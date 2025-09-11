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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pageWidth = doc.page.width;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pageHeight = doc.page.height;
    const margin = 50;
    const columnWidth = (pageWidth - margin * 2 - 40) / 2; // 40px gap between columns

    // Header
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Bold')
      .fontSize(16)
      .text(config.title || `${subjectName} testi`, margin, margin, {
        width: pageWidth - margin * 2,
        align: 'center',
      });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(0.5);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Roman')
      .fontSize(12)
      .text(`Variant ${variant.variantNumber} • #${variant.uniqueNumber}`, {
        align: 'center',
      });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(1);

    // Test info
    const testInfo = [
      `Fan: ${subjectName}`,
      `Vaqt: ${config.timeLimit} daqiqa`,
      `Savollar soni: ${variant.questions.length}`,
      `Sana: ${new Date().toLocaleDateString('uz-UZ')}`,
    ];

    testInfo.forEach((info) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc.text(info, margin, doc.y, { width: pageWidth - margin * 2 });
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(1);

    // Student info section
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.font('Times-Bold').fontSize(12);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text("Talaba ma'lumotlari:", margin, doc.y);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.font('Times-Roman').fontSize(10);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text(
      'Ism-familiya: _________________________________',
      margin,
      doc.y + 15,
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text(
      'Guruh: _______________  Variant: _______________',
      margin,
      doc.y + 15,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(1.5);

    // Line separator
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .moveTo(margin, doc.y)
      .lineTo(pageWidth - margin, doc.y)
      .stroke();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(0.5);

    // Questions in 2-column layout
    const startY = doc.y;
    let leftY = startY;
    let rightY = startY;
    let currentColumn = 'left';
    let questionCounter = 1;

    variant.questions.forEach((question) => {
      const questionText = `${questionCounter}. ${question.text}`;

      // Calculate space needed for this question (text + answers + padding)
      const answerCount = question.answers?.length || 0;
      const spaceNeeded = 30 + answerCount * 15 + 20; // base + answers + padding

      let xPos: number;
      let yPos: number;

      // Determine position and column
      if (currentColumn === 'left') {
        if (leftY + spaceNeeded > pageHeight - 100) {
          // Switch to right column
          currentColumn = 'right';
          xPos = margin + columnWidth + 40;
          yPos = rightY;
          rightY += spaceNeeded;
        } else {
          xPos = margin;
          yPos = leftY;
          leftY += spaceNeeded;
        }
      } else {
        if (rightY + spaceNeeded > pageHeight - 100) {
          // Add new page
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          doc.addPage();
          leftY = margin + 50;
          rightY = margin + 50;
          currentColumn = 'left';
          xPos = margin;
          yPos = leftY;
          leftY += spaceNeeded;
        } else {
          xPos = margin + columnWidth + 40;
          yPos = rightY;
          rightY += spaceNeeded;
        }
      }

      // Draw question
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc.font('Times-Roman').fontSize(11).text(questionText, xPos, yPos, {
        width: columnWidth,
        align: 'left',
      });

      // Draw answers
      if (question.answers && question.answers.length > 0) {
        let answerY = yPos + 20;
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

        question.answers.forEach((answer, index) => {
          const letter = letters[index] || `${index + 1}`;
          const answerText = `${letter}) ${answer.text}`;

          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          doc
            .font('Times-Roman')
            .fontSize(10)
            .text(answerText, xPos + 15, answerY, {
              width: columnWidth - 20,
            });
          answerY += 15;
        });
      } else if (question.type === QuestionType.TRUE_FALSE) {
        const answerY = yPos + 20;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc
          .font('Times-Roman')
          .fontSize(10)
          .text("A) To'g'ri", xPos + 15, answerY, { width: columnWidth - 20 });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc.text("B) Noto'g'ri", xPos + 15, answerY + 15, {
          width: columnWidth - 20,
        });
      } else if (question.type === QuestionType.ESSAY) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc
          .font('Times-Roman')
          .fontSize(10)
          .text(
            'Javob: _________________________________',
            xPos + 15,
            yPos + 20,
            {
              width: columnWidth - 20,
            },
          );
      }

      questionCounter++;
    });

    // Footer
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
