import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import * as cheerio from 'cheerio';
import { Test } from '../tests/entities/test.entity';
import { Question } from '../questions/entities/question.entity';
import { ExamVariant } from '../exams/entities/exam-variant.entity';

interface PDFGenerationOptions {
  includeAnswers?: boolean;
  isAnswerKey?: boolean;
  studentName?: string;
  variantNumber?: string | number;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
  ) {}

  /**
   * Test uchun PDF yaratish - HTML dan emas, to'g'ridan-to'g'ri ma'lumotlar bazasidan
   */
  async generateTestPDF(
    testId: number,
    options: PDFGenerationOptions = {},
  ): Promise<Buffer> {
    console.log(`Generating PDF for test ${testId}`);

    const test = await this.testRepository.findOne({
      where: { id: testId },
      relations: ['subject', 'teacher', 'questions', 'questions.answers'],
    });

    if (!test) {
      throw new InternalServerErrorException('Test topilmadi');
    }

    return this.createPDFFromData(test, options);
  }

  /**
   * Exam variant uchun PDF yaratish
   */
  async generateExamVariantPDF(
    variant: ExamVariant,
    options: PDFGenerationOptions = {},
  ): Promise<Buffer> {
    console.log(`Generating PDF for exam variant ${variant.id}`);

    return this.createExamVariantPDF(variant, options);
  }

  /**
   * Ma'lumotlar bazasidan to'g'ridan-to'g'ri PDF yaratish
   */
  private async createPDFFromData(
    test: Test,
    options: PDFGenerationOptions,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true,
          info: {
            Title: test.title,
            Author: 'Universal LMS',
            Subject: test.subject?.name || 'Test',
            Creator: 'Universal LMS System',
            CreationDate: new Date(),
          },
        });

        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log(
            `PDF created successfully. Size: ${pdfBuffer.length} bytes`,
          );
          resolve(pdfBuffer);
        });
        doc.on('error', (error) => {
          console.error('PDF creation error:', error);
          reject(
            new InternalServerErrorException(
              `PDF yaratishda xatolik: ${error.message}`,
            ),
          );
        });

        // PDF tuzilishini yaratish
        this.buildTestPDF(doc, test, options);

        doc.end();
      } catch (error) {
        console.error('PDF generation failed:', error);
        reject(
          new InternalServerErrorException(
            `PDF generatsiya xatolik: ${error.message}`,
          ),
        );
      }
    });
  }

  /**
   * Test PDF tuzilishini yaratish
   */
  private buildTestPDF(
    doc: typeof PDFDocument,
    test: Test,
    options: PDFGenerationOptions,
  ): void {
    const pageWidth = doc.page.width - 100; // margins
    let yPosition = doc.y;

    // Header
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(test.title.toUpperCase(), 50, yPosition, {
        align: 'center',
        width: pageWidth,
      });

    yPosition += 40;

    // Subject va ma'lumotlar
    if (test.subject) {
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(`Fan: ${test.subject.name}`, 50, yPosition, {
          align: 'center',
          width: pageWidth,
        });
      yPosition += 30;
    }

    // Variant va talaba ma'lumotlari
    if (options.variantNumber) {
      doc
        .fontSize(14)
        .font('Helvetica')
        .text(`Variant: ${options.variantNumber}`, 50, yPosition, {
          align: 'center',
          width: pageWidth,
        });
      yPosition += 25;
    }

    if (options.studentName) {
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(`Talaba: ${options.studentName}`, 50, yPosition, {
          align: 'center',
          width: pageWidth,
        });
      yPosition += 25;
    }

    // Test ma'lumotlari
    const testInfo = [
      `Savollar soni: ${test.questions?.length || 0}`,
      `Jami ball: ${test.totalPoints || 0}`,
      `Vaqt: ${test.duration} daqiqa`,
      `Sana: ${new Date().toLocaleDateString('uz-UZ')}`,
    ].join(' • ');

    doc.fontSize(10).font('Helvetica').text(testInfo, 50, yPosition, {
      align: 'center',
      width: pageWidth,
    });

    yPosition += 35;

    // Chiziq
    doc
      .moveTo(50, yPosition)
      .lineTo(doc.page.width - 50, yPosition)
      .stroke();
    yPosition += 20;

    // Savollar
    if (test.questions && test.questions.length > 0) {
      this.addQuestionsToPDF(doc, test.questions, options, yPosition);
    } else {
      doc
        .fontSize(12)
        .font('Helvetica')
        .text('Savollar mavjud emas', 50, yPosition, {
          align: 'center',
          width: pageWidth,
        });
    }

    // Footer
    const footerY = doc.page.height - 70;
    doc
      .fontSize(8)
      .font('Helvetica')
      .text('Universal LMS - Test tizimi', 50, footerY, {
        align: 'center',
        width: pageWidth,
      });
  }

  /**
   * Savollarni PDF ga qo'shish
   */
  private addQuestionsToPDF(
    doc: typeof PDFDocument,
    questions: Question[],
    options: PDFGenerationOptions,
    startY: number,
  ): void {
    let yPosition = startY;
    const pageWidth = doc.page.width - 100;
    const pageHeight = doc.page.height - 100;

    questions.forEach((question, index) => {
      // Yangi sahifa kerakmi?
      if (yPosition > pageHeight - 150) {
        doc.addPage();
        yPosition = 50;
      }

      // Savol raqami va bali
      const questionHeader = `${index + 1}. (${question.points} ball)`;
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(questionHeader, 50, yPosition, { width: pageWidth });

      yPosition += 20;

      // Savol matni
      const questionText = this.cleanText(question.text);
      doc
        .fontSize(11)
        .font('Helvetica')
        .text(questionText, 70, yPosition, {
          width: pageWidth - 20,
          lineGap: 3,
        });

      yPosition +=
        this.calculateTextHeight(doc, questionText, pageWidth - 20, 11) + 15;

      // Rasm bo'lsa
      if (question.imageBase64) {
        doc
          .fontSize(9)
          .font('Helvetica')
          .text('[Rasm biriktirilgan]', 70, yPosition, {
            width: pageWidth - 20,
          });
        yPosition += 20;
      }

      // Javob variantlari
      if (question.answers && question.answers.length > 0) {
        question.answers.forEach((answer, answerIndex) => {
          const answerLetter = String.fromCharCode(65 + answerIndex); // A, B, C, D
          let answerText = `${answerLetter}) ${this.cleanText(answer.text)}`;

          // Javoblar kalitida to'g'ri javobni belgilash
          if (options.isAnswerKey && answer.isCorrect) {
            answerText += ' ✓';
          }

          doc
            .fontSize(10)
            .font('Helvetica')
            .text(answerText, 90, yPosition, {
              width: pageWidth - 40,
              lineGap: 2,
            });

          yPosition +=
            this.calculateTextHeight(doc, answerText, pageWidth - 40, 10) + 8;
        });
      } else if (
        question.type === 'essay' ||
        question.type === 'short_answer'
      ) {
        // Ochiq savol uchun javob joyi
        doc
          .fontSize(10)
          .font('Helvetica')
          .text('Javob: ________________________________', 90, yPosition, {
            width: pageWidth - 40,
          });
        yPosition += 30;
      } else if (question.type === 'true_false') {
        // To'g'ri/noto'g'ri savol
        const trueText =
          options.isAnswerKey &&
          question.answers?.find(
            (a) => a.isCorrect && a.text.toLowerCase().includes("to'g'ri"),
          )
            ? "A) To'g'ri ✓"
            : "A) To'g'ri";
        const falseText =
          options.isAnswerKey &&
          question.answers?.find(
            (a) => a.isCorrect && a.text.toLowerCase().includes("noto'g'ri"),
          )
            ? "B) Noto'g'ri ✓"
            : "B) Noto'g'ri";

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(trueText, 90, yPosition, { width: pageWidth - 40 });
        yPosition += 18;
        doc.text(falseText, 90, yPosition, { width: pageWidth - 40 });
        yPosition += 18;
      }

      yPosition += 20; // Savollar orasidagi bo'shliq
    });
  }

  /**
   * Exam variant PDF yaratish
   */
  private createExamVariantPDF(
    variant: ExamVariant,
    options: PDFGenerationOptions,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true,
        });

        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Exam variant ma'lumotlari
        const pageWidth = doc.page.width - 100;

        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .text(variant.exam?.title || 'IMTIHON', 50, 50, {
            align: 'center',
            width: pageWidth,
          });

        doc
          .fontSize(14)
          .font('Helvetica')
          .text(`Variant: ${variant.variantNumber}`, 50, 100, {
            align: 'center',
            width: pageWidth,
          });

        if (variant.student) {
          doc
            .fontSize(12)
            .font('Helvetica')
            .text(
              `Talaba: ${variant.student.firstName} ${variant.student.lastName}`,
              50,
              130,
              {
                align: 'center',
                width: pageWidth,
              },
            );
        }

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 50, 160, {
            align: 'center',
            width: pageWidth,
          });

        // Chiziq
        doc
          .moveTo(50, 190)
          .lineTo(doc.page.width - 50, 190)
          .stroke();

        // Variant questions qo'shish (agar mavjud bo'lsa)
        if (variant.questions && variant.questions.length > 0) {
          // ExamVariantQuestion larni Question formatiga o'tkazish
          const questions = variant.questions.map((vq) => ({
            id: vq.id,
            text: vq.questionText,
            type: 'multiple_choice' as any,
            points: vq.points || 1,
            order: vq.order,
            hasFormula: false,
            imageBase64: null,
            metadata: null,
            answers: vq.options
              ? vq.options.map((opt: string, idx: number) => ({
                  id: idx,
                  text: opt,
                  isCorrect: vq.correctAnswer === String.fromCharCode(65 + idx),
                  order: idx,
                  hasFormula: false,
                  explanation: null,
                }))
              : [],
            test: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          this.addQuestionsToPDF(
            doc,
            questions as any as Question[],
            options,
            210,
          );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Matnni tozalash (HTML taglar va ortiqcha belgilarni olib tashlash)
   */
  private cleanText(text: string): string {
    if (!text) return '';

    // HTML taglarni olib tashlash
    let cleanText = text.replace(/<[^>]*>/g, ' ');

    // LaTeX formulalarni oddiy tekstga aylantirish
    cleanText = cleanText.replace(/\$\$(.*?)\$\$/g, '[$1]');
    cleanText = cleanText.replace(/\$(.*?)\$/g, '[$1]');

    // Ortiqcha bo'shliqlarni tozalash
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    return cleanText;
  }

  /**
   * Matn balandligini hisoblash (taxminiy)
   */
  private calculateTextHeight(
    doc: typeof PDFDocument,
    text: string,
    width: number,
    fontSize: number,
  ): number {
    const averageCharWidth = fontSize * 0.6;
    const charsPerLine = Math.floor(width / averageCharWidth);
    const lines = Math.ceil(text.length / charsPerLine);
    return lines * (fontSize + 3); // fontSize + lineGap
  }

  /**
   * HTML content dan to'g'ridan-to'g'ri PDF yaratish (backup method)
   */
  async generatePDFFromHTML(
    html: string,
    title: string = 'Document',
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Cheerio yordamida HTML parse qilish
        const $ = cheerio.load(html);

        // Title
        const pageTitle = $('title').text() || title;
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .text(pageTitle, { align: 'center' });
        doc.moveDown(2);

        // Body content
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
        if (bodyText) {
          doc
            .fontSize(11)
            .font('Helvetica')
            .text(bodyText, {
              width: doc.page.width - 100,
              lineGap: 3,
            });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
