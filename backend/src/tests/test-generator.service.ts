/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-require-imports */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Test } from './entities/test.entity';
import { Question, QuestionType } from '../questions/entities/question.entity';
import { Subject } from '../subjects/entities/subject.entity';
import {
  GeneratedTest,
  GeneratedTestVariant,
} from './entities/generated-test.entity';
import { LatexProcessorService } from './latex-processor.service';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PDFDocument = require('pdfkit');

export interface GenerateTestDto {
  title: string;
  subjectId: number;
  questionCount: number;
  variantCount: number;
  timeLimit: number;
  difficulty: string;
  includeAnswers: boolean;
  showTitleSheet: boolean;
}

export interface TestVariant {
  id: string;
  variantNumber: string;
  uniqueNumber: string;
  questions: Question[];
  createdAt: Date;
}

@Injectable()
export class TestGeneratorService {
  constructor(
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
    @InjectRepository(GeneratedTest)
    private generatedTestRepository: Repository<GeneratedTest>,
    @InjectRepository(GeneratedTestVariant)
    private generatedTestVariantRepository: Repository<GeneratedTestVariant>,
    private latexProcessor: LatexProcessorService,
  ) {}

  /**
   * Generate unique 10-digit number for test variant
   */
  private generateUniqueNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return (timestamp.slice(-7) + random).padStart(10, '0');
  }

  /**
   * Generate random test variants
   */
  async generateRandomTest(dto: GenerateTestDto, teacherId: number) {
    // Validate subject
    const subject = await this.subjectRepository.findOne({
      where: { id: dto.subjectId },
    });

    if (!subject) {
      throw new NotFoundException('Fan topilmadi');
    }

    // Get available questions
    const availableQuestions = await this.questionRepository.find({
      where: { test: { subject: { id: dto.subjectId } } },
      relations: ['answers', 'test'],
    });

    if (availableQuestions.length === 0) {
      throw new BadRequestException('Tanlangan fanda savollar mavjud emas');
    }

    if (availableQuestions.length < dto.questionCount) {
      throw new BadRequestException(
        `Fanda ${availableQuestions.length} ta savol bor, lekin ${dto.questionCount} ta so'rayapsiz`,
      );
    }

    // Create generated test record
    const generatedTest = this.generatedTestRepository.create({
      title: dto.title || `${subject.name} testi`,
      description: '',
      variantCount: dto.variantCount,
      questionCount: dto.questionCount,
      timeLimit: dto.timeLimit,
      difficulty: dto.difficulty,
      includeAnswers: dto.includeAnswers,
      showTitleSheet: dto.showTitleSheet,
      teacher: { id: teacherId },
      subject: { id: dto.subjectId },
    });

    const savedGeneratedTest =
      await this.generatedTestRepository.save(generatedTest);

    // Generate variants
    const variants: TestVariant[] = [];
    for (let v = 1; v <= dto.variantCount; v++) {
      // Randomly select questions for this variant
      const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, dto.questionCount);

      // Shuffle answer options for multiple choice questions
      const questionsWithShuffledAnswers = selectedQuestions.map((q) => {
        if (
          q.type === QuestionType.MULTIPLE_CHOICE &&
          q.answers &&
          q.answers.length > 1
        ) {
          const shuffledAnswers = [...q.answers].sort(
            () => 0.5 - Math.random(),
          );
          return { ...q, answers: shuffledAnswers };
        }
        return q;
      });

      const uniqueNumber = this.generateUniqueNumber();

      // Save variant to database
      const variant = this.generatedTestVariantRepository.create({
        uniqueNumber,
        variantNumber: v,
        questionsData: questionsWithShuffledAnswers,
        generatedAt: new Date(),
        generatedTest: savedGeneratedTest,
      });

      await this.generatedTestVariantRepository.save(variant);

      variants.push({
        id: `${Date.now()}-${v}`,
        variantNumber: v.toString(),
        uniqueNumber,
        questions: questionsWithShuffledAnswers,
        createdAt: new Date(),
      });
    }

    return {
      id: savedGeneratedTest.id,
      title: dto.title || `${subject.name} testi`,
      subject: subject.name,
      variants,
      config: dto,
      totalQuestions: dto.questionCount,
      totalVariants: dto.variantCount,
    };
  }

  /**
   * Generate PDF for test variants with 2-column layout
   */
  async generateTestPDF(
    variants: TestVariant[],
    config: GenerateTestDto,
    subjectName: string,
  ): Promise<Buffer> {
    const PDFDoc = require('pdfkit');

    return new Promise((resolve, reject) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const doc = new PDFDoc({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Generate PDF for each variant
        variants.forEach((variant, variantIndex) => {
          if (variantIndex > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            doc.addPage();
          }

          this.generateVariantPDF(doc, variant, config, subjectName);
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc.end();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Generate PDF for a single variant with 2-column layout
   */
  private generateVariantPDF(
    doc: any,
    variant: TestVariant,
    config: GenerateTestDto,
    subjectName: string,
  ): void {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    const columnWidth = (pageWidth - margin * 2 - 60) / 2; // 60px gap between columns
    const columnSeparator = margin + columnWidth + 30; // Center line position

    // === HEADER PAGE ===
    this.generateHeaderPage(
      doc,
      variant,
      config,
      subjectName,
      pageWidth as number,
      margin,
    );

    // Add new page for questions
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.addPage();

    // === QUESTIONS PAGE ===
    this.generateQuestionsPage(
      doc,
      variant,
      config,
      pageWidth as number,
      pageHeight as number,
      margin,
      columnWidth,
      columnSeparator,
    );
  }

  /**
   * Generate header page with title and student info
   */
  private generateHeaderPage(
    doc: any,
    variant: TestVariant,
    config: GenerateTestDto,
    subjectName: string,
    pageWidth: number,
    margin: number,
  ): void {
    // Main title
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Bold')
      .fontSize(18)
      .text(config.title || `${subjectName} testi`, margin, margin + 80, {
        width: pageWidth - margin * 2,
        align: 'center',
      });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(1);

    // Variant info
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Roman')
      .fontSize(14)
      .text(`Variant ${variant.variantNumber}`, {
        align: 'center',
      });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.fontSize(12).text(`Unique ID: #${variant.uniqueNumber}`, {
      align: 'center',
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(2);

    // Test info box
    const infoStartY = doc.y;
    const boxHeight = 120;

    // Draw box
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .rect(margin + 50, infoStartY, pageWidth - margin * 2 - 100, boxHeight)
      .stroke();

    // Test info
    const testInfo = [
      `Fan: ${subjectName}`,
      `Vaqt: ${config.timeLimit} daqiqa`,
      `Savollar soni: ${variant.questions.length}`,
      `Sana: ${new Date().toLocaleDateString('uz-UZ')}`,
    ];

    let infoY = infoStartY + 20;
    testInfo.forEach((info) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc
        .font('Times-Roman')
        .fontSize(12)
        .text(info, margin + 70, infoY);
      infoY += 20;
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(3);

    // Student info section
    const studentInfoY = doc.y;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.font('Times-Bold').fontSize(14);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text("Talaba ma'lumotlari:", margin, studentInfoY);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.font('Times-Roman').fontSize(12);

    const fieldY = studentInfoY + 40;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text('Ism-familiya:', margin, fieldY);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .moveTo(margin + 80, fieldY + 15)
      .lineTo(pageWidth - margin, fieldY + 15)
      .stroke();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text('Guruh:', margin, fieldY + 40);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .moveTo(margin + 50, fieldY + 55)
      .lineTo(margin + 200, fieldY + 55)
      .stroke();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text('Variant:', margin + 250, fieldY + 40);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .moveTo(margin + 300, fieldY + 55)
      .lineTo(pageWidth - margin, fieldY + 55)
      .stroke();

    // Instructions
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(4);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.font('Times-Bold').fontSize(12);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text("Ko'rsatmalar:", margin, doc.y);

    const instructions = [
      "• Barcha savollarni diqqat bilan o'qing",
      "• Har bir savol uchun eng to'g'ri javobni tanlang",
      '• Javoblaringizni aniq va tushunarli yozing',
      '• Berilgan vaqt ichida ishni yakunlang',
    ];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.font('Times-Roman').fontSize(11);
    instructions.forEach((instruction) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc.text(instruction, margin, doc.y + 15);
    });
  }

  /**
   * Generate questions page with 2-column layout
   */
  private generateQuestionsPage(
    doc: any,
    variant: TestVariant,
    config: GenerateTestDto,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    columnWidth: number,
    columnSeparator: number,
  ): void {
    // Page header
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Bold')
      .fontSize(16)
      .text('SAVOLLAR', margin, margin, {
        width: pageWidth - margin * 2,
        align: 'center',
      });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(1);

    // Draw vertical line between columns on each page
    this.drawColumnSeparator(doc, columnSeparator, margin, pageHeight);

    // Questions in 2-column layout
    const startY = doc.y;
    let leftY = startY;
    let rightY = startY;
    let currentColumn = 'left';
    let questionCounter = 1;

    variant.questions.forEach((question) => {
      const questionText = `${questionCounter}. ${question.text}`;

      // Better space calculation with LaTeX and image support
      const processedQuestionForSpace =
        this.latexProcessor.processContent(questionText);
      const baseSpace = 40; // Space for question text
      const answerCount = question.answers?.length || 0;
      const answerSpace = answerCount * 18 + 10; // Space for answers
      const imageSpace = processedQuestionForSpace.hasImages
        ? (processedQuestionForSpace.base64Images?.length || 0) * 100
        : 0; // Space for images
      const totalSpace = baseSpace + answerSpace + imageSpace + 25; // Total with padding

      let xPos: number;
      let yPos: number;

      // Determine position and column
      if (currentColumn === 'left') {
        if (leftY + totalSpace > pageHeight - 80) {
          // Switch to right column
          currentColumn = 'right';
          xPos = columnSeparator + 30;
          yPos = rightY;
          rightY += totalSpace;
        } else {
          xPos = margin;
          yPos = leftY;
          leftY += totalSpace;
        }
      } else {
        if (rightY + totalSpace > pageHeight - 80) {
          // Add new page
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          doc.addPage();

          // Redraw column separator on new page
          this.drawColumnSeparator(doc, columnSeparator, margin, pageHeight);

          leftY = margin + 30;
          rightY = margin + 30;
          currentColumn = 'left';
          xPos = margin;
          yPos = leftY;
          leftY += totalSpace;
        } else {
          xPos = columnSeparator + 30;
          yPos = rightY;
          rightY += totalSpace;
        }
      }

      // Draw question with improved formatting and LaTeX support
      const processedQuestion =
        this.latexProcessor.processContent(questionText);
      const questionDisplayText = this.latexProcessor.convertLatexToText(
        processedQuestion.text,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc
        .font('Times-Roman')
        .fontSize(13)
        .text(questionDisplayText, xPos, yPos, {
          width: columnWidth - 10,
          align: 'left',
          lineGap: 2,
        });

      // Handle Base64 images in question if any
      if (processedQuestion.hasImages && processedQuestion.base64Images) {
        yPos += 30; // Add space after question text
        processedQuestion.base64Images.forEach((imageInfo) => {
          const imageData = this.latexProcessor.processBase64Image(
            imageInfo.data,
          );
          if (imageData && imageData.size < 1024 * 1024) {
            // Max 1MB
            try {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              doc.image(imageData.buffer, xPos + 10, yPos, {
                fit: [columnWidth - 20, 80],
                align: 'left',
              });
              yPos += 90; // Space for image
            } catch (error) {
              console.warn('Failed to add image to PDF:', error);
              // Fallback: show placeholder text
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              doc
                .font('Times-Roman')
                .fontSize(10)
                .text('[Rasm]', xPos + 10, yPos, {
                  width: columnWidth - 20,
                });
              yPos += 15;
            }
          }
        });
      }

      // Draw answers
      if (question.answers && question.answers.length > 0) {
        let answerY = yPos + 25;
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

        question.answers.forEach((answer, index) => {
          const letter = letters[index] || `${index + 1}`;

          // Process LaTeX in answer text
          const processedAnswer = this.latexProcessor.processContent(
            answer.text,
          );
          const answerDisplayText = this.latexProcessor.convertLatexToText(
            processedAnswer.text,
          );

          let answerText = `${letter}) ${answerDisplayText}`;

          // Show correct answer if answer key is enabled
          if (config.includeAnswers && answer.isCorrect) {
            answerText += ' ✓';
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          doc
            .font('Times-Roman')
            .fontSize(12)
            .text(answerText, xPos + 10, answerY, {
              width: columnWidth - 20,
              lineGap: 1,
            });

          answerY += 18;

          // Handle Base64 images in answers
          if (processedAnswer.hasImages && processedAnswer.base64Images) {
            processedAnswer.base64Images.forEach((imageInfo) => {
              const imageData = this.latexProcessor.processBase64Image(
                imageInfo.data,
              );
              if (imageData && imageData.size < 512 * 1024) {
                // Max 512KB for answer images
                try {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                  doc.image(imageData.buffer, xPos + 20, answerY, {
                    fit: [columnWidth - 30, 40],
                    align: 'left',
                  });
                  answerY += 45; // Space for image
                } catch (error) {
                  console.warn('Failed to add answer image to PDF:', error);
                  // Fallback: show placeholder text
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                  doc
                    .font('Times-Roman')
                    .fontSize(9)
                    .text('   [Rasm]', xPos + 20, answerY, {
                      width: columnWidth - 30,
                    });
                  answerY += 12;
                }
              }
            });
          }
        });
      } else if (question.type === QuestionType.TRUE_FALSE) {
        const answerY = yPos + 25;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc
          .font('Times-Roman')
          .fontSize(12)
          .text("A) To'g'ri", xPos + 10, answerY, { width: columnWidth - 20 });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc.text("B) Noto'g'ri", xPos + 10, answerY + 18, {
          width: columnWidth - 20,
        });
      } else if (question.type === QuestionType.ESSAY) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc
          .font('Times-Roman')
          .fontSize(12)
          .text(
            'Javob: _________________________________',
            xPos + 10,
            yPos + 25,
            {
              width: columnWidth - 20,
            },
          );
      }

      questionCounter++;
    });

    // Footer on last page
    const footerY = pageHeight - 30;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Roman')
      .fontSize(8)
      .text(
        `EduNimbus LMS • ${new Date().toLocaleDateString('uz-UZ')} • Variant: ${variant.uniqueNumber}`,
        margin,
        footerY,
        {
          width: pageWidth - margin * 2,
          align: 'center',
        },
      );
  }

  /**
   * Draw vertical line between columns
   */
  private drawColumnSeparator(
    doc: any,
    columnSeparator: number,
    margin: number,
    pageHeight: number,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .moveTo(columnSeparator, margin + 50)
      .lineTo(columnSeparator, pageHeight - 50)
      .stroke();
  }

  /**
   * Save generated test variants to database (optional)
   */
  saveGeneratedTest(generatedTest: any, teacherId: number): Promise<any> {
    // For now, we'll just return the generated test without saving
    // In the future, you can implement saving to a separate table
    return Promise.resolve({
      ...generatedTest,
      savedAt: new Date(),
      teacherId,
    });
  }
}
