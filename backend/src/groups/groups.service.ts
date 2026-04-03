import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { In, QueryFailedError } from 'typeorm';
import { randomBytes } from 'crypto';
import { Group } from './entities/group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto, StudentDto } from './dto/group-response.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Center } from '../centers/entities/center.entity';
import { Subject } from '../subjects/entities/subject.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private readonly groupRepo: Repository<Group>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Center) private readonly centerRepo: Repository<Center>,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
  ) {}

  async create(dto: CreateGroupDto, userId: number): Promise<GroupResponseDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['center'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Faqat admin yoki superadmin guruh yarata oladi
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException(
        'Faqat admin yoki superadmin guruh yaratishi mumkin',
      );
    }

    if (!user.center && user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admin markazga biriktirilmagan');
    }

    // Teacher'ni topish va tekshirish
    const teacher = await this.userRepo.findOne({
      where: { id: dto.teacherId },
      relations: ['center'],
    });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");
    if (teacher.role !== UserRole.TEACHER) {
      throw new ForbiddenException("Tanlangan foydalanuvchi o'qituvchi emas");
    }

    // Admin uchun teacher o'z markazida bo'lishi kerak
    if (
      user.role === UserRole.ADMIN &&
      teacher.center?.id !== user.center?.id
    ) {
      throw new ForbiddenException("O'qituvchi sizning markazingizda emas");
    }

    if (!teacher.center) {
      throw new ForbiddenException("O'qituvchi markazga biriktirilmagan");
    }

    // Subject'ni topish va tekshirish (majburiy)
    const subject = await this.subjectRepo.findOne({
      where: { id: dto.subjectId },
      relations: ['center'],
    });
    if (!subject) throw new NotFoundException('Fan topilmadi');

    // Admin uchun subject o'z markazida bo'lishi kerak
    if (
      user.role === UserRole.ADMIN &&
      subject.center?.id !== user.center?.id
    ) {
      throw new ForbiddenException('Fan sizning markazingizda emas');
    }

    // Students'ni topish
    const students: User[] = [];
    if (dto.studentIds && dto.studentIds.length > 0) {
      const found = await this.userRepo.find({
        where: { id: In(dto.studentIds) },
        relations: ['center'],
      });
      found.forEach((u) => {
        if (u.role === UserRole.STUDENT && u.center?.id === teacher.center.id) {
          students.push(u);
        }
      });
    }

    const group = this.groupRepo.create({
      name: dto.name,
      description: dto.description,
      subject,
      teacher,
      center: teacher.center,
      students,
      daysOfWeek: dto.daysOfWeek || [],
      startTime: dto.startTime,
      endTime: dto.endTime,
      telegramJoinToken: randomBytes(16).toString('base64url'),
    });
    const saved = await this.groupRepo.save(group);
    return this.map(saved);
  }

  async listMy(userId: number): Promise<GroupResponseDto[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['center'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Teacher -> own groups
    // Admin -> all groups in their center
    // Superadmin -> all groups
    let where: any = undefined;
    if (user.role === UserRole.TEACHER) {
      where = { teacher: { id: user.id } };
    } else if (user.role === UserRole.ADMIN) {
      if (!user.center) {
        throw new ForbiddenException('Sizga markaz tayinlanmagan');
      }
      where = { center: { id: user.center.id } };
    } else if (user.role === UserRole.SUPERADMIN) {
      where = {};
    } else {
      throw new ForbiddenException("Faqat o'qituvchi yoki admin");
    }

    const groups = await this.groupRepo.find({
      where,
      relations: ['subject', 'students', 'teacher', 'center'],
      order: { createdAt: 'DESC' },
    });
    return groups.map(this.map);
  }

  async addStudents(
    groupId: number,
    studentIds: number[],
    userId: number,
  ): Promise<GroupResponseDto> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['teacher', 'students', 'center'],
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['center'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Teacher yoki Admin o'zgartira oladi
    const canEdit =
      group.teacher.id === userId ||
      (user.role === UserRole.ADMIN && user.center?.id === group.center?.id) ||
      user.role === UserRole.SUPERADMIN;

    if (!canEdit) {
      throw new ForbiddenException("Siz bu guruhni o'zgartira olmaysiz");
    }

    const students = await this.userRepo.find({
      where: { id: In(studentIds) },
      relations: ['center'],
    });
    const allowed = students.filter(
      (s) => s.role === UserRole.STUDENT && s.center?.id === group.center.id,
    );
    group.students = [
      ...(group.students || []),
      ...allowed.filter((a) => !group.students.some((s) => s.id === a.id)),
    ];
    const saved = await this.groupRepo.save(group);
    return this.map(saved);
  }

  async removeStudent(
    groupId: number,
    studentId: number,
    userId: number,
  ): Promise<GroupResponseDto> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['teacher', 'students', 'center'],
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['center'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Teacher yoki Admin o'zgartira oladi
    const canEdit =
      group.teacher.id === userId ||
      (user.role === UserRole.ADMIN && user.center?.id === group.center?.id) ||
      user.role === UserRole.SUPERADMIN;

    if (!canEdit) {
      throw new ForbiddenException("Siz bu guruhni o'zgartira olmaysiz");
    }

    group.students = (group.students || []).filter((s) => s.id !== studentId);
    const saved = await this.groupRepo.save(group);
    return this.map(saved);
  }

  async getStudents(groupId: number, userId: number) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['teacher', 'students', 'center'],
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['center'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    if (user.role === UserRole.TEACHER) {
      if (group.teacher.id !== userId) {
        throw new ForbiddenException(
          "Faqat o'qituvchi o'z guruh talabalarini ko'ra oladi",
        );
      }
    } else if (user.role === UserRole.ADMIN) {
      if (!user.center || group.center?.id !== user.center.id) {
        throw new ForbiddenException("Faqat o'z markazingiz guruhlari");
      }
    } else if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException("Ruxsat yo'q");
    }

    return group.students.map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      username: student.username,
    }));
  }

  async update(
    id: number,
    dto: Partial<CreateGroupDto>,
    userId: number,
  ): Promise<GroupResponseDto> {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: ['teacher', 'center', 'students', 'subject'],
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['center'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Teacher yoki Admin tahrirlashi mumkin
    const canEdit =
      group.teacher.id === userId ||
      (user.role === UserRole.ADMIN && user.center?.id === group.center?.id) ||
      user.role === UserRole.SUPERADMIN;

    if (!canEdit) {
      throw new ForbiddenException('Siz bu guruhni tahrirlay olmaysiz');
    }

    // Subject yangilash (majburiy bo'lishi mumkin)
    if (dto.subjectId !== undefined) {
      const subject = await this.subjectRepo.findOne({
        where: { id: dto.subjectId },
        relations: ['center'],
      });
      if (!subject) throw new NotFoundException('Fan topilmadi');

      // Admin uchun subject o'z markazida bo'lishi kerak
      if (
        user.role === UserRole.ADMIN &&
        subject.center?.id !== user.center?.id
      ) {
        throw new ForbiddenException('Fan sizning markazingizda emas');
      }

      group.subject = subject;
    }

    // Teacher yangilash (majburiy bo'lishi mumkin)
    if (dto.teacherId !== undefined) {
      const teacher = await this.userRepo.findOne({
        where: { id: dto.teacherId },
        relations: ['center'],
      });
      if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");
      if (teacher.role !== UserRole.TEACHER) {
        throw new ForbiddenException("Tanlangan foydalanuvchi o'qituvchi emas");
      }

      // Admin uchun teacher o'z markazida bo'lishi kerak
      if (
        user.role === UserRole.ADMIN &&
        teacher.center?.id !== user.center?.id
      ) {
        throw new ForbiddenException("O'qituvchi sizning markazingizda emas");
      }

      group.teacher = teacher;
    }

    if (dto.name !== undefined) group.name = dto.name;
    if (dto.description !== undefined) group.description = dto.description;
    if (dto.daysOfWeek !== undefined) group.daysOfWeek = dto.daysOfWeek;
    if (dto.startTime !== undefined) group.startTime = dto.startTime;
    if (dto.endTime !== undefined) group.endTime = dto.endTime;

    if (dto.studentIds) {
      const students = await this.userRepo.find({
        where: { id: In(dto.studentIds) },
        relations: ['center'],
      });
      group.students = students.filter(
        (s) => s.role === UserRole.STUDENT && s.center?.id === group.center.id,
      );
    }

    const saved = await this.groupRepo.save(group);
    return this.map(saved);
  }

  async delete(id: number, userId: number): Promise<void> {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: ['teacher', 'center'],
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['center'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Teacher yoki Admin o'chira oladi
    const canDelete =
      group.teacher.id === userId ||
      (user.role === UserRole.ADMIN && user.center?.id === group.center?.id) ||
      user.role === UserRole.SUPERADMIN;

    if (!canDelete) {
      throw new ForbiddenException("Siz bu guruhni o'chira olmaysiz");
    }

    try {
      await this.groupRepo.remove(group);
    } catch (err: unknown) {
      const driverCode =
        err instanceof QueryFailedError
          ? ((err as any).driverError?.code ?? (err as any).code)
          : undefined;

      // Postgres foreign key violation is 23503
      if (driverCode === '23503') {
        throw new ConflictException(
          "Guruhni o'chirib bo'lmaydi: bog'liq ma'lumotlar mavjud",
        );
      }

      throw err;
    }
  }

  async findByIds(ids: number[]): Promise<Group[]> {
    if (!ids || ids.length === 0) return [];
    return this.groupRepo.find({
      where: { id: In(ids) },
      relations: ['students'],
    });
  }

  async findById(id: number): Promise<Group> {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: ['students'],
    });
    if (!group) {
      throw new NotFoundException('Guruh topilmadi');
    }
    return group;
  }

  private map = (g: Group): GroupResponseDto => ({
    id: g.id,
    name: g.name,
    description: g.description,
    subjectId: g.subject?.id ?? null,
    teacherId: g.teacher?.id ?? 0,
    studentIds: (g.students || []).map((s) => s.id),
    students: (g.students || []).map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      username: s.username,
      role: s.role,
    })),
    daysOfWeek: g.daysOfWeek || [],
    startTime: g.startTime,
    endTime: g.endTime,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    telegramStartPayload:
      g.telegramJoinToken && g.id
        ? `g_${g.id}_${g.telegramJoinToken}`
        : undefined,
  });
}
