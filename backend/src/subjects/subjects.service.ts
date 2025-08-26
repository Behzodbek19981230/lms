import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Subject } from './entities/subject.entity';
import type { CreateSubjectDto } from './dto/create-subject.dto';
import type { UpdateSubjectDto } from './dto/update-subject.dto';
import type { SubjectResponseDto } from './dto/subject-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createSubjectDto: CreateSubjectDto,
    userid: number,
  ): Promise<SubjectResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userid },
      relations: ['subjects'],
    });

    if (!user) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }

    // Create new subject
    const subject = this.subjectRepository.create(createSubjectDto);
    const savedSubject = await this.subjectRepository.save(subject);

    // Associate subject with user
    user.subjects.push(savedSubject);
    await this.userRepository.save(user);

    return this.mapToResponseDto(savedSubject);
  }

  async findAllByTeacher(userid: number): Promise<SubjectResponseDto[]> {
    const user = await this.userRepository.findOne({
      where: { id: userid },
      relations: ['subjects'],
    });

    if (!user) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }

    return user.subjects.map((subject) => this.mapToResponseDto(subject));
  }
  async findAll(userid: number): Promise<SubjectResponseDto[]> {
    const user = await this.userRepository.findOne({
      where: { id: userid },
      relations: ['subjects'],
    });

    if (!user) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }

    return user.subjects.map((subject) => this.mapToResponseDto(subject));
  }

  async findOne(id: number, userid: number): Promise<SubjectResponseDto> {
    const subject = await this.subjectRepository.findOne({
      where: { id },
      relations: ['teachers', 'tests'],
    });

    if (!subject) {
      throw new NotFoundException('Fan topilmadi');
    }

    // Check if teacher has access to this subject
    const hasAccess = subject.teachers.some((teacher) => teacher.id === userid);
    if (!hasAccess) {
      throw new ForbiddenException("Bu fanga ruxsatingiz yo'q");
    }

    return this.mapToResponseDto(subject);
  }

  async update(
    id: number,
    updateSubjectDto: UpdateSubjectDto,
    userid: number,
  ): Promise<SubjectResponseDto> {
    const subject = await this.subjectRepository.findOne({
      where: { id },
      relations: ['teachers'],
    });

    if (!subject) {
      throw new NotFoundException('Fan topilmadi');
    }

    // Check if teacher has access to this subject
    const hasAccess = subject.teachers.some((teacher) => teacher.id === userid);
    if (!hasAccess) {
      throw new ForbiddenException("Bu fanga ruxsatingiz yo'q");
    }

    // Update subject
    Object.assign(subject, updateSubjectDto);
    const updatedSubject = await this.subjectRepository.save(subject);

    return this.mapToResponseDto(updatedSubject);
  }

  async remove(id: number, userid: number): Promise<void> {
    const subject = await this.subjectRepository.findOne({
      where: { id },
      relations: ['teachers', 'tests'],
    });

    if (!subject) {
      throw new NotFoundException('Fan topilmadi');
    }

    // Check if teacher has access to this subject
    const hasAccess = subject.teachers.some((teacher) => teacher.id === userid);
    if (!hasAccess) {
      throw new ForbiddenException("Bu fanga ruxsatingiz yo'q");
    }

    // Check if subject has tests
    if (subject.tests && subject.tests.length > 0) {
      throw new ForbiddenException(
        "Bu fanda testlar mavjud. Avval testlarni o'chiring",
      );
    }

    // Remove teacher-subject association
    const teacher = await this.userRepository.findOne({
      where: { id: userid },
      relations: ['subjects'],
    });

    if (teacher) {
      teacher.subjects = teacher.subjects.filter((s) => s.id !== id);
      await this.userRepository.save(teacher);
    }

    // If no other teachers are associated, delete the subject
    const remainingTeachers = subject.teachers.filter((t) => t.id !== userid);
    if (remainingTeachers.length === 0) {
      await this.subjectRepository.remove(subject);
    }
  }

  async getSubjectStats(userid: number): Promise<any> {
    const teacher = await this.userRepository.findOne({
      where: { id: userid },
      relations: ['subjects', 'subjects.tests'],
    });

    if (!teacher) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }

    const stats = {
      totalSubjects: teacher.subjects.length,
      activeSubjects: teacher.subjects.filter((s) => s.isActive).length,
      subjectsWithFormulas: teacher.subjects.filter((s) => s.hasFormulas)
        .length,
      totalTests: teacher.subjects.reduce(
        (sum, subject) => sum + (subject.tests?.length || 0),
        0,
      ),
      subjectsByCategory: {} as Record<string, number>,
    };

    // Count subjects by category
    teacher.subjects.forEach((subject) => {
      stats.subjectsByCategory[subject.category] =
        (stats.subjectsByCategory[subject.category] || 0) + 1;
    });

    return stats;
  }

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
