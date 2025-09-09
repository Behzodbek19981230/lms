import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PdfService } from '../pdf/pdf.service';
import { PuppeteerPdfService } from '../pdf/puppeteer-pdf.service';
import { Test } from '../tests/entities/test.entity';
import { Question } from '../questions/entities/question.entity';
import { ExamVariant } from '../exams/entities/exam-variant.entity';

@Injectable()
export class ImprovedExamsService {
  private readonly logger = new Logger(ImprovedExamsService.name);

  constructor(
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(ExamVariant)
    private examVariantRepository: Repository<ExamVariant>,
    private pdfService: PdfService,
    private puppeteerPdfService: PuppeteerPdfService,
  ) {}

  /**
   * Test uchun PDF yaratish - yangi yondashuv
   */
  async generateTestPDF(
    testId: number,
    options: {
      method?: 'pdfkit' | 'puppeteer';
      isAnswerKey?: boolean;
      variantNumber?: string;
      studentName?: string;
    } = {},
  ): Promise<Buffer> {
    console.log(
      `Generating PDF for test ${testId} using ${options.method || 'pdfkit'} method`,
    );

    const test = await this.testRepository.findOne({
      where: { id: testId },
      relations: ['subject', 'teacher', 'questions', 'questions.answers'],
    });

    if (!test) {
      throw new Error('Test topilmadi');
    }

    const { method = 'pdfkit' } = options;

    // if (method === 'puppeteer') {
    //   return this.generatePuppeteerPDF(test, options);
    // } else {
    return this.pdfService.generateTestPDF(testId, options);
    // }
  }

  /**
   * Puppeteer yordamida PDF yaratish
   */
  private async generatePuppeteerPDF(
    test: Test,
    options: any,
  ): Promise<Buffer> {
    const testData = {
      title: test.title,
      subject: test.subject?.name,
      questions: test.questions?.map((q) => ({
        text: q.text,
        type: q.type,
        points: q.points,
        imageBase64: q.imageBase64,
        answers: q.answers?.map((a) => ({
          text: a.text,
          isCorrect: a.isCorrect,
        })),
      })),
      variantNumber: options.variantNumber,
      studentName: options.studentName,
      duration: test.duration,
      totalPoints: test.totalPoints,
      isAnswerKey: options.isAnswerKey,
    };

    const html = this.puppeteerPdfService.generateTestHTML(testData, options);
    return this.puppeteerPdfService.generatePDFFromHTML(html);
  }

  /**
   * Exam variant uchun PDF yaratish
   */
  async generateExamVariantPDF(
    variantId: number,
    options: {
      method?: 'pdfkit' | 'puppeteer';
      isAnswerKey?: boolean;
    } = {},
  ): Promise<Buffer> {
    const variant = await this.examVariantRepository.findOne({
      where: { id: variantId },
      relations: ['student', 'exam', 'questions'],
    });

    if (!variant) {
      throw new Error('Variant topilmadi');
    }

    const { method = 'pdfkit' } = options;

    // if (method === 'puppeteer') {
    //   return this.generateExamVariantPuppeteerPDF(variant, options);
    // } else {
    return this.pdfService.generateExamVariantPDF(variant, options);
    // }
  }

  /**
   * Exam variant Puppeteer PDF
   */
  private async generateExamVariantPuppeteerPDF(
    variant: ExamVariant,
    options: any,
  ): Promise<Buffer> {
    const examData = {
      title: variant.exam?.title || 'IMTIHON',
      subject: variant.exam?.subjects?.[0]?.name || '',
      questions: variant.questions?.map((vq) => ({
        text: vq.questionText,
        type: 'multiple_choice',
        points: vq.points || 1,
        answers:
          vq.options?.map((opt: string, idx: number) => ({
            text: opt,
            isCorrect: vq.correctAnswer === String.fromCharCode(65 + idx),
          })) || [],
      })),
      variantNumber: variant.variantNumber,
      studentName: variant.student
        ? `${variant.student.firstName} ${variant.student.lastName}`
        : '',
      totalPoints: variant.totalPoints,
      isAnswerKey: options.isAnswerKey,
    };

    const html = this.puppeteerPdfService.generateTestHTML(examData, options);
    return this.puppeteerPdfService.generatePDFFromHTML(html);
  }

  /**
   * Test savollarini olish
   */
  async getTestQuestions(testId: number): Promise<Question[]> {
    return this.questionRepository.find({
      where: { test: { id: testId } },
      relations: ['answers'],
      order: { order: 'ASC' },
    });
  }

  /**
   * PDF generatsiya usullarini sinash
   */
  async testPDFGeneration(testId: number): Promise<{
    pdfkitSuccess: boolean;
    puppeteerSuccess: boolean;
    pdfkitSize?: number;
    puppeteerSize?: number;
    errors: string[];
  }> {
    const result = {
      pdfkitSuccess: false,
      puppeteerSuccess: false,
      pdfkitSize: undefined as number | undefined,
      puppeteerSize: undefined as number | undefined,
      errors: [] as string[],
    };

    // PDFKit sinovi
    try {
      const pdfkitBuffer = await this.generateTestPDF(testId, {
        method: 'pdfkit',
      });
      result.pdfkitSuccess = true;
      result.pdfkitSize = pdfkitBuffer.length;
      console.log(`PDFKit test successful. Size: ${pdfkitBuffer.length} bytes`);
    } catch (error) {
      result.errors.push(`PDFKit error: ${error.message}`);
      console.error('PDFKit test failed:', error);
    }

    // Puppeteer sinovi
    try {
      const puppeteerBuffer = await this.generateTestPDF(testId, {
        method: 'puppeteer',
      });
      result.puppeteerSuccess = true;
      result.puppeteerSize = puppeteerBuffer.length;
      console.log(
        `Puppeteer test successful. Size: ${puppeteerBuffer.length} bytes`,
      );
    } catch (error) {
      result.errors.push(`Puppeteer error: ${error.message}`);
      console.error('Puppeteer test failed:', error);
    }

    return result;
  }
}
