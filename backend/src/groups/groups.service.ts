import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import { Group } from './entities/group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
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
    const teacher = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['center'],
    });
    if (!teacher) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (teacher.role !== UserRole.TEACHER)
      throw new ForbiddenException("Faqat o'qituvchi guruh yaratishi mumkin");
    if (!teacher.center)
      throw new ForbiddenException("O'qituvchi markazga biriktirilmagan");

    let subject: Subject | null = null;
    if (dto.subjectId) {
      subject = await this.subjectRepo.findOne({
        where: { id: dto.subjectId },
      });
      if (!subject) throw new NotFoundException('Fan topilmadi');
    }

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
      subject: subject || null,
      teacher,
      center: teacher.center,
      students,
      daysOfWeek: dto.daysOfWeek || [],
      startTime: dto.startTime,
      endTime: dto.endTime,
    });
    const saved = await this.groupRepo.save(group);
    return this.map(saved);
  }

  async listMy(userId: number): Promise<GroupResponseDto[]> {
    const teacher = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['center'],
    });
    if (!teacher) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (teacher.role !== UserRole.TEACHER)
      throw new ForbiddenException("Faqat o'qituvchi");
    const groups = await this.groupRepo.find({
      where: { teacher: { id: teacher.id } },
      relations: ['subject', 'students'],
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
    if (group.teacher.id !== userId)
      throw new ForbiddenException("Faqat o'qituvchi o'zgartira oladi");
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
      relations: ['teacher', 'students'],
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    if (group.teacher.id !== userId)
      throw new ForbiddenException("Faqat o'qituvchi o'zgartira oladi");
    group.students = (group.students || []).filter((s) => s.id !== studentId);
    const saved = await this.groupRepo.save(group);
    return this.map(saved);
  }

  async getStudents(groupId: number, userId: number) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['teacher', 'students'],
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    if (group.teacher.id !== userId)
      throw new ForbiddenException("Faqat o'qituvchi guruh talabalarini ko'ra oladi");
    
    return group.students.map(student => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
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
    if (group.teacher.id !== userId)
      throw new ForbiddenException("Faqat o'qituvchi tahrirlashi mumkin");

    if (dto.subjectId) {
      const subject = await this.subjectRepo.findOne({
        where: { id: dto.subjectId },
      });
      if (!subject) throw new NotFoundException('Fan topilmadi');
      group.subject = subject;
    }
    if (dto.name !== undefined) group.name = dto.name as string;
    if (dto.description !== undefined)
      group.description = dto.description as string;
    if (dto.daysOfWeek !== undefined)
      group.daysOfWeek = dto.daysOfWeek as string[];
    if (dto.startTime !== undefined) group.startTime = dto.startTime as string;
    if (dto.endTime !== undefined) group.endTime = dto.endTime as string;

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
      relations: ['teacher'],
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    if (group.teacher.id !== userId)
      throw new ForbiddenException("Faqat o'qituvchi o'chira oladi");
    await this.groupRepo.remove(group);
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
    studentIds: (g.students || []).map((s) => s.id),
    daysOfWeek: g.daysOfWeek || [],
    startTime: g.startTime,
    endTime: g.endTime,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  });
}
