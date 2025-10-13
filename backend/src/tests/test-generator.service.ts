/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
import { LogsService } from 'src/logs/logs.service';

export interface GenerateTestDto {
  title: string;
  subjectId: number;
  questionCount: number;
  variantCount: number;
  timeLimit: number;
  difficulty: string;
  includeAnswers: boolean;
  showTitleSheet: boolean;
  testId?: number; // Optional test ID to base the generation on
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
    private logService: LogsService,
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
    void this.logService.log(
      `Available questions for subject ${subject.name}: test id ${dto.testId}`,
      'TestGenerator',
    );
    const availableQuestions = await this.questionRepository.find({
      where: {
        test: dto.testId
          ? { id: dto.testId }
          : { subject: { id: dto.subjectId } },
      },
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
  generateTestPDF(): Promise<Buffer> {
    // PDF generation is deprecated; use HTML printable flow instead
    return Promise.reject(
      new BadRequestException('PDF generation is disabled. Use HTML output.'),
    );
  }

  /**
   * Generate PDF for a single variant with 2-column layout
   */
  private async generateVariantPDF(
    doc: any,
    variant: TestVariant,
    config: GenerateTestDto,
    subjectName: string,
    contentMappings?: {
      latexMap?: Record<string, string>;
      imageMap?: Record<string, string>;
    },
  ): Promise<void> {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    const columnWidth = (pageWidth - margin * 2 - 60) / 2; // 60px gap between columns
    const columnSeparator = margin + columnWidth + 30; // Center line position

    // === HEADER PAGE ===
    if (config.showTitleSheet) {
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
    }

    // === QUESTIONS PAGE ===
    await this.generateQuestionsPage(
      doc,
      variant,
      config,
      pageWidth as number,
      pageHeight as number,
      margin,
      columnWidth,
      columnSeparator,
      contentMappings,
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
  private async generateQuestionsPage(
    doc: any,
    variant: TestVariant,
    config: GenerateTestDto,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    columnWidth: number,
    columnSeparator: number,
    contentMappings?: {
      latexMap?: Record<string, string>;
      imageMap?: Record<string, string>;
    },
  ): Promise<void> {
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

    for (let i = 0; i < variant.questions.length; i++) {
      const question = variant.questions[i];
      const questionText = `${questionCounter}. ${question.text}`;

      // Better space calculation with LaTeX and image support
      const processedQuestionForSpace = this.latexProcessor
        .processContentEnhanced
        ? this.latexProcessor.processContentEnhanced(questionText)
        : { hasImages: false, base64Images: [] };

      // More accurate space calculation
      const baseSpace = 50; // Space for question text (increased for better spacing)

      // Calculate answer space more accurately
      const answerCount = question.answers?.length || 0;
      let answerSpace = answerCount * 20; // 20px per answer line

      // Add space for True/False or Essay questions
      if (question.type === QuestionType.TRUE_FALSE) {
        answerSpace = 40; // Space for A) and B) options
      } else if (question.type === QuestionType.ESSAY) {
        answerSpace = 30; // Space for answer line
      }

      // Calculate image space
      const questionImageSpace = processedQuestionForSpace.hasImages
        ? (processedQuestionForSpace.base64Images?.length || 0) * 100
        : 0;

      // Calculate answer image space (rough estimate)
      let answerImageSpace = 0;
      if (question.answers) {
        question.answers.forEach((answer) => {
          if (this.latexProcessor.hasBase64Images(answer.text)) {
            answerImageSpace += 50; // Smaller space for answer images
          }
        });
      }

      const totalSpace =
        baseSpace + answerSpace + questionImageSpace + answerImageSpace + 30; // Total with padding

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

      // Draw question with enhanced LaTeX and image support using MathJax
      let processedQuestion =
        this.latexProcessor.processContentEnhanced(questionText);

      // Apply content mappings if provided
      if (contentMappings?.imageMap) {
        processedQuestion = {
          ...processedQuestion,
          ...this.latexProcessor.mapImageData(
            processedQuestion,
            contentMappings.imageMap,
          ),
        };
      }

      // Remove IMAGE placeholders that don't have data and LATEX_SVG placeholders
      let questionDisplayText = processedQuestion.text;
      processedQuestion.base64Images.forEach((imageInfo) => {
        if (!imageInfo.data || !imageInfo.data.startsWith('data:image/')) {
          // Replace IMAGE placeholder with empty string
          questionDisplayText = questionDisplayText.replace(
            imageInfo.placeholder,
            '',
          );
        } else {
          // Remove IMAGE placeholder since we'll render the image separately
          questionDisplayText = questionDisplayText.replace(
            imageInfo.placeholder,
            '',
          );
        }
      });

      // Remove LATEX_SVG placeholders since we'll render them as SVG
      processedQuestion.svgFormulas?.forEach((svgFormula) => {
        questionDisplayText = questionDisplayText.replace(
          svgFormula.placeholder,
          '',
        );
      });

      // Calculate text height for better positioning
      const textHeight = this.estimateTextHeight(
        questionDisplayText,
        columnWidth - 10,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc
        .font('Times-Roman')
        .fontSize(13)
        .text(questionDisplayText, xPos, yPos, {
          width: columnWidth - 10,
          align: 'left',
          lineGap: 3, // Increased line gap for better readability
        });

      let currentYPos = yPos + textHeight + 10; // Dynamic spacing based on text height      // Handle Base64 images in question if any
      if (processedQuestion.hasImages && processedQuestion.base64Images) {
        processedQuestion.base64Images.forEach((imageInfo) => {
          if (imageInfo.data && imageInfo.data.startsWith('data:image/')) {
            const imageData = this.latexProcessor.processBase64Image(
              imageInfo.data,
            );
            if (imageData && imageData.size < 1024 * 1024) {
              // Max 1MB
              try {
                // Use custom dimensions if available, otherwise default
                const imageWidth = imageInfo.width || 120;
                const imageHeight = imageInfo.height || 80;

                // Scale to fit column while maintaining aspect ratio
                const maxWidth = columnWidth - 20;
                const maxHeight = 120;

                let finalWidth = imageWidth;
                let finalHeight = imageHeight;

                // Scale down if too large
                if (finalWidth > maxWidth) {
                  const ratio = maxWidth / finalWidth;
                  finalWidth = maxWidth;
                  finalHeight = finalHeight * ratio;
                }

                if (finalHeight > maxHeight) {
                  const ratio = maxHeight / finalHeight;
                  finalHeight = maxHeight;
                  finalWidth = finalWidth * ratio;
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                doc.image(imageData.buffer, xPos + 10, currentYPos, {
                  width: finalWidth,
                  height: finalHeight,
                  align: 'left',
                });
                currentYPos += finalHeight + 10; // Space for image
              } catch (error) {
                console.warn('Failed to add image to PDF:', error);
                // Fallback: show placeholder text
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                doc
                  .font('Times-Roman')
                  .fontSize(10)
                  .text('[Rasm mavjud emas]', xPos + 10, currentYPos, {
                    width: columnWidth - 20,
                  });
                currentYPos += 15;
              }
            }
          } else {
            // Show placeholder for images without data
            const dimensions =
              imageInfo.width && imageInfo.height
                ? `${imageInfo.width}×${imageInfo.height}px`
                : '';
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            doc
              .font('Times-Roman')
              .fontSize(10)
              .text(`[Rasm ${dimensions}]`, xPos + 10, currentYPos, {
                width: columnWidth - 20,
              });
            currentYPos += 15;
          }
        });
      }

      // Handle SVG LaTeX formulas in question
      if (processedQuestion.hasLatex && processedQuestion.svgFormulas) {
        processedQuestion.svgFormulas.forEach((svgFormula) => {
          if (svgFormula.svg) {
            try {
              // Render SVG formula to PDF
              // PDF rendering removed; skip server-side SVG to PDF embedding
              this.latexProcessor.renderSvgToPdf();
              currentYPos += 45; // Space for SVG formula
            } catch (error) {
              console.warn('Failed to render LaTeX SVG formula:', error);
              // Fallback: show formula text in italic 12pt font
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              doc
                .font('Times-Italic')
                .fontSize(12)
                .text(svgFormula.formula, xPos + 10, currentYPos, {
                  width: columnWidth - 20,
                });
              currentYPos += 20;
            }
          }
        });
      }

      // Draw answers
      if (question.answers && question.answers.length > 0) {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

        // Process all answers with LaTeX support
        const processedAnswers = await Promise.all(
          question.answers.map((answer, index) => {
            const letter = letters[index] || `${index + 1}`;

            // Process LaTeX in answer text
            const processedAnswer = this.latexProcessor.processContentEnhanced(
              answer.text,
            );

            // Apply content mappings if provided
            if (contentMappings?.imageMap) {
              this.latexProcessor.mapImageData(
                processedAnswer,
                contentMappings.imageMap,
              );
            }

            // Remove IMAGE placeholders and LATEX_SVG placeholders
            let answerDisplayText = processedAnswer.text;
            processedAnswer.base64Images.forEach((imageInfo) => {
              if (
                !imageInfo.data ||
                !imageInfo.data.startsWith('data:image/')
              ) {
                // Replace IMAGE placeholder with empty string
                answerDisplayText = answerDisplayText.replace(
                  imageInfo.placeholder,
                  '',
                );
              } else {
                // Remove IMAGE placeholder since we'll render the image separately
                answerDisplayText = answerDisplayText.replace(
                  imageInfo.placeholder,
                  '',
                );
              }
            });

            // Remove LATEX_SVG placeholders since we'll render them as SVG
            processedAnswer.svgFormulas?.forEach((svgFormula) => {
              answerDisplayText = answerDisplayText.replace(
                svgFormula.placeholder,
                '',
              );
            });

            return {
              letter,
              processedAnswer,
              displayText: answerDisplayText,
            };
          }),
        );

        // Render each processed answer
        processedAnswers.forEach((answerData) => {
          const { letter, processedAnswer, displayText } = answerData;
          const answerText = `${letter}) ${displayText}`;

          // Don't show correct answer inline when answer key is enabled
          // Individual answers will be shown in the answer key section instead

          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          doc
            .font('Times-Roman')
            .fontSize(12)
            .text(answerText, xPos + 10, currentYPos, {
              width: columnWidth - 20,
              lineGap: 2, // Better line spacing for answers
            });

          // Calculate answer text height for better spacing
          const answerTextHeight = this.estimateTextHeight(
            answerText,
            columnWidth - 20,
          );
          currentYPos += Math.max(20, answerTextHeight + 5); // Dynamic spacing or minimum 20px

          // Handle SVG LaTeX formulas in answer
          if (processedAnswer.hasLatex && processedAnswer.svgFormulas) {
            processedAnswer.svgFormulas.forEach((svgFormula) => {
              if (svgFormula.svg) {
                try {
                  // Render SVG formula to PDF
                  // PDF rendering removed; skip server-side SVG to PDF embedding
                  this.latexProcessor.renderSvgToPdf();
                  currentYPos += 35; // Space for SVG formula
                } catch (error) {
                  console.warn(
                    'Failed to render LaTeX SVG formula in answer:',
                    error,
                  );
                  // Fallback: show formula text in italic 12pt font
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                  doc
                    .font('Times-Italic')
                    .fontSize(12)
                    .text(svgFormula.formula, xPos + 20, currentYPos, {
                      width: columnWidth - 30,
                    });
                  currentYPos += 15;
                }
              }
            });
          }

          // Handle Base64 images in answers
          if (processedAnswer.hasImages && processedAnswer.base64Images) {
            processedAnswer.base64Images.forEach((imageInfo) => {
              if (imageInfo.data) {
                const imageData = this.latexProcessor.processBase64Image(
                  imageInfo.data,
                );
                if (imageData && imageData.size < 512 * 1024) {
                  // Max 512KB for answer images
                  try {
                    // Use custom dimensions if available, otherwise default smaller for answers
                    const imageWidth = imageInfo.width
                      ? imageInfo.width * 0.5
                      : 60; // Scale down for answers
                    const imageHeight = imageInfo.height
                      ? imageInfo.height * 0.5
                      : 40;

                    // Scale to fit answer area
                    const maxWidth = columnWidth - 30;
                    const maxHeight = 60;

                    let finalWidth = imageWidth;
                    let finalHeight = imageHeight;

                    if (finalWidth > maxWidth) {
                      const ratio = maxWidth / finalWidth;
                      finalWidth = maxWidth;
                      finalHeight = finalHeight * ratio;
                    }

                    if (finalHeight > maxHeight) {
                      const ratio = maxHeight / finalHeight;
                      finalHeight = maxHeight;
                      finalWidth = finalWidth * ratio;
                    }

                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    doc.image(imageData.buffer, xPos + 20, currentYPos, {
                      width: finalWidth,
                      height: finalHeight,
                      align: 'left',
                    });
                    currentYPos += finalHeight + 5; // Space for image
                  } catch (error) {
                    console.warn('Failed to add answer image to PDF:', error);
                    // Fallback: show placeholder text
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    doc
                      .font('Times-Roman')
                      .fontSize(9)
                      .text('   [Rasm]', xPos + 20, currentYPos, {
                        width: columnWidth - 30,
                      });
                    currentYPos += 12;
                  }
                }
              } else {
                // This should not happen since we removed placeholders from display text
                // But keeping as fallback
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                doc
                  .font('Times-Roman')
                  .fontSize(9)
                  .text(`   [Rasm]`, xPos + 20, currentYPos, {
                    width: columnWidth - 30,
                  });
                currentYPos += 12;
              }
            });
          }
        });
      } else if (question.type === QuestionType.TRUE_FALSE) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc
          .font('Times-Roman')
          .fontSize(12)
          .text("A) To'g'ri", xPos + 10, currentYPos, {
            width: columnWidth - 20,
          });
        currentYPos += 18;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc.text("B) Noto'g'ri", xPos + 10, currentYPos, {
          width: columnWidth - 20,
        });
        currentYPos += 18;
      } else if (question.type === QuestionType.ESSAY) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        doc
          .font('Times-Roman')
          .fontSize(12)
          .text(
            'Javob: _________________________________',
            xPos + 10,
            currentYPos,
            {
              width: columnWidth - 20,
            },
          );
        currentYPos += 25;
      }

      // Update column position tracking
      if (currentColumn === 'left') {
        leftY = currentYPos + 10; // Add some padding between questions
      } else {
        rightY = currentYPos + 10; // Add some padding between questions
      }

      questionCounter++;
    }

    // Footer on questions page
    const footerY = pageHeight - 30;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Roman')
      .fontSize(8)
      .text(
        `EduOne LMS • ${new Date().toLocaleDateString('uz-UZ')} • Variant: ${variant.uniqueNumber}`,
        margin,
        footerY,
        {
          width: pageWidth - margin * 2,
          align: 'center',
        },
      );

    // Add answer key on separate page if enabled
    if (config.includeAnswers) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc.addPage();
      this.addAnswerKeyPage(doc, variant, pageWidth, pageHeight, margin);
    }
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
   * Estimate text height for better spacing
   */
  private estimateTextHeight(text: string, width: number): number {
    // Rough estimation: each character is about 7px wide, each line is about 16px tall
    const avgCharWidth = 7;
    const lineHeight = 16;
    const charsPerLine = Math.floor(width / avgCharWidth);
    const lines = Math.ceil(text.length / charsPerLine);
    return lines * lineHeight;
  }

  /**
   * Add answer key on a separate dedicated page
   */
  private addAnswerKeyPage(
    doc: any,
    variant: TestVariant,
    pageWidth: number,
    pageHeight: number,
    margin: number,
  ): void {
    // Page title
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Bold')
      .fontSize(18)
      .text('JAVOBLAR KALITI', margin, margin + 80, {
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
    doc.moveDown(3);

    // Generate answer key content
    const answersPerLine = 10; // Show 10 answers per line
    const totalQuestions = variant.questions.length;
    let currentY = doc.y;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    for (let i = 0; i < totalQuestions; i += answersPerLine) {
      let lineText = '';

      for (let j = 0; j < answersPerLine && i + j < totalQuestions; j++) {
        const questionIndex = i + j;
        const question = variant.questions[questionIndex];
        const questionNumber = questionIndex + 1;

        let correctAnswer = 'X'; // Default if no correct answer found

        if (question.answers && question.answers.length > 0) {
          const correctAnswerIndex = question.answers.findIndex(
            (answer) => answer.isCorrect,
          );
          if (correctAnswerIndex !== -1) {
            correctAnswer = letters[correctAnswerIndex] || 'X';
          }
        } else if (question.type === QuestionType.TRUE_FALSE) {
          // For True/False questions, check if there's a correct answer in the question data
          // This might be stored differently in your database structure
          if (question.answers && question.answers.length > 0) {
            const correctAnswerIndex = question.answers.findIndex(
              (answer) => answer.isCorrect,
            );
            correctAnswer = correctAnswerIndex === 0 ? 'A' : 'B';
          } else {
            // Try to determine from question text patterns (basic logic)
            const questionLower = question.text.toLowerCase();
            if (
              questionLower.includes("noto'g'ri") ||
              questionLower.includes("yolg'on")
            ) {
              correctAnswer = 'B'; // Likely false
            } else {
              correctAnswer = 'A'; // Default to true
            }
          }
        } else if (question.type === QuestionType.ESSAY) {
          correctAnswer = '-'; // No specific answer for essay questions
        }

        lineText += `${questionNumber}.${correctAnswer}    `;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc
        .font('Times-Roman')
        .fontSize(12)
        .text(lineText.trim(), margin + 20, currentY, {
          width: pageWidth - margin * 2 - 40,
          align: 'left',
        });

      currentY += 25; // More spacing between lines for better readability
    }

    // Instructions section
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.moveDown(3);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.font('Times-Bold').fontSize(12);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.text("Baholash ko'rsatmalari:", margin, doc.y);

    const instructions = [
      "• Har bir to'g'ri javob uchun 1 ball beriladi",
      "• Noto'g'ri javob uchun 0 ball beriladi",
      '• Javob bermaslik ham 0 ball deb hisoblanadi',
      '• Maksimal ball: ' + totalQuestions + ' ball',
    ];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc.font('Times-Roman').fontSize(11);
    instructions.forEach((instruction) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      doc.text(instruction, margin, doc.y + 15);
    });

    // Footer on answer key page
    const footerY = pageHeight - 30;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    doc
      .font('Times-Roman')
      .fontSize(8)
      .text(
        `EduOne LMS • Javoblar kaliti • ${new Date().toLocaleDateString('uz-UZ')}`,
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
