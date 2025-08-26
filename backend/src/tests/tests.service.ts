import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Test, TestStatus, TestType } from './entities/test.entity';
import { Subject } from '../subjects/entities/subject.entity';
import type { CreateTestDto } from './dto/create-test.dto';
import type { UpdateTestDto } from './dto/update-test.dto';
import type { TestResponseDto } from './dto/test-response.dto';
import type { TestStatsDto } from './dto/test-stats.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';

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
      relations: ['subjects'],
    });

    if (!teacher) {
      throw new NotFoundException("O'qituvchi topilmadi");
    }

    const subject = await this.subjectRepository.findOne({
      where: { id: createTestDto.subjectid },
      relations: ['teachers'],
    });

    if (!subject) {
      throw new NotFoundException('Fan topilmadi');
    }

    // Check if teacher has access to this subject
    const hasAccess = subject.teachers.some((t) => t.id === teacherid);
    if (!hasAccess) {
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

  async findBySubject(
    subjectid: number,
    teacherid: number,
  ): Promise<TestResponseDto[]> {
    const subject = await this.subjectRepository.findOne({
      where: { id: subjectid },
      relations: ['teachers'],
    });

    if (!subject) {
      throw new NotFoundException('Fan topilmadi');
    }

    // Check if teacher has access to this subject
    const hasAccess = subject.teachers.some((t) => t.id === teacherid);
    if (!hasAccess) {
      throw new ForbiddenException("Bu fanga ruxsatingiz yo'q");
    }

    const tests = await this.testRepository.find({
      where: { subject: { id: subjectid }, teacher: { id: teacherid } },
      relations: ['subject', 'teacher', 'questions'],
      order: { updatedAt: 'DESC' },
    });

    return tests.map((test) => this.mapToResponseDto(test));
  }

  async findOne(id: number, teacherid: number): Promise<TestResponseDto> {
    const test = await this.testRepository.findOne({
      where: { id },
      relations: ['subject', 'teacher', 'questions'],
    });

    if (!test) {
      throw new NotFoundException('Test topilmadi');
    }

    // Check if teacher owns this test
    if (test.teacher.id !== teacherid) {
      throw new ForbiddenException("Bu testga ruxsatingiz yo'q");
    }

    return this.mapToResponseDto(test);
  }

  async update(
    id: number,
    updateTestDto: UpdateTestDto,
    teacherid: number,
  ): Promise<TestResponseDto> {
    const test = await this.testRepository.findOne({
      where: { id },
      relations: ['subject', 'teacher', 'questions'],
    });

    if (!test) {
      throw new NotFoundException('Test topilmadi');
    }

    // Check if teacher owns this test
    if (test.teacher.id !== teacherid) {
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

      const hasAccess = newSubject.teachers.some((t) => t.id === teacherid);
      if (!hasAccess) {
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

  async remove(id: number, teacherid: number): Promise<void> {
    const test = await this.testRepository.findOne({
      where: { id },
      relations: ['subject', 'teacher', 'questions'],
    });

    if (!test) {
      throw new NotFoundException('Test topilmadi');
    }

    // Check if teacher owns this test
    if (test.teacher.id !== teacherid) {
      throw new ForbiddenException("Bu testga ruxsatingiz yo'q");
    }

    // Check if test can be deleted (only drafts can be deleted)
    if (test.status !== TestStatus.DRAFT) {
      throw new BadRequestException(
        "Faqat qoralama testlarni o'chirish mumkin",
      );
    }

    // Update subject tests count
    test.subject.testsCount = Math.max(0, (test.subject.testsCount || 1) - 1);
    await this.subjectRepository.save(test.subject);

    await this.testRepository.remove(test);
  }

  async duplicate(id: number, teacherid: number): Promise<TestResponseDto> {
    const originalTest = await this.testRepository.findOne({
      where: { id },
      relations: ['subject', 'teacher', 'questions'],
    });

    if (!originalTest) {
      throw new NotFoundException('Test topilmadi');
    }

    // Check if teacher owns this test
    if (originalTest.teacher.id !== teacherid) {
      throw new ForbiddenException("Bu testga ruxsatingiz yo'q");
    }

    // Create duplicate
    const duplicateTest = this.testRepository.create({
      title: `${originalTest.title} (nusxa)`,
      description: originalTest.description,
      type: originalTest.type,
      duration: originalTest.duration,
      shuffleQuestions: originalTest.shuffleQuestions,
      showResults: originalTest.showResults,
      teacher: originalTest.teacher,
      subject: originalTest.subject,
      status: TestStatus.DRAFT,
    });

    const savedTest = await this.testRepository.save(duplicateTest);

    // Update subject tests count
    originalTest.subject.testsCount =
      (originalTest.subject.testsCount || 0) + 1;
    await this.subjectRepository.save(originalTest.subject);

    return this.mapToResponseDto(savedTest);
  }

  async getTestStats(teacherid: number): Promise<TestStatsDto> {
    const tests = await this.testRepository.find({
      where: { teacher: { id: teacherid } },
      relations: ['subject', 'questions'],
    });

    const stats: TestStatsDto = {
      totalTests: tests.length,
      draftTests: tests.filter((t) => t.status === TestStatus.DRAFT).length,
      publishedTests: tests.filter((t) => t.status === TestStatus.PUBLISHED)
        .length,
      archivedTests: tests.filter((t) => t.status === TestStatus.ARCHIVED)
        .length,
      openTests: tests.filter((t) => t.type === TestType.OPEN).length,
      closedTests: tests.filter((t) => t.type === TestType.CLOSED).length,
      mixedTests: tests.filter((t) => t.type === TestType.MIXED).length,
      totalQuestions: tests.reduce(
        (sum, test) => sum + (test.questions?.length || 0),
        0,
      ),
      averageQuestionsPerTest:
        tests.length > 0
          ? Math.round(
              (tests.reduce(
                (sum, test) => sum + (test.questions?.length || 0),
                0,
              ) /
                tests.length) *
                100,
            ) / 100
          : 0,
      testsBySubject: {},
    };

    // Count tests by subject
    tests.forEach((test) => {
      const subjectName = test.subject.name;
      stats.testsBySubject[subjectName] =
        (stats.testsBySubject[subjectName] || 0) + 1;
    });

    return stats;
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
