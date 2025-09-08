import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import {
  AssignedTest,
  AssignedTestVariant,
} from './entities/assigned-test.entity';
import { Test } from '../tests/entities/test.entity';
import { Group } from '../groups/entities/group.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Question, QuestionType } from '../questions/entities/question.entity';
import { NotificationsService } from '../notifications/notifications.service';
import PDFDocument from 'pdfkit';

interface GenerateDto {
  baseTestId: number;
  groupId: number;
  numQuestions: number;
  shuffleAnswers?: boolean;
  title?: string;
}

@Injectable()
export class AssignedTestsService {
  constructor(
    @InjectRepository(AssignedTest)
    private assignedRepo: Repository<AssignedTest>,
    @InjectRepository(AssignedTestVariant)
    private variantRepo: Repository<AssignedTestVariant>,
    @InjectRepository(Test) private testRepo: Repository<Test>,
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    private notificationsService: NotificationsService,
  ) {}

  async generate(dto: GenerateDto, teacherId: number) {
    const teacher = await this.userRepo.findOne({
      where: { id: teacherId },
      relations: ['center'],
    });
    if (!teacher || teacher.role !== UserRole.TEACHER)
      throw new ForbiddenException("Faqat o'qituvchi");

    const [test, group] = await Promise.all([
      this.testRepo.findOne({
        where: { id: dto.baseTestId },
        relations: ['subject', 'teacher'],
      }),
      this.groupRepo.findOne({
        where: { id: dto.groupId },
        relations: ['center', 'students'],
      }),
    ]);
    if (!test) throw new NotFoundException('Asosiy test topilmadi');
    if (!group) throw new NotFoundException('Guruh topilmadi');
    if (!teacher.center || group.center?.id !== teacher.center.id)
      throw new ForbiddenException("Ruxsat yo'q");

    const allQuestions = await this.questionRepo.find({
      where: { test: { id: test.id } },
      relations: ['answers'],
    });
    if (!allQuestions.length)
      throw new NotFoundException("Testda savollar yo'q");

    // Function to shuffle array randomly
    const shuffleArray = <T>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Function to generate unique question combinations for each student
    const generateUniqueVariants = (
      questions: Question[],
      numQuestions: number,
      numStudents: number,
    ): Question[][] => {
      const variants: Question[][] = [];

      for (let i = 0; i < numStudents; i++) {
        // Shuffle the question pool for each student to get different order
        const shuffledPool = shuffleArray([...questions]);
        // Take first N questions for this variant
        const variant = shuffledPool.slice(
          0,
          Math.min(numQuestions, shuffledPool.length),
        );
        variants.push(variant);
      }

      return variants;
    };

    const assigned = this.assignedRepo.create({
      baseTest: test,
      group,
      teacher,
      title: dto.title || `${test.title} — blok`,
      numQuestions: Math.max(1, Math.round(dto.numQuestions || 1)),
      shuffleAnswers: dto.shuffleAnswers !== false,
    });
    const savedAssigned = await this.assignedRepo.save(assigned);

    const students = group.students || [];
    const uniqueVariants = generateUniqueVariants(
      allQuestions,
      assigned.numQuestions,
      students.length,
    );

    let variantNumber = 1;
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const studentQuestions = uniqueVariants[i];

      const payload = { questions: [] as any[] };
      for (const q of studentQuestions) {
        const entry: any = { questionId: q.id };

        if (assigned.shuffleAnswers && q.answers && q.answers.length > 1) {
          // Shuffle answers for this specific question and student
          const shuffledAnswers = shuffleArray([...q.answers]);
          const answerOrder = shuffledAnswers.map((a) => {
            const originalIndex = q.answers.findIndex(
              (original) => original.id === a.id,
            );
            return originalIndex;
          });

          entry.answerOrder = answerOrder;
          const correctIndex = q.answers.findIndex((a) => a.isCorrect);
          if (correctIndex >= 0) {
            entry.correctIndex = answerOrder.indexOf(correctIndex);
          }
        }

        payload.questions.push(entry);
      }

      const variant = this.variantRepo.create({
        assignedTest: savedAssigned,
        student,
        variantNumber: variantNumber++,
        payload,
      });
      await this.variantRepo.save(variant);
    }

    // Create notifications for all students in the group
    const studentIds = students.map((student) => student.id);
    try {
      await this.notificationsService.createTestNotification(
        savedAssigned.id,
        savedAssigned.title,
        studentIds,
      );
    } catch {
      // Don't fail the test creation if notification fails
    }

