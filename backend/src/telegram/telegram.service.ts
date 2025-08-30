import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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

  // ==================== User Registration & Linking ====================

  async registerUserToBot(telegramUserId: string, username?: string, firstName?: string, lastName?: string): Promise<{ success: boolean; message: string; userId?: number }> {
    try {
      // Check if this Telegram user is already registered
      const existingChat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user'],
      });

      if (existingChat && existingChat.user) {
        return {
          success: true,
          message: `Welcome back ${existingChat.user.firstName}! You are already registered.`,
          userId: existingChat.user.id,
        };
      }

      // Create or update chat record for this user
      const chatData = {
        chatId: telegramUserId, // For private chats, use user ID as chat ID
        type: ChatType.PRIVATE,
        telegramUserId,
        telegramUsername: username,
        firstName,
        lastName,
        status: ChatStatus.ACTIVE,
      };

      let chat: TelegramChat;
      if (existingChat) {
        Object.assign(existingChat, chatData);
        chat = await this.telegramChatRepo.save(existingChat);
      } else {
        chat = await this.telegramChatRepo.save(this.telegramChatRepo.create(chatData));
      }

      return {
        success: true,
        message: 'Registration successful! Please contact your teacher to link your account to the LMS system.',
        userId: undefined,
      };
    } catch (error) {
      this.logger.error('Failed to register user to bot:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again later.',
      };
    }
  }

  async linkTelegramUserToLmsUser(telegramUserId: string, lmsUserId: number): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.userRepo.findOne({ where: { id: lmsUserId } });
      if (!user) {
        return { success: false, message: 'LMS user not found' };
      }

      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
      });

      if (!chat) {
        return { success: false, message: 'Telegram user not found. Please start the bot first.' };
      }

      chat.user = user;
      await this.telegramChatRepo.save(chat);

      return {
        success: true,
        message: `Successfully linked ${user.firstName} ${user.lastName} to Telegram account`,
      };
    } catch (error) {
      this.logger.error('Failed to link Telegram user to LMS user:', error);
      return { success: false, message: 'Linking failed. Please try again.' };
    }
  }

  async getUnlinkedTelegramUsers(): Promise<TelegramChat[]> {
    return this.telegramChatRepo.find({
      where: { user: IsNull(), type: ChatType.PRIVATE },
      order: { createdAt: 'DESC' },
    });
  }

  async generateChannelInviteLink(channelId: string): Promise<{ success: boolean; inviteLink?: string; message: string }> {
    if (!this.bot) {
      return { success: false, message: 'Telegram bot not configured' };
    }

    try {
      const inviteLink = await this.bot.exportChatInviteLink(channelId);
      
      // Save invite link to database
      const chat = await this.telegramChatRepo.findOne({ where: { chatId: channelId } });
      if (chat) {
        chat.inviteLink = inviteLink;
        await this.telegramChatRepo.save(chat);
      }

      return {
        success: true,
        inviteLink,
        message: 'Invite link generated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to generate invite link:', error);
      return {
        success: false,
        message: 'Failed to generate invite link. Make sure the bot is admin in the channel.',
      };
    }
  }

  async getUserTelegramStatus(userId: number): Promise<{ isLinked: boolean; telegramUsername?: string; firstName?: string; lastName?: string; availableChannels: TelegramChat[] }> {
    try {
      // Get user's Telegram connection
      const userChat = await this.telegramChatRepo.findOne({
        where: { user: { id: userId }, type: ChatType.PRIVATE },
        relations: ['user'],
      });

      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['center'], // Assuming user has center relationship
      });

      // Get available channels for this user (based on center)
      let availableChannels: TelegramChat[] = [];
      
      if (user) {
        availableChannels = await this.telegramChatRepo.find({
          where: {
            type: ChatType.CHANNEL,
            status: ChatStatus.ACTIVE,
            // Add center filtering if you have centerId field
          },
          order: { title: 'ASC' },
        });
      }

      return {
        isLinked: !!userChat,
        telegramUsername: userChat?.telegramUsername,
        firstName: userChat?.firstName,
        lastName: userChat?.lastName,
        availableChannels,
      };
    } catch (error) {
      this.logger.error('Failed to get user Telegram status:', error);
      return {
        isLinked: false,
        availableChannels: [],
      };
    }
  }

  async sendUserInvitations(userId: number): Promise<{ success: boolean; message: string; channels: string[] }> {
    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['center'], // Assuming user has center relationship
      });

      if (!user) {
        return { success: false, message: 'Foydalanuvchi topilmadi', channels: [] };
      }

      // Find user's Telegram chat
      const userChat = await this.telegramChatRepo.findOne({
        where: { user: { id: userId }, type: ChatType.PRIVATE },
      });

      if (!userChat || !userChat.telegramUserId) {
        return {
          success: false,
          message: 'Foydalanuvchining Telegram hisobi ulanmagan',
          channels: [],
        };
      }

      // Find relevant channels for this user (based on center)
      const relevantChannels = await this.telegramChatRepo.find({
        where: {
          type: ChatType.CHANNEL,
          status: ChatStatus.ACTIVE,
          // Add center filtering if you have centerId field
        },
        order: { title: 'ASC' },
      });

      if (relevantChannels.length === 0) {
        return {
          success: false,
          message: 'Sizning markazingiz uchun kanallar mavjud emas',
          channels: [],
        };
      }

      // Send invitation message with channel links
      const channelList = relevantChannels
        .map(channel => `📚 ${channel.title || channel.username || channel.chatId}\n   Qo'shilish: ${channel.inviteLink || channel.username || 'Adminstratsiya bilan bog\'laning'}`)
        .join('\n\n');

      const invitationMessage = `🎓 Universal LMS Telegram integratsiyasiga xush kelibsiz!\n\nDarslaringiz uchun quyidagi kanallarga qo'shiling:\n\n${channelList}\n\n📋 Ko'rsatmalar:\n• Yuqoridagi kanallarga qo'shiling\n• U yerda test xabarnomalari olasiz\n• Testlarga quyidagi formatda javob bering: #T123Q1 A\n• Javoblaringizga darhol fikr-mulohaza oling\n\n❓ Yordam kerakmi? O'qituvchingiz bilan bog'laning yoki /help yuboring`;

      if (this.bot) {
        await this.bot.sendMessage(userChat.telegramUserId, invitationMessage, {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        });
      }

      return {
        success: true,
        message: 'Taklifnoma muvaffaqiyatli yuborildi',
        channels: relevantChannels.map(c => c.title || c.username || c.chatId),
      };
    } catch (error) {
      this.logger.error('Failed to send user invitations:', error);
      return {
        success: false,
        message: 'Taklifnomalarni yuborishda xatolik',
        channels: [],
      };
    }
  }

  // ==================== Test Sending ====================

  async sendTestToChannel(dto: SendTestToChannelDto): Promise<boolean> {
    if (!this.bot) {
      throw new BadRequestException('Telegram bot sozlanmagan');
    }

    const test = await this.testRepo.findOne({
      where: { id: dto.testId },
      relations: ['subject', 'teacher', 'questions', 'questions.answers'],
    });

    if (!test) {
      throw new BadRequestException('Test topilmadi');
    }

    const channel = await this.telegramChatRepo.findOne({
      where: { chatId: dto.channelId, type: ChatType.CHANNEL },
    });

    if (!channel) {
      throw new BadRequestException('Kanal topilmadi');
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
      throw new BadRequestException('Testni Telegram kanaliga yuborishda xatolik');
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
      throw new BadRequestException('Talaba topilmadi. Avval Telegram hisobingizni ulang.');
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
      throw new BadRequestException('Bu savol uchun javob allaqachon yuborilgan');
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
      throw new BadRequestException('Javob topilmadi');
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
      throw new BadRequestException('Telegram bot sozlanmagan');
    }

    const answers = await this.telegramAnswerRepo.find({
      where: { testId, status: AnswerStatus.CHECKED },
      relations: ['student'],
      order: { student: { lastName: 'ASC' }, questionNumber: 'ASC' },
    });

    if (answers.length === 0) {
      await this.bot.sendMessage(channelId, '📊 <b>Test Natijalari</b>\n\nHali hech qanday javob yuborilmagan.', {
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
      throw new BadRequestException('Natijalarni kanalga e\'lon qilishda xatolik');
    }
  }

  // ==================== Helper Methods ====================

  private formatTestMessage(test: Test, customMessage?: string): string {
    const header = '📝 <b>YANGI TEST MAVJUD</b>\n\n';
    const testInfo = `<b>📚 Fan:</b> ${test.subject?.name || 'Aniqlanmagan'}\n`;
    const title = `<b>🎯 Test:</b> ${test.title}\n`;
    const description = test.description ? `<b>📖 Tavsif:</b> ${test.description}\n` : '';
    const duration = `<b>⏱ Davomiyligi:</b> ${test.duration} daqiqa\n`;
    const questions = `<b>❓ Savollar:</b> ${test.questions?.length || 0}\n`;
    const points = `<b>🎯 Jami ball:</b> ${test.totalPoints}\n\n`;
    
    const custom = customMessage ? `${customMessage}\n\n` : '';
    
    return header + testInfo + title + description + duration + questions + points + custom;
  }

  private formatQuestionMessage(question: Question, number: number, testId: number): string {
    let message = `<b>Savol ${number}:</b>\n${question.text}\n\n`;
    
    if (question.imageBase64) {
      message += '🖼 [Rasm biriktirilgan]\n\n';
    }

    if (question.answers && question.answers.length > 0) {
      message += '<b>Variantlar:</b>\n';
      question.answers.forEach((answer, index) => {
        const letter = String.fromCharCode(65 + index); // A, B, C, D...
        message += `${letter}) ${answer.text}\n`;
      });
    }

    message += `\n<b>Ball:</b> ${question.points}`;
    message += `\n\n<i>Javob berish uchun: #T${testId}Q${number} SIZNING_JAVOBINGIZ</i>`;

    return message;
  }

  private getAnswerInstructions(testId: number): string {
    return `📋 <b>JAVOBLARNI QANDAY YUBORISH</b>\n\n` +
           `Javoblaringizni yuborish uchun quyidagi formatda xabar yuboring:\n` +
           `<code>#T${testId}Q1 A</code> (1-savol uchun, A javobi)\n` +
           `<code>#T${testId}Q2 B</code> (2-savol uchun, B javobi)\n\n` +
           `⚠️ <b>Muhim:</b>\n` +
           `• Yuqorida ko'rsatilgan aniq formatni ishlating\n` +
           `• Har bir savol uchun alohida xabar yuboring\n` +
           `• Yangi xabar yuborish orqali javobingizni o'zgartirishingiz mumkin\n` +
           `• Tekshirilgandan so'ng natijalar avtomatik e'lon qilinadi\n\n` +
           `Omad tilaymiz! 🍀`;
  }

  private async sendAnswerResult(answer: TelegramAnswer): Promise<void> {
    if (!this.bot || !answer.chat) return;

    const emoji = answer.isCorrect ? '✅' : '❌';
    const status = answer.isCorrect ? 'To\'g\'ri' : 'Noto\'g\'ri';
    
    let message = `${emoji} <b>Savol ${answer.questionNumber} - ${status}</b>\n\n`;
    message += `<b>Sizning javobingiz:</b> ${answer.answerText}\n`;
    
    if (!answer.isCorrect && answer.correctAnswer) {
      message += `<b>To'g'ri javob:</b> ${answer.correctAnswer}\n`;
    }
    
    message += `<b>Olingan ball:</b> ${answer.points || 0}`;

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
    let message = `📊 <b>TEST NATIJALARI - Test #${testId}</b>\n\n`;

    studentResults.forEach((answers, studentName) => {
      const totalPoints = answers.reduce((sum, answer) => sum + (answer.points || 0), 0);
      const correctAnswers = answers.filter(answer => answer.isCorrect).length;
      const totalQuestions = answers.length;
      const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      message += `👤 <b>${studentName}</b>\n`;
      message += `   ✅ To'g'ri: ${correctAnswers}/${totalQuestions} (${percentage}%)\n`;
      message += `   🎯 Ball: ${totalPoints}\n\n`;
    });

    message += `<i>Yangilangan: ${new Date().toLocaleString()}</i>`;

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