import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as PDFDocument from 'pdfkit';
import { Test } from '../tests/entities/test.entity';
import { Question } from '../questions/entities/question.entity';

@Injectable()
export class TestPDFGeneratorService {
  private readonly logger = new Logger(TestPDFGeneratorService.name);

  constructor(
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
  ) {}

  async generateTestPDF(
    testId: number,
    userId: number,
    variant?: number,
  ): Promise<Buffer> {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      relations: ['subject', 'teacher', 'questions', 'questions.answers'],
    });

    if (!test) {
      throw new Error('Test topilmadi');
    }

    return new Promise((resolve, reject) => {
      try {
        const doc: PDFDocument = new PDFDocument({
          size: 'A4',
          margin: 50,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(20).text('EduOne Test Platformasi', { align: 'center' });
        doc.moveDown();

        // Test Info
        doc.fontSize(16).text(`Test: ${test.title}`, { underline: true });
        if (test.subject) {
          doc.text(`Fan: ${test.subject.name}`);
        }
        if (test.teacher) {
          doc.text(
            `O'qituvchi: ${test.teacher.firstName} ${test.teacher.lastName}`,
          );
        }
        doc.text(`Davomiyligi: ${test.duration} daqiqa`);
        doc.text(`Jami ball: ${test.totalPoints}`);
        doc.text(`Savollar soni: ${test.questions?.length || 0}`);

        if (variant) {
          doc.text(`Variant: ${variant}`, { align: 'right' });
        }

        doc.text(`Test ID: #T${testId}`, { align: 'right' });
        doc.text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, {
          align: 'right',
        });
        doc.moveDown(2);

        // Instructions
        doc.fontSize(12).text("Ko'rsatmalar:", { underline: true });
        doc.text("• Har bir savol uchun to'g'ri javob variantini belgilang");
        doc.text(
          '• Telegram botga javoblarni yuborish uchun quyidagi formatdan foydalaning:',
        );
        doc.text(`  #T${testId}Q1 A (1-savol uchun A javobi)`);
        doc.text(`  #T${testId}Q2 B (2-savol uchun B javobi)`);
        doc.text('• Har bir savol uchun alohida xabar yuboring');
        doc.moveDown(2);

        // Questions
        if (test.questions && test.questions.length > 0) {
          test.questions.forEach((question, index) => {
            const questionNumber = index + 1;

            // Question header
            doc.fontSize(14).text(`${questionNumber}. ${question.text}`, {
              continued: false,
            });

            // Question points
            doc
              .fontSize(10)
              .text(`(${question.points} ball)`, { align: 'right' });
            doc.moveDown(0.5);

            // Answer options
            if (question.answers && question.answers.length > 0) {
              doc.fontSize(12);
              question.answers.forEach((answer, answerIndex) => {
                const letter = String.fromCharCode(65 + answerIndex); // A, B, C, D...
                doc.text(`${letter}) ${answer.text}`);
              });
            }

            // Space for manual answer
            doc.moveDown(0.5);
            doc
              .fontSize(10)
              .text(
                `Javob: _____ (Telegram: #T${testId}Q${questionNumber} ___)`,
              );
            doc.moveDown(1);

            // Check if we need a new page
            if (doc.y > 700) {
              doc.addPage();
            }
          });
        }

        // Footer
        doc
          .fontSize(8)
          .text(
            'Bu test EduOne platformasi orqali yaratilgan',
            50,
            doc.page.height - 50,
            { align: 'center' },
          );

        doc.end();
      } catch (error: unknown) {
        this.logger.error('Error generating PDF:', error);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  async generateAnswerSheet(testId: number): Promise<Buffer> {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      relations: ['questions'],
    });

    if (!test) {
      throw new Error('Test topilmadi');
    }

    return new Promise((resolve, reject) => {
      try {
        const doc: PDFDocument = new PDFDocument({
          size: 'A4',
          margin: 50,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(18).text("JAVOB VARAG'I", { align: 'center' });
        doc.moveDown();

        doc.fontSize(14).text(`Test: ${test.title}`);
        doc.text(`Test ID: #T${testId}`);
        doc.text(`Savollar soni: ${test.questions?.length || 0}`);
        doc.moveDown();

        // Student info section
        doc.text("Talaba ma'lumotlari:");
        doc.text('Ism: ________________________');
        doc.text('Familiya: ________________________');
        doc.text('Guruh: ________________________');
        doc.text('Sana: ________________________');
        doc.moveDown(2);

        // Answer grid
        if (test.questions && test.questions.length > 0) {
          doc.fontSize(12).text('Javoblar:', { underline: true });
          doc.moveDown();

          const questionsPerRow = 5;
          const rows = Math.ceil(test.questions.length / questionsPerRow);

          for (let row = 0; row < rows; row++) {
            const startQuestion = row * questionsPerRow + 1;
            const endQuestion = Math.min(
              (row + 1) * questionsPerRow,
              test.questions.length,
            );

            let rowText = '';
            for (let q = startQuestion; q <= endQuestion; q++) {
              rowText += `${q.toString().padStart(2, '0')}: [A] [B] [C] [D]    `;
            }

            doc.text(rowText);
            doc.moveDown(0.8);
          }
        }

        // Telegram instructions
        doc.moveDown(2);
        doc
          .fontSize(10)
          .text('Telegram orqali javob yuborish:', { underline: true });
        doc.text('Har bir savol uchun alohida xabar yuboring:');
        doc.text(`Masalan: #T${testId}Q1 A`);
        doc.text(`         #T${testId}Q2 B`);

        doc.end();
      } catch (error: unknown) {
        this.logger.error('Error generating answer sheet:', error);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
}
