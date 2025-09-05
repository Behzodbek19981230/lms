import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import TelegramBot from 'node-telegram-bot-api';
import { ConfigService } from '@nestjs/config';
import { TelegramAnswer, AnswerStatus } from './entities/telegram-answer.entity';
import { TelegramChat } from './entities/telegram-chat.entity';
import { Test } from '../tests/entities/test.entity';
import { Question } from '../questions/entities/question.entity';
import { Answer } from '../questions/entities/answer.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AnswerProcessorService {
  private readonly logger = new Logger(AnswerProcessorService.name);
  private bot: TelegramBot;

  constructor(
    @InjectRepository(TelegramAnswer)
    private telegramAnswerRepo: Repository<TelegramAnswer>,
    @InjectRepository(TelegramChat)
    private telegramChatRepo: Repository<TelegramChat>,
    @InjectRepository(Test)
    private testRepo: Repository<Test>,
    @InjectRepository(Question)
    private questionRepo: Repository<Question>,
    @InjectRepository(Answer)
    private answerRepo: Repository<Answer>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private configService: ConfigService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (token) {
      this.bot = new TelegramBot(token, { polling: false });
    }
  }

  /**
   * Process answer from telegram message
   * Expected format: #T123Q1 A
   */
  async processAnswerFromMessage(
    messageText: string,
    telegramUserId: string,
    messageId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Parse answer format: #T123Q1 A
      const answerMatch = messageText.match(/#T(\d+)Q(\d+)\s+([A-Za-z0-9]+)/);
      
      if (!answerMatch) {
        return {
          success: false,
          message: "❌ Noto'g'ri format. To'g'ri format: #T123Q1 A",
        };
      }

      const testId = parseInt(answerMatch[1]);
      const questionNumber = parseInt(answerMatch[2]);
      const answerText = answerMatch[3].toUpperCase().trim();

      // Find user by telegram ID
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user'],
      });

      if (!chat || !chat.user) {
        return {
          success: false,
          message: "❌ Hisobingiz ulanmagan. Avval /start buyrug'ini yuboring.",
        };
      }

      // Validate test exists
      const test = await this.testRepo.findOne({
        where: { id: testId },
        relations: ['questions', 'questions.answers'],
      });

      if (!test) {
        return {
          success: false,
          message: `❌ Test #T${testId} topilmadi.`,
        };
      }

      // Validate question number
      if (questionNumber < 1 || questionNumber > test.questions.length) {
        return {
          success: false,
          message: `❌ Savol raqami noto'g'ri. Test #T${testId} da ${test.questions.length} ta savol bor.`,
        };
      }

      // Check if answer already exists
      const existingAnswer = await this.telegramAnswerRepo.findOne({
        where: {
          testId,
          questionNumber,
          student: { id: chat.user.id },
        },
      });

      if (existingAnswer) {
        // Update existing answer
        existingAnswer.answerText = answerText;
        existingAnswer.messageId = messageId;
        existingAnswer.status = AnswerStatus.PENDING;
        existingAnswer.submittedAt = new Date();
        
        const savedAnswer = await this.telegramAnswerRepo.save(existingAnswer);
        await this.checkAnswer(savedAnswer.id);
        
        return {
          success: true,
          message: `✏️ Javob yangilandi: Test #T${testId}, Savol ${questionNumber} = ${answerText}`,
        };
      } else {
        // Create new answer
        const newAnswer = this.telegramAnswerRepo.create({
          messageId,
          questionNumber,
          answerText,
          status: AnswerStatus.PENDING,
          student: chat.user,
          chat: chat,
        });
        newAnswer.testId = testId;
        const savedAnswer = await this.telegramAnswerRepo.save(newAnswer);
        await this.checkAnswer(savedAnswer.id);

        return {
          success: true,
          message: `✅ Javob qabul qilindi: Test #T${testId}, Savol ${questionNumber} = ${answerText}`,
        };
      }
    } catch (error) {
      this.logger.error('Error processing answer:', error);
      return {
        success: false,
        message: "❌ Javob qayta ishlashda xatolik yuz berdi. Qaytadan urinib ko'ring.",
      };
    }
  }

  /**
   * Check if the answer is correct and send result back to user
   */
  async checkAnswer(answerId: number): Promise<void> {
    const answer = await this.telegramAnswerRepo.findOne({
      where: { id: answerId },
      relations: ['student', 'chat'],
    });

    if (!answer) {
      this.logger.error(`Answer ${answerId} not found`);
      return;
    }

    try {
      // Get the test and question with correct answers
      const test = await this.testRepo.findOne({
        where: { id: answer.testId },
        relations: ['questions', 'questions.answers'],
      });

      if (!test) {
        this.logger.error(`Test ${answer.testId} not found`);
        return;
      }

      // Find the specific question
      const question = test.questions.find((q, index) => index + 1 === answer.questionNumber);
      
      if (!question) {
        this.logger.error(`Question ${answer.questionNumber} not found in test ${answer.testId}`);
        return;
      }

      // Find correct answer
      const correctAnswer = question.answers.find(a => a.isCorrect);
      
      if (!correctAnswer) {
        this.logger.error(`No correct answer found for question ${question.id}`);
        return;
      }

      // Check if answer is correct
      const isCorrect = this.compareAnswers(answer.answerText, correctAnswer.text);
      const points = isCorrect ? question.points : 0;

      // Update answer with results
      answer.isCorrect = isCorrect;
      answer.correctAnswer = correctAnswer.text;
      answer.points = points;
      answer.status = AnswerStatus.CHECKED;
      answer.checkedAt = new Date();

      await this.telegramAnswerRepo.save(answer);

      // Send result back to student
      await this.sendAnswerResult(answer);

    } catch (error) {
      this.logger.error(`Error checking answer ${answerId}:`, error);
      answer.status = AnswerStatus.INVALID;
      await this.telegramAnswerRepo.save(answer);
    }
  }

  /**
   * Send answer result back to the student via Telegram
   */
  private async sendAnswerResult(answer: TelegramAnswer): Promise<void> {
    if (!this.bot || !answer.chat?.telegramUserId) {
      return;
    }

    try {
      const emoji = answer.isCorrect ? '✅' : '❌';
      const status = answer.isCorrect ? "To'g'ri" : "Noto'g'ri";
      
      let message = `${emoji} <b>Test #T${answer.testId} - Savol ${answer.questionNumber}</b>\n\n`;
      message += `<b>Sizning javobingiz:</b> ${answer.answerText}\n`;
      message += `<b>Natija:</b> ${status}\n`;
      
      if (!answer.isCorrect && answer.correctAnswer) {
        message += `<b>To'g'ri javob:</b> ${answer.correctAnswer}\n`;
      }
      
      message += `<b>Olingan ball:</b> ${answer.points || 0}\n\n`;
      message += `<i>Test #T${answer.testId} uchun boshqa savollar javoblarini ham yuboring!</i>`;

      await this.bot.sendMessage(answer.chat.telegramUserId, message, {
        parse_mode: 'HTML',
      });

    } catch (error) {
      this.logger.error('Error sending answer result:', error);
    }
  }

  /**
   * Compare student answer with correct answer
   */
  private compareAnswers(studentAnswer: string, correctAnswer: string): boolean {
    // For multiple choice questions, we compare the letter (A, B, C, D)
    if (studentAnswer.length === 1 && /[A-Za-z]/.test(studentAnswer)) {
      // Extract first letter from correct answer if it's in format "A) Text"
      const correctLetter = correctAnswer.match(/^([A-Za-z])/)?.[1];
      if (correctLetter) {
        return studentAnswer.toUpperCase() === correctLetter.toUpperCase();
      }
      
      // If correct answer is just the letter
      return studentAnswer.toUpperCase() === correctAnswer.toUpperCase();
    }

    // For text answers, normalize and compare
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' '); // Normalize whitespace

    return normalize(studentAnswer) === normalize(correctAnswer);
  }

  /**
   * Get user's test results summary
   */
  async getUserTestResults(telegramUserId: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user'],
      });

      if (!chat || !chat.user) {
        return "❌ Hisobingiz ulanmagan. Avval /start buyrug'ini yuboring.";
      }

      const answers = await this.telegramAnswerRepo.find({
        where: { 
          student: { id: chat.user.id },
          status: AnswerStatus.CHECKED,
        },
        relations: ['student'],
        order: { testId: 'DESC', questionNumber: 'ASC' },
      });

      if (answers.length === 0) {
        return `📊 <b>Test Natijalarim</b>\n\n🔍 Hozircha test natijalari yo'q.\nTestlarga javob bergansizdan so'ng, natijalar bu yerda ko'rinadi.`;
      }

      // Group by test
      const testGroups = new Map<number, TelegramAnswer[]>();
      answers.forEach(answer => {
        if (!testGroups.has(answer.testId)) {
          testGroups.set(answer.testId, []);
        }
        testGroups.get(answer.testId)!.push(answer);
      });

      let resultMessage = `📊 <b>${chat.user.firstName} ning Test Natijalari</b>\n\n`;

      for (const [testId, testAnswers] of testGroups) {
        const correctCount = testAnswers.filter(a => a.isCorrect).length;
        const totalQuestions = testAnswers.length;
        const totalPoints = testAnswers.reduce((sum, a) => sum + (a.points || 0), 0);
        const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        
        const emoji = percentage >= 80 ? '🟢' : percentage >= 60 ? '🟡' : '🔴';
        
        resultMessage += `${emoji} <b>Test #T${testId}</b>\n`;
        resultMessage += `   ✅ To'g'ri: ${correctCount}/${totalQuestions} (${percentage}%)\n`;
        resultMessage += `   🎯 Ball: ${totalPoints}\n`;
        resultMessage += `   📅 Sana: ${testAnswers[0].checkedAt?.toLocaleDateString() || 'N/A'}\n\n`;
      }

      resultMessage += `💡 <b>Ko'rsatma:</b> Yanada yaxshi natijalar uchun testlarni takrorlang!`;
      
      return resultMessage;

    } catch (error) {
      this.logger.error('Error getting user test results:', error);
      return "❌ Natijalarni olishda xatolik yuz berdi.";
    }
  }

  /**
   * Get test statistics for teacher
   */
  async getTestStatistics(testId: number): Promise<{
    totalStudents: number;
    totalAnswers: number;
    correctAnswers: number;
    averageScore: number;
    completionRate: number;
  }> {
    const answers = await this.telegramAnswerRepo.find({
      where: { 
        testId,
        status: AnswerStatus.CHECKED,
      },
      relations: ['student'],
    });

    const studentAnswers = new Map<number, TelegramAnswer[]>();
    answers.forEach(answer => {
      if (!studentAnswers.has(answer.student.id)) {
        studentAnswers.set(answer.student.id, []);
      }
      studentAnswers.get(answer.student.id)!.push(answer);
    });

    const test = await this.testRepo.findOne({
      where: { id: testId },
      relations: ['questions'],
    });

    const totalQuestions = test?.questions?.length || 0;
    const totalStudents = studentAnswers.size;
    const totalAnswers = answers.length;
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    
    // Calculate average score and completion rate
    let totalScore = 0;
    let completedTests = 0;
    
    studentAnswers.forEach(studentAnswerList => {
      if (studentAnswerList.length >= totalQuestions) {
        completedTests++;
      }
      const studentScore = studentAnswerList.reduce((sum, a) => sum + (a.points || 0), 0);
      totalScore += studentScore;
    });

    const averageScore = totalStudents > 0 ? totalScore / totalStudents : 0;
    const completionRate = totalStudents > 0 ? (completedTests / totalStudents) * 100 : 0;

    return {
      totalStudents,
      totalAnswers,
      correctAnswers,
      averageScore: Math.round(averageScore * 100) / 100,
      completionRate: Math.round(completionRate),
    };
  }
}