    return { id: savedAssigned.id };
  }

  async getMyAssignedTests(teacherId: number) {
    const teacher = await this.userRepo.findOne({
      where: { id: teacherId },
      relations: ['center'],
    });
    if (!teacher || teacher.role !== UserRole.TEACHER)
      throw new ForbiddenException("Faqat o'qituvchi");

    const assignedTests = await this.assignedRepo.find({
      where: { teacher: { id: teacherId } },
      relations: ['group', 'baseTest'],
      order: { createdAt: 'DESC' },
    });

    const result: Array<{
      id: number;
      title: string;
      group: { name: string };
      createdAt: Date;
      variants: Array<{
        id: number;
        student: { id: number; fullName: string };
        assignedAt: Date;
        completedAt?: Date;
        status: 'completed' | 'pending';
      }>;
    }> = [];

    for (const assigned of assignedTests) {
      const variants = await this.variantRepo.find({
        where: { assignedTest: { id: assigned.id } },
        relations: ['student'],
        order: { variantNumber: 'ASC' },
      });

      const variantsWithStatus = variants.map((v) => ({
        id: v.id,
        student: {
          id: v.student.id,
          fullName: v.student.fullName,
        },
        assignedAt: v.createdAt,
        completedAt: v.completedAt,
        status: v.completedAt ? ('completed' as const) : ('pending' as const),
      }));

      result.push({
        id: assigned.id,
        title: assigned.title,
        group: { name: assigned.group.name },
        createdAt: assigned.createdAt,
        variants: variantsWithStatus,
      });
    }

    return result;
  }

  async getTestAnswers(assignedTestId: number, teacherId: number) {
    const teacher = await this.userRepo.findOne({
      where: { id: teacherId },
      relations: ['center'],
    });
    if (!teacher || teacher.role !== UserRole.TEACHER)
      throw new ForbiddenException("Faqat o'qituvchi");

    const assignedTest = await this.assignedRepo.findOne({
      where: { id: assignedTestId, teacher: { id: teacherId } },
      relations: ['group', 'baseTest', 'variants'],
    });
    if (!assignedTest) throw new NotFoundException('Blok test topilmadi');

    const variants = await this.variantRepo.find({
      where: { assignedTest: { id: assignedTestId } },
      relations: ['student'],
      order: { variantNumber: 'ASC' },
    });

    const questions = await this.questionRepo.find({
      where: { test: { id: assignedTest.baseTest.id } },
      relations: ['answers'],
      order: { order: 'ASC' },
    });

    const result = {
      id: assignedTest.id,
      title: assignedTest.title,
      group: { name: assignedTest.group.name },
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        answers:
          q.answers?.map((a) => ({
            id: a.id,
            text: a.text,
            isCorrect: a.isCorrect,
          })) || [],
      })),
      variants: variants.map((v) => ({
        id: v.id,
        student: {
          id: v.student.id,
          fullName: v.student.fullName,
        },
        variantNumber: v.variantNumber,
        payload: v.payload,
        completedAt: v.completedAt,
        status: v.completedAt ? ('completed' as const) : ('pending' as const),
      })),
    };

    return result;
  }

  async generatePdf(
    assignedTestId: number,
    teacherId: number,
  ): Promise<Buffer> {
    const teacher = await this.userRepo.findOne({
      where: { id: teacherId },
      relations: ['center'],
    });
    if (!teacher || teacher.role !== UserRole.TEACHER)
      throw new ForbiddenException("Faqat o'qituvchi");

    const assignedTest = await this.assignedRepo.findOne({
      where: { id: assignedTestId, teacher: { id: teacherId } },
      relations: ['group', 'baseTest', 'baseTest.subject', 'variants'],
    });
    if (!assignedTest) throw new NotFoundException('Blok test topilmadi');

    const variants = await this.variantRepo.find({
      where: { assignedTest: { id: assignedTestId } },
      relations: ['student'],
      order: { variantNumber: 'ASC' },
    });

    const questions = await this.questionRepo.find({
      where: { test: { id: assignedTest.baseTest.id } },
      relations: ['answers'],
      order: { order: 'ASC' },
    });

    return this.generatePdfWithPDFKit(assignedTest, variants, questions);
  }

  private async generatePdfWithPDFKit(
    assignedTest: AssignedTest,
    variants: AssignedTestVariant[],
    questions: Question[],
  ): Promise<Buffer> {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
    return new Promise((resolve, reject) => {
      let doc: InstanceType<typeof PDFDocument>;
      try {
        // Create a new PDFDocument
        const title = assignedTest.title || 'Assigned Test';
        doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: title,
            Author: 'Universal LMS',
            Subject: 'Assigned Test Document',
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
          resolve(finalBuffer);
        });

        doc.on('error', (error) => {
          reject(error instanceof Error ? error : new Error(String(error)));
        });

        const subjectName =
          assignedTest.baseTest.subject?.name || "Fan ko'rsatilmagan";
        const totalStudents = variants.length;
        const totalQuestions = questions.length;
        const currentDate = new Date().toLocaleDateString('uz-UZ');

        // Generate title page
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text(`${subjectName.toUpperCase()} FANIDAN BLOK TEST`, {
            align: 'center',
          })
          .moveDown(1);

        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .text(title, { align: 'center' })
          .moveDown(2);

        // Add test information
        doc
          .fontSize(12)
          .font('Helvetica')
          .text(`Guruh: ${assignedTest.group.name}`, { align: 'center' })
          .text(`Savollar soni: ${totalQuestions} ta`, { align: 'center' })
          .text(`Variantlar soni: ${totalStudents} ta`, { align: 'center' })
          .text(`Sana: ${currentDate}`, { align: 'center' })
          .moveDown(2);

        // Add instructions
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text("KO'RSATMALAR:", { align: 'center' })
          .moveDown(1);

        const instructions = [
          'Barcha savollarga javob bering',
          "Har bir savol uchun faqat bitta to'g'ri javob mavjud",
          'Javoblarni aniq va tushunarli yozing',
          "Vaqtni to'g'ri taqsimlang",
          'Ishingizni tekshirib chiqing',
        ];

        doc.fontSize(11).font('Helvetica');
        instructions.forEach((instruction) => {
          doc.text(`• ${instruction}`, { indent: 50 });
        });
        doc.moveDown(2);

        // Add student info fields
        const studentFields = [
          'Ism: ___________________________',
          'Familiya: ___________________________',
          'Guruh: ___________________________',
          'Variant raqami: ___________________________',
          'Sana: ___________________________',
        ];

        studentFields.forEach((field) => {
          doc.text(field, { align: 'left', indent: 100 }).moveDown(0.5);
        });

        // Generate variants
        variants.forEach((variant) => {
          doc.addPage();

          // Variant header
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .text(title, { align: 'center' })
            .moveDown(0.5);

          doc
            .fontSize(12)
            .font('Helvetica')
            .text(`Guruh: ${assignedTest.group.name}`, { align: 'center' })
            .text(`Variant: ${variant.variantNumber}`, { align: 'center' })
            .text(`O'quvchi: ${variant.student.fullName}`, { align: 'center' })
            .text(`Sana: ${currentDate}`, { align: 'center' })
            .moveDown(1);

          // Add separator line
          doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(1);

          // Get questions for this variant
          const variantQuestionIds = variant.payload.questions.map(
            (q) => q.questionId,
          );
          const variantQuestions = questions.filter((q) =>
            variantQuestionIds.includes(q.id),
          );

          // Add questions
          variantQuestions.forEach((question, qIndex) => {
            const variantData = variant.payload.questions.find(
              (vq) => vq.questionId === question.id,
            );

            // Question text
            doc
              .fontSize(11)
              .font('Helvetica-Bold')
              .text(`${qIndex + 1}. ${question.text}`, {
                width: 495,
                lineGap: 2,
              })
              .moveDown(0.5);

            // Answers
            if (
              (question.type as string) === 'multiple_choice' &&
              variantData?.answerOrder
            ) {
              const shuffledAnswers = variantData.answerOrder.map(
                (orderIndex) => question.answers[orderIndex],
              );
              shuffledAnswers.forEach((answer, aIndex) => {
                doc
                  .fontSize(10)
                  .font('Helvetica')
                  .text(`${String.fromCharCode(65 + aIndex)}. ${answer.text}`, {
                    indent: 20,
                    width: 475,
                    lineGap: 1,
                  });
              });
            } else if ((question.type as string) === 'true_false') {
              doc
                .fontSize(10)
                .font('Helvetica')
                .text("A. To'g'ri", { indent: 20 })
                .text("B. Noto'g'ri", { indent: 20 });
            } else {
              doc
                .fontSize(10)
                .font('Helvetica')
                .text('Javob: _________________', { indent: 20 });
            }

            // Points
            doc
              .fontSize(9)
              .font('Helvetica')
              .text(`Ball: ${question.points || 1}`, {
                indent: 20,
                color: '#666666',
              })
              .moveDown(1);

            // Check if we need a new page
            if (doc.y > 700) {
              doc.addPage();
            }
          });

          // Footer
          doc
            .fontSize(10)
            .font('Helvetica')
            .text('Jami ball: ___________', {
              align: 'center',
              y: doc.page.height - 100,
            });
        });

        // Finalize the PDF
        doc.end();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private generateTestHtml(
    assignedTest: AssignedTest,
    variants: AssignedTestVariant[],
    questions: Question[],
  ): string {
    // Generate title page
    const titlePageHtml = this.generateTitlePage(
      assignedTest,
      variants,
      questions,
    );

    const variantHtml = variants
      .map((v) => {
        // Get the questions for this specific variant from the payload
        const variantQuestionIds = v.payload.questions.map((q) => q.questionId);
        const variantQuestions = questions.filter((q) =>
          variantQuestionIds.includes(q.id),
        );

        const studentQuestions = variantQuestions
          .map((q, index) => {
            const variantData = v.payload.questions.find(
              (vq) => vq.questionId === q.id,
            );
            let answersHtml = '';

            if (
              q.type === QuestionType.MULTIPLE_CHOICE &&
              variantData?.answerOrder
            ) {
              const shuffledAnswers = variantData.answerOrder.map(
                (orderIndex) => q.answers[orderIndex],
              );
              answersHtml = shuffledAnswers
                .map(
                  (a, i) =>
                    `<div style="margin: 5px 0; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
              ${String.fromCharCode(65 + i)}. ${a.text}
            </div>`,
                )
                .join('');
            } else if (q.type === QuestionType.TRUE_FALSE) {
              answersHtml = `
            <div style="margin: 5px 0; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">A. To'g'ri</div>
            <div style="margin: 5px 0; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">B. Noto'g'ri</div>
          `;
            } else {
              answersHtml = `<div style="margin: 5px 0; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">Javob: _________________</div>`;
            }

            return `
          <div style="margin: 20px 0; padding: 15px; border: 1px solid #ccc; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #333;">${index + 1}. ${q.text}</h4>
            <div style="margin: 10px 0;">
              ${answersHtml}
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 10px;">
              Ball: ${q.points}
            </div>
          </div>
        `;
          })
          .join('');

        return `
        <div style="page-break-before: always; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
            <h1 style="color: #333; margin: 0;">${assignedTest.title}</h1>
            <h3 style="color: #666; margin: 10px 0;">Guruh: ${assignedTest.group.name}</h3>
            <h3 style="color: #666; margin: 10px 0;">Variant: ${v.variantNumber}</h3>
            <h3 style="color: #666; margin: 10px 0;">O'quvchi: ${v.student.fullName}</h3>
            <p style="color: #999; margin: 5px 0;">Sana: ${new Date().toLocaleDateString('uz-UZ')}</p>
            <p style="color: #999; margin: 5px 0;">Savollar soni: ${variantQuestions.length}</p>
          </div>
          
          <div style="margin-top: 30px;">
            ${studentQuestions}
          </div>
          
          <div style="margin-top: 40px; text-align: center; border-top: 1px solid #ccc; padding-top: 20px;">
            <p style="color: #666;">Jami ball: ___________</p>
          </div>
        </div>
      `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${assignedTest.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
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
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .question { margin: 20px 0; padding: 15px; border: 1px solid #ccc; border-radius: 8px; }
          .answer { margin: 5px 0; padding: 5px; border: 1px solid #ddd; border-radius: 3px; }
          .footer { margin-top: 40px; text-align: center; border-top: 1px solid #ccc; padding-top: 20px; }
        </style>
      </head>
      <body>
        ${titlePageHtml}
        ${variantHtml}
      </body>
      </html>
    `;
  }

  private generateTitlePage(
    assignedTest: AssignedTest,
    variants: AssignedTestVariant[],
    questions: Question[],
  ): string {
    const subjectName =
      assignedTest.baseTest.subject?.name || "Fan nomi ko'rsatilmagan";
    const totalStudents = variants.length;
    const totalQuestions = questions.length;
    const currentDate = new Date().toLocaleDateString('uz-UZ');

    return `
      <div class="title-page">
        <h1>${subjectName.toUpperCase()} FANIDAN BLOK TEST</h1>
        <h2>${assignedTest.title}</h2>
        
        <div class="info">
          <p><strong>Guruh:</strong> ${assignedTest.group.name}</p>
          <p><strong>Savollar soni:</strong> ${totalQuestions} ta</p>
          <p><strong>Variantlar soni:</strong> ${totalStudents} ta</p>
          <p><strong>Sana:</strong> ${currentDate}</p>
        </div>
        
        <div class="instructions">
          <h3>KO'RSATMALAR:</h3>
          <ul>
            <li>Barcha savollarga javob bering</li>
            <li>Har bir savol uchun faqat bitta to'g'ri javob mavjud</li>
            <li>Javoblarni aniq va tushunarli yozing</li>
            <li>Vaqtni to'g'ri taqsimlang</li>
            <li>Ishingizni tekshirib chiqing</li>
          </ul>
        </div>
        
        <div class="student-info">
          <div class="field">
            <strong>Ism:</strong> ___________________________
          </div>
          <div class="field">
            <strong>Familiya:</strong> ___________________________
          </div>
          <div class="field">
            <strong>Guruh:</strong> ___________________________
          </div>
          <div class="field">
            <strong>Variant raqami:</strong> ___________________________
          </div>
          <div class="field">
            <strong>Sana:</strong> ___________________________
          </div>
        </div>
      </div>
    `;
  }
}
