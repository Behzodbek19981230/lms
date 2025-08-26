import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Subject } from './entities/subject.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectResponseDto } from './dto/subject-response.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Center } from '../centers/entities/center.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,
  ) {}

  /** SUBJECT YARATISH */
  async create(
    createSubjectDto: CreateSubjectDto,
    userId: number,
  ): Promise<SubjectResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['center', 'subjects'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    if (
      ![UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN].includes(
        user.role,
      )
    ) {
      throw new ForbiddenException(
        'Siz subject yaratishga ruxsatga ega emassiz',
      );
    }

    const center = await this.centerRepository.findOne({
      where: { id: createSubjectDto.centerId || user.center?.id },
    });
    if (!center) throw new NotFoundException('Markaz topilmadi');

    const subject = this.subjectRepository.create({
      ...createSubjectDto,
      center,
    });
    const savedSubject = await this.subjectRepository.save(subject);

    // Agar teacher bo'lsa, subjectni unga bog'laymiz
    if (user.role === UserRole.TEACHER) {
      user.subjects.push(savedSubject);
      await this.userRepository.save(user);
    }

    return this.mapToResponseDto(savedSubject);
  }

  /** BARCHA SUBJECTLARNI KO'RISH (teacher uchun faqat o'ziniki, admin uchun markazdagilari) */
  async findAll(userId: number): Promise<SubjectResponseDto[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['center', 'subjects'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    let subjects: Subject[] = [];
    if (user.role === UserRole.TEACHER) {
      subjects = await this.subjectRepository.find({
        where: { teachers: { id: user.id } },
        relations: ['center'],
      });
    } else {
      subjects = await this.subjectRepository.find({
        where: { center: { id: user.center?.id } },
        relations: ['center', 'teachers'],
      });
    }

    // eslint-disable-next-line @typescript-eslint/unbound-method
    return subjects.map(this.mapToResponseDto);
  }

  /** BITTA SUBJECTNI KO'RISH */
  async findOne(id: number, userId: number): Promise<SubjectResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['center'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const subject = await this.subjectRepository.findOne({
      where: { id },
      relations: ['teachers', 'tests', 'center'],
    });
    if (!subject) throw new NotFoundException('Fan topilmadi');

    if (user.role === UserRole.TEACHER) {
      const hasAccess = subject.teachers.some((t) => t.id === user.id);
      if (!hasAccess) throw new ForbiddenException("Bu fanga ruxsatingiz yo'q");
    } else if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.SUPERADMIN
    ) {
      throw new ForbiddenException('Siz subjectni ko‘ra olmaysiz');
    }

    return this.mapToResponseDto(subject);
  }

  /** SUBJECTNI TAHRIRLASH */
  async update(
    id: number,
    dto: UpdateSubjectDto,
    userId: number,
  ): Promise<SubjectResponseDto> {
    const subject = await this.subjectRepository.findOne({
      where: { id },
      relations: ['teachers', 'center'],
    });
    if (!subject) throw new NotFoundException('Fan topilmadi');

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['center'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Ruxsatlarni tekshirish
    if (user.role === UserRole.TEACHER) {
      const hasAccess = subject.teachers.some((t) => t.id === user.id);
      if (!hasAccess) throw new ForbiddenException("Bu fanga ruxsatingiz yo'q");
    } else if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.SUPERADMIN
    ) {
      throw new ForbiddenException(
        'Siz subjectni tahrirlashga ruxsatga ega emassiz',
      );
    }

    Object.assign(subject, dto);
    const updatedSubject = await this.subjectRepository.save(subject);
    return this.mapToResponseDto(updatedSubject);
  }

  /** SUBJECTNI O'CHIRISH */
  async remove(id: number, userId: number): Promise<void> {
    const subject = await this.subjectRepository.findOne({
      where: { id },
      relations: ['teachers', 'tests', 'center'],
    });
    if (!subject) throw new NotFoundException('Fan topilmadi');

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['center'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Ruxsatlarni tekshirish
    if (user.role === UserRole.TEACHER) {
      const hasAccess = subject.teachers.some((t) => t.id === user.id);
      if (!hasAccess) throw new ForbiddenException("Bu fanga ruxsatingiz yo'q");
    } else if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.SUPERADMIN
    ) {
      throw new ForbiddenException('Siz subjectni o‘chira olmaysiz');
    }

    // Testlar mavjud bo'lsa, o'chirishga ruxsat yo'q
    if (subject.tests && subject.tests.length > 0) {
      throw new ForbiddenException(
        "Bu fanda testlar mavjud. Avval testlarni o'chiring",
      );
    }

    await this.subjectRepository.remove(subject);
  }

  /** SUBJECT STATISTIKASI (Teacher uchun faqat o'ziniki, Admin uchun markaz bo'yicha) */
  async getSubjectStats(userId: number): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['center', 'subjects', 'subjects.tests'],
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    let subjects: Subject[] = [];
    if (user.role === UserRole.TEACHER) {
      subjects = user.subjects;
    } else if (
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPERADMIN
    ) {
      subjects = await this.subjectRepository.find({
        where: { center: { id: user.center?.id } },
        relations: ['tests'],
      });
    }

    const stats = {
      totalSubjects: subjects.length,
      activeSubjects: subjects.filter((s) => s.isActive).length,
      subjectsWithFormulas: subjects.filter((s) => s.hasFormulas).length,
      totalTests: subjects.reduce((sum, s) => sum + (s.tests?.length || 0), 0),
      subjectsByCategory: {} as Record<string, number>,
    };

    subjects.forEach((s) => {
      stats.subjectsByCategory[s.category] =
        (stats.subjectsByCategory[s.category] || 0) + 1;
    });

    return stats;
  }

  /** DTO GA MAP QILISH */
  private mapToResponseDto(subject: Subject): SubjectResponseDto {
    return {
      id: subject.id,
      name: subject.name,
      description: subject.description,
      category: subject.category,
      hasFormulas: subject.hasFormulas,
      isActive: subject.isActive,
      testsCount: subject.testsCount,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    };
  }
}
