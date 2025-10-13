import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';

import { Exam, ExamStatus, ExamType } from './entities/exam.entity';
import { ExamVariant, ExamVariantStatus } from './entities/exam-variant.entity';
import { ExamVariantQuestion } from './entities/exam-variant-question.entity';
import { Group } from '../groups/entities/group.entity';
import { UsersService } from '../users/users.service';
import { GroupsService } from '../groups/groups.service';
import { SubjectsService } from '../subjects/subjects.service';
import { TestsService } from '../tests/tests.service';
import { QuestionsService } from '../questions/questions.service';
import { User, UserRole } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
// import { TelegramService } from '../telegram/telegram.service';

import { Question, QuestionType } from '../questions/entities/question.entity';
import { LogsService } from 'src/logs/logs.service';
import * as katex from 'katex';

export interface CreateExamDto {
  title: string;
  description?: string;
  type: ExamType;
  examDate: Date;
  startTime?: Date;
  endTime?: Date;
  duration: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  variantsPerStudent: number;
  settings?: {
    allowCalculator?: boolean;
    allowNotes?: boolean;
    showTimer?: boolean;
    autoSubmit?: boolean;
  };
  groupIds: number[];
  subjectIds: number[];
  teacherId: number;
}

export interface GenerateVariantsDto {
  examId: number;
  questionsPerSubject?: number;
  randomizeQuestions?: boolean;
  randomizeAnswers?: boolean;
  sendPDFsToTelegram?: boolean;
}

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    @InjectRepository(ExamVariant)
    private examVariantRepository: Repository<ExamVariant>,
    @InjectRepository(ExamVariantQuestion)
    private examVariantQuestionRepository: Repository<ExamVariantQuestion>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    private usersService: UsersService,
    private groupsService: GroupsService,
    private subjectsService: SubjectsService,
    private testsService: TestsService,
    private questionsService: QuestionsService,
    private notificationsService: NotificationsService,
    // private telegramService: TelegramService,
    private readonly logsService: LogsService,
  ) {}

  /* -------------------------
       Basic exam CRUD & helpers
       ------------------------- */

  async createExam(createExamDto: CreateExamDto): Promise<Exam> {
    const teacher = await this.usersService.findById(createExamDto.teacherId);
    if (!teacher || teacher.role !== UserRole.TEACHER) {
      throw new BadRequestException('Invalid teacher');
    }

    const groups = await this.groupsService.findByIds(createExamDto.groupIds);
    const subjects = await this.subjectsService.findByIds(
      createExamDto.subjectIds,
    );

    // Compute unique students count
    const uniqueStudentIds = Array.from(
      new Set(
        (groups || []).flatMap((g) => (g.students || []).map((s) => s.id)),
      ),
    );

    const exam = this.examRepository.create({
      ...createExamDto,
      teacher,
      groups,
      subjects,
      status: ExamStatus.DRAFT,
      totalStudents: uniqueStudentIds.length,
    });

    return this.examRepository.save(exam);
  }

  async findAllByTeacher(teacherId: number): Promise<Exam[]> {
    return this.examRepository.find({
      where: { teacher: { id: teacherId } },
      relations: ['groups', 'subjects', 'variants'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<Exam> {
    const exam = await this.examRepository.findOne({
      where: { id },
      relations: [
        'groups',
        'groups.students',
        'subjects',
        'variants',
        'variants.student',
      ],
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async updateExamStatus(examId: number, status: ExamStatus): Promise<Exam> {
    const exam = await this.findById(examId);
    exam.status = status;
    return this.examRepository.save(exam);
  }

  async deleteExam(examId: number): Promise<void> {
    const exam = await this.findById(examId);
    if (exam.status !== ExamStatus.DRAFT) {
      throw new BadRequestException('Can only delete draft exams');
    }

    // Defensive cleanup to avoid FK issues in join tables or child rows
    // 1) Delete variants first (questions will cascade via onDelete: CASCADE)
    await this.examVariantRepository
      .createQueryBuilder()
      .delete()
      .where('examId = :examId', { examId })
      .execute();

    // 2) Clear ManyToMany join tables explicitly (exam_groups, exam_subjects)
    try {
      await this.examRepository.query(
        'DELETE FROM exam_groups WHERE "examId" = $1',
        [examId],
      );
    } catch (e) {
      this.logger.warn(
        `Failed to clear exam_groups for exam ${examId}: ${e?.message || e}`,
      );
    }
    try {
      await this.examRepository.query(
        'DELETE FROM exam_subjects WHERE "examId" = $1',
        [examId],
      );
    } catch (e) {
      this.logger.warn(
        `Failed to clear exam_subjects for exam ${examId}: ${e?.message || e}`,
      );
    }

    // 3) Finally remove the exam
    await this.examRepository.delete(examId);
  }

  /* --------------------------------
       Variant generation & questions
       -------------------------------- */

  async generateVariants(
    generateVariantsDto: GenerateVariantsDto,
  ): Promise<ExamVariant[]> {
    const exam = await this.findById(generateVariantsDto.examId);

    if (exam.status !== ExamStatus.DRAFT) {
      throw new BadRequestException(
        'Can only generate variants for draft exams',
      );
    }

    // Collect all students from groups
    const allStudents: User[] = [];
    for (const group of exam.groups) {
      const groupWithStudents = await this.groupsService.findById(group.id);
      allStudents.push(...(groupWithStudents.students || []));
    }

    // Unique students
    const uniqueStudents = allStudents.filter(
      (student, idx, self) =>
        idx === self.findIndex((s) => s.id === student.id),
    );

    const variants: ExamVariant[] = [];

    for (const student of uniqueStudents) {
      for (let i = 0; i < exam.variantsPerStudent; i++) {
        const variantNumber = this.generateVariantNumber(
          exam.id,
          student.id,
          i + 1,
        );

        const variant = this.examVariantRepository.create({
          variantNumber,
          exam,
          student,
          status: ExamVariantStatus.GENERATED,
        });

        const savedVariant = await this.examVariantRepository.save(variant);
        variants.push(savedVariant);

        // Generate questions for saved variant
        await this.generateVariantQuestions(
          savedVariant,
          exam,
          generateVariantsDto.questionsPerSubject ?? 10,
          generateVariantsDto.randomizeQuestions ?? true,
          generateVariantsDto.randomizeAnswers ?? true,
        );
      }
    }

    // Update exam statistics
    await this.updateExamStatistics(exam.id);

    // Create notifications for all students
    const studentIds = uniqueStudents.map((student) => student.id);
    try {
      await this.notificationsService.createExamNotification(
        exam.id,
        exam.title,
        studentIds,
      );
    } catch (error) {
      void this.logsService.log(
        `Notification creation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't fail the variant generation if notification fails
    }

    // PDF sending deprecated: no background PDF generation/sending

    return variants;
  }

  private async generateVariantQuestions(
    variant: ExamVariant,
    exam: Exam,
    questionsPerSubject: number,
    randomizeQuestions: boolean,
    randomizeAnswers: boolean,
  ): Promise<void> {
    type Answer = {
      id: number;
      text: string;
      isCorrect: boolean;
      hasFormula?: boolean;
    };
    const variantQuestions: ExamVariantQuestion[] = [];
    let questionOrder = 1;

    for (const subject of exam.subjects) {
      // Get tests for subject
      const tests = await this.testsService.findBySubjectWithoutTeacher(
        subject.id,
      );

      // Aggregate all questions
      const allQuestions: Question[] = [];
      for (const test of tests) {
        const testQuestions = await this.questionsService.findByTest(test.id);
        allQuestions.push(...testQuestions);
      }

      // Optionally shuffle
      const questionsPool = randomizeQuestions
        ? this.shuffleArray(allQuestions)
        : allQuestions;

      // Select required amount
      const selectedQuestions = questionsPool.slice(0, questionsPerSubject);

      for (const question of selectedQuestions) {
        // Get answers
        const answers = (await this.questionsService.getQuestionAnswers(
          question.id,
        )) as Answer[];

        // Shuffle answers if requested (and not essay/short)
        let shuffledAnswers: Answer[] = [...answers];
        if (
          randomizeAnswers &&
          question.type !== QuestionType.ESSAY &&
          question.type !== QuestionType.SHORT_ANSWER
        ) {
          shuffledAnswers = this.shuffleArray(answers);
        }

        // Determine correct answer index
        const correctAnswer = answers.find((a) => a.isCorrect);
        const correctAnswerIndex = shuffledAnswers.findIndex(
          (a) => a.id === correctAnswer?.id,
        );

        const variantQuestion = this.examVariantQuestionRepository.create({
          questionText: question.text,
          type: question.type,
          points: question.points ?? 1,
          order: questionOrder++,
          hasFormula: question.hasFormula,
          imageBase64: question.imageBase64,
          explanation: question.explanation,
          answers: shuffledAnswers.map((answer, index) => ({
            id: answer.id,
            text: answer.text,
            isCorrect: answer.isCorrect,
            order: index,
            hasFormula: answer.hasFormula,
          })),
          correctAnswerIndex: correctAnswerIndex >= 0 ? correctAnswerIndex : -1,
          shuffledOrder: shuffledAnswers.map((_, index) => index),
          variant,
          originalQuestion: question,
          subjectName: subject.name,
          subjectId: subject.id,
        });

        variantQuestions.push(variantQuestion);
      }
    }

    // Bulk save
    if (variantQuestions.length) {
      await this.examVariantQuestionRepository.save(variantQuestions);
    }

    await this.updateVariantTotals(variant.id);
  }

  private async updateVariantTotals(variantId: number) {
    const variant = await this.examVariantRepository.findOne({
      where: { id: variantId },
      relations: ['questions'],
    });
    if (!variant) return;
    const totalPoints = (variant.questions || []).reduce(
      (s, q) => s + (q.points ?? 1),
      0,
    );
    await this.examVariantRepository.update(variantId, { totalPoints });
  }

  private generateVariantNumber(
    examId: number,
    studentId: number,
    variantIndex: number,
  ): string {
    const year = new Date().getFullYear();
    return `${year}-${String(examId).padStart(3, '0')}-${String(studentId).padStart(3, '0')}-${String(variantIndex).padStart(2, '0')}`;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // PDF background send removed

  private async updateExamStatistics(examId: number): Promise<void> {
    // Removed redundant exam load
    const variants = await this.examVariantRepository.find({
      where: { exam: { id: examId } },
      relations: ['questions'],
    });

    const totalStudents = Array.from(
      new Set(
        (variants || [])
          .map((v) => (v.student ? v.student.id : undefined))
          .filter((id): id is number => typeof id === 'number'),
      ),
    ).length;
    const completedStudents = variants.filter(
      (v) => v.status === ExamVariantStatus.COMPLETED,
    ).length;
    const totalQuestions = variants.reduce(
      (sum, v) => sum + (v.questions || []).length,
      0,
    );
    const totalPoints = variants.reduce(
      (sum, v) => sum + (v.totalPoints || 0),
      0,
    );

    await this.examRepository.update(examId, {
      totalStudents,
      completedStudents,
      totalQuestions,
      totalPoints,
    });
  }

  async getExamVariants(examId: number): Promise<ExamVariant[]> {
    const variants = await this.examVariantRepository.find({
      where: { exam: { id: examId } },
      relations: ['student', 'questions'],
      order: { variantNumber: 'ASC' },
    });

    for (const variant of variants) {
      if (!variant.questions || variant.questions.length === 0) {
        void this.logsService.warn(
          `Loading questions separately for variant ${variant.id} in getExamVariants`,
        );
        const questions = await this.examVariantQuestionRepository.find({
          where: { variant: { id: variant.id } },
          order: { order: 'ASC' },
        });
        variant.questions = questions;
      }
    }

    return variants;
  }

  private renderHtmlToPdf(): Promise<Buffer> {
    return Promise.reject(new BadRequestException('PDF generation disabled'));
  }

  private renderHtmlToPdfWithPDFKit(): Promise<Buffer> {
    return Promise.reject(new BadRequestException('PDF generation disabled'));
  }

  private wrapHtml(inner: string, title: string): string {
    return `<!DOCTYPE html>
      <html lang="uz">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: Times, 'Times New Roman', serif; margin: 0; padding: 0; color: #111; }
          .page { page-break-after: always; padding: 0 6mm; }
          .question-page { page-break-after: always; padding: 0 6mm; }
          .header { text-align: center; margin-bottom: 12px; }
          .title { font-size: 20px; font-weight: 700; margin: 0 0 6px 0; }
          .subtitle { font-size: 12px; margin: 2px 0; color: #333; }
          .meta { font-size: 10px; color: #666; }
          .questions-container { column-count: 2; column-gap: 16px; column-rule: 1px solid #ddd; background-image: linear-gradient(to bottom, #ddd, #ddd); background-size: 1px 100%; background-position: 50% 0; background-repeat: no-repeat; }
          .question { 
            margin: 10px 0 14px 0; 
            break-inside: avoid;
            break-inside: avoid-column;
            -webkit-column-break-inside: avoid;
            -moz-column-break-inside: avoid;
          }
          .q-row { display: flex; align-items: flex-start; gap: 8px; }
          .q-no { color: #cc5000; font-weight: 600; min-width: 20px; flex-shrink: 0; }
          .q-content { flex: 1; }
          .q-text { margin-bottom: 6px; }
          .points { color: #666; font-size: 10px; font-weight: 500; align-self: flex-start; flex-shrink: 0; margin-left: 8px; }
          .answers { margin-top: 6px; padding-left: 0; }
          .answer { margin: 2px 0; }
          .image-container { margin: 8px 0; }
          .answer-image-container { margin: 4px 0 4px 20px; display: inline-block; }
          .answer-image { 
            max-width: 200px; 
            height: auto; 
            max-height: 150px; 
            border: 1px solid #ddd; 
            border-radius: 4px; 
            margin: 2px 0; 
            break-inside: avoid;
            display: inline-block;
            vertical-align: middle;
          }
          .katex-display { margin: 6px 0; }
          img.q-image { 
            max-width: 100%; 
            height: auto; 
            max-height: 300px; 
            border: 1px solid #ddd; 
            border-radius: 4px; 
            margin: 6px 0; 
            break-inside: avoid;
            display: block;
          }
          /* Override styles for images with custom dimensions */
          img[style*="width"], img[style*="height"] {
            max-width: none !important;
            max-height: none !important;
          }
          .key-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
          .key-table th, .key-table td { border: 1px solid #ccc; padding: 6px 8px; text-align: center; }
          .key-table th { background: #f7f7f7; }
          /* Title page styles */
          .title-page { page-break-after: always; padding: 20px; text-align: center; }
          .title-page h1 { font-size: 24px; margin: 30px 0; color: #333; }
          .title-page h2 { font-size: 18px; margin: 20px 0; color: #666; }
          .title-page .info { margin: 15px 0; font-size: 14px; }
          .title-page .instructions { text-align: left; margin: 40px auto; max-width: 500px; }
          .title-page .instructions h3 { color: #333; margin-bottom: 15px; }
          .title-page .instructions ul { padding-left: 20px; }
          .title-page .instructions li { margin: 8px 0; }
          .student-info { margin: 40px auto; max-width: 400px; text-align: left; }
          .student-info .field { margin: 20px 0; border-bottom: 1px solid #333; padding-bottom: 5px; }
          @media screen and (max-width: 900px) { .questions-container { column-count: 1; background: none; } }
        </style>
      </head>
      <body>
        ${inner}
      </body>
      </html>`;
  }

  private wrapHtmlForBrowser(inner: string, title: string): string {
    return `<!DOCTYPE html>
      <html lang="uz">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: Times, 'Times New Roman', serif; margin: 0; padding: 0; color: #111; }
          .toolbar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #eee; padding: 8px 12px; display:flex; gap:8px; align-items:center; z-index: 10; }
          .toolbar button { padding: 6px 10px; font-size: 14px; }
          .page { page-break-after: always; padding: 0 6mm; }
          .header { text-align: center; margin-bottom: 12px; }
          .title { font-size: 20px; font-weight: 700; margin: 0 0 6px 0; }
          .subtitle { font-size: 12px; margin: 2px 0; color: #333; }
          .meta { font-size: 10px; color: #666; }
          .questions-container { column-count: 2; column-gap: 16px; column-rule: 1px solid #ddd; background-image: linear-gradient(to bottom, #ddd, #ddd); background-size: 1px 100%; background-position: 50% 0; background-repeat: no-repeat; }
          .question { 
            margin: 10px 0 14px 0; 
            break-inside: avoid;
            break-inside: avoid-column;
            -webkit-column-break-inside: avoid;
            -moz-column-break-inside: avoid;
          }
          .q-row { display: flex; align-items: flex-start; gap: 8px; }
          .q-no { color: #cc5000; font-weight: 600; min-width: 20px; flex-shrink: 0; }
          .q-content { flex: 1; }
          .q-text { margin-bottom: 6px; }
          .points { color: #666; font-size: 10px; font-weight: 500; align-self: flex-start; flex-shrink: 0; margin-left: 8px; }
          .answers { margin-top: 6px; padding-left: 0; }
          .answer { margin: 2px 0; }
          .image-container { margin: 8px 0; }
          .answer-image-container { margin: 4px 0 4px 20px; display: inline-block; }
          .answer-image { max-width: 200px; height: auto; max-height: 150px; border: 1px solid #ddd; border-radius: 4px; margin: 2px 0; break-inside: avoid; display: inline-block; vertical-align: middle; }
          .katex-display { margin: 6px 0; }
          img.q-image { max-width: 100%; height: auto; max-height: 300px; border: 1px solid #ddd; border-radius: 4px; margin: 6px 0; break-inside: avoid; display: block; }
          img[style*="width"], img[style*="height"] { max-width: none !important; max-height: none !important; }
          .key-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
          .key-table th, .key-table td { border: 1px solid #ccc; padding: 6px 8px; text-align: center; }
          .key-table th { background: #f7f7f7; }
          @media print { .toolbar { display: none; } }
          @media screen and (max-width: 900px) { .questions-container { column-count: 1; background: none; } }
        </style>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
      </head>
      <body>
        <div class="toolbar">
          <button onclick="window.print()">PDFga chop etish</button>
          <span style="color:#666; font-size:13px;">Chop etish oynasida "Save as PDF"ni tanlang.</span>
        </div>
        ${inner}
        <script>
          window.addEventListener('DOMContentLoaded', function() {
            if (window.renderMathInElement) {
              try {
                window.renderMathInElement(document.body, {
                  delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                  ],
                  throwOnError: false
                });
              } catch (e) {
                console.warn('KaTeX render error', e);
              }
            }
          });
        </script>
      </body>
      </html>`;
  }

  async generateVariantHTML(variantId: number): Promise<string> {
    const variant = await this.examVariantRepository.findOne({
      where: { id: variantId },
      relations: ['student', 'exam', 'exam.subjects', 'questions'],
    });
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const questions = await this.examVariantQuestionRepository.find({
      where: { variant: { id: variantId } },
      order: { order: 'ASC' },
    });
    variant.questions = questions;

    const studentGroups = variant.student
      ? await this.groupRepository.find({
          where: { students: { id: variant.student.id } },
          relations: ['students'],
        })
      : [];

    const titlePageHtml = this.generateExamTitlePage(
      {
        exam: variant.exam,
        student: variant.student,
        questions: variant.questions,
        variantNumber: variant.variantNumber,
      },
      false,
      studentGroups.map((g) => ({ name: g.name })),
    );
    const inner = this.buildVariantPage(
      { ...variant, exam: variant.exam },
      false,
    );
    const combinedContent = titlePageHtml + inner;
    const pageTitle = `${variant.exam?.title || 'Imtihon'} — Variant ${variant.variantNumber}`;
    return this.renderWithLayout(combinedContent, pageTitle);
  }

  async generateVariantPrintableFile(
    variantId: number,
  ): Promise<{ url: string; fileName: string; absolutePath: string }> {
    // Load variant metadata and reuse existing HTML if available
    const variant = await this.examVariantRepository.findOne({
      where: { id: variantId },
      relations: ['exam', 'student'],
    });
    if (!variant) throw new NotFoundException('Variant not found');

    // If already generated and file exists, return it
    if (variant.printHtmlPath) {
      const existingFile = variant.printHtmlPath.split('/').pop() || '';
      const existingPath = join(this.getPublicDir(), existingFile);
      try {
        await fs.access(existingPath);
        return {
          url: variant.printHtmlPath,
          fileName: existingFile || `variant-${variantId}.html`,
          absolutePath: existingPath,
        };
      } catch {
        // file missing → regenerate below
      }
    }

    // Build fresh HTML
    const html = await this.generateVariantHTML(variantId);

    // Ensure public dir exists
    const publicDir = this.getPublicDir();
    await fs.mkdir(publicDir, { recursive: true });

    // Safe slug helper
    const slug = (s: string) =>
      (s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 80);

    const examSlug = slug(variant.exam?.title || 'exam');
    const varSlug = slug(variant.variantNumber || String(variantId));
    const stuSlug = slug(
      `${variant.student?.firstName || ''}-${variant.student?.lastName || ''}`,
    );
    const timestamp = Date.now();
    const fileName = `${examSlug}-variant-${varSlug}${stuSlug ? '-' + stuSlug : ''}-${timestamp}.html`;
    const absolutePath = join(publicDir, fileName);

    await fs.writeFile(absolutePath, html, 'utf8');

    // Public URL via static assets (configured in main.ts)
    const url = `/print/${fileName}`;

    // Persist path for reuse
    await this.examVariantRepository.update(variantId, { printHtmlPath: url });

    return { url, fileName, absolutePath };
  }

  private getImageSrc(imageBase64?: string, mime?: string): string | null {
    if (!imageBase64) return null;

    try {
      // Clean the base64 string - remove any whitespace or newlines
      const cleanBase64 = imageBase64.replace(/\s+/g, '');

      // If base64 contains data:image prefix, normalize and return it
      if (/^data:image\/[a-zA-Z]+;base64,/.test(cleanBase64)) {
        return this.normalizeDataUri(cleanBase64);
      }

      // If it starts with just base64 data, add proper data URI prefix
      if (this.isValidBase64(cleanBase64)) {
        // Determine MIME type
        const safeMime =
          mime || this.detectImageMimeType(cleanBase64) || 'image/png';
        return `data:${safeMime};base64,${cleanBase64}`;
      }

      return null;
    } catch (error) {
      void this.logsService.warn(
        `Error processing image data: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  // Resolve the public directory depending on runtime (dist vs ts-node)
  private getPublicDir(): string {
    return join(__dirname, '..', '..', 'public');
  }

  // Render given content inside shared layout template (src/shared/main.html compiled to dist/src/shared/main.html)
  private async renderWithLayout(
    contentHtml: string,
    pageTitle: string,
    extraHead = '',
  ): Promise<string> {
    try {
      const layoutPath = join(__dirname, '..', 'shared', 'main.html');
      const layoutHtml = await fs.readFile(layoutPath, 'utf8');
      const defaultExtraHead = `
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <style>
          .questions-container { column-count: 2; column-gap: 16px; column-rule: 1px solid #ddd; background-image: linear-gradient(to bottom, #ddd, #ddd); background-size: 1px 100%; background-position: 50% 0; background-repeat: no-repeat; }
          .question { margin: 10px 0 14px 0; break-inside: avoid; break-inside: avoid-column; -webkit-column-break-inside: avoid; -moz-column-break-inside: avoid; }
          @media screen and (max-width: 900px) { .questions-container { column-count: 1; background: none; } }
        </style>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
        <script>
          window.addEventListener('DOMContentLoaded', function() {
            if (window.renderMathInElement) {
              try {
                window.renderMathInElement(document.body, {
                  delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                  ],
                  throwOnError: false
                });
              } catch (e) {
                console.warn('KaTeX render error', e);
              }
            }
          });
        </script>`;
      return layoutHtml
        .replace('{{PAGE_TITLE}}', escapeHtml(pageTitle))
        .replace('{{EXTRA_HEAD}}', `${defaultExtraHead}\n${extraHead || ''}`)
        .replace('{{CONTENT}}', contentHtml);
    } catch {
      // Fallback to previous inline wrapper if layout missing
      return this.wrapHtmlForBrowser(contentHtml, pageTitle);
    }
  }

  private isValidBase64(str: string): boolean {
    // Basic check for base64 string
    if (!str || str.length < 4) return false;

    // Check if string contains only valid base64 characters
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) return false;

    // Check if length is valid (must be multiple of 4 when padded)
    const paddedLength = str.length + ((4 - (str.length % 4)) % 4);
    if (paddedLength % 4 !== 0) return false;

    try {
      // Additional validation: try to decode and re-encode
      const decoded = atob(str);
      const reencoded = btoa(decoded);
      // Allow for padding differences
      return str.replace(/=+$/, '') === reencoded.replace(/=+$/, '');
    } catch {
      return false;
    }
  }

  private extractImageFromText(text: string): {
    cleanedText: string;
    imageDataUri: string | null;
    imageStyles?: string;
  } {
    if (!text) return { cleanedText: '', imageDataUri: null };

    let cleanedText = text;
    let imageDataUri: string | null = null;
    let imageStyles: string | undefined;

    // Look for markdown images with size specifications: ![alt|styles](src)
    // This regex now handles multi-line base64 data and potential trailing text
    const markdownImageWithSizePattern =
      /!\[[^\]]*\|([^\]]+)\]\((data:image\/[^\s)]+[^)]*)\)/gs;
    const sizeMatches = [...text.matchAll(markdownImageWithSizePattern)];

    for (const match of sizeMatches) {
      const styles = match[1];
      let imageSrc = match[2];

      // Clean up the image source - extract only the data URI part
      imageSrc = this.extractDataUriFromText(imageSrc);

      // If we find a data URI image and don't have one yet, use it
      if (imageSrc && imageSrc.startsWith('data:image/') && !imageDataUri) {
        // Ensure the base64 data is properly formatted
        imageDataUri = this.normalizeDataUri(imageSrc);
        // Parse and clean up the styles
        imageStyles = this.parseImageStyles(styles);
      }

      // Remove the markdown image from text
      cleanedText = cleanedText.replace(match[0], '');
    }

    // Look for regular markdown images without size: ![alt](src)
    if (!imageDataUri) {
      const markdownImagePattern =
        /!\[[^\]]*\]\((data:image\/[^\s)]+[^)]*)\)/gs;
      const matches = [...text.matchAll(markdownImagePattern)];

      for (const match of matches) {
        let imageSrc = match[1];

        // Clean up the image source
        imageSrc = this.extractDataUriFromText(imageSrc);

        // If we find a data URI image and don't have one yet, use it
        if (imageSrc && imageSrc.startsWith('data:image/') && !imageDataUri) {
          imageDataUri = this.normalizeDataUri(imageSrc);
        }

        // Remove the markdown image from text
        cleanedText = cleanedText.replace(match[0], '');
      }
    }

    // Also remove any remaining markdown image references
    cleanedText = cleanedText.replace(/!\[[^\]]*\]/g, '');

    // Clean up extra whitespace
    cleanedText = cleanedText.trim();

    return { cleanedText, imageDataUri, imageStyles };
  }

  private extractDataUriFromText(text: string): string {
    if (!text) return '';

    // Remove all whitespace and newlines
    const cleaned = text.replace(/\s+/g, '');

    // Find the data URI part - it should start with "data:image/" and contain base64 data
    const dataUriMatch = cleaned.match(
      /(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/i,
    );

    if (dataUriMatch) {
      return dataUriMatch[1];
    }

    // If no proper data URI found, return the cleaned text (might still be processable)
    return cleaned;
  }

  private parseImageStyles(styleString: string): string {
    if (!styleString) return '';

    // Parse styles like "width: 120px; height: 120px"
    const styles = styleString
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join('; ');

    return styles;
  }

  private normalizeDataUri(dataUri: string): string | null {
    if (!dataUri || !dataUri.startsWith('data:image/')) {
      return null;
    }

    try {
      // Extract the MIME type and base64 data
      const [header, base64Data] = dataUri.split(',');
      if (!header || !base64Data) {
        void this.logsService.warn(
          'Invalid data URI format: missing header or base64 data',
        );
        return null;
      }

      // Clean the base64 data - remove all whitespace, newlines, and any trailing text
      let cleanBase64 = base64Data.replace(/\s+/g, '');

      // Remove any non-base64 characters that might be trailing (like text after the image)
      cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, '');

      // Ensure proper base64 padding
      const paddingNeeded = (4 - (cleanBase64.length % 4)) % 4;
      if (paddingNeeded > 0) {
        cleanBase64 += '='.repeat(paddingNeeded);
      }

      // Validate the base64 data
      if (!this.isValidBase64(cleanBase64)) {
        void this.logsService.warn('Invalid base64 data detected');
        return null;
      }

      // Check minimum size for a valid image (at least 50 bytes when decoded)
      try {
        const decoded = atob(cleanBase64);
        if (decoded.length < 50) {
          void this.logsService.warn(
            'Base64 data too small to be a valid image',
          );
          return null;
        }
      } catch (error) {
        const err = error as Error;
        void this.logsService.warn(
          `Failed to decode base64 data: ${err.message}`,
        );
        return null;
      }

      // Reconstruct the data URI with clean base64
      return `${header},${cleanBase64}`;
    } catch (error) {
      const err = error as Error;
      void this.logsService.warn(
        `Failed to normalize data URI: ${err.message}`,
      );
      return null;
    }
  }

  private detectImageMimeType(base64: string): string | null {
    // Check magic numbers in base64 to detect image type
    if (base64.startsWith('/9j/')) return 'image/jpeg';
    if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
    if (base64.startsWith('R0lGODlh') || base64.startsWith('R0lGODdh'))
      return 'image/gif';
    if (base64.startsWith('UklGR')) return 'image/webp';
    return null;
  }

  private buildVariantPage(
    variant: ExamVariant & { exam?: Exam },
    withAnswerKey = false,
  ): string {
    const exam = variant.exam;

    // Ensure we have basic data
    if (!exam) {
      void this.logsService.error('No exam data found for variant');
      return '<div class="page"><div class="header"><div class="title">Error: Exam data not found</div></div></div>';
    }

    const header = `
        <div class="header">
          <div class="title">${escapeHtml(exam?.title || 'Untitled Exam')}</div>
          <div class="subtitle">Variant: ${escapeHtml(variant.variantNumber || 'N/A')}</div>
          <div class="subtitle">O'quvchi: ${escapeHtml(variant.student?.firstName || '')} ${escapeHtml(variant.student?.lastName || '')}</div>
          <div class="meta">Sana: ${new Date().toLocaleDateString('uz-UZ')}</div>
        </div>
      `;

    const questionsCount = variant.questions?.length ?? 0;
    void this.logsService.log(
      `Building variant page with ${questionsCount} questions`,
    );

    if (questionsCount === 0) {
      const noQuestionsHtml = `
        <div class="page">
          ${header}
          <div class="questions-container">
            <div style="text-align: center; margin: 50px 0; color: #666;">
              <p>Bu variantda savollar topilmadi.</p>
            </div>
          </div>
        </div>
      `;
      return noQuestionsHtml;
    }

    const questionsHtml = (variant.questions || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((q: ExamVariantQuestion, idx: number) => {
        const answers = Array.isArray(q.answers) ? q.answers : [];
        const points = typeof q.points === 'number' ? q.points : 1;

        // First try to get image from imageBase64 field
        let imageDataUri = this.getImageSrc(q.imageBase64);
        let imageStyles = '';

        // If no image in imageBase64 field, extract from text
        let questionText: string =
          typeof q.questionText === 'string' ? q.questionText : '';
        if (!imageDataUri) {
          const textProcessResult = this.extractImageFromText(questionText);
          questionText = textProcessResult.cleanedText;
          imageDataUri = textProcessResult.imageDataUri;
          imageStyles = textProcessResult.imageStyles || '';
        } else {
          // Still clean the text even if we have imageBase64
          const textProcessResult = this.extractImageFromText(questionText);
          questionText = textProcessResult.cleanedText;
        }

        const imgHtml = imageDataUri
          ? `<div class="image-container"><img class="q-image" src="${imageDataUri}" alt="Savol rasmi" style="${imageStyles}" /></div>`
          : '';

        // Log image processing results for debugging
        if (
          q.imageBase64 ||
          (questionText && questionText.includes('data:image/'))
        ) {
          void this.logsService.log(
            `Question ${idx + 1}: Found image - imageBase64 field: ${!!q.imageBase64}, extracted from text: ${!!imageDataUri}, final URI length: ${imageDataUri?.length || 0}`,
          );
        }

        const answersHtml = answers.length
          ? `<div class="answers">${answers
              .map((a, i: number) => {
                // Process answer text for images
                const answerProcessResult = this.extractImageFromText(
                  a.text || '',
                );
                const cleanAnswerText = answerProcessResult.cleanedText;
                const answerImageDataUri = answerProcessResult.imageDataUri;
                const answerImageStyles = answerProcessResult.imageStyles || '';

                const answerImgHtml = answerImageDataUri
                  ? `<div class="answer-image-container"><img class="answer-image" src="${answerImageDataUri}" alt="Javob rasmi" style="${answerImageStyles}" /></div>`
                  : '';

                const renderedAnswerHtml =
                  this.renderTextWithLatex(cleanAnswerText);

                return `<div class="answer">${String.fromCharCode(65 + i)}) ${renderedAnswerHtml}${answerImgHtml}</div>`;
              })
              .join('')}</div>`
          : '';

        // Render LaTeX to HTML using KaTeX (server-side)
        const renderedQuestionText = this.renderTextWithLatex(questionText);

        return `<div class="question">
              <div class="q-row">
                <div class="q-no">${idx + 1}.</div>
                <div class="q-content">
                  <div class="q-text">${renderedQuestionText}</div>
                  ${imgHtml}
                  ${answersHtml}
                </div>
                <div class="points">[${points} ball]</div>
              </div>
            </div>`;
      })
      .join('');

    let pageHtml = `<div class="page">${header}<div class="questions-container">${questionsHtml}</div></div>`;

    if (withAnswerKey) {
      const keyRows = (variant.questions || [])
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((q, i: number) => {
          const idxNum: number =
            typeof q.correctAnswerIndex === 'number'
              ? q.correctAnswerIndex
              : -1;
          const letter = idxNum >= 0 ? String.fromCharCode(65 + idxNum) : '-';
          const pts = typeof q.points === 'number' ? q.points : 1;
          return `<tr><td>${i + 1}</td><td>${letter}</td><td>${pts}</td></tr>`;
        })
        .join('');
      const keyPage = `<div class="page">
          <div class="header"><div class="title">Javoblar Kaliti</div><div class="subtitle">Variant: ${escapeHtml(variant.variantNumber || '')}</div></div>
          <table class="key-table"><thead><tr><th>#</th><th>To'g'ri javob</th><th>Ball</th></tr></thead><tbody>${keyRows}</tbody></table>
        </div>`;
      pageHtml += keyPage;
    }

    return pageHtml;
  }

  // Convert LaTeX delimiters in plain text to HTML using KaTeX; non-math text is HTML-escaped
  private renderTextWithLatex(text: string): string {
    try {
      return renderWithKatex(text ?? '');
    } catch (e) {
      void this.logsService.warn(
        `KaTeX render failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return escapeHtml(text ?? '');
    }
  }

  /* ------------------------
       Debug & Troubleshooting
       ------------------------ */

  async debugVariant(variantId: number): Promise<any> {
    void this.logsService.log(`Debugging variant ${variantId}`);

    try {
      // Query with all relations
      const variant = await this.examVariantRepository.findOne({
        where: { id: variantId },
        relations: ['student', 'exam', 'exam.subjects', 'questions'],
      });

      if (!variant) {
        return { error: `Variant ${variantId} not found` };
      }

      // Also query questions separately
      const separateQuestionsQuery =
        await this.examVariantQuestionRepository.find({
          where: { variant: { id: variantId } },
          order: { order: 'ASC' },
        });

      return {
        variantId,
        found: true,
        basicInfo: {
          id: variant.id,
          variantNumber: variant.variantNumber,
          status: variant.status,
          totalPoints: variant.totalPoints,
          createdAt: variant.createdAt,
          updatedAt: variant.updatedAt,
        },
        student: variant.student
          ? {
              id: variant.student.id,
              firstName: variant.student.firstName,
              lastName: variant.student.lastName,
              username: variant.student.username,
            }
          : null,
        exam: variant.exam
          ? {
              id: variant.exam.id,
              title: variant.exam.title,
              description: variant.exam.description,
              status: variant.exam.status,
              subjectsCount: variant.exam.subjects?.length || 0,
              subjects:
                variant.exam.subjects?.map((s) => ({
                  id: s.id,
                  name: s.name,
                })) || [],
            }
          : null,
        questions: {
          fromRelation: {
            count: variant.questions?.length || 0,
            questions:
              variant.questions?.map((q) => ({
                id: q.id,
                order: q.order,
                questionText: q.questionText?.substring(0, 100) + '...',
                type: q.type,
                points: q.points,
                answersCount: q.answers?.length || 0,
                correctAnswerIndex: q.correctAnswerIndex,
                subjectName: q.subjectName,
                hasFormula: q.hasFormula,
                hasImage: !!q.imageBase64,
              })) || [],
          },
          fromSeparateQuery: {
            count: separateQuestionsQuery.length,
            questions: separateQuestionsQuery.map((q) => ({
              id: q.id,
              order: q.order,
              questionText: q.questionText?.substring(0, 100) + '...',
              type: q.type,
              points: q.points,
              answersCount: q.answers?.length || 0,
              correctAnswerIndex: q.correctAnswerIndex,
              subjectName: q.subjectName,
              hasFormula: q.hasFormula,
              hasImage: !!q.imageBase64,
            })),
          },
        },
        relationsLoaded: {
          student: !!variant.student,
          exam: !!variant.exam,
          examSubjects: !!variant.exam?.subjects,
          questions: !!variant.questions,
        },
      };
    } catch (error) {
      const err = error as Error;
      void this.logsService.error(
        `Error debugging variant ${variantId}: ${err.message}`,
        err.stack,
      );
      return {
        variantId,
        error: err.message,
        found: false,
      };
    }
  }

  /* ------------------------
       Public PDF API methods
       ------------------------ */

  generateVariantPDF(_variantId: number): Promise<Buffer> {
    void _variantId;
    throw new BadRequestException('PDF generation disabled');
  }

  generateAnswerKeyPDF(_variantId: number): Promise<Buffer> {
    void _variantId;
    throw new BadRequestException('PDF generation disabled');
  }

  generateAllVariantsPDF(_examId: number): Promise<Buffer> {
    void _examId;
    throw new BadRequestException('PDF generation disabled');
  }

  generateAllAnswerKeysPDF(_examId: number): Promise<Buffer> {
    void _examId;
    throw new BadRequestException('PDF generation disabled');
  }

  /* ------------------------
       PDF Generation with Telegram Auto-Send
       ------------------------ */

  generateAndSendVariantPDF(): Promise<{
    pdfGenerated: boolean;
    telegramSent: boolean;
    message: string;
  }> {
    return Promise.resolve({
      pdfGenerated: false,
      telegramSent: false,
      message: 'PDF generation disabled',
    });
  }

  generateAndSendAllVariantsPDFs(): Promise<{
    totalVariants: number;
    sent: number;
    failed: number;
    details: string[];
  }> {
    return Promise.resolve({
      totalVariants: 0,
      sent: 0,
      failed: 0,
      details: [],
    });
  }

  /* ------------------------
       PDF Title Page Generation
       ------------------------ */

  private generateExamTitlePage(
    variant: {
      exam: Exam;
      student?: User | null;
      questions?: ExamVariantQuestion[] | null;
      variantNumber: string;
    },
    isAnswerKey: boolean = false,
    studentGroups: Array<{ name: string }> = [],
  ): string {
    const exam = variant.exam;
    const student = variant.student || null;
    const subjects = exam.subjects || [];
    const subjectNames =
      subjects.map((s) => s.name).join(', ') || "Fan ko'rsatilmagan";
    const currentDate = new Date().toLocaleDateString('uz-UZ');
    const totalQuestions = variant.questions?.length || 0;

    const pageType = isAnswerKey ? 'JAVOBLAR KALITI' : 'IMTIHON';

    return `
      <div class="page">
        <div style="text-align: center; padding: 40px 20px; min-height: 80vh; display: flex; flex-direction: column; justify-content: center;">
          <h1 style="font-size: 24px; font-weight: bold; margin: 20px 0; color: #333; text-transform: uppercase;">
            ${subjectNames} ${pageType}
          </h1>
          
          <h2 style="font-size: 18px; margin: 15px 0; color: #666;">${exam.title}</h2>
          
          <div style="margin: 30px 0; font-size: 14px; line-height: 1.8;">
            <p><strong>Fan(lar):</strong> ${subjectNames}</p>
            <p><strong>Savollar soni:</strong> ${totalQuestions} ta</p>
            <p><strong>Variant:</strong> ${variant.variantNumber}</p>
            ${student ? `<p><strong>Talaba:</strong> ${student.firstName} ${student.lastName}</p>` : ''}
            <p><strong>Sana:</strong> ${currentDate}</p>
          </div>
          
          ${
            !isAnswerKey
              ? `
          <div style="text-align: left; margin: 40px auto; max-width: 500px;">
            <h3 style="color: #333; margin-bottom: 15px; text-align: center;">KO'RSATMALAR:</h3>
            <ul style="padding-left: 20px; line-height: 1.6;">
              <li>Barcha savollarga javob bering</li>
              <li>Har bir savol uchun faqat bitta to'g'ri javob mavjud</li>
              <li>Javoblarni aniq va tushunarli yozing</li>
              <li>Vaqtni to'g'ri taqsimlang</li>
              <li>Ishingizni tekshirib chiqing</li>
            </ul>
          </div>
          
          <div style="margin: 40px auto; max-width: 400px; text-align: left;">
            <div style="margin: 20px 0; border-bottom: 1px solid #333; padding-bottom: 5px;">
              <strong>Ism:</strong> ${student ? student.firstName : '___________________________'}
            </div>
            <div style="margin: 20px 0; border-bottom: 1px solid #333; padding-bottom: 5px;">
              <strong>Familiya:</strong> ${student ? student.lastName : '___________________________'}
            </div>
            <div style="margin: 20px 0; border-bottom: 1px solid #333; padding-bottom: 5px;">
              <strong>Guruh:</strong> ${studentGroups && studentGroups.length > 0 ? studentGroups.map((g) => g.name).join(', ') : '___________________________'}
            </div>
            <div style="margin: 20px 0; border-bottom: 1px solid #333; padding-bottom: 5px;">
              <strong>Variant raqami:</strong> ${variant.variantNumber}
            </div>
            <div style="margin: 20px 0; border-bottom: 1px solid #333; padding-bottom: 5px;">
              <strong>Sana:</strong> ${currentDate}
            </div>
          </div>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  private generateExamTitlePageForAll(
    exam: Exam,
    variants: Array<ExamVariant & { questions?: ExamVariantQuestion[] }>,
    isAnswerKey: boolean = false,
  ): string {
    const subjects = exam.subjects || [];
    const subjectNames =
      subjects.map((s) => s.name).join(', ') || "Fan ko'rsatilmagan";
    const currentDate = new Date().toLocaleDateString('uz-UZ');
    const totalVariants = variants.length;
    const totalQuestions = variants[0]?.questions?.length || 0;

    const pageType = isAnswerKey ? 'JAVOBLAR KALITI' : 'IMTIHON';

    return `
      <div class="page">
        <div style="text-align: center; padding: 40px 20px; min-height: 80vh; display: flex; flex-direction: column; justify-content: center;">
          <h1 style="font-size: 24px; font-weight: bold; margin: 20px 0; color: #333; text-transform: uppercase;">
            ${subjectNames} ${pageType}
          </h1>
          
          <h2 style="font-size: 18px; margin: 15px 0; color: #666;">${exam.title}</h2>
          
          <div style="margin: 30px 0; font-size: 14px; line-height: 1.8;">
            <p><strong>Fan(lar):</strong> ${subjectNames}</p>
            <p><strong>Savollar soni:</strong> ${totalQuestions} ta</p>
            <p><strong>Variantlar soni:</strong> ${totalVariants} ta</p>
            <p><strong>Sana:</strong> ${currentDate}</p>
          </div>
          
          ${
            !isAnswerKey
              ? `
          <div style="text-align: left; margin: 40px auto; max-width: 500px;">
            <h3 style="color: #333; margin-bottom: 15px; text-align: center;">KO'RSATMALAR:</h3>
            <ul style="padding-left: 20px; line-height: 1.6;">
              <li>Barcha savollarga javob bering</li>
              <li>Har bir savol uchun faqat bitta to'g'ri javob mavjud</li>
              <li>Javoblarni aniq va tushunarli yozing</li>
              <li>Vaqtni to'g'ri taqsimlang</li>
              <li>Ishingizni tekshirib chiqing</li>
            </ul>
          </div>
          
          <div style="margin: 40px auto; max-width: 400px; text-align: left;">
            <div style="margin: 20px 0; border-bottom: 1px solid #333; padding-bottom: 5px;">
              <strong>Ism:</strong> ___________________________
            </div>
            <div style="margin: 20px 0; border-bottom: 1px solid #333; padding-bottom: 5px;">
              <strong>Familiya:</strong> ___________________________
            </div>
            <div style="margin: 20px 0; border-bottom: 1px solid #333; padding-bottom: 5px;">
              <strong>Guruh:</strong> ___________________________
            </div>
            <div style="margin: 20px 0; border-bottom: 1px solid #333; padding-bottom: 5px;">
              <strong>Variant raqami:</strong> ___________________________
            </div>
            <div style="margin: 20px 0; border-bottom: 1px solid #333; padding-bottom: 5px;">
              <strong>Sana:</strong> ___________________________
            </div>
          </div>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  /* ------------------------
       Fallback PDF Generation
       ------------------------ */

  private async renderHtmlToPdfFallback(): Promise<Buffer> {
    return Promise.reject(new BadRequestException('PDF generation disabled'));
  }
}

/* ------------------------
     Small utilities
     ------------------------ */

function escapeHtml(str: string) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Server-side KaTeX renderer: converts inline $...$ and display $$...$$ (also \( \), \[ \]) to HTML
// Keeps non-LaTeX parts escaped to avoid XSS while allowing KaTeX markup to render as HTML.
// Note: KaTeX CSS is already linked in wrapHtmlForBrowser.
function renderWithKatex(text: string): string {
  if (!text) return '';
  const parts: string[] = [];
  const regex =
    /\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$|\\\[((?:.|\n)*?)\\\]|\\\(((?:.|\n)*?)\\\)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const index = m.index;
    const before = text.slice(lastIndex, index);
    if (before) parts.push(escapeHtml(before));
    const formula = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').trim();
    const display = Boolean(m[1] || m[3]);
    try {
      const html: string = katex.renderToString(formula, {
        displayMode: display,
        throwOnError: false,
        strict: 'ignore',
        trust: false,
      });
      parts.push(html);
    } catch {
      parts.push(`<span class="katex-error">${escapeHtml(formula)}</span>`);
    }
    lastIndex = index + m[0].length;
  }
  const rest = text.slice(lastIndex);
  if (rest) parts.push(escapeHtml(rest));
  return parts.join('');
}
