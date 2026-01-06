import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, LessThanOrEqual, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import {
  ExamVariant,
  ExamVariantStatus,
} from '../exams/entities/exam-variant.entity';
import { AssignedTestVariant } from '../assigned-tests/entities/assigned-test.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { ExamsService } from '../exams/exams.service';
import {
  Attendance,
  AttendanceStatus,
} from '../attendance/entities/attendance.entity';

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
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    private examsService: ExamsService,
  ) {}

  private formatDateYYYYMMDD(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private async getStudentGroupsWithCounts(studentId: number) {
    const groups = await this.groupRepository
      .createQueryBuilder('g')
      .innerJoin('g.students', 's', 's.id = :studentId', { studentId })
      .loadRelationCountAndMap('g.studentsCount', 'g.students')
      .orderBy('g.id', 'DESC')
      .getMany();

    return groups.map((g: any) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      studentsCount: Number(g.studentsCount ?? 0),
    }));
  }

  async getMyGroups(studentId: number) {
    return this.getStudentGroupsWithCounts(studentId);
  }

  async getMyAttendance(
    studentId: number,
    query?: { groupId?: number; from?: string; to?: string },
  ) {
    // Default: last 30 days
    const today = new Date();
    const defaultFrom = new Date();
    defaultFrom.setDate(today.getDate() - 30);

    const from = (query?.from || this.formatDateYYYYMMDD(defaultFrom)).slice(
      0,
      10,
    );
    const to = (query?.to || this.formatDateYYYYMMDD(today)).slice(0, 10);

    const where: any = {
      student: { id: studentId },
    };

    if (query?.groupId) {
      where.group = { id: query.groupId };
    }

    if (from && to) {
      where.date = Between(from, to);
    } else if (from) {
      where.date = MoreThanOrEqual(from);
    } else if (to) {
      where.date = LessThanOrEqual(to);
    }

    const records = await this.attendanceRepository.find({
      where,
      order: { date: 'DESC', id: 'DESC' },
      take: 200,
    });

    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: records.length,
      from,
      to,
    };

    for (const r of records) {
      if (r.status === AttendanceStatus.PRESENT) summary.present += 1;
      else if (r.status === AttendanceStatus.ABSENT) summary.absent += 1;
      else if (r.status === AttendanceStatus.LATE) summary.late += 1;
      else if (r.status === AttendanceStatus.EXCUSED) summary.excused += 1;
    }

    return {
      summary,
      records: records.map((r) => ({
        id: r.id,
        date: r.date,
        status: r.status,
        notes: r.notes,
        arrivedAt: r.arrivedAt,
        leftAt: r.leftAt,
        group: r.group ? { id: r.group.id, name: r.group.name } : null,
        teacher: r.teacher
          ? { id: r.teacher.id, fullName: r.teacher.fullName }
          : null,
        createdAt: r.createdAt,
      })),
    };
  }

  async getDashboardData(studentId: number) {
    // Get student info
    const student = await this.userRepository.findOne({
      where: { id: studentId },
      relations: ['center'],
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get student's groups (strictly: only where student is enrolled)
    const groups = await this.getStudentGroupsWithCounts(studentId);

    // Get exam variants for the student
    const examVariants = await this.examVariantRepository.find({
      where: { student: { id: studentId } },
      relations: ['exam', 'exam.subjects'],
      order: { createdAt: 'DESC' },
    });

    // Get assigned test variants for the student
    const assignedTestVariants = await this.assignedTestVariantRepository.find({
      where: { student: { id: studentId } },
      relations: [
        'assignedTest',
        'assignedTest.baseTest',
        'assignedTest.baseTest.subject',
      ],
      order: { createdAt: 'DESC' },
    });

    // Calculate statistics
    const completedExams = examVariants.filter(
      (v) =>
        v.status === ExamVariantStatus.COMPLETED ||
        v.status === ExamVariantStatus.SUBMITTED,
    ).length;
    const completedTests = assignedTestVariants.filter(
      (v) => v.completedAt,
    ).length;
    const totalExams = examVariants.length;
    const totalTests = assignedTestVariants.length;

    // Calculate average score
    const allScores = [
      ...examVariants.filter((v) => v.score > 0).map((v) => v.score),
      ...assignedTestVariants
        .filter((v) => v.completedAt)
        .map((v) => Math.floor(Math.random() * 100)), // Mock scores for now
    ];
    const averageScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0;

    // Get upcoming exams (scheduled but not started)
    const upcomingExams = examVariants.filter(
      (v) =>
        v.status === ExamVariantStatus.GENERATED &&
        v.exam.status === 'scheduled',
    ).length;

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: student.fullName,
        username: student.username,
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
      groups,
    };
  }

  async getStudentExams(studentId: number) {
    const examVariants = await this.examVariantRepository.find({
      where: { student: { id: studentId } },
      relations: ['exam', 'exam.subjects', 'exam.teacher', 'questions'],
      order: { createdAt: 'DESC' },
    });

    return examVariants.map((variant) => ({
      id: variant.id,
      examId: variant.exam.id,
      examTitle: variant.exam.title,
      examDescription: variant.exam.description,
      variantNumber: variant.variantNumber,
      status: variant.status,
      subjects:
        variant.exam.subjects?.map((s) => s.name).join(', ') ||
        "Fan ko'rsatilmagan",
      teacher: variant.exam.teacher?.fullName || "O'qituvchi ko'rsatilmagan",
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
      relations: [
        'assignedTest',
        'assignedTest.baseTest',
        'assignedTest.baseTest.subject',
        'assignedTest.teacher',
        'assignedTest.group',
      ],
      order: { createdAt: 'DESC' },
    });

    return assignedTestVariants.map((variant) => ({
      id: variant.id,
      assignedTestId: variant.assignedTest.id,
      title: variant.assignedTest.title,
      variantNumber: variant.variantNumber,
      subject:
        variant.assignedTest.baseTest?.subject?.name || "Fan ko'rsatilmagan",
      teacher:
        variant.assignedTest.teacher?.fullName || "O'qituvchi ko'rsatilmagan",
      group: variant.assignedTest.group?.name || "Guruh ko'rsatilmagan",
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
      .filter((variant) => variant.score > 0)
      .map((variant) => ({
        id: variant.id,
        type: 'exam',
        title: variant.exam.title,
        subject:
          variant.exam.subjects?.map((s) => s.name).join(', ') ||
          "Fan ko'rsatilmagan",
        score: variant.score,
        maxScore: variant.totalPoints,
        percentage:
          variant.totalPoints > 0
            ? Math.round((variant.score / variant.totalPoints) * 100)
            : 0,
        date: variant.completedAt,
        status: variant.status,
      }));

    // Get assigned test grades (mock for now)
    const assignedTestVariants = await this.assignedTestVariantRepository.find({
      where: {
        student: { id: studentId },
      },
      relations: [
        'assignedTest',
        'assignedTest.baseTest',
        'assignedTest.baseTest.subject',
      ],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const assignedTestGrades = assignedTestVariants
      .filter((variant) => variant.completedAt)
      .map((variant) => ({
        id: variant.id,
        type: 'assigned_test',
        title: variant.assignedTest.title,
        subject:
          variant.assignedTest.baseTest?.subject?.name || "Fan ko'rsatilmagan",
        score: Math.floor(Math.random() * 100), // Mock score
        maxScore: 100,
        percentage: Math.floor(Math.random() * 100),
        date: variant.completedAt,
        status: 'completed',
      }));

    return [...examGrades, ...assignedTestGrades].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async getNotifications(studentId: number) {
    // Get real notifications from the notifications table
    const notifications = await this.notificationRepository.find({
      where: { user: { id: studentId } },
      order: { createdAt: 'DESC' },
      take: 10, // Return latest 10 notifications
    });

    return notifications.map((notification) => ({
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
      relations: [
        'assignedTest',
        'assignedTest.baseTest',
        'assignedTest.baseTest.subject',
      ],
    });

    // Collect unique subjects
    const subjectIds = new Set<number>();
    const subjectsMap = new Map<number, any>();

    examVariants.forEach((variant) => {
      variant.exam.subjects?.forEach((subject) => {
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

    assignedTestVariants.forEach((variant) => {
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
      canDownload:
        variant.status === ExamVariantStatus.GENERATED ||
        variant.status === ExamVariantStatus.STARTED,
    };
  }

  async downloadExamVariant(
    variantId: number,
    studentId: number,
  ): Promise<Buffer> {
    // First, verify that this variant belongs to the student
    const variant = await this.examVariantRepository.findOne({
      where: { id: variantId, student: { id: studentId } },
      relations: ['student', 'exam', 'exam.subjects', 'questions'],
    });

    console.log(
      'Download attempt - Variant:',
      variantId,
      'Student:',
      studentId,
    );
    console.log(
      'Found variant:',
      variant
        ? {
            id: variant.id,
            status: variant.status,
            examStatus: variant.exam?.status,
            studentId: variant.student?.id,
            hasExam: !!variant.exam,
            hasStudent: !!variant.student,
            questionsCount: variant.questions?.length || 0,
          }
        : 'Not found',
    );

    if (!variant) {
      throw new NotFoundException(
        'Exam variant not found or does not belong to you',
      );
    }

    // Check if required relations exist
    if (!variant.student) {
      console.error('Variant missing student relation:', variant.id);
      throw new InternalServerErrorException(
        'Variant data incomplete: missing student information',
      );
    }

    if (!variant.exam) {
      console.error('Variant missing exam relation:', variant.id);
      throw new InternalServerErrorException(
        'Variant data incomplete: missing exam information',
      );
    }

    // Students can download their variants if they are generated or already started
    // No need to check exam status - focus on variant availability
    if (
      variant.status !== ExamVariantStatus.GENERATED &&
      variant.status !== ExamVariantStatus.STARTED
    ) {
      console.log('Download rejected - Invalid status:', variant.status);
      throw new ForbiddenException(
        `Exam variant is not available for download. Current status: ${variant.status}`,
      );
    }

    console.log('Download approved - Updating status to STARTED');

    // Update variant status to 'started' when student downloads the exam for the first time
    if (variant.status === ExamVariantStatus.GENERATED) {
      await this.examVariantRepository.update(variantId, {
        status: ExamVariantStatus.STARTED,
        startedAt: new Date(),
      });
    }

    try {
      // Generate and return the PDF
      console.log('Generating PDF for variant:', variantId);
      const pdfBuffer = await this.examsService.generateVariantPDF(variantId);
      console.log('PDF generated successfully, size:', pdfBuffer.length);
      return pdfBuffer;
    } catch (error) {
      console.error('PDF generation failed for variant:', variantId, error);
      throw error;
    }
  }
}
