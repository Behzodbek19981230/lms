import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
const PDFDocument = require('pdfkit');
import { createWriteStream, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Readable } from 'stream';

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
import { TelegramService } from '../telegram/telegram.service';

import { Question } from '../questions/entities/question.entity';

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
    private telegramService: TelegramService,
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
    await this.examRepository.remove(exam);
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
      console.log('Notification creation failed:', error);
      // Don't fail the variant generation if notification fails
    }

    // Optionally send PDFs to Telegram
    if (generateVariantsDto.sendPDFsToTelegram) {
      try {
        this.logger.log(`Sending ${variants.length} PDFs to Telegram...`);
        // Send PDFs in background (don't wait for completion)
        this.sendPDFsInBackground(variants);
        this.logger.log('PDF sending initiated in background');
      } catch (error) {
        this.logger.error('Failed to initiate PDF sending:', error);
        // Don't fail the variant generation if PDF sending fails
      }
    }

    return variants;
  }

  private async generateVariantQuestions(
    variant: ExamVariant,
    exam: Exam,
    questionsPerSubject: number,
    randomizeQuestions: boolean,
    randomizeAnswers: boolean,
  ): Promise<void> {
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
        const answers = await this.questionsService.getQuestionAnswers(
          question.id,
        );

        // Shuffle answers if requested (and not essay/short)
        let shuffledAnswers = [...answers];
        if (
          randomizeAnswers &&
          question.type !== 'essay' &&
          question.type !== 'short_answer'
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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

    // Update variant totals (optional)
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

  private async sendPDFsInBackground(variants: ExamVariant[]): Promise<void> {
    // Run in background - no await needed
    setImmediate(async () => {
      for (const variant of variants) {
        try {
          await this.generateAndSendVariantPDF(variant.id);
          // Small delay between sends to avoid overwhelming the system
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          this.logger.error(
            `Failed to send PDF for variant ${variant.id}:`,
            error,
          );
        }
      }
      this.logger.log(
        `Background PDF sending completed for ${variants.length} variants`,
      );
    });
  }

  /* ------------------------
       Exam statistics updater
       ------------------------ */

  private async updateExamStatistics(examId: number): Promise<void> {
    const exam = await this.findById(examId);
    const variants = await this.examVariantRepository.find({
      where: { exam: { id: examId } },
      relations: ['questions'],
    });

    const totalStudents = Array.from(
      new Set(
        (variants || []).map((v) => (v as any).student?.id).filter(Boolean),
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
      (sum, v) => sum + ((v as any).totalPoints || 0),
      0,
    );

    await this.examRepository.update(examId, {
      totalStudents,
      completedStudents,
      totalQuestions,
      totalPoints,
    });
  }

  /* ------------------------
       Variant retrieval
       ------------------------ */

  async getExamVariants(examId: number): Promise<ExamVariant[]> {
    return this.examVariantRepository.find({
      where: { exam: { id: examId } },
      relations: ['student', 'questions'],
      order: { variantNumber: 'ASC' },
    });
  }

  /* ------------------------
       PDF generation (Puppeteer + KaTeX)
       ------------------------ */

  private async renderHtmlToPdf(
    html: string,
    title = 'Document',
  ): Promise<Buffer> {
    this.logger.log(`Starting PDF generation with PDFKit for: ${title}`);
    return await this.renderHtmlToPdfWithPDFKit(html, title);
  }

  private async renderHtmlToPdfWithPDFKit(
    html: string,
    title = 'Document',
  ): Promise<Buffer> {
    this.logger.log(`Using PDFKit PDF generation for: ${title}`);

    return new Promise((resolve, reject) => {
      try {
        // Create a new PDFDocument
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: title,
            Author: 'Universal LMS',
            Subject: 'Exam Document',
            Creator: 'Universal LMS System',
          },
        });

        const buffers: Buffer[] = [];

        // Collect PDF data
        doc.on('data', (chunk) => {
          buffers.push(chunk);
        });

        doc.on('end', () => {
          const finalBuffer = Buffer.concat(buffers);
          this.logger.log(
            `PDFKit PDF generated successfully. Size: ${finalBuffer.length} bytes`,
          );
          resolve(finalBuffer);
        });

        doc.on('error', (error) => {
          this.logger.error('PDFKit error:', error);
          reject(
            new InternalServerErrorException(
              `PDF generation failed: ${error.message}`,
            ),
          );
        });

        // Extract basic information from HTML
        let examTitle = title;
        let variantNumber = '';
        let studentName = '';
        let subjectName = '';
        let questionsText = '';

        // Extract title from HTML if possible
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          examTitle = titleMatch[1];
        }

        // Extract variant information
        const variantMatch = html.match(/Variant[:\s]*([^\n<]+)/i);
        if (variantMatch && variantMatch[1]) {
          variantNumber = variantMatch[1].trim();
        }

        // Extract student name
        const studentMatch = html.match(/(?:Talaba|O'quvchi)[:\s]*([^\n<]+)/i);
        if (studentMatch && studentMatch[1]) {
          studentName = studentMatch[1].trim();
        }

        // Extract subject name
        const subjectMatch = html.match(/(?:Fan|Subject)[:\s]*([^\n<]+)/i);
        if (subjectMatch && subjectMatch[1]) {
          subjectName = subjectMatch[1].trim();
        }

        // Extract questions with better parsing
        const questionsMatches = html.match(
          /<div class="question">([\s\S]*?)<\/div>/g,
        );
        if (questionsMatches) {
          questionsText = questionsMatches
            .map((q, i) => {
              // Better HTML to text conversion
              const cleanText = q
                .replace(/<div class="q-no">[^<]*<\/div>/g, '') // Remove question numbers
                .replace(/<div class="points">[^<]*<\/div>/g, '') // Remove points
                .replace(/<[^>]*>/g, ' ') // Remove all HTML tags
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
              return `${i + 1}. ${cleanText}`;
            })
            .join('\n\n');
        }

        // Set up fonts and styles
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text(examTitle || 'IMTIHON', { align: 'center' })
          .moveDown(2);

        if (subjectName) {
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .text(`Fan: ${subjectName}`, { align: 'center' })
            .moveDown(1);
        }

        if (variantNumber) {
          doc
            .fontSize(14)
            .font('Helvetica')
            .text(`Variant: ${variantNumber}`, { align: 'center' })
            .moveDown(1);
        }

        if (studentName) {
          doc
            .fontSize(12)
            .font('Helvetica')
            .text(`Talaba: ${studentName}`, { align: 'center' })
            .moveDown(1);
        }

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, {
            align: 'center',
          })
          .moveDown(2);

        // Add a line separator
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(1);

        // Add questions section
        if (questionsText) {
          doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('SAVOLLAR:', { align: 'left' })
            .moveDown(1);

          // Split text into chunks to avoid overflow
          const maxLength = 2000; // Limit text length per chunk
          const chunks: string[] = [];
          let currentChunk = '';
          const lines = questionsText.split('\n\n');

          for (const line of lines) {
            if (currentChunk.length + line.length > maxLength) {
              if (currentChunk) chunks.push(currentChunk);
              currentChunk = line;
            } else {
              currentChunk = currentChunk ? currentChunk + '\n\n' + line : line;
            }
          }
          if (currentChunk) chunks.push(currentChunk);

          // Add each chunk
          for (const chunk of chunks) {
            doc.fontSize(10).font('Helvetica').text(chunk, {
              align: 'left',
              width: 495,
              lineGap: 3,
            });
            if (doc.y > 700) {
              // Add page break if needed
              doc.addPage();
            }
          }
        } else {
          doc
            .fontSize(12)
            .font('Helvetica')
            .text("PDFKit mode: Savollar HTML formatidan chiqarib bo'lmadi.", {
              align: 'center',
            })
            .moveDown(2)
            .text(
              'Ushbu PDF tizim imkoniyatlari cheklanganligi sababli soddalashtirilgan formatda yaratildi.',
              {
                align: 'center',
                fontSize: 10,
              },
            );
        }

        // Footer
        doc
          .fontSize(8)
          .font('Helvetica')
          .text('Universal LMS - PDFKit Mode', 50, doc.page.height - 50, {
            align: 'center',
            width: doc.page.width - 100,
          });

        // Finalize the PDF
        doc.end();
      } catch (error) {
        this.logger.error('Error in PDFKit generation:', error);
        reject(
          new InternalServerErrorException(
            `PDFKit generation failed: ${error.message}`,
          ),
        );
      }
    });
  }

  private wrapHtml(inner: string, title: string): string {
    return `<!DOCTYPE html>
      <html lang="uz">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: Times, 'Times New Roman', serif; margin: 0; padding: 0; color: #111; }
          .page { page-break-after: always; padding: 0 6mm; }
          .question-page { page-break-after: always; padding: 0 6mm; }
          .header { text-align: center; margin-bottom: 12px; }
          .title { font-size: 20px; font-weight: 700; margin: 0 0 6px 0; }
          .subtitle { font-size: 12px; margin: 2px 0; color: #333; }
          .meta { font-size: 10px; color: #666; }
          .question { margin: 10px 0 14px 0; break-inside: avoid; }
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
        </style>
      </head>
      <body>
        ${inner}
      </body>
      </html>`;
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
      this.logger.warn('Error processing image data:', error);
      return null;
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
    } catch (error) {
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
        this.logger.warn(
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
        this.logger.warn('Invalid base64 data detected');
        return null;
      }

      // Check minimum size for a valid image (at least 50 bytes when decoded)
      try {
        const decoded = atob(cleanBase64);
        if (decoded.length < 50) {
          this.logger.warn('Base64 data too small to be a valid image');
          return null;
        }
      } catch (error) {
        this.logger.warn('Failed to decode base64 data:', error);
        return null;
      }

      // Reconstruct the data URI with clean base64
      return `${header},${cleanBase64}`;
    } catch (error) {
      this.logger.warn('Failed to normalize data URI:', error);
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
      this.logger.error('No exam data found for variant');
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

    const questions = variant.questions || [];
    this.logger.log(`Building variant page with ${questions.length} questions`);

    if (questions.length === 0) {
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
      .map((q: any, idx: number) => {
        const answers = q.answers || [];
        const points = Number.isFinite(q.points) ? q.points : 1;

        // First try to get image from imageBase64 field
        let imageDataUri = this.getImageSrc(q.imageBase64);
        let imageStyles = '';

        // If no image in imageBase64 field, extract from text
        let questionText = q.questionText || '';
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
        if (q.imageBase64 || questionText.includes('data:image/')) {
          this.logger.log(
            `Question ${idx + 1}: Found image - imageBase64 field: ${!!q.imageBase64}, extracted from text: ${!!imageDataUri}, final URI length: ${imageDataUri?.length || 0}`,
          );
        }

        const answersHtml = answers.length
          ? `<div class="answers">${answers
              .map((a: any, i: number) => {
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

                return `<div class="answer">${String.fromCharCode(65 + i)}) ${escapeHtml(cleanAnswerText)}${answerImgHtml}</div>`;
              })
              .join('')}</div>`
          : '';

        // NOTE: We intentionally do NOT strip LaTeX delimiters: KaTeX auto-render will process $$...$$ etc.
        const cleanedQuestionText = escapeHtml(questionText);

        return `<div class="question">
              <div class="q-row">
                <div class="q-no">${idx + 1}.</div>
                <div class="q-content">
                  <div class="q-text">${cleanedQuestionText}</div>
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
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .map((q: any, i: number) => {
          const idx =
            typeof q.correctAnswerIndex === 'number'
              ? q.correctAnswerIndex
              : -1;
          const letter = idx >= 0 ? String.fromCharCode(65 + idx) : '-';
          const pts = Number.isFinite(q.points) ? q.points : 1;
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

  /* ------------------------
       Debug & Troubleshooting
       ------------------------ */

  async debugVariant(variantId: number): Promise<any> {
    this.logger.log(`Debugging variant ${variantId}`);

    try {
      // Query with all relations
      const variant = await this.examVariantRepository.findOne({
        where: { id: variantId },
        relations: ['student', 'exam', 'exam.subjects', 'questions'],
        order: { questions: { order: 'ASC' } as any },
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
              email: variant.student.email,
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
      this.logger.error(`Error debugging variant ${variantId}:`, error);
      return {
        variantId,
        error: error.message,
        found: false,
      };
    }
  }

  /* ------------------------
       Public PDF API methods
       ------------------------ */

  async generateVariantPDF(variantId: number): Promise<Buffer> {
    try {
      this.logger.log(`Generating PDF for variant ${variantId}`);

      const variant = await this.examVariantRepository.findOne({
        where: { id: variantId },
        relations: ['student', 'exam', 'exam.subjects', 'questions'],
        order: { questions: { order: 'ASC' } as any },
      });

      if (!variant) {
        this.logger.error(`Variant ${variantId} not found`);
        throw new NotFoundException('Variant not found');
      }

      // Enhanced logging for debugging
      this.logger.log(`Variant ${variantId} database query result:`, {
        variantExists: !!variant,
        studentExists: !!variant.student,
        examExists: !!variant.exam,
        questionsExists: !!variant.questions,
        questionsCount: variant.questions?.length || 0,
        questionsArray:
          variant.questions?.map((q) => ({
            id: q.id,
            order: q.order,
            questionText: q.questionText?.substring(0, 50),
            answersCount: q.answers?.length || 0,
            type: q.type,
          })) || [],
      });

      this.logger.log(`Found variant ${variantId}`, {
        hasStudent: !!variant.student,
        hasExam: !!variant.exam,
        questionsCount: variant.questions?.length || 0,
        studentName: variant.student?.firstName,
        examTitle: variant.exam?.title,
      });

      if (!variant.student) {
        this.logger.error(`Variant ${variantId} missing student relation`);
        throw new InternalServerErrorException(
          'Variant data incomplete: missing student information',
        );
      }

      if (!variant.exam) {
        this.logger.error(`Variant ${variantId} missing exam relation`);
        throw new InternalServerErrorException(
          'Variant data incomplete: missing exam information',
        );
      }

      // Log questions info
      this.logger.log(
        `Variant ${variantId} has ${variant.questions?.length || 0} questions`,
      );
      if (variant.questions && variant.questions.length > 0) {
        this.logger.log(`First question sample:`, {
          id: variant.questions[0].id,
          text: variant.questions[0].questionText?.substring(0, 50) + '...',
          hasAnswers: !!variant.questions[0].answers,
          answersCount: variant.questions[0].answers?.length || 0,
        });
      }

      // Get student's group information
      const studentGroups = variant.student
        ? await this.groupRepository.find({
            where: { students: { id: variant.student.id } },
            relations: ['students'],
          })
        : [];

      // Generate title page
      const titlePageHtml = this.generateExamTitlePage(
        variant,
        false,
        studentGroups,
      );

      const inner = this.buildVariantPage(
        { ...variant, exam: variant.exam } as any,
        false,
      );

      // Combine title page with variant content
      const combinedContent = titlePageHtml + inner;

      const html = this.wrapHtml(
        combinedContent,
        `${variant.exam.title} — Variant ${variant.variantNumber}`,
      );

      return this.renderHtmlToPdf(
        html,
        `${variant.exam.title} — Variant ${variant.variantNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate PDF for variant ${variantId}:`,
        error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `PDF generation failed for variant ${variantId}: ${error.message}`,
      );
    }
  }

  async generateAnswerKeyPDF(variantId: number): Promise<Buffer> {
    const variant = await this.examVariantRepository.findOne({
      where: { id: variantId },
      relations: ['student', 'exam', 'exam.subjects', 'questions'],
      order: { questions: { order: 'ASC' } as any },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    // Get student's group information
    const studentGroups = await this.groupRepository.find({
      where: { students: { id: variant.student.id } },
      relations: ['students'],
    });

    // Generate title page
    const titlePageHtml = this.generateExamTitlePage(
      variant,
      true,
      studentGroups,
    );

    const inner = this.buildVariantPage(
      { ...variant, exam: variant.exam } as any,
      true,
    );

    // Combine title page with answer key content
    const combinedContent = titlePageHtml + inner;

    const html = this.wrapHtml(
      combinedContent,
      `${variant.exam.title} — Javoblar: Variant ${variant.variantNumber}`,
    );
    return this.renderHtmlToPdf(
      html,
      `${variant.exam.title} — Javoblar: Variant ${variant.variantNumber}`,
    );
  }

  async generateAllVariantsPDF(examId: number): Promise<Buffer> {
    const exam = await this.findById(examId);
    const variants = await this.getExamVariants(examId);

    // Generate title page for all variants
    const examWithSubjects = await this.examRepository.findOne({
      where: { id: examId },
      relations: ['subjects'],
    });

    const titlePageHtml = this.generateExamTitlePageForAll(
      examWithSubjects,
      variants,
      false,
    );

    const pages = variants
      .map((v) => this.buildVariantPage({ ...v, exam } as any, false))
      .join('');

    const combinedContent = titlePageHtml + pages;
    const html = this.wrapHtml(
      combinedContent,
      `${exam.title} — Barcha variantlar`,
    );
    return this.renderHtmlToPdf(html, `${exam.title} — Barcha variantlar`);
  }

  async generateAllAnswerKeysPDF(examId: number): Promise<Buffer> {
    const exam = await this.findById(examId);
    const variants = await this.getExamVariants(examId);

    // Generate title page for all answer keys
    const examWithSubjects = await this.examRepository.findOne({
      where: { id: examId },
      relations: ['subjects'],
    });

    const titlePageHtml = this.generateExamTitlePageForAll(
      examWithSubjects,
      variants,
      true,
    );

    const pages = variants
      .map((v) => this.buildVariantPage({ ...v, exam } as any, true))
      .join('');

    const combinedContent = titlePageHtml + pages;
    const html = this.wrapHtml(combinedContent, `${exam.title} — Javoblar`);
    return this.renderHtmlToPdf(html, `${exam.title} — Javoblar`);
  }

  /* ------------------------
       PDF Generation with Telegram Auto-Send
       ------------------------ */

  async generateAndSendVariantPDF(variantId: number): Promise<{
    pdfGenerated: boolean;
    telegramSent: boolean;
    message: string;
  }> {
    try {
      this.logger.log(
        `Starting PDF generation and send for variant ${variantId}`,
      );

      // First generate the PDF
      const pdfBuffer = await this.generateVariantPDF(variantId);

      // Get variant details for user ID and filename
      const variant = await this.examVariantRepository.findOne({
        where: { id: variantId },
        relations: ['student', 'exam'],
      });

      if (!variant || !variant.student) {
        this.logger.warn(`No student found for variant ${variantId}`);
        return {
          pdfGenerated: true,
          telegramSent: false,
          message: 'PDF generated but no student found to send to',
        };
      }

      const fileName = `${variant.exam.title}-Variant-${variant.variantNumber}.pdf`;
      const caption = `🎓 <b>Test PDF - ${variant.exam.title}</b>\n\n📋 <b>Variant:</b> ${variant.variantNumber}\n👤 <b>Talaba:</b> ${variant.student.firstName} ${variant.student.lastName}\n📅 <b>Sana:</b> ${new Date().toLocaleDateString()}`;

      this.logger.log(
        `Sending PDF to user ${variant.student.id} for variant ${variantId}`,
      );

      // Send PDF to user's Telegram
      const telegramResult = await this.telegramService.sendPDFToUser(
        variant.student.id,
        pdfBuffer,
        fileName,
        caption,
      );

      this.logger.log(
        `PDF send result for variant ${variantId}: ${telegramResult.success ? 'SUCCESS' : 'FAILED'} - ${telegramResult.message}`,
      );

      return {
        pdfGenerated: true,
        telegramSent: telegramResult.success,
        message: telegramResult.message,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate and send variant PDF ${variantId}:`,
        error,
      );
      return {
        pdfGenerated: false,
        telegramSent: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  async generateAndSendAllVariantsPDFs(examId: number): Promise<{
    totalVariants: number;
    sent: number;
    failed: number;
    details: string[];
  }> {
    try {
      const exam = await this.findById(examId);
      const variants = await this.getExamVariants(examId);

      const result = {
        totalVariants: variants.length,
        sent: 0,
        failed: 0,
        details: [] as string[],
      };

      for (const variant of variants) {
        try {
          const variantResult = await this.generateAndSendVariantPDF(
            variant.id,
          );
          if (variantResult.telegramSent) {
            result.sent++;
            result.details.push(
              `✅ Variant ${variant.variantNumber} (${variant.student?.firstName} ${variant.student?.lastName}): ${variantResult.message}`,
            );
          } else {
            result.failed++;
            result.details.push(
              `❌ Variant ${variant.variantNumber} (${variant.student?.firstName} ${variant.student?.lastName}): ${variantResult.message}`,
            );
          }

          // Small delay to avoid overwhelming the system
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          result.failed++;
          result.details.push(
            `❌ Variant ${variant.variantNumber}: Error - ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Bulk PDF send completed for exam ${examId}: ${result.sent} sent, ${result.failed} failed`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to generate and send all variants PDFs for exam ${examId}:`,
        error,
      );
      throw new InternalServerErrorException(
        `Bulk PDF generation failed: ${error.message}`,
      );
    }
  }

  /* ------------------------
       PDF Title Page Generation
       ------------------------ */

  private generateExamTitlePage(
    variant: any,
    isAnswerKey: boolean = false,
    studentGroups: any[] = [],
  ): string {
    const exam = variant.exam;
    const student = variant.student;
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
    exam: any,
    variants: any[],
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

  private async renderHtmlToPdfFallback(
    html: string,
    title = 'Document',
  ): Promise<Buffer> {
    this.logger.warn(`Using fallback PDF generation with PDFKit for: ${title}`);

    return new Promise((resolve, reject) => {
      try {
        // Create a new PDFDocument
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: title,
            Author: 'Universal LMS',
            Subject: 'Exam Document',
            Creator: 'Universal LMS System',
          },
        });

        const buffers: Buffer[] = [];

        // Collect PDF data
        doc.on('data', (chunk) => {
          buffers.push(chunk);
        });

        doc.on('end', () => {
          const finalBuffer = Buffer.concat(buffers);
          this.logger.log(
            `Fallback PDF generated successfully. Size: ${finalBuffer.length} bytes`,
          );
          resolve(finalBuffer);
        });

        doc.on('error', (error) => {
          this.logger.error('PDFKit error:', error);
          reject(
            new InternalServerErrorException(
              `PDF generation failed: ${error.message}`,
            ),
          );
        });

        // Extract basic information from HTML
        let examTitle = title;
        let variantNumber = '';
        let studentName = '';
        let subjectName = '';
        let questionsText = '';

        // Extract title from HTML if possible
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          examTitle = titleMatch[1];
        }

        // Extract variant information
        const variantMatch = html.match(/Variant[:\s]*([^\n<]+)/i);
        if (variantMatch && variantMatch[1]) {
          variantNumber = variantMatch[1].trim();
        }

        // Extract student name
        const studentMatch = html.match(/(?:Talaba|O'quvchi)[:\s]*([^\n<]+)/i);
        if (studentMatch && studentMatch[1]) {
          studentName = studentMatch[1].trim();
        }

        // Extract subject name
        const subjectMatch = html.match(/(?:Fan|Subject)[:\s]*([^\n<]+)/i);
        if (subjectMatch && subjectMatch[1]) {
          subjectName = subjectMatch[1].trim();
        }

        // Extract questions
        const questionsMatches = html.match(
          /<div class="question">([\s\S]*?)<\/div>/g,
        );
        if (questionsMatches) {
          questionsText = questionsMatches
            .map((q, i) => {
              // Simple HTML to text conversion
              const cleanText = q
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              return `${i + 1}. ${cleanText}`;
            })
            .join('\n\n');
        }

        // Set up fonts and styles
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text(examTitle || 'IMTIHON', { align: 'center' })
          .moveDown(2);

        if (subjectName) {
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .text(`Fan: ${subjectName}`, { align: 'center' })
            .moveDown(1);
        }

        if (variantNumber) {
          doc
            .fontSize(14)
            .font('Helvetica')
            .text(`Variant: ${variantNumber}`, { align: 'center' })
            .moveDown(1);
        }

        if (studentName) {
          doc
            .fontSize(12)
            .font('Helvetica')
            .text(`Talaba: ${studentName}`, { align: 'center' })
            .moveDown(1);
        }

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, {
            align: 'center',
          })
          .moveDown(2);

        // Add a line separator
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(1);

        // Add questions section
        if (questionsText) {
          doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('SAVOLLAR:', { align: 'left' })
            .moveDown(1);

          doc.fontSize(10).font('Helvetica').text(questionsText, {
            align: 'left',
            width: 495,
            lineGap: 5,
          });
        } else {
          doc
            .fontSize(12)
            .font('Helvetica')
            .text(
              "PDF fallback mode: Savollar HTML formatidan chiqarib bo'lmadi.",
              {
                align: 'center',
              },
            )
            .moveDown(2)
            .text(
              'Ushbu PDF tizim imkoniyatlari cheklanganligi sababli soddalashtirilgan formatda yaratildi.',
              {
                align: 'center',
                fontSize: 10,
              },
            );
        }

        // Footer
        doc
          .fontSize(8)
          .font('Helvetica')
          .text('Universal LMS - PDF Fallback Mode', 50, doc.page.height - 50, {
            align: 'center',
            width: doc.page.width - 100,
          });

        // Finalize the PDF
        doc.end();
      } catch (error) {
        this.logger.error('Error in PDF fallback generation:', error);
        reject(
          new InternalServerErrorException(
            `PDF fallback generation failed: ${error.message}`,
          ),
        );
      }
    });
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
