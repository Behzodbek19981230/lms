import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import TelegramBot from 'node-telegram-bot-api';
import { ConfigService } from '@nestjs/config';
import { TelegramChat, ChatType, ChatStatus } from './entities/telegram-chat.entity';
import { TelegramAnswer, AnswerStatus } from './entities/telegram-answer.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Center } from '../centers/entities/center.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Test } from '../tests/entities/test.entity';
import { Question } from '../questions/entities/question.entity';
import { Answer } from '../questions/entities/answer.entity';
import { Exam } from '../exams/entities/exam.entity';
import { CreateTelegramChatDto, SendTestToChannelDto, SubmitAnswerDto, NotifyExamStartDto } from './dto/telegram.dto';

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
    @InjectRepository(Center)
    private centerRepo: Repository<Center>,
    @InjectRepository(Subject)
    private subjectRepo: Repository<Subject>,
    @InjectRepository(Test)
    private testRepo: Repository<Test>,
    @InjectRepository(Question)
    private questionRepo: Repository<Question>,
    @InjectRepository(Answer)
    private answerRepo: Repository<Answer>,
    @InjectRepository(Exam)
    private examRepo: Repository<Exam>,
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

  async createOrUpdateChat(dto: CreateTelegramChatDto, authenticatedUser: User): Promise<TelegramChat> {
    const existingChat = await this.telegramChatRepo.findOne({
      where: { chatId: dto.chatId },
      relations: ['user', 'center', 'subject'],
    });

    // Get the full user with center and subjects relationships
    const fullUser = await this.userRepo.findOne({
      where: { id: authenticatedUser.id },
      relations: ['center', 'subjects'],
    });

    if (!fullUser) {
      throw new BadRequestException('Foydalanuvchi topilmadi');
    }

    // Determine center and subject
    let center: Center | null = null;
    let subject: Subject | null = null;

    // For channels and groups, try to get center and subject from the user or DTO
    if (dto.type === ChatType.CHANNEL || dto.type === ChatType.GROUP) {
      // Use center from user if not provided in DTO
      if (dto.centerId) {
        center = await this.centerRepo.findOne({ where: { id: dto.centerId } });
      } else if (fullUser.center) {
        center = fullUser.center;
      }

      // Use subject from DTO if provided
      if (dto.subjectId) {
        subject = await this.subjectRepo.findOne({ where: { id: dto.subjectId } });
      }
    }

    if (existingChat) {
      // Update existing chat
      Object.assign(existingChat, {
        type: dto.type,
        title: dto.title,
        username: dto.username,
        telegramUserId: dto.telegramUserId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        telegramUsername: dto.telegramUsername,
        lastActivity: new Date(),
      });
      
      if (center) existingChat.center = center;
      if (subject) existingChat.subject = subject;
      
      return this.telegramChatRepo.save(existingChat);
    }

    // Create new chat
    const newChatData = {
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
      center: center || undefined,
      subject: subject || undefined,
    };
    
    // For private chats, link to the user who sent the message
    if (dto.type === ChatType.PRIVATE && dto.userId) {
      const chatUser = await this.userRepo.findOne({ where: { id: dto.userId } });
      if (chatUser) {
        (newChatData as any).user = chatUser;
      }
    }

    const newChat = this.telegramChatRepo.create(newChatData);
    return this.telegramChatRepo.save(newChat);
  }

  async linkUserToChat(userId: number, chatId: string): Promise<TelegramChat> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Foydalanuvchi topilmadi');
    }

    const chat = await this.telegramChatRepo.findOne({ where: { chatId } });
    if (!chat) {
      throw new BadRequestException('Telegram chat topilmadi');
    }

    chat.user = user;
    return this.telegramChatRepo.save(chat);
  }

  async getUserChats(userId: number): Promise<TelegramChat[]> {
    return this.telegramChatRepo.find({
      where: { user: { id: userId } },
      relations: ['center', 'subject', 'user'],
      order: { lastActivity: 'DESC' },
    });
  }

  async getAllChats(): Promise<TelegramChat[]> {
    return this.telegramChatRepo.find({
      relations: ['center', 'subject', 'user'],
      order: { lastActivity: 'DESC' },
    });
  }

  // ==================== Enhanced User Authentication & Auto-Connection ====================

  async authenticateUser(dto: any): Promise<{ success: boolean; message: string; userId?: number; autoConnected?: boolean }> {
    try {
      // Use the enhanced authentication method
      return await this.authenticateAndConnectUser(
        dto.telegramUserId.toString(),
        dto.username,
        dto.firstName,
        dto.lastName
      );
    } catch (error) {
      this.logger.error('Failed to authenticate user:', error);
      return {
        success: false,
        message: 'Autentifikatsiyada xatolik. Keyinroq qayta urinib ko\'ring.',
        autoConnected: false,
      };
    }
  }

  async authenticateAndConnectUser(telegramUserId: string, username?: string, firstName?: string, lastName?: string): Promise<{ success: boolean; message: string; userId?: number; autoConnected?: boolean }> {
    try {
      // Check if this Telegram user is already registered
      const existingChat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user', 'user.center', 'user.subjects'],
      });

      if (existingChat && existingChat.user) {
        // User already connected, send updated channel list
        await this.sendUserChannelsAndInvitation(existingChat.user.id);
        return {
          success: true,
          message: `Qaytib kelganingiz bilan, ${existingChat.user.firstName}! Sizning hisobingiz allaqachon ulangan.`,
          userId: existingChat.user.id,
          autoConnected: true,
        };
      }

      // Try to find matching LMS user by name or email
      const potentialUsers = await this.userRepo.find({
        where: [
          { firstName: firstName, lastName: lastName },
          { firstName: lastName, lastName: firstName }, // Try reversed names
        ],
        relations: ['center', 'subjects'],
      });

      let linkedUser: User | null = null;

      if (potentialUsers.length === 1) {
        // Exact match found - auto-link
        linkedUser = potentialUsers[0];
        const chat = existingChat || this.telegramChatRepo.create({
          chatId: telegramUserId,
          type: ChatType.PRIVATE,
          telegramUserId,
          telegramUsername: username,
          firstName,
          lastName,
          status: ChatStatus.ACTIVE,
        });

        chat.user = linkedUser;
        await this.telegramChatRepo.save(chat);

        // Automatically send invitations to relevant channels
        await this.sendUserChannelsAndInvitation(linkedUser.id);

        return {
          success: true,
          message: `🎉 Salom ${linkedUser.firstName}! Hisobingiz avtomatik ulandi. Tegishli kanallarga qo'shilish uchun quyidagi havolalardan foydalaning.`,
          userId: linkedUser.id,
          autoConnected: true,
        };
      }

      // No exact match or multiple matches - manual linking required
      const chatData = {
        chatId: telegramUserId,
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
        message: potentialUsers.length > 1 
          ? `Bir nechta mos hisoblar topildi. O'qituvchingiz bilan bog'lanib, hisobingizni qo'lda ulashni so'rang.`
          : `Ro'yxatdan o'tish muvaffaqiyatli! Hisobingizni LMS tizimiga ulash uchun o'qituvchingiz bilan bog'laning.`,
        userId: undefined,
        autoConnected: false,
      };
    } catch (error) {
      this.logger.error('Failed to authenticate and connect user:', error);
      return {
        success: false,
        message: 'Autentifikatsiyada xatolik. Keyinroq qayta urinib ko\'ring.',
        autoConnected: false,
      };
    }
  }

  async sendUserChannelsAndInvitation(userId: number): Promise<{ success: boolean; message: string; channels: string[] }> {
    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['center', 'subjects'],
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

      // Find relevant channels based on user's center and subjects
      const relevantChannels = await this.telegramChatRepo.find({
        where: {
          type: ChatType.CHANNEL,
          status: ChatStatus.ACTIVE,
          center: { id: user.center?.id },
        },
        relations: ['center', 'subject'],
        order: { title: 'ASC' },
      });

      if (relevantChannels.length === 0) {
        const defaultMessage = `🎓 Salom ${user.firstName}! Telegram hisobingiz muvaffaqiyatli ulandi.\n\n📚 Hozircha sizning markazingiz uchun faol kanallar yo'q. O'qituvchingiz kanallar yaratganida, sizga avtomatik xabar yuboriladi.\n\n❓ Yordam kerakmi? /help buyrug'ini yuboring.`;
        
        if (this.bot) {
          await this.bot.sendMessage(userChat.telegramUserId, defaultMessage, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          });
        }

        return {
          success: true,
          message: 'Foydalanuvchi xabardor qilindi (kanallar yo\'q)',
          channels: [],
        };
      }

      // Create invitation message with channel links
      const channelList = relevantChannels
        .map(channel => {
          const channelName = channel.title || channel.username || channel.chatId;
          const subjectInfo = channel.subject ? ` (${channel.subject.name})` : '';
          const joinLink = channel.inviteLink || channel.username || 'O\'qituvchingiz bilan bog\'laning';
          
          return `📚 ${channelName}${subjectInfo}\n   👉 Qo'shilish: ${joinLink}`;
        })
        .join('\n\n');

      const invitationMessage = `🎓 Salom ${user.firstName}! Telegram hisobingiz muvaffaqiyatli ulandi.\n\n📢 Quyidagi kanallarga qo'shilib, darslaringizni kuzatib boring:\n\n${channelList}\n\n📋 Ko'rsatmalar:\n• Yuqoridagi kanallarga qo'shiling\n• Testlar va e'lonlarni kuzatib boring\n• Savollarga quyidagi formatda javob bering: #T123Q1 A\n• Javoblaringizga darhol fikr-mulohaza oling\n\n👨‍👩‍👧‍👦 Ota-onalar ham qo'shilishgan \n❓ Yordam kerakmi? /help buyrug'ini yuboring`;

      if (this.bot) {
        await this.bot.sendMessage(userChat.telegramUserId, invitationMessage, {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        });

        // Also try to automatically add user to public channels
        for (const channel of relevantChannels) {
          if (channel.username && channel.username.startsWith('@')) {
            try {
              // Generate a fresh invite link for the channel
              const inviteResult = await this.generateChannelInviteLink(channel.chatId);
              if (inviteResult.success && inviteResult.inviteLink) {
                // Send individual invitation
                await this.bot.sendMessage(
                  userChat.telegramUserId,
                  `🔗 ${channel.title || channel.username} kanaliga avtomatik qo'shilish:\n${inviteResult.inviteLink}`,
                  { disable_web_page_preview: true }
                );
              }
            } catch (error) {
              this.logger.warn(`Failed to generate invite for channel ${channel.chatId}:`, error);
            }
          }
        }
      }

      return {
        success: true,
        message: 'Kanallar ro\'yxati muvaffaqiyatli yuborildi',
        channels: relevantChannels.map(c => c.title || c.username || c.chatId),
      };
    } catch (error) {
      this.logger.error('Failed to send user channels and invitation:', error);
      return {
        success: false,
        message: 'Taklifnomalarni yuborishda xatolik',
        channels: [],
      };
    }
  }

  async linkTelegramUserToLmsUser(telegramUserId: string, lmsUserId: number): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.userRepo.findOne({ where: { id: lmsUserId } });
      if (!user) {
        return { success: false, message: 'LMS foydalanuvchisi topilmadi' };
      }

      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
      });

      if (!chat) {
        return { success: false, message: 'Telegram foydalanuvchisi topilmadi. Iltimos avval botni ishga tushiring.' };
      }

      chat.user = user;
      await this.telegramChatRepo.save(chat);

      return {
        success: true,
        message: `${user.firstName} ${user.lastName} muvaffaqiyatli Telegram hisobiga ulandi`,
      };
    } catch (error) {
      this.logger.error('Failed to link Telegram user to LMS user:', error);
      return { success: false, message: 'Ulanishda xatolik. Qayta urinib ko\'ring.' };
    }
  }

  async getUnlinkedTelegramUsers(): Promise<TelegramChat[]> {
    return this.telegramChatRepo.find({
      where: { user: IsNull(), type: ChatType.PRIVATE },
      order: { createdAt: 'DESC' },
    });
  }

  async generateChannelInviteLink(channelId: string): Promise<{ success: boolean; inviteLink?: string; message: string; errorDetails?: any }> {
    if (!this.bot) {
      return { success: false, message: 'Telegram bot not configured' };
    }

    try {
      // First, try to get bot information to check if it's in the channel
      let botInfo;
      try {
        botInfo = await this.bot.getMe();
        const chatMember = await this.bot.getChatMember(channelId, botInfo.id);
        
        if (!['administrator', 'creator'].includes(chatMember.status)) {
          return {
            success: false,
            message: `Bot is not an admin in the channel. Bot status: ${chatMember.status}. Please add @${botInfo.username} as an admin with "can_invite_users" permission.`,
            errorDetails: { botStatus: chatMember.status, botUsername: botInfo.username }
          };
        }

        // Check if bot has the required permissions
        if (chatMember.status === 'administrator' && chatMember.can_invite_users === false) {
          return {
            success: false,
            message: `Bot is admin but lacks "can_invite_users" permission. Please grant this permission to @${botInfo.username}.`,
            errorDetails: { permissions: chatMember }
          };
        }
      } catch (permissionError) {
        this.logger.warn('Could not check bot permissions, proceeding anyway:', permissionError);
      }

      // Try to generate the invite link
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
      
      // Provide more specific error messages
      if (error.code === 400) {
        if (error.description?.includes('not enough rights')) {
          return {
            success: false,
            message: 'Bot does not have sufficient permissions. Please ensure the bot is an admin with "can_invite_users" permission.',
            errorDetails: error
          };
        } else if (error.description?.includes('chat not found')) {
          return {
            success: false,
            message: 'Channel not found. Please check the channel ID or username.',
            errorDetails: error
          };
        } else if (error.description?.includes('CHAT_ADMIN_REQUIRED')) {
          return {
            success: false,
            message: 'Bot must be an admin in the channel to generate invite links.',
            errorDetails: error
          };
        }
      }
      
      return {
        success: false,
        message: `Failed to generate invite link: ${error.message || 'Unknown error'}. Make sure the bot is admin in the channel with invite permissions.`,
        errorDetails: error
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

  async checkBotChannelStatus(channelId: string): Promise<{ success: boolean; botStatus?: string; botUsername?: string; permissions?: any; message: string }> {
    if (!this.bot) {
      return { success: false, message: 'Telegram bot not configured' };
    }

    try {
      const botInfo = await this.bot.getMe();
      const chatMember = await this.bot.getChatMember(channelId, botInfo.id);
      
      return {
        success: true,
        botStatus: chatMember.status,
        botUsername: botInfo.username,
        permissions: chatMember,
        message: `Bot @${botInfo.username} status in channel: ${chatMember.status}`
      };
    } catch (error) {
      this.logger.error('Failed to check bot status in channel:', error);
      return {
        success: false,
        message: `Failed to check bot status: ${error.message}`
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

  // ==================== Exam Helper Methods ====================

  private formatExamStartMessage(exam: Exam, customMessage?: string): string {
    const header = '🎯 <b>IMTIHON BOSHLANDI!</b>\n\n';
    const subjectNames = exam.subjects?.map(s => s.name).join(', ') || 'Aniqlanmagan';
    const examInfo = `<b>📚 Fan:</b> ${subjectNames}\n`;
    const title = `<b>📝 Imtihon:</b> ${exam.title}\n`;
    const description = exam.description ? `<b>📖 Tavsif:</b> ${exam.description}\n` : '';
    const duration = `<b>⏱ Davomiyligi:</b> ${exam.duration} daqiqa\n`;
    const variants = `<b>🔢 Variantlar:</b> ${exam.variants?.length || 0}\n`;
    const startTime = `<b>🕐 Boshlanish vaqti:</b> ${exam.startTime ? new Date(exam.startTime).toLocaleString() : 'Hozir'}\n`;
    const endTime = `<b>🕕 Tugash vaqti:</b> ${exam.endTime ? new Date(exam.endTime).toLocaleString() : 'Belgilanmagan'}\n\n`;
    
    const custom = customMessage ? `${customMessage}\n\n` : '';
    
    return header + examInfo + title + description + duration + variants + startTime + endTime + custom;
  }

  private getExamInstructions(exam: Exam): string {
    return `📋 <b>IMTIHON QOIDALARI</b>\n\n` +
           `⚠️ <b>Muhim ko'rsatmalar:</b>\n` +
           `• Imtihon ${exam.duration} daqiqa davom etadi\n` +
           `• Har bir variant uchun alohida javob varaqasi beriladi\n` +
           `• Vaqt tugagach, javob varaqlari yig'ib olinadi\n` +
           `• Imtihon davomida telefondan foydalanish taqiqlanadi\n` +
           `• Nusxa ko'chirish va gaplashish taqiqlanadi\n\n` +
           `🎯 <b>Muvaffaqiyat tilaymiz!</b>\n\n` +
           `📞 Savollar bo'lsa, nazoratchi bilan bog'laning.`;
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

  // ==================== Bot Command Handlers ====================

  async getUserTestResults(telegramUserId: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user']
      });

      if (!chat || !chat.user) {
        return '❌ Hisobingiz ulanmagan. Avval /start buyrug\'ini yuboring va o\'qituvchingiz bilan bog\'laning.';
      }

      // Get user's test results from TelegramAnswer
      const answers = await this.telegramAnswerRepo.find({
        where: { student: { id: chat.user.id } },
        relations: ['student'],
        order: { createdAt: 'DESC' },
        take: 10 // Last 10 tests
      });

      if (answers.length === 0) {
        return `📊 <b>Test Natijalarim</b>\n\n🔍 Hozircha test natijalari yo'q.\nTestlarga javob bergansizdan so'ng, natijalar bu yerda ko'rinadi.`;
      }

      // Group answers by test
      const testGroups = answers.reduce((groups, answer) => {
        if (!groups[answer.testId]) {
          groups[answer.testId] = [];
        }
        groups[answer.testId].push(answer);
        return groups;
      }, {} as Record<number, typeof answers>);

      let resultMessage = `📊 <b>${chat.user.firstName} ning Test Natijalari</b>\n\n`;

      Object.keys(testGroups).forEach((testId, index) => {
        const testAnswers = testGroups[testId];
        const correctAnswers = testAnswers.filter(a => a.isCorrect).length;
        const totalQuestions = testAnswers.length;
        const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        const emoji = percentage >= 80 ? '🟢' : percentage >= 60 ? '🟡' : '🔴';

        resultMessage += `${emoji} <b>Test ${testId}</b>\n`;
        resultMessage += `   ✅ To'g'ri: ${correctAnswers}/${totalQuestions} (${percentage}%)\n`;
        resultMessage += `   📅 Sana: ${testAnswers[0].createdAt.toLocaleDateString()}\n\n`;
      });

      resultMessage += `💡 <b>Ko'rsatma:</b> Yanada yaxshi natijalar uchun darslarni takrorlang!`;

      return resultMessage;
    } catch (error) {
      this.logger.error('Error getting user test results:', error);
      return 'Natijalarni yuklab olishda xatolik yuz berdi. Keyinroq qayta urinib ko\'ring.';
    }
  }

  async getUserAttendance(telegramUserId: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user']
      });

      if (!chat || !chat.user) {
        return '❌ Hisobingiz ulanmagan. Avval /start buyrug\'ini yuboring va o\'qituvchingiz bilan bog\'laning.';
      }

      // This would require implementing attendance tracking
      // For now, return a placeholder message
      return `📅 <b>${chat.user.firstName} ning Davomat Hisoboti</b>\n\n⏰ Davomat tizimi hali ishga tushirilmagan.\n\n📋 Tez orada quyidagi ma'lumotlar mavjud bo'ladi:\n• Darsga kelish statistikasi\n• Kechikishlar hisoboti\n• Oylik davomat foizi\n\n👨‍🏫 Batafsil ma'lumot uchun o'qituvchingiz bilan bog'laning.`;
    } catch (error) {
      this.logger.error('Error getting user attendance:', error);
      return 'Davomat ma\'lumotlarini yuklab olishda xatolik yuz berdi.';
    }
  }

  async getUserAccountInfo(telegramUserId: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user', 'user.center']
      });

      if (!chat || !chat.user) {
        return '❌ Hisobingiz ulanmagan. Avval /start buyrug\'ini yuboring va o\'qituvchingiz bilan bog\'laning.';
      }

      const user = chat.user;
      let accountMessage = `👤 <b>Shaxsiy Ma'lumotlar</b>\n\n`;
      accountMessage += `📝 <b>Ism:</b> ${user.firstName}\n`;
      if (user.lastName) {
        accountMessage += `📝 <b>Familiya:</b> ${user.lastName}\n`;
      }
      accountMessage += `📧 <b>Email:</b> ${user.email}\n`;
      accountMessage += `👤 <b>Rol:</b> ${this.getRoleDisplayName(user.role)}\n`;
      
      if (user.center) {
        accountMessage += `🏢 <b>Markaz:</b> ${user.center.name}\n`;
      }
      
      accountMessage += `📱 <b>Telegram:</b> @${chat.telegramUsername || 'username yo\'q'}\n`;
      accountMessage += `🔗 <b>Ulangan sana:</b> ${chat.createdAt.toLocaleDateString()}\n\n`;
      accountMessage += `⚙️ Hisobingizni o'zgartirish uchun LMS tizimiga kiring yoki o'qituvchingiz bilan bog'laning.`;

      return accountMessage;
    } catch (error) {
      this.logger.error('Error getting user account info:', error);
      return 'Hisob ma\'lumotlarini yuklab olishda xatolik yuz berdi.';
    }
  }

  async getTeacherGroups(telegramUserId: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user', 'user.center']
      });

      if (!chat || !chat.user) {
        return '❌ Hisobingiz ulanmagan. Avval /start buyrug\'ini yuboring va admin bilan bog\'laning.';
      }

      if (chat.user.role !== UserRole.TEACHER) {
        return '🚫 Sizda o\'qituvchi huquqi yo\'q. Yo\'qlama olish faqat o\'qituvchilar uchun mavjud.';
      }

      // Get teacher's groups from the database
      let groupMessage = `👨‍🏫 <b>Yo'qlama Olish - ${chat.user.firstName} ning Guruhlari</b>\n\n`;
      groupMessage += `📅 <b>Bugungi sana:</b> ${new Date().toLocaleDateString()}\n\n`;
      groupMessage += `Yo'qlama olish uchun guruhni tanlang:\n\n`;
      
      // This would be replaced with actual group data from Groups repository
      // For now using sample data, but structure matches expected DB schema
      const sampleGroups = [
        { id: 1, name: 'Beginner A1', studentsCount: 15, subject: 'Ingliz tili' },
        { id: 2, name: 'Intermediate B1', studentsCount: 12, subject: 'Ingliz tili' },
        { id: 3, name: 'Advanced C1', studentsCount: 8, subject: 'Ingliz tili' },
        { id: 4, name: 'Matematika 9-sinf', studentsCount: 20, subject: 'Matematika' }
      ];
      
      sampleGroups.forEach(group => {
        groupMessage += `🔹 <b>grup_${group.id}</b> - ${group.name}\n`;
        groupMessage += `   📋 Fan: ${group.subject}\n`;
        groupMessage += `   👥 Studentlar: ${group.studentsCount} ta\n\n`;
      });
      
      groupMessage += `💡 <b>Qo'llanma:</b>\n`;
      groupMessage += `• Guruh kodini yozing (masalan: <b>grup_1</b>)\n`;
      groupMessage += `• Keyin har bir student uchun yo'qlama belgilang\n`;
      groupMessage += `• /menu - Asosiy menyuga qaytish`;

      return groupMessage;
    } catch (error) {
      this.logger.error('Error getting teacher groups:', error);
      return 'Guruhlar ro\'yxatini yuklab olishda xatolik yuz berdi.';
    }
  }

  async getGroupStudentsForAttendance(telegramUserId: string, groupId: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user']
      });

      if (!chat || !chat.user || chat.user.role !== UserRole.TEACHER) {
        return '❌ Sizda ushbu amalni bajarish huquqi yo\'q.';
      }

      const groupIdNum = parseInt(groupId);
      if (isNaN(groupIdNum)) {
        return '❌ Noto\'g\'ri guruh ID. Masalan: grup_1';
      }

      // Get group info and students - this would be replaced with actual data
      const groups = {
        1: { name: 'Beginner A1', subject: 'Ingliz tili', students: [
          { id: 1, firstName: 'Ali', lastName: 'Valiyev' },
          { id: 2, firstName: 'Malika', lastName: 'Karimova' },
          { id: 3, firstName: 'Bobur', lastName: 'Rahimov' },
          { id: 4, firstName: 'Nodira', lastName: 'Toshmatova' },
          { id: 5, firstName: 'Sardor', lastName: 'Umarov' }
        ]},
        2: { name: 'Intermediate B1', subject: 'Ingliz tili', students: [
          { id: 6, firstName: 'Dilshod', lastName: 'Nazarov' },
          { id: 7, firstName: 'Zarina', lastName: 'Saidova' },
          { id: 8, firstName: 'Jahongir', lastName: 'Karimov' }
        ]},
        3: { name: 'Advanced C1', subject: 'Ingliz tili', students: [
          { id: 9, firstName: 'Lola', lastName: 'Ahmadova' },
          { id: 10, firstName: 'Bekzod', lastName: 'Ruziyev' }
        ]},
        4: { name: 'Matematika 9-sinf', subject: 'Matematika', students: [
          { id: 11, firstName: 'Aziza', lastName: 'Yusupova' },
          { id: 12, firstName: 'Jasur', lastName: 'Ergashev' },
          { id: 13, firstName: 'Nargiza', lastName: 'Turdiyeva' }
        ]}
      };

      const group = groups[groupIdNum];
      if (!group) {
        return '❌ Guruh topilmadi. Mavjud guruhlar: grup_1, grup_2, grup_3, grup_4';
      }

      let studentsMessage = `📋 <b>${group.name} - Yo'qlama</b>\n`;
      studentsMessage += `📋 <b>Fan:</b> ${group.subject}\n`;
      studentsMessage += `📅 <b>Sana:</b> ${new Date().toLocaleDateString()}\n`;
      studentsMessage += `⏰ <b>Vaqt:</b> ${new Date().toLocaleTimeString()}\n\n`;
      studentsMessage += `👥 <b>Studentlar ro'yxati:</b>\n\n`;
      
      group.students.forEach((student, index) => {
        studentsMessage += `👤 <b>${index + 1}. ${student.firstName} ${student.lastName}</b>\n`;
        studentsMessage += `   ✅ <code>${student.id}_keldi</code>\n`;
        studentsMessage += `   ❌ <code>${student.id}_kelmadi</code>\n`;
        studentsMessage += `   ⏰ <code>${student.id}_kechikdi</code>\n\n`;
      });

      studentsMessage += `💡 <b>Qo'llanma:</b>\n`;
      studentsMessage += `• Yuqoridagi kodlardan birini aynan yozing\n`;
      studentsMessage += `• Masalan: <code>1_keldi</code> yoki <code>2_kelmadi</code>\n`;
      studentsMessage += `• Har bir student uchun alohida kod yuboring\n`;
      studentsMessage += `• /yoklama - Guruhlar ro'yxatiga qaytish`;

      return studentsMessage;
    } catch (error) {
      this.logger.error('Error getting group students:', error);
      return 'Guruh ma\'lumotlarini yuklab olishda xatolik yuz berdi.';
    }
  }

  async markStudentAttendance(telegramUserId: string, attendanceCode: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user']
      });

      if (!chat || !chat.user || chat.user.role !== UserRole.TEACHER) {
        return '❌ Sizda ushbu amalni bajarish huquqi yo\'q.';
      }

      // Parse attendance code: studentId_status
      const parts = attendanceCode.trim().split('_');
      if (parts.length !== 2) {
        return '❌ Noto\'g\'ri format. Masalan: <code>1_keldi</code>, <code>2_kelmadi</code>, <code>3_kechikdi</code>';
      }

      const studentId = parseInt(parts[0]);
      const status = parts[1].toLowerCase();

      if (isNaN(studentId)) {
        return '❌ Student ID raqam bo\'lishi kerak. Masalan: <code>1_keldi</code>';
      }

      const validStatuses = ['keldi', 'kelmadi', 'kechikdi'];
      if (!validStatuses.includes(status)) {
        return '❌ Noto\'g\'ri status. Faqat: <code>keldi</code>, <code>kelmadi</code>, <code>kechikdi</code>';
      }

      // Get student info from sample data (would be replaced with actual DB query)
      const allStudents = {
        1: { firstName: 'Ali', lastName: 'Valiyev', group: 'Beginner A1' },
        2: { firstName: 'Malika', lastName: 'Karimova', group: 'Beginner A1' },
        3: { firstName: 'Bobur', lastName: 'Rahimov', group: 'Beginner A1' },
        4: { firstName: 'Nodira', lastName: 'Toshmatova', group: 'Beginner A1' },
        5: { firstName: 'Sardor', lastName: 'Umarov', group: 'Beginner A1' },
        6: { firstName: 'Dilshod', lastName: 'Nazarov', group: 'Intermediate B1' },
        7: { firstName: 'Zarina', lastName: 'Saidova', group: 'Intermediate B1' },
        8: { firstName: 'Jahongir', lastName: 'Karimov', group: 'Intermediate B1' },
        9: { firstName: 'Lola', lastName: 'Ahmadova', group: 'Advanced C1' },
        10: { firstName: 'Bekzod', lastName: 'Ruziyev', group: 'Advanced C1' },
        11: { firstName: 'Aziza', lastName: 'Yusupova', group: 'Matematika 9-sinf' },
        12: { firstName: 'Jasur', lastName: 'Ergashev', group: 'Matematika 9-sinf' },
        13: { firstName: 'Nargiza', lastName: 'Turdiyeva', group: 'Matematika 9-sinf' }
      };

      const student = allStudents[studentId];
      if (!student) {
        return `❌ Student topilmadi (ID: ${studentId}). Mavjud studentlar ro'yxatini ko'rish uchun guruhni qayta tanlang.`;
      }

      // Here would be the actual attendance marking logic
      // For now, we'll simulate saving to database
      const statusEmoji = status === 'keldi' ? '✅' : status === 'kechikdi' ? '⏰' : '❌';
      const statusText = status === 'keldi' ? 'Keldi' : status === 'kechikdi' ? 'Kechikdi' : 'Kelmadi';
      const today = new Date();

      let resultMessage = `${statusEmoji} <b>Yo'qlama Muvaffaqiyatli Belgilandi!</b>\n\n`;
      resultMessage += `👤 <b>Student:</b> ${student.firstName} ${student.lastName}\n`;
      resultMessage += `📋 <b>Guruh:</b> ${student.group}\n`;
      resultMessage += `📅 <b>Status:</b> ${statusText}\n`;
      resultMessage += `📅 <b>Sana:</b> ${today.toLocaleDateString()}\n`;
      resultMessage += `⏰ <b>Vaqt:</b> ${today.toLocaleTimeString()}\n`;
      resultMessage += `👨‍🏫 <b>O'qituvchi:</b> ${chat.user.firstName}\n\n`;
      
      if (status === 'keldi') {
        resultMessage += `🎉 Ajoyib! Student o'z vaqtida keldi.`;
      } else if (status === 'kechikdi') {
        resultMessage += `⚠️ Student kechikdi. Sababini aniqlash tavsiya etiladi.`;
      } else {
        resultMessage += `🚨 Student darsga kelmadi. Ota-onasi bilan bog'lanish kerak.`;
      }
      
      resultMessage += `\n\n📊 Boshqa studentlar uchun yo'qlama davom ettiring yoki /yoklama orqali guruhlar ro'yxatiga qaytinng.`;

      // Send notification about attendance
      await this.notifyAttendanceTaken(
        student.group,
        chat.user.firstName + ' ' + (chat.user.lastName || ''),
        status === 'keldi' ? 1 : 0,
        1
      );

      return resultMessage;
    } catch (error) {
      this.logger.error('Error marking attendance:', error);
      return 'Yo\'qlama belgilashda xatolik yuz berdi. Qaytadan urinib ko\'ring.';
    }
  }

  private getRoleDisplayName(role: string): string {
    switch (role) {
      case 'student':
        return 'Talaba';
      case 'teacher':
        return 'O\'qituvchi';
      case 'center_admin':
        return 'Markaz Admin';
      case 'super_admin':
        return 'Super Admin';
      default:
        return role;
    }
  }

  // ==================== Bot Commands and Menu Setup ====================

  async setBotCommands(chatId: number): Promise<void> {
    try {
      if (this.bot) {
        const commands = [
          { command: 'start', description: 'Botni ishga tushirish' },
          { command: 'menu', description: 'Asosiy menyu' },
          { command: 'natijalarim', description: 'Test natijalarim' },
          { command: 'davomatim', description: 'Davomat hisobotim' },
          { command: 'hisobim', description: 'Shaxsiy ma\'lumotlar' },
          { command: 'yoklama', description: 'Yo\'qlama olish (o\'qituvchilar)' },
          { command: 'elon', description: 'E\'lonlar va xabarlar' },
          { command: 'testlar', description: 'Aktiv testlar' },
          { command: 'aloqa', description: 'Aloqa ma\'lumotlari' },
          { command: 'help', description: 'Yordam' }
        ];
        
        await this.bot.setMyCommands(commands, { scope: { type: 'chat', chat_id: chatId } });
        this.logger.log(`Bot commands set for chat ${chatId}`);
      }
    } catch (error) {
      this.logger.error('Error setting bot commands:', error);
    }
  }

  async getUserAnnouncements(telegramUserId: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user', 'user.center']
      });

      if (!chat || !chat.user) {
        return '❌ Hisobingiz ulanmagan. Avval /start buyrug\'ini yuboring va o\'qituvchingiz bilan bog\'laning.';
      }

      let announcementsMessage = `📢 <b>${chat.user.firstName} uchun E'lonlar</b>\n\n`;
      
      // Get recent announcements - this would be replaced with actual announcement data
      const today = new Date().toLocaleDateString();
      
      announcementsMessage += `📅 <b>Bugungi e'lonlar (${today}):</b>\n\n`;
      announcementsMessage += `📚 <b>Dars jadvali o'zgarishi</b>\n`;
      announcementsMessage += `   • Matematika darsi soat 14:00 ga ko'chirildi\n`;
      announcementsMessage += `   • Sana: ${today}\n\n`;
      
      announcementsMessage += `📝 <b>Yangi test e'lon qilindi</b>\n`;
      announcementsMessage += `   • Fan: Ingliz tili\n`;
      announcementsMessage += `   • Muddat: 3 kun\n`;
      announcementsMessage += `   • Savollar soni: 20\n\n`;
      
      announcementsMessage += `📅 <b>Haftalik e'lonlar:</b>\n`;
      announcementsMessage += `• Oraliq nazorat - Dushanba\n`;
      announcementsMessage += `• Ota-onalar yig'ilishi - Juma\n`;
      announcementsMessage += `• Bayram tadbirlari - Dam olish kunlari\n\n`;
      
      announcementsMessage += `🔔 <b>Eslatma:</b> Barcha e'lonlar avtomatik ravishda sizga yuboriladi.`;

      return announcementsMessage;
    } catch (error) {
      this.logger.error('Error getting user announcements:', error);
      return 'E\'lonlarni yuklab olishda xatolik yuz berdi.';
    }
  }

  async getUserActiveTests(telegramUserId: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user', 'user.center']
      });

      if (!chat || !chat.user) {
        return '❌ Hisobingiz ulanmagan. Avval /start buyrug\'ini yuboring va o\'qituvchingiz bilan bog\'laning.';
      }

      let testsMessage = `📝 <b>${chat.user.firstName} uchun Aktiv Testlar</b>\n\n`;
      
      // Get active tests - this would be replaced with actual test data
      testsMessage += `🔴 <b>Joriy testlar:</b>\n\n`;
      
      testsMessage += `📚 <b>Test #123 - Matematika</b>\n`;
      testsMessage += `   • Savollar: 15 ta\n`;
      testsMessage += `   • Vaqt: 30 daqiqa\n`;
      testsMessage += `   • Muddat: 2 kun qoldi\n`;
      testsMessage += `   • Javob formati: #T123Q1 A\n\n`;
      
      testsMessage += `📚 <b>Test #124 - Ingliz tili</b>\n`;
      testsMessage += `   • Savollar: 20 ta\n`;
      testsMessage += `   • Vaqt: 45 daqiqa\n`;
      testsMessage += `   • Muddat: 5 kun qoldi\n`;
      testsMessage += `   • Javob formati: #T124Q1 A\n\n`;
      
      testsMessage += `🔵 <b>Tugallangan testlar:</b>\n\n`;
      testsMessage += `✅ Test #122 - Fizika (Natija: 85%)\n`;
      testsMessage += `✅ Test #121 - Kimyo (Natija: 92%)\n\n`;
      
      testsMessage += `📊 <b>Statistika:</b>\n`;
      testsMessage += `• Jami testlar: 15\n`;
      testsMessage += `• Tugallangan: 13\n`;
      testsMessage += `• O'rtacha ball: 87%\n\n`;
      
      testsMessage += `💡 <b>Eslatma:</b> Testlarga javob berish uchun #T123Q1 A formatidan foydalaning.`;

      return testsMessage;
    } catch (error) {
      this.logger.error('Error getting user active tests:', error);
      return 'Aktiv testlarni yuklab olishda xatolik yuz berdi.';
    }
  }

  // ==================== Enhanced Notification System ====================

  async sendNotificationToChannelsAndBot(message: string, testId?: number, targetRole?: UserRole): Promise<void> {
    try {
      // Get all active channels
      const channels = await this.telegramChatRepo.find({
        where: { 
          type: ChatType.CHANNEL,
          status: ChatStatus.ACTIVE
        },
        relations: ['center', 'subject']
      });

      // Send to channels
      for (const channel of channels) {
        try {
          if (this.bot) {
            await this.bot.sendMessage(channel.chatId, message, { parse_mode: 'HTML' });
            await this.delay(100); // Small delay to avoid rate limiting
          }
        } catch (error) {
          this.logger.error(`Failed to send to channel ${channel.chatId}:`, error);
        }
      }

      // Send to individual users based on role
      if (targetRole) {
        const users = await this.telegramChatRepo.find({
          where: {
            type: ChatType.PRIVATE,
            user: { role: targetRole }
          },
          relations: ['user']
        });

        for (const userChat of users) {
          try {
            if (this.bot && userChat.telegramUserId) {
              await this.bot.sendMessage(userChat.telegramUserId, message, { parse_mode: 'HTML' });
              await this.delay(100);
            }
          } catch (error) {
            this.logger.error(`Failed to send to user ${userChat.telegramUserId}:`, error);
          }
        }
      }

      this.logger.log(`Notification sent to ${channels.length} channels and users`);
    } catch (error) {
      this.logger.error('Error sending notifications:', error);
    }
  }

  async notifyTestCreated(testId: number, testName: string, subject: string, timeLimit: number): Promise<void> {
    const message = `🎆 <b>Yangi Test E'lon Qilindi!</b>\n\n📚 <b>Test:</b> ${testName}\n📋 <b>Fan:</b> ${subject}\n⏰ <b>Vaqt:</b> ${timeLimit} daqiqa\n🔢 <b>Test ID:</b> #T${testId}\n\n📝 <b>Javob formati:</b> #T${testId}Q1 A\n\n🔥 Testni boshlash uchun tayyor bo'ling!`;
    
    await this.sendNotificationToChannelsAndBot(message, testId, UserRole.STUDENT);
  }

  async notifyAttendanceTaken(groupName: string, teacherName: string, presentCount: number, totalCount: number): Promise<void> {
    const message = `📋 <b>Yo'qlama Olindi</b>\n\n👥 <b>Guruh:</b> ${groupName}\n👨‍🏫 <b>O'qituvchi:</b> ${teacherName}\n✅ <b>Keldi:</b> ${presentCount}/${totalCount}\n📅 <b>Sana:</b> ${new Date().toLocaleDateString()}\n⏰ <b>Vaqt:</b> ${new Date().toLocaleTimeString()}`;
    
    await this.sendNotificationToChannelsAndBot(message, undefined, UserRole.ADMIN);
  }

  // ==================== Exam Notifications ====================

  async notifyExamStart(dto: NotifyExamStartDto): Promise<boolean> {
    if (!this.bot) {
      throw new BadRequestException('Telegram bot sozlanmagan');
    }

    const exam = await this.examRepo.findOne({
      where: { id: dto.examId },
      relations: ['subjects', 'teacher', 'variants'],
    });

    if (!exam) {
      throw new BadRequestException('Imtihon topilmadi');
    }

    const channel = await this.telegramChatRepo.findOne({
      where: { chatId: dto.channelId, type: ChatType.CHANNEL },
    });

    if (!channel) {
      throw new BadRequestException('Kanal topilmadi');
    }

    try {
      const message = this.formatExamStartMessage(exam, dto.customMessage);
      
      await this.bot.sendMessage(dto.channelId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });

      // Also send additional instructions if needed
      const instructionsMessage = this.getExamInstructions(exam);
      await this.bot.sendMessage(dto.channelId, instructionsMessage, {
        parse_mode: 'HTML',
      });

      this.logger.log(`Exam start notification sent to channel ${dto.channelId} for exam ${dto.examId}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send exam start notification:', error);
      throw new BadRequestException('Imtihon boshlanishi haqida xabarni yuborishda xatolik');
    }
  }

  async sendPDFToUser(userId: number, pdfBuffer: Buffer, fileName: string, caption?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user's Telegram chat
      const userChat = await this.telegramChatRepo.findOne({
        where: { user: { id: userId }, type: ChatType.PRIVATE },
        relations: ['user'],
      });

      if (!userChat || !userChat.telegramUserId) {
        this.logger.warn(`User ${userId} does not have a connected Telegram account`);
        return {
          success: false,
          message: 'Foydalanuvchining Telegram hisobi ulanmagan',
        };
      }

      if (!this.bot) {
        this.logger.error('Telegram bot not configured');
        return {
          success: false,
          message: 'Telegram bot sozlanmagan',
        };
      }

      // Send PDF document
      await this.bot.sendDocument(userChat.telegramUserId, pdfBuffer, {
        caption: caption || `📄 ${fileName}`,
        parse_mode: 'HTML',
      });

      this.logger.log(`PDF sent successfully to user ${userId} (${userChat.telegramUserId})`);
      return {
        success: true,
        message: 'PDF muvaffaqiyatli yuborildi',
      };
    } catch (error) {
      this.logger.error(`Failed to send PDF to user ${userId}:`, error);
      return {
        success: false,
        message: `PDF yuborishda xatolik: ${error.message}`,
      };
    }
  }

  async sendPDFToMultipleUsers(userIds: number[], pdfBuffer: Buffer, fileName: string, caption?: string): Promise<{ success: boolean; sentCount: number; failedCount: number; details: string[] }> {
    const results = {
      success: true,
      sentCount: 0,
      failedCount: 0,
      details: [] as string[],
    };

    for (const userId of userIds) {
      try {
        const result = await this.sendPDFToUser(userId, pdfBuffer, fileName, caption);
        if (result.success) {
          results.sentCount++;
          results.details.push(`User ${userId}: ✅ ${result.message}`);
        } else {
          results.failedCount++;
          results.details.push(`User ${userId}: ❌ ${result.message}`);
        }
        
        // Small delay to avoid rate limiting
        await this.delay(200);
      } catch (error) {
        results.failedCount++;
        results.details.push(`User ${userId}: ❌ Error: ${error.message}`);
      }
    }

    if (results.failedCount > 0) {
      results.success = false;
    }

    this.logger.log(`PDF batch send completed: ${results.sentCount} sent, ${results.failedCount} failed`);
    return results;
  }

  async testTelegramConnection(): Promise<boolean> {
    try {
      if (!this.bot) {
        this.logger.warn('Telegram bot not configured');
        return false;
      }

      const botInfo = await this.bot.getMe();
      this.logger.log(`Telegram bot connected: @${botInfo.username}`);
      return true;
    } catch (error) {
      this.logger.error('Telegram connection test failed:', error);
      return false;
    }
  }

  // ==================== Payment Reminders ====================

  async sendPaymentReminder(studentId: number, payment: any): Promise<void> {
    if (!this.bot) {
      this.logger.warn('Telegram bot not configured - cannot send payment reminder');
      return;
    }

    try {
      // Find student's private chat
      const studentChat = await this.telegramChatRepo.findOne({
        where: { 
          user: { id: studentId }, 
          type: ChatType.PRIVATE 
        },
        relations: ['user']
      });

      if (!studentChat || !studentChat.telegramUserId) {
        this.logger.warn(`Student ${studentId} does not have Telegram connected`);
        return;
      }

      const message = `💰 To'lov eslatmasi\n\n` +
        `📚 Guruh: ${payment.group?.name || 'Noma\'lum'}\n` +
        `💵 Miqdor: ${payment.amount} so'm\n` +
        `📅 Muddat: ${new Date(payment.dueDate).toLocaleDateString('uz-UZ')}\n` +
        `📋 Tavsif: ${payment.description}\n\n` +
        `⚠️ Iltimos, to'lovingizni muddatida amalga oshiring.\n` +
        `❓ Savollar bo'lsa o'qituvchingiz bilan bog'laning.`;

      await this.bot.sendMessage(studentChat.telegramUserId, message, {
        parse_mode: 'HTML'
      });

      this.logger.log(`Payment reminder sent to student ${studentId}`);
    } catch (error) {
      this.logger.error(`Failed to send payment reminder to student ${studentId}:`, error);
      throw error;
    }
  }

  async sendPaymentReminderToChannel(channelId: string, payment: any): Promise<void> {
    if (!this.bot) {
      this.logger.warn('Telegram bot not configured - cannot send payment reminder to channel');
      return;
    }

    try {
      const message = `💰 To'lov eslatmasi\n\n` +
        `👤 O'quvchi: ${payment.student?.firstName} ${payment.student?.lastName}\n` +
        `📚 Guruh: ${payment.group?.name || 'Noma\'lum'}\n` +
        `💵 Miqdor: ${payment.amount} so'm\n` +
        `📅 Muddat: ${new Date(payment.dueDate).toLocaleDateString('uz-UZ')}\n` +
        `📋 Tavsif: ${payment.description}\n\n` +
        `⚠️ To'lov muddati yetib keldi!`;

      await this.bot.sendMessage(channelId, message, {
        parse_mode: 'HTML'
      });

      this.logger.log(`Payment reminder sent to channel ${channelId}`);
    } catch (error) {
      this.logger.error(`Failed to send payment reminder to channel ${channelId}:`, error);
      throw error;
    }
  }

  async sendMonthlyPaymentNotifications(studentIds: number[], paymentData: { amount: number; description: string; dueDate: Date; groupName: string }): Promise<{ sentCount: number; failedCount: number }> {
    if (!this.bot) {
      this.logger.warn('Telegram bot not configured - cannot send monthly payment notifications');
      return { sentCount: 0, failedCount: studentIds.length };
    }

    let sentCount = 0;
    let failedCount = 0;

    const message = `🗓️ Yangi oylik to'lov\n\n` +
      `📚 Guruh: ${paymentData.groupName}\n` +
      `💵 Miqdor: ${paymentData.amount} so'm\n` +
      `📅 To'lash muddati: ${paymentData.dueDate.toLocaleDateString('uz-UZ')}\n` +
      `📋 Tavsif: ${paymentData.description}\n\n` +
      `💡 To'lovingizni muddatida amalga oshiring.\n` +
      `❓ Savollar bo'lsa o'qituvchingiz bilan bog'laning.`;

    for (const studentId of studentIds) {
      try {
        const studentChat = await this.telegramChatRepo.findOne({
          where: { 
            user: { id: studentId }, 
            type: ChatType.PRIVATE 
          },
          relations: ['user']
        });

        if (studentChat && studentChat.telegramUserId) {
          await this.bot.sendMessage(studentChat.telegramUserId, message, {
            parse_mode: 'HTML'
          });
          sentCount++;
        } else {
          failedCount++;
        }

        // Small delay to avoid rate limiting
        await this.delay(200);
      } catch (error) {
        this.logger.error(`Failed to send monthly payment notification to student ${studentId}:`, error);
        failedCount++;
      }
    }

    this.logger.log(`Monthly payment notifications sent: ${sentCount} sent, ${failedCount} failed`);
    return { sentCount, failedCount };
  }

}