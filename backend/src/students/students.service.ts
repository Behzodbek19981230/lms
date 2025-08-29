import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { ExamVariant, ExamVariantStatus } from '../exams/entities/exam-variant.entity';
import { AssignedTestVariant } from '../assigned-tests/entities/assigned-test.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { ExamsService } from '../exams/exams.service';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(ExamVariant)
    private examVariantRepository: Repository<ExamVariant>,
    @InjectRepository(AssignedTestVariant)
    private assignedTestVariantRepository: Repository<AssignedTestVariant>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
    private examsService: ExamsService,
  ) {}

  async getDashboardData(studentId: number) {
    // Get student info
    const student = await this.userRepository.findOne({
      where: { id: studentId },
      relations: ['center'],
    });
    
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get student's groups
    const groups = await this.groupRepository.find({
      where: { students: { id: studentId } },
      relations: ['students'],
    });

    // Get exam variants for the student
    const examVariants = await this.examVariantRepository.find({
      where: { student: { id: studentId } },
      relations: ['exam', 'exam.subjects'],
      order: { createdAt: 'DESC' },
    });

    // Get assigned test variants for the student
    const assignedTestVariants = await this.assignedTestVariantRepository.find({
      where: { student: { id: studentId } },
      relations: ['assignedTest', 'assignedTest.baseTest', 'assignedTest.baseTest.subject'],
      order: { createdAt: 'DESC' },
    });

    // Calculate statistics
    const completedExams = examVariants.filter(v => v.status === 'completed' || v.status === 'submitted').length;
    const completedTests = assignedTestVariants.filter(v => v.completedAt).length;
    const totalExams = examVariants.length;
    const totalTests = assignedTestVariants.length;
    
    // Calculate average score
    const allScores = [
      ...examVariants.filter(v => v.score > 0).map(v => v.score),
      ...assignedTestVariants.filter(v => v.completedAt).map(v => Math.floor(Math.random() * 100)) // Mock scores for now
    ];
    const averageScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

    // Get upcoming exams (scheduled but not started)
    const upcomingExams = examVariants.filter(v => 
      v.status === 'generated' && 
      v.exam.status === 'scheduled'
    ).length;

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: student.fullName,
        email: student.email,
        center: student.center?.name || null,
      },
      stats: {
        enrolledCourses: groups.length,
        completedExams,
        totalExams,
        completedTests,
        totalTests,
        averageScore,
        upcomingExams,
        totalGroups: groups.length,
      },
      groups: groups.map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        studentsCount: group.students?.length || 0,
      })),
    };
  }

  async getStudentExams(studentId: number) {
    const examVariants = await this.examVariantRepository.find({
      where: { student: { id: studentId } },
      relations: ['exam', 'exam.subjects', 'exam.teacher', 'questions'],
      order: { createdAt: 'DESC' },
    });

    return examVariants.map(variant => ({
      id: variant.id,
      examId: variant.exam.id,
      examTitle: variant.exam.title,
      examDescription: variant.exam.description,
      variantNumber: variant.variantNumber,
      status: variant.status,
      subjects: variant.exam.subjects?.map(s => s.name).join(', ') || 'Fan ko\'rsatilmagan',
      teacher: variant.exam.teacher?.fullName || 'O\'qituvchi ko\'rsatilmagan',
      examDate: variant.exam.examDate,
      duration: variant.exam.duration,
      startedAt: variant.startedAt,
      completedAt: variant.completedAt,
      submittedAt: variant.submittedAt,
      score: variant.score,
      totalPoints: variant.totalPoints,
      correctAnswers: variant.correctAnswers,
      totalQuestions: variant.totalQuestions,
      questionsCount: variant.questions?.length || 0,
    }));
  }

  async getAssignedTests(studentId: number) {
    const assignedTestVariants = await this.assignedTestVariantRepository.find({
      where: { student: { id: studentId } },
      relations: ['assignedTest', 'assignedTest.baseTest', 'assignedTest.baseTest.subject', 'assignedTest.teacher', 'assignedTest.group'],
      order: { createdAt: 'DESC' },
    });

    return assignedTestVariants.map(variant => ({
      id: variant.id,
      assignedTestId: variant.assignedTest.id,
      title: variant.assignedTest.title,
      variantNumber: variant.variantNumber,
      subject: variant.assignedTest.baseTest?.subject?.name || 'Fan ko\'rsatilmagan',
      teacher: variant.assignedTest.teacher?.fullName || 'O\'qituvchi ko\'rsatilmagan',
      group: variant.assignedTest.group?.name || 'Guruh ko\'rsatilmagan',
      questionsCount: variant.assignedTest.numQuestions,
      completedAt: variant.completedAt,
      status: variant.completedAt ? 'completed' : 'pending',
      payload: variant.payload,
    }));
  }

  async getGrades(studentId: number) {
    // Get exam grades
    const examVariants = await this.examVariantRepository.find({
      where: { 
        student: { id: studentId },
      },
      relations: ['exam', 'exam.subjects'],
      order: { completedAt: 'DESC' },
      take: 10, // Last 10 grades
    });

    const examGrades = examVariants
      .filter(variant => variant.score > 0)
      .map(variant => ({
      id: variant.id,
      type: 'exam',
      title: variant.exam.title,
      subject: variant.exam.subjects?.map(s => s.name).join(', ') || 'Fan ko\'rsatilmagan',
      score: variant.score,
      maxScore: variant.totalPoints,
      percentage: variant.totalPoints > 0 ? Math.round((variant.score / variant.totalPoints) * 100) : 0,
      date: variant.completedAt,
      status: variant.status,
    }));

    // Get assigned test grades (mock for now)
    const assignedTestVariants = await this.assignedTestVariantRepository.find({
      where: { 
        student: { id: studentId },
      },
      relations: ['assignedTest', 'assignedTest.baseTest', 'assignedTest.baseTest.subject'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const assignedTestGrades = assignedTestVariants
      .filter(variant => variant.completedAt)
      .map(variant => ({
      id: variant.id,
      type: 'assigned_test',
      title: variant.assignedTest.title,
      subject: variant.assignedTest.baseTest?.subject?.name || 'Fan ko\'rsatilmagan',
      score: Math.floor(Math.random() * 100), // Mock score
      maxScore: 100,
      percentage: Math.floor(Math.random() * 100),
      date: variant.completedAt,
      status: 'completed',
    }));

    return [...examGrades, ...assignedTestGrades].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getNotifications(studentId: number) {
    // Get real notifications from the notifications table
    const notifications = await this.notificationRepository.find({
      where: { user: { id: studentId } },
      order: { createdAt: 'DESC' },
      take: 10, // Return latest 10 notifications
    });

    return notifications.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      date: notification.createdAt,
      isRead: notification.isRead,
      priority: notification.priority,
      metadata: notification.metadata,
    }));
  }

  async getSubjects(studentId: number) {
    // Get subjects through groups and exams
    const groups = await this.groupRepository.find({
      where: { students: { id: studentId } },
    });

    const examVariants = await this.examVariantRepository.find({
      where: { student: { id: studentId } },
      relations: ['exam', 'exam.subjects'],
    });

    const assignedTestVariants = await this.assignedTestVariantRepository.find({
      where: { student: { id: studentId } },
      relations: ['assignedTest', 'assignedTest.baseTest', 'assignedTest.baseTest.subject'],
    });

    // Collect unique subjects
    const subjectIds = new Set<number>();
    const subjectsMap = new Map<number, any>();

    examVariants.forEach(variant => {
      variant.exam.subjects?.forEach(subject => {
        if (!subjectIds.has(subject.id)) {
          subjectIds.add(subject.id);
          subjectsMap.set(subject.id, {
            id: subject.id,
            name: subject.name,
            description: subject.description,
            category: subject.category,
            hasFormulas: subject.hasFormulas,
            source: 'exam',
          });
        }
      });
    });

    assignedTestVariants.forEach(variant => {
      const subject = variant.assignedTest.baseTest?.subject;
      if (subject && !subjectIds.has(subject.id)) {
        subjectIds.add(subject.id);
        subjectsMap.set(subject.id, {
          id: subject.id,
          name: subject.name,
          description: subject.description,
          category: subject.category,
          hasFormulas: subject.hasFormulas,
          source: 'test',
        });
      }
    });

    return Array.from(subjectsMap.values());
  }

  async getExamVariantInfo(variantId: number, studentId: number) {
    const variant = await this.examVariantRepository.findOne({
      where: { id: variantId, student: { id: studentId } },
      relations: ['student', 'exam', 'exam.subjects'],
    });

    if (!variant) {
      return { error: 'Exam variant not found or does not belong to you' };
    }

    return {
      id: variant.id,
      variantNumber: variant.variantNumber,
      status: variant.status,
      examId: variant.exam.id,
      examTitle: variant.exam.title,
      examStatus: variant.exam.status,
      studentId: variant.student.id,
      studentName: variant.student.fullName,
      startedAt: variant.startedAt,
      completedAt: variant.completedAt,
      allowedStatuses: [ExamVariantStatus.GENERATED, ExamVariantStatus.STARTED],
      canDownload: variant.status === ExamVariantStatus.GENERATED || variant.status === ExamVariantStatus.STARTED
    };
  }

  async downloadExamVariant(variantId: number, studentId: number): Promise<Buffer> {
    // First, verify that this variant belongs to the student
    const variant = await this.examVariantRepository.findOne({
      where: { id: variantId, student: { id: studentId } },
      relations: ['student', 'exam', 'exam.subjects'],
    });

    console.log('Download attempt - Variant:', variantId, 'Student:', studentId);
    console.log('Found variant:', variant ? {
      id: variant.id,
      status: variant.status,
      examStatus: variant.exam.status,
      studentId: variant.student.id
    } : 'Not found');

    if (!variant) {
      throw new NotFoundException('Exam variant not found or does not belong to you');
    }

    // Students can download their variants if they are generated or already started
    // No need to check exam status - focus on variant availability
    if (variant.status !== ExamVariantStatus.GENERATED && variant.status !== ExamVariantStatus.STARTED) {
      console.log('Download rejected - Invalid status:', variant.status);
      throw new ForbiddenException(`Exam variant is not available for download. Current status: ${variant.status}`);
    }

    console.log('Download approved - Updating status to STARTED');
    
    // Update variant status to 'started' when student downloads the exam for the first time
    if (variant.status === ExamVariantStatus.GENERATED) {
      await this.examVariantRepository.update(variantId, {
        status: ExamVariantStatus.STARTED,
        startedAt: new Date(),
      });
    }

    // Generate and return the PDF
    return this.examsService.generateVariantPDF(variantId);
  }
}