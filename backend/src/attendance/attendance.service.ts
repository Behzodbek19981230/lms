import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance, AttendanceStatus } from './entities/attendance.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';
import {
  CreateAttendanceDto,
  BulkAttendanceDto,
  AttendanceQueryDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepo: Repository<Attendance>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Group)
    private groupRepo: Repository<Group>,
    private telegramNotificationService: TelegramNotificationService,
  ) {}

  async create(
    dto: CreateAttendanceDto,
    teacherId: number,
  ): Promise<Attendance> {
    const teacher = await this.userRepo.findOne({
      where: { id: teacherId },
      relations: ['center'],
    });

    if (!teacher || teacher.role !== UserRole.TEACHER) {
      throw new ForbiddenException("Faqat o'qituvchi davomat qo'sha oladi");
    }

    const student = await this.userRepo.findOne({
      where: { id: dto.studentId, role: UserRole.STUDENT },
    });

    if (!student) {
      throw new NotFoundException('Student topilmadi');
    }

    const group = await this.groupRepo.findOne({
      where: { id: dto.groupId },
      relations: ['teacher', 'students'],
    });

    if (!group) {
      throw new NotFoundException('Guruh topilmadi');
    }

    if (group.teacher.id !== teacherId) {
      throw new ForbiddenException(
        "Siz faqat o'z guruhingiz uchun davomat qo'sha olasiz",
      );
    }

    const isStudentInGroup = group.students.some((s) => s.id === dto.studentId);
    if (!isStudentInGroup) {
      throw new ForbiddenException('Student bu guruhda emas');
    }

    // Check if attendance already exists for this date
    const existingAttendance = await this.attendanceRepo.findOne({
      where: {
        student: { id: dto.studentId },
        group: { id: dto.groupId },
        date: dto.date,
      },
    });

    if (existingAttendance) {
      throw new ForbiddenException('Bu sana uchun davomat allaqachon mavjud');
    }

    const attendance = this.attendanceRepo.create({
      student,
      group,
      teacher,
      date: dto.date,
      status: dto.status,
      notes: dto.notes,
      arrivedAt: dto.arrivedAt,
      leftAt: dto.leftAt,
    });

    const savedAttendance = await this.attendanceRepo.save(attendance);

    // ✅ Send to group-specific channel (absent list) + center channel (summary)
    try {
      if (dto.status === AttendanceStatus.ABSENT) {
        await this.telegramNotificationService.sendAbsentListToGroupChat(
          group.id,
          dto.date,
          [`${student.firstName} ${student.lastName}`],
        );
      }

      const presentCount = dto.status === AttendanceStatus.PRESENT ? 1 : 0;
      const absentCount = dto.status === AttendanceStatus.ABSENT ? 1 : 0;
      const lateCount = dto.status === AttendanceStatus.LATE ? 1 : 0;

      await this.telegramNotificationService.sendAttendanceSummaryToCenterChannel({
        centerId: teacher.center.id,
        groupName: group.name,
        date: dto.date,
        presentCount,
        absentCount,
        lateCount,
        absentStudents:
          dto.status === AttendanceStatus.ABSENT
            ? [`${student.firstName} ${student.lastName}`]
            : [],
      });
    } catch (error) {
      console.log('Failed to send absent notification to Telegram:', error);
    }

    return savedAttendance;
  }

  async createBulk(
    dto: BulkAttendanceDto,
    teacherId: number,
  ): Promise<Attendance[]> {
    const teacher = await this.userRepo.findOne({
      where: { id: teacherId },
      relations: ['center'],
    });

    if (!teacher || teacher.role !== UserRole.TEACHER) {
      throw new ForbiddenException("Faqat o'qituvchi davomat qo'sha oladi");
    }

    const group = await this.groupRepo.findOne({
      where: { id: dto.groupId },
      relations: ['teacher', 'students'],
    });

    if (!group) {
      throw new NotFoundException('Guruh topilmadi');
    }

    if (group.teacher.id !== teacherId) {
      throw new ForbiddenException(
        "Siz faqat o'z guruhingiz uchun davomat qo'sha olasiz",
      );
    }

    // Delete existing attendance for this group and date
    await this.attendanceRepo.delete({
      group: { id: dto.groupId },
      date: dto.date,
    });

    const attendanceRecords: Attendance[] = [];

    for (const record of dto.attendanceRecords) {
      const student = group.students.find((s) => s.id === record.studentId);
      if (!student) {
        continue; // Skip invalid students
      }

      const attendance = this.attendanceRepo.create({
        student,
        group,
        teacher,
        date: dto.date,
        status: record.status,
        notes: record.notes,
        arrivedAt: record.arrivedAt,
        leftAt: record.leftAt,
      });

      attendanceRecords.push(attendance);
    }

    const savedAttendances = await this.attendanceRepo.save(attendanceRecords);

    // ✅ Send to group-specific channel (absent list) + center channel (summary)
    try {
      const absentStudents = attendanceRecords
        .filter((record) => record.status === AttendanceStatus.ABSENT)
        .map(
          (record) => `${record.student.firstName} ${record.student.lastName}`,
        );

      if (absentStudents.length > 0) {
        await this.telegramNotificationService.sendAbsentListToGroupChat(
          group.id,
          dto.date,
          absentStudents,
        );
      }

      const presentCount = attendanceRecords.filter(
        (r) => r.status === AttendanceStatus.PRESENT,
      ).length;
      const absentCount = absentStudents.length;
      const lateCount = attendanceRecords.filter(
        (r) => r.status === AttendanceStatus.LATE,
      ).length;

      await this.telegramNotificationService.sendAttendanceSummaryToCenterChannel({
        centerId: teacher.center.id,
        groupName: group.name,
        date: dto.date,
        presentCount,
        absentCount,
        lateCount,
        absentStudents,
      });
    } catch (error) {
      console.warn('Failed to send absent notification to Telegram:', error);
    }

    return savedAttendances;
  }

  async findAll(
    query: AttendanceQueryDto,
    userId: number,
    userRole: UserRole,
  ): Promise<Attendance[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['center'],
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const queryBuilder = this.attendanceRepo
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.student', 'student')
      .leftJoinAndSelect('attendance.group', 'group')
      .leftJoinAndSelect('attendance.teacher', 'teacher')
      .leftJoinAndSelect('group.subject', 'subject');

    // Role-based filtering
    if (userRole === UserRole.TEACHER) {
      queryBuilder.where('teacher.id = :teacherId', { teacherId: userId });
    } else if (userRole === UserRole.STUDENT) {
      queryBuilder.where('student.id = :studentId', { studentId: userId });
    } else if (userRole === UserRole.ADMIN) {
      queryBuilder.where('student.center = :centerId', {
        centerId: user.center.id,
      });
    }

    // Apply filters
    if (query.groupId) {
      queryBuilder.andWhere('group.id = :groupId', { groupId: query.groupId });
    }

    if (query.studentId) {
      queryBuilder.andWhere('student.id = :studentId', {
        studentId: query.studentId,
      });
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('attendance.date BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    } else if (query.period) {
      const today = new Date();
      let startDate: Date;

      switch (query.period) {
        case 'today':
          startDate = new Date(today.setHours(0, 0, 0, 0));
          queryBuilder.andWhere('attendance.date = :date', {
            date: startDate.toISOString().split('T')[0],
          });
          break;
        case 'week':
          startDate = new Date(today.setDate(today.getDate() - 7));
          queryBuilder.andWhere('attendance.date >= :startDate', {
            startDate: startDate.toISOString().split('T')[0],
          });
          break;
        case 'month':
          startDate = new Date(today.setMonth(today.getMonth() - 1));
          queryBuilder.andWhere('attendance.date >= :startDate', {
            startDate: startDate.toISOString().split('T')[0],
          });
          break;
      }
    }

    queryBuilder.orderBy('attendance.date', 'DESC');

    return queryBuilder.getMany();
  }

  async update(
    id: number,
    dto: UpdateAttendanceDto,
    userId: number,
  ): Promise<Attendance> {
    const attendance = await this.attendanceRepo.findOne({
      where: { id },
      relations: ['teacher', 'student', 'group'],
    });

    if (!attendance) {
      throw new NotFoundException('Davomat yozuvi topilmadi');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    // Check permissions
    if (user.role === UserRole.TEACHER && attendance.teacher.id !== userId) {
      throw new ForbiddenException(
        "Siz faqat o'z davomat yozuvlaringizni o'zgartira olasiz",
      );
    } else if (user.role === UserRole.ADMIN) {
      // Center admin can modify attendance for their center
      if (attendance.student.center?.id !== user.center?.id) {
        throw new ForbiddenException(
          "Siz faqat o'z markazingiz davomatini o'zgartira olasiz",
        );
      }
    } else if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException("Sizda davomat o'zgartirish huquqi yo'q");
    }

    Object.assign(attendance, dto);
    return this.attendanceRepo.save(attendance);
  }

  async getAttendanceStats(groupId: number, userId: number): Promise<any> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['teacher', 'students', 'subject'],
    });

    if (!group) {
      throw new NotFoundException('Guruh topilmadi');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['center'],
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    // Check permissions
    if (user.role === UserRole.TEACHER && group.teacher.id !== userId) {
      throw new ForbiddenException(
        "Siz faqat o'z guruhingiz statistikasini ko'ra olasiz",
      );
    }

    const totalStudents = group.students.length;
    const today = new Date().toISOString().split('T')[0];

    // Get today's attendance
    const todayAttendance = await this.attendanceRepo.find({
      where: {
        group: { id: groupId },
        date: today,
      },
      relations: ['student'],
    });

    const presentToday = todayAttendance.filter(
      (a) => a.status === AttendanceStatus.PRESENT,
    ).length;
    const absentToday = todayAttendance.filter(
      (a) => a.status === AttendanceStatus.ABSENT,
    ).length;
    const lateToday = todayAttendance.filter(
      (a) => a.status === AttendanceStatus.LATE,
    ).length;

    // Get weekly stats
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weeklyAttendance = await this.attendanceRepo.find({
      where: {
        group: { id: groupId },
        date: Between(weekStart.toISOString().split('T')[0], today),
      },
    });

    const weeklyPresentRate =
      weeklyAttendance.length > 0
        ? (weeklyAttendance.filter((a) => a.status === AttendanceStatus.PRESENT)
            .length /
            weeklyAttendance.length) *
          100
        : 0;

    return {
      totalStudents,
      todayAttendance: {
        present: presentToday,
        absent: absentToday,
        late: lateToday,
        total: todayAttendance.length,
      },
      weeklyPresentRate: Math.round(weeklyPresentRate),
      group: {
        id: group.id,
        name: group.name,
        subject: group.subject?.name || null,
      },
    };
  }

  async delete(id: number, userId: number): Promise<void> {
    const attendance = await this.attendanceRepo.findOne({
      where: { id },
      relations: ['teacher'],
    });

    if (!attendance) {
      throw new NotFoundException('Davomat yozuvi topilmadi');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    if (user.role === UserRole.TEACHER && attendance.teacher.id !== userId) {
      throw new ForbiddenException(
        "Siz faqat o'z davomat yozuvlaringizni o'chira olasiz",
      );
    } else if (
      user.role !== UserRole.SUPERADMIN &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException("Sizda davomat o'chirish huquqi yo'q");
    }

    await this.attendanceRepo.remove(attendance);
  }

  // Get only present students for a specific group and date
  async getPresentStudents(
    groupId: number,
    date: string,
    teacherId: number,
  ): Promise<{
    groupName: string;
    subject: string;
    presentStudents: Array<{
      id: number;
      firstName: string;
      lastName: string;
      fullName: string;
      arrivedAt?: string;
      notes?: string;
    }>;
    totalPresent: number;
    date: string;
  }> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['teacher', 'subject'],
    });

    if (!group) {
      throw new NotFoundException('Guruh topilmadi');
    }

    if (group.teacher.id !== teacherId) {
      throw new ForbiddenException(
        "Siz faqat o'z guruhingiz davomatini ko'ra olasiz",
      );
    }

    // Get only present students for the given date
    const presentAttendance = await this.attendanceRepo.find({
      where: {
        group: { id: groupId },
        date: date,
        status: AttendanceStatus.PRESENT,
      },
      relations: ['student'],
      order: {
        student: {
          firstName: 'ASC',
          lastName: 'ASC',
        },
      },
    });

    const presentStudents = presentAttendance.map((attendance) => ({
      id: attendance.student.id,
      firstName: attendance.student.firstName,
      lastName: attendance.student.lastName,
      fullName: `${attendance.student.firstName} ${attendance.student.lastName}`,
      arrivedAt: attendance.arrivedAt,
      notes: attendance.notes,
    }));

    return {
      groupName: group.name,
      subject: group.subject?.name || 'Fan belgilanmagan',
      presentStudents,
      totalPresent: presentStudents.length,
      date,
    };
  }

  // Get attendance summary showing only present students for today
  async getTodayPresentStudents(
    groupId: number,
    teacherId: number,
  ): Promise<{
    groupName: string;
    subject: string;
    presentStudents: Array<{
      id: number;
      firstName: string;
      lastName: string;
      fullName: string;
      arrivedAt?: string;
      notes?: string;
    }>;
    totalPresent: number;
    date: string;
  }> {
    const today = new Date().toISOString().split('T')[0];
    return this.getPresentStudents(groupId, today, teacherId);
  }
}
