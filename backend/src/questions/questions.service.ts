import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Question, QuestionType } from './entities/question.entity';
import { Answer } from './entities/answer.entity';
import { Test } from '../tests/entities/test.entity';
import type { CreateQuestionDto } from './dto/create-question.dto';
import type { UpdateQuestionDto } from './dto/update-question.dto';
import type { QuestionResponseDto } from './dto/question-response.dto';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
  ) {}

  async create(
    createQuestionDto: CreateQuestionDto,
    teacherid: number,
  ): Promise<QuestionResponseDto> {
    const test = await this.testRepository.findOne({
      where: { id: createQuestionDto.testid },
      relations: ['teacher', 'questions'],
    });

    if (!test) {
      throw new NotFoundException('Test topilmadi');
    }

    // Check if teacher owns this test
    if (test.teacher.id !== teacherid) {
      throw new ForbiddenException("Bu testga ruxsatingiz yo'q");
    }

    // Normalize numeric fields
    createQuestionDto.points = Math.round(Number(createQuestionDto.points || 1));
    if (createQuestionDto.order !== undefined) {
      createQuestionDto.order = Math.round(Number(createQuestionDto.order));
    }

    // Validate question type and answers
    this.validateQuestionData(createQuestionDto);

    // Set order if not provided
    if (!createQuestionDto.order) {
      createQuestionDto.order = test.questions.length;
    }

    // Create question
    const question = this.questionRepository.create({
      ...createQuestionDto,
      test,
    });

    const savedQuestion = await this.questionRepository.save(question);

    // Create answers if provided
    if (createQuestionDto.answers && createQuestionDto.answers.length > 0) {
      const answers = createQuestionDto.answers.map((answerDto, index) =>
        this.answerRepository.create({
          ...answerDto,
          order: answerDto.order ?? index,
          question: savedQuestion,
        }),
      );

      savedQuestion.answers = await this.answerRepository.save(answers);
    }

    // Update test statistics
    await this.updateTestStatistics(test.id);

    return this.mapToResponseDto(savedQuestion);
  }

  async findAllByTest(
    testid: number,
    teacherid: number,
  ): Promise<QuestionResponseDto[]> {
    const test = await this.testRepository.findOne({
      where: { id: testid },
      relations: ['teacher'],
    });

    if (!test) {
      throw new NotFoundException('Test topilmadi');
    }

    // Check if teacher owns this test
    if (test.teacher.id !== teacherid) {
      throw new ForbiddenException("Bu testga ruxsatingiz yo'q");
    }

    const questions = await this.questionRepository.find({
      where: { test: { id: testid } },
      relations: ['answers'],
      order: { order: 'ASC', createdAt: 'ASC' },
    });

    return questions.map((question) => this.mapToResponseDto(question));
  }

  async findOne(id: number, teacherid: number): Promise<QuestionResponseDto> {
    const question = await this.questionRepository.findOne({
      where: { id },
      relations: ['test', 'test.teacher', 'answers'],
    });

    if (!question) {
      throw new NotFoundException('Savol topilmadi');
    }

    // Check if teacher owns this Question's test
    if (question.test.teacher.id !== teacherid) {
      throw new ForbiddenException("Bu savolga ruxsatingiz yo'q");
    }

    return this.mapToResponseDto(question);
  }

  async update(
    id: number,
    updateQuestionDto: UpdateQuestionDto,
    teacherid: number,
  ): Promise<QuestionResponseDto> {
    const question = await this.questionRepository.findOne({
      where: { id },
      relations: ['test', 'test.teacher', 'answers'],
    });

    if (!question) {
      throw new NotFoundException('Savol topilmadi');
    }

    // Check if teacher owns this question's test
    if (question.test.teacher.id !== teacherid) {
      throw new ForbiddenException("Bu savolga ruxsatingiz yo'q");
    }

    // Validate question data if type is changing
    if (updateQuestionDto.type && updateQuestionDto.type !== question.type) {
      this.validateQuestionData(updateQuestionDto as CreateQuestionDto);
    }

    // Normalize numeric fields on update
    if (updateQuestionDto.points !== undefined) {
      updateQuestionDto.points = Math.round(Number(updateQuestionDto.points));
    }
    if (updateQuestionDto.order !== undefined) {
      updateQuestionDto.order = Math.round(Number(updateQuestionDto.order));
    }

    // Update question
    Object.assign(question, updateQuestionDto);
    const updatedQuestion = await this.questionRepository.save(question);

    // Update answers if provided
    if (updateQuestionDto.answers) {
      // Remove existing answers
      await this.answerRepository.delete({ question: { id } });

      // Create new answers
      const answers = updateQuestionDto.answers.map((answerDto, index) =>
        this.answerRepository.create({
          ...answerDto,
          order: answerDto.order ?? index,
          question: updatedQuestion,
        }),
      );

      updatedQuestion.answers = await this.answerRepository.save(answers);
    }

    // Update test statistics
    await this.updateTestStatistics(question.test.id);

    return this.mapToResponseDto(updatedQuestion);
  }

  async remove(id: number, teacherid: number): Promise<void> {
    const question = await this.questionRepository.findOne({
      where: { id },
      relations: ['test', 'test.teacher'],
    });

    if (!question) {
      throw new NotFoundException('Savol topilmadi');
    }

    // Check if teacher owns this question's test
    if (question.test.teacher.id !== teacherid) {
      throw new ForbiddenException("Bu savolga ruxsatingiz yo'q");
    }

    const testId = question.test.id;
    await this.questionRepository.remove(question);

    // Update test statistics
    await this.updateTestStatistics(testId);
  }

  async reorderQuestions(
    testid: number,
    questionIds: string[],
    teacherid: number,
  ): Promise<QuestionResponseDto[]> {
    const test = await this.testRepository.findOne({
      where: { id: testid },
      relations: ['teacher'],
    });

    if (!test) {
      throw new NotFoundException('Test topilmadi');
    }

    // Check if teacher owns this test
    if (test.teacher.id !== teacherid) {
      throw new ForbiddenException("Bu testga ruxsatingiz yo'q");
    }

    // Update question orders
    for (let i = 0; i < questionIds.length; i++) {
      await this.questionRepository.update(questionIds[i], { order: i });
    }

    return this.findAllByTest(testid, teacherid);
  }

  private validateQuestionData(questionDto: CreateQuestionDto): void {
    const { type, answers } = questionDto;

    switch (type) {
      case QuestionType.MULTIPLE_CHOICE:
        if (!answers || answers.length < 2) {
          throw new BadRequestException(
            "Ko'p variantli savol uchun kamida 2 ta javob kerak",
          );
        }
        // eslint-disable-next-line no-case-declarations
        const correctAnswers = answers.filter((a) => a.isCorrect);
        if (correctAnswers.length === 0) {
          throw new BadRequestException("Kamida bitta to'g'ri javob belgilang");
        }
        break;

      case QuestionType.TRUE_FALSE:
        if (!answers || answers.length !== 2) {
          throw new BadRequestException(
            "To'g'ri/Noto'g'ri savol uchun aynan 2 ta javob kerak",
          );
        }
        // eslint-disable-next-line no-case-declarations
        const trueAnswers = answers.filter((a) => a.isCorrect);
        if (trueAnswers.length !== 1) {
          throw new BadRequestException(
            "To'g'ri/Noto'g'ri savolda aynan bitta to'g'ri javob bo'lishi kerak",
          );
        }
        break;

      case QuestionType.ESSAY:
      case QuestionType.SHORT_ANSWER:
      case QuestionType.FILL_BLANK:
        // These types don't require predefined answers
        break;

      default:
        throw new BadRequestException("Noto'g'ri savol turi");
    }
  }

  private async updateTestStatistics(testid: number): Promise<void> {
    const questions = await this.questionRepository.find({
      where: { test: { id: testid } },
    });

    const totalQuestions = questions.length;
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    await this.testRepository.update(testid, {
      totalQuestions,
      totalPoints,
    });
  }

  private mapToResponseDto(question: Question): QuestionResponseDto {
    return {
      id: question.id,
      text: question.text,
      explanation: question.explanation,
      type: question.type,
      points: question.points,
      imageUrl: '',
      order: question.order,
      hasFormula: question.hasFormula,
      metadata: question.metadata,
      answers: question.answers
        ? question.answers
            .sort((a, b) => a.order - b.order)
            .map((answer) => ({
              id: answer.id,
              text: answer.text,
              isCorrect: answer.isCorrect,
              order: answer.order,
              hasFormula: answer.hasFormula,
              explanation: answer.explanation,
            }))
        : [],
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
  }
}
