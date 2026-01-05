import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../groups/entities/group.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';
import { TaskNotDone } from './entities/task-not-done.entity';
import { BulkTasksDto } from './dto/tasks.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(TaskNotDone)
    private taskNotDoneRepo: Repository<TaskNotDone>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Group)
    private groupRepo: Repository<Group>,
    private readonly telegramNotificationService: TelegramNotificationService,
  ) {}

  private async assertCanManageGroupTasks(params: {
    groupId: number;
    userId: number;
  }): Promise<{ user: User; group: Group }> {
    const user = await this.userRepo.findOne({
      where: { id: params.userId },
      relations: ['center'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const group = await this.groupRepo.findOne({
      where: { id: params.groupId },
      relations: ['teacher', 'center', 'students'],
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');

    const canEdit =
      (user.role === UserRole.TEACHER && group.teacher?.id === user.id) ||
      (user.role === UserRole.ADMIN && user.center?.id === group.center?.id) ||
      user.role === UserRole.SUPERADMIN;

    if (!canEdit) {
      throw new ForbiddenException(
        'Siz bu guruh uchun vazifani belgilay olmaysiz',
      );
    }

    return { user, group };
  }

  async saveBulk(dto: BulkTasksDto, userId: number) {
    const { group } = await this.assertCanManageGroupTasks({
      groupId: dto.groupId,
      userId,
    });

    const notDoneIds = Array.isArray(dto.notDoneStudentIds)
      ? dto.notDoneStudentIds
          .map((id) => Number(id))
          .filter((id) => !Number.isNaN(id))
      : [];

    // Keep only students from the group
    const groupStudentIds = new Set((group.students || []).map((s) => s.id));
    const filteredNotDone = notDoneIds.filter((id) => groupStudentIds.has(id));

    // Replace existing records for this group/date
    await this.taskNotDoneRepo.delete({ groupId: dto.groupId, date: dto.date });

    if (filteredNotDone.length > 0) {
      const rows = filteredNotDone.map((studentId) =>
        this.taskNotDoneRepo.create({
          groupId: dto.groupId,
          studentId,
          date: dto.date,
          markedById: userId,
        }),
      );
      await this.taskNotDoneRepo.save(rows);
    }

    // Telegram: send not-done list to group/subject channel
    try {
      const notDoneStudents = (group.students || [])
        .filter((s) => filteredNotDone.includes(s.id))
        .map((s) => `${s.firstName} ${s.lastName}`);

      await this.telegramNotificationService.sendTaskNotDoneListToGroupChat(
        group.id,
        dto.date,
        notDoneStudents,
      );
    } catch (e) {
      // Do not block saving on Telegram failures
      this.logger.warn(
        `Failed to send tasks notification to Telegram: ${String(e)}`,
      );
    }

    return {
      groupId: dto.groupId,
      date: dto.date,
      notDoneStudentIds: filteredNotDone,
    };
  }

  async getTodayNotDone(groupId: number, userId: number) {
    const { group } = await this.assertCanManageGroupTasks({ groupId, userId });

    const date = this.getISODate(new Date());

    const rows = await this.taskNotDoneRepo.find({ where: { groupId, date } });
    const ids = rows.map((r) => r.studentId);

    // Return student lite objects for UI convenience
    const students = (group.students || [])
      .filter((s) => ids.includes(s.id))
      .map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        username: s.username,
      }));

    return students;
  }

  async getNotDoneStudentIds(groupId: number, userId: number, date?: string) {
    await this.assertCanManageGroupTasks({ groupId, userId });

    const effectiveDate =
      date && typeof date === 'string' ? date : this.getISODate(new Date());
    const rows = await this.taskNotDoneRepo.find({
      where: { groupId, date: effectiveDate },
    });
    return rows.map((r) => r.studentId);
  }

  async getHistory(groupId: number, userId: number, limit = 30) {
    await this.assertCanManageGroupTasks({ groupId, userId });

    const safeLimit = Number.isFinite(limit)
      ? Math.max(1, Math.min(365, limit))
      : 30;

    const rows = await this.taskNotDoneRepo
      .createQueryBuilder('t')
      .select('t.date', 'date')
      .addSelect('COUNT(*)', 'notDoneCount')
      .where('t.groupId = :groupId', { groupId })
      .groupBy('t.date')
      .orderBy('t.date', 'DESC')
      .limit(safeLimit)
      .getRawMany<{ date: string; notDoneCount: string }>();

    return rows.map((r) => ({
      date: String(r.date),
      notDoneCount: Number(r.notDoneCount) || 0,
    }));
  }

  private getISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
