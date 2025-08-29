import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import TelegramBot from 'node-telegram-bot-api';
import { ConfigService } from '@nestjs/config';
import { TelegramChat, ChatType, ChatStatus } from './entities/telegram-chat.entity';
import { TelegramAnswer, AnswerStatus } from './entities/telegram-answer.entity';
import { User } from '../users/entities/user.entity';
import { Test } from '../tests/entities/test.entity';
import { Question } from '../questions/entities/question.entity';
import { Answer } from '../questions/entities/answer.entity';
import { CreateTelegramChatDto, SendTestToChannelDto, SubmitAnswerDto } from './dto/telegram.dto';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot;

  constructor(
    @InjectRepository(TelegramChat)
    private telegramChatRepo: Repository<TelegramChat>,
    @InjectRepository(TelegramAnswer)
    private telegramAnswerRepo: Repository<TelegramAnswer>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Test)
    private testRepo: Repository<Test>,
    @InjectRepository(Question)
    private questionRepo: Repository<Question>,
    @InjectRepository(Answer)
    private answerRepo: Repository<Answer>,
    private configService: ConfigService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (token) {
      this.bot = new TelegramBot(token, { polling: false });
      this.logger.log('Telegram bot initialized');
    } else {
      this.logger.warn('Telegram bot token not configured');
    }
  }

  // ==================== Chat Management ====================

  async createOrUpdateChat(dto: CreateTelegramChatDto): Promise<TelegramChat> {
    const existingChat = await this.telegramChatRepo.findOne({
      where: { chatId: dto.chatId },
      relations: ['user'],
    });

    if (existingChat) {
      Object.assign(existingChat, dto);
      existingChat.lastActivity = new Date();
      return this.telegramChatRepo.save(existingChat);
    }

    const user = dto.userId ? await this.userRepo.findOne({ where: { id: dto.userId } }) : null;
    
    const newChat = this.telegramChatRepo.create({
      chatId: dto.chatId,
      type: dto.type,
      status: ChatStatus.ACTIVE,
      title: dto.title,
      username: dto.username,
      telegramUserId: dto.telegramUserId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      telegramUsername: dto.telegramUsername,
      lastActivity: new Date(),
    });

    if (user) {
      newChat.user = user;
    }

    return this.telegramChatRepo.save(newChat);
  }

  async linkUserToChat(userId: number, chatId: string): Promise<TelegramChat> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const chat = await this.telegramChatRepo.findOne({ where: { chatId } });
    if (!chat) {
      throw new BadRequestException('Telegram chat not found');
    }

    chat.user = user;
    return this.telegramChatRepo.save(chat);
  }

  async getUserChats(userId: number): Promise<TelegramChat[]> {
    return this.telegramChatRepo.find({
      where: { user: { id: userId } },
      order: { lastActivity: 'DESC' },
    });
  }

  // ==================== Test Distribution ====================

  async sendTestToChannel(dto: SendTestToChannelDto): Promise<boolean> {
    if (!this.bot) {
      throw new BadRequestException('Telegram bot not configured');
    }

    const test = await this.testRepo.findOne({
      where: { id: dto.testId },
      relations: ['subject', 'teacher', 'questions', 'questions.answers'],
    });

    if (!test) {
      throw new BadRequestException('Test not found');
    }

    const channel = await this.telegramChatRepo.findOne({
      where: { chatId: dto.channelId, type: ChatType.CHANNEL },
    });

    if (!channel) {
      throw new BadRequestException('Channel not found');
    }

    try {
      const message = this.formatTestMessage(test, dto.customMessage);
      
      await this.bot.sendMessage(dto.channelId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });

      // Send questions one by one
      for (let i = 0; i < test.questions.length; i++) {
        const question = test.questions[i];
        const questionMessage = this.formatQuestionMessage(question, i + 1, dto.testId);
        
        await this.bot.sendMessage(dto.channelId, questionMessage, {
          parse_mode: 'HTML',
        });

        // Small delay between messages
        await this.delay(500);
      }

      // Send instructions for answering
      const instructionsMessage = this.getAnswerInstructions(dto.testId);
      await this.bot.sendMessage(dto.channelId, instructionsMessage, {
        parse_mode: 'HTML',
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to send test to channel:', error);
      throw new BadRequestException('Failed to send test to Telegram channel');
    }
  }

  // ==================== Answer Processing ====================

  async processAnswer(dto: SubmitAnswerDto): Promise<TelegramAnswer> {
    // Find the student by Telegram user ID
    const chat = await this.telegramChatRepo.findOne({
      where: { telegramUserId: dto.telegramUserId },
      relations: ['user'],
    });

    if (!chat || !chat.user) {
      throw new BadRequestException('Student not found. Please link your Telegram account first.');
    }

    // Check if answer already exists
    const existingAnswer = await this.telegramAnswerRepo.findOne({
      where: {
        messageId: dto.messageId,
        testId: dto.testId,
        questionNumber: dto.questionNumber,
        student: { id: chat.user.id },
      },
    });

    if (existingAnswer) {
      throw new BadRequestException('Answer already submitted for this question');
    }

    const answer = this.telegramAnswerRepo.create({
      messageId: dto.messageId,
      testId: dto.testId,
      questionNumber: dto.questionNumber,
      answerText: dto.answerText.trim(),
      status: AnswerStatus.PENDING,
      student: chat.user,
      chat,
    });

    const savedAnswer = await this.telegramAnswerRepo.save(answer);

    // Process the answer immediately
    await this.checkAnswer(savedAnswer.id);

    return savedAnswer;
  }

  async checkAnswer(answerId: number): Promise<void> {
    const answer = await this.telegramAnswerRepo.findOne({
      where: { id: answerId },
      relations: ['student', 'chat'],
    });

    if (!answer) {
      throw new BadRequestException('Answer not found');
    }

    try {
      // Get the question and correct answer
      const question = await this.questionRepo.findOne({
        where: { 
          test: { id: answer.testId },
          order: answer.questionNumber 
        },
        relations: ['answers', 'test'],
      });

      if (!question) {
        this.logger.warn(`Question not found for test ${answer.testId}, question ${answer.questionNumber}`);
        return;
      }

      const correctAnswer = question.answers.find(a => a.isCorrect);
      if (!correctAnswer) {
        this.logger.warn(`No correct answer found for question ${question.id}`);
        return;
      }

      // Check if the answer is correct
      const isCorrect = this.compareAnswers(answer.answerText, correctAnswer.text);
      const points = isCorrect ? question.points : 0;

      // Update the answer
      answer.isCorrect = isCorrect;
      answer.correctAnswer = correctAnswer.text;
      answer.points = points;
      answer.status = AnswerStatus.CHECKED;
      answer.checkedAt = new Date();

      await this.telegramAnswerRepo.save(answer);

      // Send result back to the student
      await this.sendAnswerResult(answer);

    } catch (error) {
      this.logger.error('Failed to check answer:', error);
      answer.status = AnswerStatus.INVALID;
      await this.telegramAnswerRepo.save(answer);
    }
  }

  // ==================== Results Publishing ====================

  async publishTestResults(testId: number, channelId: string): Promise<void> {
    if (!this.bot) {
      throw new BadRequestException('Telegram bot not configured');
    }

    const answers = await this.telegramAnswerRepo.find({
      where: { testId, status: AnswerStatus.CHECKED },
      relations: ['student'],
      order: { student: { lastName: 'ASC' }, questionNumber: 'ASC' },
    });

    if (answers.length === 0) {
      await this.bot.sendMessage(channelId, '📊 <b>Test Results</b>\n\nNo answers submitted yet.', {
        parse_mode: 'HTML',
      });
      return;
    }

    // Group answers by student
    const studentResults = this.groupAnswersByStudent(answers);
    
    const resultsMessage = this.formatResultsMessage(testId, studentResults);

    try {
      await this.bot.sendMessage(channelId, resultsMessage, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      this.logger.error('Failed to publish results:', error);
      throw new BadRequestException('Failed to publish results to channel');
    }
  }

  // ==================== Helper Methods ====================

  private formatTestMessage(test: Test, customMessage?: string): string {
    const header = '📝 <b>NEW TEST AVAILABLE</b>\n\n';
    const testInfo = `<b>📚 Subject:</b> ${test.subject?.name || 'N/A'}\n`;
    const title = `<b>🎯 Test:</b> ${test.title}\n`;
    const description = test.description ? `<b>📖 Description:</b> ${test.description}\n` : '';
    const duration = `<b>⏱ Duration:</b> ${test.duration} minutes\n`;
    const questions = `<b>❓ Questions:</b> ${test.questions?.length || 0}\n`;
    const points = `<b>🎯 Total Points:</b> ${test.totalPoints}\n\n`;
    
    const custom = customMessage ? `${customMessage}\n\n` : '';
    
    return header + testInfo + title + description + duration + questions + points + custom;
  }

  private formatQuestionMessage(question: Question, number: number, testId: number): string {
    let message = `<b>Question ${number}:</b>\n${question.text}\n\n`;
    
    if (question.imageBase64) {
      message += '🖼 [Image attached]\n\n';
    }

    if (question.answers && question.answers.length > 0) {
      message += '<b>Options:</b>\n';
      question.answers.forEach((answer, index) => {
        const letter = String.fromCharCode(65 + index); // A, B, C, D...
        message += `${letter}) ${answer.text}\n`;
      });
    }

    message += `\n<b>Points:</b> ${question.points}`;
    message += `\n\n<i>To answer, reply with: #T${testId}Q${number} YOUR_ANSWER</i>`;

    return message;
  }

  private getAnswerInstructions(testId: number): string {
    return `📋 <b>HOW TO SUBMIT ANSWERS</b>\n\n` +
           `To submit your answers, send messages in this format:\n` +
           `<code>#T${testId}Q1 A</code> (for question 1, answer A)\n` +
           `<code>#T${testId}Q2 B</code> (for question 2, answer B)\n\n` +
           `⚠️ <b>Important:</b>\n` +
           `• Use the exact format shown above\n` +
           `• Send one message per question\n` +
           `• You can change your answer by sending a new message\n` +
           `• Results will be posted automatically after checking\n\n` +
           `Good luck! 🍀`;
  }

  private async sendAnswerResult(answer: TelegramAnswer): Promise<void> {
    if (!this.bot || !answer.chat) return;

    const emoji = answer.isCorrect ? '✅' : '❌';
    const status = answer.isCorrect ? 'Correct' : 'Incorrect';
    
    let message = `${emoji} <b>Question ${answer.questionNumber} - ${status}</b>\n\n`;
    message += `<b>Your answer:</b> ${answer.answerText}\n`;
    
    if (!answer.isCorrect && answer.correctAnswer) {
      message += `<b>Correct answer:</b> ${answer.correctAnswer}\n`;
    }
    
    message += `<b>Points earned:</b> ${answer.points || 0}`;

    try {
      await this.bot.sendMessage(answer.chat.chatId, message, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      this.logger.error('Failed to send answer result:', error);
    }
  }

  private compareAnswers(studentAnswer: string, correctAnswer: string): boolean {
    // Normalize both answers for comparison
    const normalize = (text: string) => 
      text.toLowerCase()
          .trim()
          .replace(/[^\w\s]/g, '') // Remove punctuation
          .replace(/\s+/g, ' '); // Normalize whitespace

    return normalize(studentAnswer) === normalize(correctAnswer);
  }

  private groupAnswersByStudent(answers: TelegramAnswer[]): Map<string, TelegramAnswer[]> {
    const grouped = new Map<string, TelegramAnswer[]>();
    
    answers.forEach(answer => {
      const studentKey = `${answer.student.firstName} ${answer.student.lastName}`;
      if (!grouped.has(studentKey)) {
        grouped.set(studentKey, []);
      }
      grouped.get(studentKey)!.push(answer);
    });

    return grouped;
  }

  private formatResultsMessage(testId: number, studentResults: Map<string, TelegramAnswer[]>): string {
    let message = `📊 <b>TEST RESULTS - Test #${testId}</b>\n\n`;

    studentResults.forEach((answers, studentName) => {
      const totalPoints = answers.reduce((sum, answer) => sum + (answer.points || 0), 0);
      const correctAnswers = answers.filter(answer => answer.isCorrect).length;
      const totalQuestions = answers.length;
      const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      message += `👤 <b>${studentName}</b>\n`;
      message += `   ✅ Correct: ${correctAnswers}/${totalQuestions} (${percentage}%)\n`;
      message += `   🎯 Points: ${totalPoints}\n\n`;
    });

    message += `<i>Updated: ${new Date().toLocaleString()}</i>`;

    return message;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== Public Methods for Statistics ====================

  async getTestStatistics(testId: number): Promise<any> {
    const answers = await this.telegramAnswerRepo.find({
      where: { testId, status: AnswerStatus.CHECKED },
      relations: ['student'],
    });

    const studentResults = this.groupAnswersByStudent(answers);
    const totalStudents = studentResults.size;
    const totalAnswers = answers.length;
    const correctAnswers = answers.filter(a => a.isCorrect).length;

    return {
      testId,
      totalStudents,
      totalAnswers,
      correctAnswers,
      accuracy: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
      studentResults: Array.from(studentResults.entries()).map(([name, answers]) => ({
        student: name,
        totalQuestions: answers.length,
        correctAnswers: answers.filter(a => a.isCorrect).length,
        totalPoints: answers.reduce((sum, a) => sum + (a.points || 0), 0),
      })),
    };
  }
}