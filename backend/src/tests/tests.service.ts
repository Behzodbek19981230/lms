import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Test, TestStatus } from './entities/test.entity';
import { Subject } from '../subjects/entities/subject.entity';
import type { CreateTestDto } from './dto/create-test.dto';
import type { UpdateTestDto } from './dto/update-test.dto';
import type { TestResponseDto } from './dto/test-response.dto';
import type { TestStatsDto } from './dto/test-stats.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(User)
    private teacherRepository: Repository<User>,
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
  ) {}

  async create(
    createTestDto: CreateTestDto,
    teacherid: number,
  ): Promise<TestResponseDto> {
    const teacher = await this.teacherRepository.findOne({
      where: { id: teacherid },
      relations: ['center'],
    });

    if (!teacher) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }

    const subject = await this.subjectRepository.findOne({
      where: { id: createTestDto.subjectid },
      relations: ['center'],
    });

    if (!subject) {
      throw new NotFoundException('Fan topilmadi');
    }

    // Allow any subject within the teacher's center
    if (!teacher.center || subject.center?.id !== teacher.center.id) {
      throw new ForbiddenException("Bu fanga ruxsatingiz yo'q");
    }

    // Create test
    const test = this.testRepository.create({
      ...createTestDto,
      teacher,
      subject,
    });

    const savedTest = await this.testRepository.save(test);

    // Update subject tests count
    subject.testsCount = (subject.testsCount || 0) + 1;
    await this.subjectRepository.save(subject);

    return this.mapToResponseDto(savedTest);
  }

  async findAllByTeacher(teacherid: number): Promise<TestResponseDto[]> {
    const tests = await this.testRepository.find({
      where: { teacher: { id: teacherid } },
      relations: ['subject', 'teacher', 'questions'],
      order: { updatedAt: 'DESC' },
    });

    return tests.map((test) => this.mapToResponseDto(test));
  }

  async getTestStats(teacherid: number): Promise<TestStatsDto> {
    const [totalTests, draftTests, publishedTests] = await Promise.all([
      this.testRepository.count({ where: { teacher: { id: teacherid } } }),
      this.testRepository.count({
        where: { teacher: { id: teacherid }, status: TestStatus.DRAFT },
      }),
      this.testRepository.count({
        where: { teacher: { id: teacherid }, status: TestStatus.PUBLISHED },
      }),
    ]);

    return {
      totalTests,
      draftTests,
      publishedTests,
      archivedTests: 0,
      openTests: 0,
      closedTests: 0,
      mixedTests: 0,
      totalQuestions: 0,
      averageQuestionsPerTest: 0,
      testsBySubject: {},
    };
  }

  async findBySubject(
    subjectid: number,
    teacherid: number,
  ): Promise<TestResponseDto[]> {
    const [subject, teacher] = await Promise.all([
      this.subjectRepository.findOne({
        where: { id: subjectid },
        relations: ['center'],
      }),
      this.teacherRepository.findOne({
        where: { id: teacherid },
        relations: ['center'],
      }),
    ]);

    if (!subject) {
      throw new NotFoundException('Fan topilmadi');
    }

    // Allow if subject belongs to teacher's center
    if (!teacher?.center || subject.center?.id !== teacher.center.id) {
      throw new ForbiddenException("Bu fanga ruxsatingiz yo'q");
    }

    const tests = await this.testRepository.find({
      where: { subject: { id: subjectid }, teacher: { id: teacherid } },
      relations: ['subject', 'teacher', 'questions'],
      order: { updatedAt: 'DESC' },
    });

    return tests.map((test) => this.mapToResponseDto(test));
  }

  async findBySubjectWithoutTeacher(subjectId: number): Promise<Test[]> {
    return this.testRepository.find({
      where: { subject: { id: subjectId } },
      relations: ['subject', 'teacher', 'questions'],
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(
    id: number,
    requesterId: number,
    requesterRole?: UserRole,
  ): Promise<TestResponseDto> {
    const test = await this.testRepository.findOne({
      where: { id },
      relations: ['subject', 'teacher', 'questions'],
    });

    if (!test) {
      throw new NotFoundException('Test topilmadi');
    }

    if (
      requesterRole !== UserRole.SUPERADMIN &&
      test.teacher.id !== requesterId
    ) {
      throw new ForbiddenException("Bu testga ruxsatingiz yo'q");
    }

    return this.mapToResponseDto(test);
  }

  async update(
    id: number,
    updateTestDto: UpdateTestDto,
    requesterId: number,
    requesterRole?: UserRole,
  ): Promise<TestResponseDto> {
    const test = await this.testRepository.findOne({
      where: { id },
      relations: ['subject', 'teacher', 'questions'],
    });

    if (!test) {
      throw new NotFoundException('Test topilmadi');
    }

    // Check if teacher owns this test (superadmin bypass)
    if (
      requesterRole !== UserRole.SUPERADMIN &&
      test.teacher.id !== requesterId
    ) {
      throw new ForbiddenException("Bu testga ruxsatingiz yo'q");
    }

    // If changing subject, verify access
    if (
      updateTestDto.subjectid &&
      updateTestDto.subjectid !== test.subject.id
    ) {
      const newSubject = await this.subjectRepository.findOne({
        where: { id: updateTestDto.subjectid },
        relations: ['teachers'],
      });

      if (!newSubject) {
        throw new NotFoundException('Yangi fan topilmadi');
      }

      const hasAccess = newSubject.teachers.some((t) => t.id === requesterId);
      if (requesterRole !== UserRole.SUPERADMIN && !hasAccess) {
        throw new ForbiddenException("Yangi fanga ruxsatingiz yo'q");
      }

      // Update subject tests count
      test.subject.testsCount = Math.max(0, (test.subject.testsCount || 1) - 1);
      await this.subjectRepository.save(test.subject);

      newSubject.testsCount = (newSubject.testsCount || 0) + 1;
      await this.subjectRepository.save(newSubject);

      test.subject = newSubject;
    }

    // Update test
    Object.assign(test, updateTestDto);
    const updatedTest = await this.testRepository.save(test);

    return this.mapToResponseDto(updatedTest);
  }

  async remove(
    id: number,
    requesterId: number,
    requesterRole?: UserRole,
  ): Promise<void> {
    const test = await this.testRepository.findOne({
      where: { id },
      relations: ['subject', 'teacher', 'questions'],
    });

    if (!test) {
      throw new NotFoundException('Test topilmadi');
    }

    // Check if teacher owns this test (superadmin bypass)
    if (
      requesterRole !== UserRole.SUPERADMIN &&
      test.teacher.id !== requesterId
    ) {
      throw new ForbiddenException("Bu testga ruxsatingiz yo'q");
    }

    // Update subject tests count
    test.subject.testsCount = Math.max(0, (test.subject.testsCount || 1) - 1);
    await this.subjectRepository.save(test.subject);

    await this.testRepository.remove(test);
  }

  async findWeeklyTests(options?: {
    teacherId?: number;
    centerId?: number;
  }): Promise<TestResponseDto[]> {
    const WEEKLY_TAG = 'WEEKLY_TEST';
    const qb = this.testRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.subject', 'subject')
      .leftJoinAndSelect('t.teacher', 'teacher')
      .leftJoinAndSelect('teacher.center', 'center')
      .leftJoinAndSelect('t.questions', 'questions')
      .where('t.description ILIKE :tag', { tag: `%${WEEKLY_TAG}%` })
      .orderBy('t.updatedAt', 'DESC');

    if (options?.teacherId !== undefined) {
      qb.andWhere('teacher.id = :teacherId', { teacherId: options.teacherId });
    }
    if (options?.centerId !== undefined) {
      qb.andWhere('center.id = :centerId', { centerId: options.centerId });
    }

    const tests = await qb.getMany();
    return tests.map((t) => this.mapToResponseDto(t));
  }

  // Add this new method to get all tests
  async findAll(): Promise<Test[]> {
    return this.testRepository.find({
      relations: ['subject', 'teacher', 'questions', 'questions.answers'],
      order: { updatedAt: 'DESC' },
    });
  }

  private mapToResponseDto(test: Test): TestResponseDto {
    return {
      id: test.id,
      title: test.title,
      description: test.description,
      type: test.type,
      status: test.status,
      duration: test.duration,
      totalQuestions: test.totalQuestions,
      totalPoints: test.totalPoints,
      shuffleQuestions: test.shuffleQuestions,
      showResults: test.showResults,
      subject: {
        id: test.subject.id,
        name: test.subject.name,
        category: test.subject.category,
        hasFormulas: test.subject.hasFormulas,
      },
      teacher: {
        id: test.teacher.id,
        fullName: test.teacher.fullName,
      },
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
    };
  }
}
