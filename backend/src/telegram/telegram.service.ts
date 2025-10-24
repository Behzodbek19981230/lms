import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThanOrEqual } from 'typeorm';
import TelegramBot, { User as TelegramUser } from 'node-telegram-bot-api';
import { ConfigService } from '@nestjs/config';
import { LogsService } from '../logs/logs.service';
import {
  TelegramChat,
  ChatType,
  ChatStatus,
} from './entities/telegram-chat.entity';
import {
  TelegramAnswer,
  AnswerStatus,
} from './entities/telegram-answer.entity';
import {
  PendingPdf,
  PendingPdfType,
  PendingPdfStatus,
} from './entities/pending-pdf.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Center } from '../centers/entities/center.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Test } from '../tests/entities/test.entity';
import { Question } from '../questions/entities/question.entity';
import { Answer } from '../questions/entities/answer.entity';
import { Exam } from '../exams/entities/exam.entity';
import { Group } from '../groups/entities/group.entity';
import {
  AuthenticateUserDto,
  CreateTelegramChatDto,
  SendTestToChannelDto,
  SubmitAnswerDto,
} from './dto/telegram.dto';

@Injectable()
export class TelegramService {
  /**
   * Bot admin bo'lgan kanallar ro'yxatini qaytaradi (chatId va title)
   */
  async getBotAdminChannels(): Promise<{ chatId: string; title?: string }[]> {
    if (!this.bot) return [];
    // Faqat CHANNEL turidagi chatlar
    const allChannels = await this.telegramChatRepo.find({
      where: { type: ChatType.CHANNEL, status: ChatStatus.ACTIVE },
    });
    const botInfo = await this.bot.getMe();
    const adminChannels: { chatId: string; title?: string }[] = [];
    for (const channel of allChannels) {
      try {
        const chatMember = await this.bot.getChatMember(
          channel.chatId,
          botInfo.id,
        );
        if (['administrator', 'creator'].includes(chatMember.status)) {
          adminChannels.push({ chatId: channel.chatId, title: channel.title });
        }
      } catch (err) {
        // Kanalga bot admin emas yoki chatId noto'g'ri bo'lishi mumkin
        continue;
      }
    }
    return adminChannels;
  }
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot;

  constructor(
    @InjectRepository(TelegramChat)
    private telegramChatRepo: Repository<TelegramChat>,
    @InjectRepository(TelegramAnswer)
    private telegramAnswerRepo: Repository<TelegramAnswer>,
    @InjectRepository(PendingPdf)
    private pendingPdfRepo: Repository<PendingPdf>,
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
    @InjectRepository(Group)
    private groupRepo: Repository<Group>,
    private configService: ConfigService,
    private readonly logsService: LogsService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (token) {
      this.bot = new TelegramBot(token, { polling: false });
      this.logsService.log('Telegram bot initialized', 'TelegramService');
    } else {
      this.logsService.warn(
        'Telegram bot token not configured',
        'TelegramService',
      );
    }
  }

  // ==================== Chat Management ====================

  async createOrUpdateChat(
    dto: CreateTelegramChatDto,
    authenticatedUser: User,
  ): Promise<TelegramChat> {
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
        subject = await this.subjectRepo.findOne({
          where: { id: dto.subjectId },
        });
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
      const chatUser = await this.userRepo.findOne({
        where: { id: dto.userId },
      });
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

  async authenticateUser({
    dto,
    user,
  }: {
    dto: AuthenticateUserDto;
    user: User;
  }): Promise<{
    success: boolean;
    message: string;
    userId?: number;
    autoConnected?: boolean;
  }> {
    try {
      // Use the enhanced authentication method
      this.logsService.log(
        `Authenticating user ${user?.id} with Telegram ID ${dto.telegramUserId}`,
        'TelegramService',
      );
      const currentUser = await this.userRepo.findOne({
        where: { id: user?.id },
      });
      if (currentUser?.telegramId) {
        return {
          success: true,
          message: `Siz allaqachon Telegram hisobingiz bilan tizimga kirdingiz.`,
          userId: currentUser.id,
          autoConnected: true,
        };
      } else {
        return await this.authenticateUserByOwn(dto, user);
      }
    } catch (error) {
      this.logsService.error(
        `Failed to authenticate user: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      return {
        success: false,
        message: "Autentifikatsiyada xatolik. Keyinroq qayta urinib ko'ring.",
        autoConnected: false,
      };
    }
  }

  async authenticateAndConnectUser(
    telegramUserId: string,
    username?: string,
    firstName?: string,
    lastName?: string,
  ): Promise<{
    success: boolean;
    message: string;
    userId?: number;
    autoConnected?: boolean;
  }> {
    try {
      this.logsService.log(
        `Authenticating Telegram user ${telegramUserId}`,
        'TelegramService',
      );
      // Check if this Telegram user is already registered
      const existingChat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user', 'user.center', 'user.subjects'],
      });

      if (existingChat && existingChat.user) {
        // User already connected, send updated channel list
        await this.sendUserChannelsAndInvitation(existingChat.user.id);

        this.logsService.log(
          `User ${existingChat.user.id} is already connected`,
          'TelegramService',
        );
        return {
          success: true,
          message: `Qaytib kelganingiz bilan, ${existingChat.user.firstName}! Sizning hisobingiz allaqachon ulangan.`,
          userId: existingChat.user.id,
          autoConnected: true,
        };
      }

      // Try to find matching LMS user by name - be more flexible with matching
      let potentialUsers: User[] = [];

      if (firstName || lastName) {
        const searchConditions: any[] = [];

        // Search by first name and last name combinations
        if (firstName && lastName) {
          searchConditions.push(
            { firstName: firstName, lastName: lastName },
            { firstName: lastName, lastName: firstName }, // Try reversed names
          );
        }

        // Search by first name only
        if (firstName) {
          searchConditions.push({ firstName: firstName });
        }

        // Search by last name only
        if (lastName) {
          searchConditions.push({ lastName: lastName });
        }

        // Search by username if provided
        if (username) {
          searchConditions.push({ username: username });
        }

        potentialUsers = await this.userRepo.find({
          where: searchConditions,
          relations: ['center', 'subjects'],
        });
      }

      let linkedUser: User | null = null;

      if (potentialUsers.length > 0) {
        // Take the first matching user for auto-linking
        linkedUser = potentialUsers[0];
        this.logsService.log(
          `Auto-linking user ${linkedUser.firstName} ${linkedUser.lastName} with Telegram user ${telegramUserId}`,
          'TelegramService',
        );
      } else {
        try {
          // Create a temporary user - this code seems wrong, fixing it
          linkedUser = await this.userRepo.save(
            this.userRepo.create({
              username: `telegram_${telegramUserId}`,
              firstName: firstName || 'Telegram',
              lastName: lastName || 'User',
              password: 'temp_password_' + Math.random().toString(36),
              role: UserRole.STUDENT,
              isActive: true,
            }),
          );

          this.logsService.log(
            `Created temporary user ${linkedUser.id} for Telegram user ${telegramUserId}`,
            'TelegramService',
          );
        } catch (error) {
          this.logsService.error(
            `Failed to create temporary user: ${error.message}`,
            error.stack,
            'TelegramService',
          );
          // Fallback - create chat without user link for manual processing later
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            chat = await this.telegramChatRepo.save(
              this.telegramChatRepo.create(chatData),
            );
          }

          return {
            success: true,
            message: `Salom ${firstName || 'Telegram foydalanuvchisi'}! Hisobingiz yaratilmoqda. Tez orada barcha funksiyalar mavjud bo'ladi.`,
            userId: undefined,
            autoConnected: false,
          };
        }
      }

      // Create or update chat with linked user
      const chat =
        existingChat ||
        this.telegramChatRepo.create({
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

      // Send any pending PDFs to the newly connected user
      try {
        const pendingResult = await this.sendAllPendingPdfs(linkedUser.id);
        if (pendingResult.sent > 0) {
          this.logsService.log(
            `Successfully sent ${pendingResult.sent} pending PDFs to user ${linkedUser.id} after connection`,
            'TelegramService',
          );

          // Optionally notify user about sent PDFs
          const userChat = await this.telegramChatRepo.findOne({
            where: { user: { id: linkedUser.id }, type: ChatType.PRIVATE },
          });

          if (userChat && userChat.telegramUserId && this.bot) {
            const pdfMessage = `📄 Sizga ${pendingResult.sent} ta kutilayotgan PDF yuborildi!`;
            await this.bot.sendMessage(userChat.telegramUserId, pdfMessage, {
              parse_mode: 'HTML',
            });
          }
        }
      } catch (error) {
        this.logsService.error(
          `Failed to send pending PDFs to user ${linkedUser.id} after connection: ${error.message}`,
          error.stack,
          'TelegramService',
        );
      }

      return {
        success: true,
        message: `🎉 Salom ${linkedUser.firstName}! Hisobingiz avtomatik ulandi. Tegishli kanallarga qo'shilish uchun quyidagi havolalardan foydalaning.`,
        userId: linkedUser.id,
        autoConnected: true,
      };
    } catch (error) {
      this.logsService.error(
        `Failed to authenticate and connect user: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      return {
        success: false,
        message: "Autentifikatsiyada xatolik. Keyinroq qayta urinib ko'ring.",
        autoConnected: false,
      };
    }
  }

  async authenticateUserByOwn(
    dto: AuthenticateUserDto,
    user: User,
  ): Promise<{
    success: boolean;
    message: string;
    userId?: number;
    autoConnected?: boolean;
  }> {
    try {
      const { telegramUserId, username, firstName, lastName } = dto;

      // Check if this Telegram user is already registered
      const existingChat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user', 'user.center', 'user.subjects'],
      });
      const currentUser = await this.userRepo.findOne({
        where: { id: user.id },
        relations: ['center', 'subjects'],
      });

      if (existingChat && existingChat.user && currentUser?.telegramConnected) {
        // User already connected, send updated channel list
        await this.sendUserChannelsAndInvitation(existingChat.user.id);

        this.logsService.log(
          `User ${existingChat.user.id} is already connected`,
          'TelegramService',
        );
        return {
          success: true,
          message: `Qaytib kelganingiz bilan, ${existingChat.user.firstName}! Sizning hisobingiz allaqachon ulangan.`,
          userId: existingChat.user.id,
          autoConnected: true,
        };
      }

      // Try to find matching LMS user by name - be more flexible with matching
      let potentialUsers: User[] = [];

      if (firstName || lastName) {
        const searchConditions: any[] = [];

        // Search by first name and last name combinations
        if (firstName && lastName) {
          searchConditions.push(
            { firstName: firstName, lastName: lastName },
            { firstName: lastName, lastName: firstName }, // Try reversed names
          );
        }

        // Search by first name only
        if (firstName) {
          searchConditions.push({ firstName: firstName });
        }

        // Search by last name only
        if (lastName) {
          searchConditions.push({ lastName: lastName });
        }

        // Search by username if provided
        if (username) {
          searchConditions.push({ username: username });
        }

        potentialUsers = await this.userRepo.find({
          where: searchConditions,
          relations: ['center', 'subjects'],
        });
      }

      let linkedUser: User | null = null;

      if (potentialUsers.length > 0) {
        // Take the first matching user for auto-linking
        linkedUser = potentialUsers[0];
        this.logsService.log(
          `Auto-linking user ${linkedUser.firstName} ${linkedUser.lastName} with Telegram user ${telegramUserId}`,
          'TelegramService',
        );
      } else {
        // Use the passed user instead of creating a new one
        linkedUser = user;
        this.logsService.log(
          `Linking existing user ${linkedUser.firstName} ${linkedUser.lastName} with Telegram user ${telegramUserId}`,
          'TelegramService',
        );
      }

      // Update the user's Telegram information
      if (telegramUserId) {
        linkedUser.telegramId = telegramUserId;
        linkedUser.telegramConnected = true;
        await this.userRepo.save(linkedUser);
      }

      // Create or update chat with linked user
      const chat =
        existingChat ||
        this.telegramChatRepo.create({
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

      // Send any pending PDFs to the newly connected user
      try {
        const pendingResult = await this.sendAllPendingPdfs(linkedUser.id);
        if (pendingResult.sent > 0) {
          this.logsService.log(
            `Successfully sent ${pendingResult.sent} pending PDFs to user ${linkedUser.id} after connection`,
            'TelegramService',
          );

          // Optionally notify user about sent PDFs
          const userChat = await this.telegramChatRepo.findOne({
            where: { user: { id: linkedUser.id }, type: ChatType.PRIVATE },
          });

          if (userChat && userChat.telegramUserId && this.bot) {
            const pdfMessage = `📄 Sizga ${pendingResult.sent} ta kutilayotgan PDF yuborildi!`;
            await this.bot.sendMessage(userChat.telegramUserId, pdfMessage, {
              parse_mode: 'HTML',
            });
          }
        }
      } catch (error) {
        this.logsService.error(
          `Failed to send pending PDFs to user ${linkedUser.id} after connection: ${error.message}`,
          error.stack,
          'TelegramService',
        );
      }

      return {
        success: true,
        message: `🎉 Salom ${linkedUser.firstName}! Hisobingiz avtomatik ulandi. Tegishli kanallarga qo'shilish uchun quyidagi havolalardan foydalaning.`,
        userId: linkedUser.id,
        autoConnected: true,
      };
    } catch (error) {
      this.logsService.error(
        `Failed to authenticate and connect user: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      return {
        success: false,
        message: "Autentifikatsiyada xatolik. Keyinroq qayta urinib ko'ring.",
        autoConnected: false,
      };
    }
  }

  async sendUserChannelsAndInvitation(
    userId: number,
  ): Promise<{ success: boolean; message: string; channels: string[] }> {
    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['center', 'subjects'],
      });

      if (!user) {
        return {
          success: false,
          message: 'Foydalanuvchi topilmadi',
          channels: [],
        };
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
          message: "Foydalanuvchi xabardor qilindi (kanallar yo'q)",
          channels: [],
        };
      }

      // Create invitation message with channel links
      const channelList = relevantChannels
        .map((channel) => {
          const channelName =
            channel.title || channel.username || channel.chatId;
          const subjectInfo = channel.subject
            ? ` (${channel.subject.name})`
            : '';
          const joinLink =
            channel.inviteLink ||
            channel.username ||
            "O'qituvchingiz bilan bog'laning";

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
              const inviteResult = await this.generateChannelInviteLink(
                channel.chatId,
              );
              if (inviteResult.success && inviteResult.inviteLink) {
                // Send individual invitation
                await this.bot.sendMessage(
                  userChat.telegramUserId,
                  `🔗 ${channel.title || channel.username} kanaliga avtomatik qo'shilish:\n${inviteResult.inviteLink}`,
                  { disable_web_page_preview: true },
                );
              }
            } catch (error) {
              this.logsService.warn(
                `Failed to generate invite for channel ${channel.chatId}: ${error.message}`,
                'TelegramService',
              );
            }
          }
        }
      }

      return {
        success: true,
        message: "Kanallar ro'yxati muvaffaqiyatli yuborildi",
        channels: relevantChannels.map(
          (c) => c.title || c.username || c.chatId,
        ),
      };
    } catch (error) {
      console.error('Failed to send user channels and invitation:', error);
      return {
        success: false,
        message: 'Taklifnomalarni yuborishda xatolik',
        channels: [],
      };
    }
  }

  async linkTelegramUserToLmsUser(
    telegramUserId: string,
    lmsUserId: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.userRepo.findOne({ where: { id: lmsUserId } });
      if (!user) {
        return { success: false, message: 'LMS foydalanuvchisi topilmadi' };
      }

      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
      });

      if (!chat) {
        return {
          success: false,
          message:
            'Telegram foydalanuvchisi topilmadi. Iltimos avval botni ishga tushiring.',
        };
      }

      chat.user = user;
      await this.telegramChatRepo.save(chat);

      return {
        success: true,
        message: `${user.firstName} ${user.lastName} muvaffaqiyatli Telegram hisobiga ulandi`,
      };
    } catch (error) {
      console.error('Failed to link Telegram user to LMS user:', error);
      return {
        success: false,
        message: "Ulanishda xatolik. Qayta urinib ko'ring.",
      };
    }
  }

  async getUnlinkedTelegramUsers(): Promise<TelegramChat[]> {
    return this.telegramChatRepo.find({
      where: { user: IsNull(), type: ChatType.PRIVATE },
      order: { createdAt: 'DESC' },
    });
  }

  async generateChannelInviteLink(channelId: string): Promise<{
    success: boolean;
    inviteLink?: string;
    message: string;
    errorDetails?: any;
  }> {
    if (!this.bot) {
      return { success: false, message: 'Telegram bot not configured' };
    }

    try {
      // First, try to get bot information to check if it's in the channel
      let botInfo: TelegramUser;
      try {
        botInfo = await this.bot.getMe();
        const chatMember = await this.bot.getChatMember(channelId, botInfo.id);

        if (!['administrator', 'creator'].includes(chatMember.status)) {
          return {
            success: false,
            message: `Bot is not an admin in the channel. Bot status: ${chatMember.status}. Please add @${botInfo.username} as an admin with "can_invite_users" permission.`,
            errorDetails: {
              botStatus: chatMember.status,
              botUsername: botInfo.username!,
            },
          };
        }

        // Check if bot has the required permissions
        if (
          chatMember.status === 'administrator' &&
          chatMember.can_invite_users === false
        ) {
          return {
            success: false,
            message: `Bot is admin but lacks "can_invite_users" permission. Please grant this permission to @${botInfo.username!}.`,
            errorDetails: { permissions: chatMember },
          };
        }
      } catch (permissionError) {
        this.logsService.warn(
          `Could not check bot permissions, proceeding anyway: ${permissionError.message}`,
          'TelegramService',
        );
      }

      // Try to generate the invite link
      const inviteLink = await this.bot.exportChatInviteLink(channelId);

      // Save invite link to database
      const chat = await this.telegramChatRepo.findOne({
        where: { chatId: channelId },
      });
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
      this.logsService.error(
        `Failed to generate invite link: ${error.message}`,
        error.stack,
        'TelegramService',
      );

      // Provide more specific error messages
      if (error.code === 400) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (error.description?.includes('not enough rights')) {
          return {
            success: false,
            message:
              'Bot does not have sufficient permissions. Please ensure the bot is an admin with "can_invite_users" permission.',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            errorDetails: error,
          };
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        } else if (error.description?.includes('chat not found')) {
          return {
            success: false,
            message:
              'Channel not found. Please check the channel ID or username.',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            errorDetails: error,
          };
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        } else if (error.description?.includes('CHAT_ADMIN_REQUIRED')) {
          return {
            success: false,
            message:
              'Bot must be an admin in the channel to generate invite links.',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            errorDetails: error,
          };
        }
      }

      return {
        success: false,
        message: `Failed to generate invite link: ${error.message || 'Unknown error'}. Make sure the bot is admin in the channel with invite permissions.`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        errorDetails: error,
      };
    }
  }

  async getUserTelegramStatus(userId: number): Promise<{
    isLinked: boolean;
    telegramUsername?: string;
    firstName?: string;
    lastName?: string;
    availableChannels: TelegramChat[];
  }> {
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
      this.logsService.error(
        `Failed to get user Telegram status: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      return {
        isLinked: false,
        availableChannels: [],
      };
    }
  }

  async checkBotChannelStatus(channelId: string): Promise<{
    success: boolean;
    botStatus?: string;
    botUsername?: string;
    permissions?: any;
    message: string;
  }> {
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
        message: `Bot @${botInfo.username} status in channel: ${chatMember.status}`,
      };
    } catch (error) {
      this.logsService.error(
        `Failed to check bot status in channel: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      return {
        success: false,
        message: `Failed to check bot status: ${error.message}`,
      };
    }
  }

  async sendUserInvitations(
    userId: number,
  ): Promise<{ success: boolean; message: string; channels: string[] }> {
    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['center'], // Assuming user has center relationship
      });

      if (!user) {
        return {
          success: false,
          message: 'Foydalanuvchi topilmadi',
          channels: [],
        };
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
        .map(
          (channel) =>
            `📚 ${channel.title || channel.username || channel.chatId}\n   Qo'shilish: ${channel.inviteLink || channel.username || "Adminstratsiya bilan bog'laning"}`,
        )
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
        channels: relevantChannels.map(
          (c) => c.title || c.username || c.chatId,
        ),
      };
    } catch (error) {
      this.logsService.error(
        `Failed to send user invitations: ${error.message}`,
        error.stack,
        'TelegramService',
      );
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

    // Try to find channel by chatId or username
    let channel = await this.telegramChatRepo.findOne({
      where: [
        { chatId: dto.channelId, type: ChatType.CHANNEL },
        { username: dto.channelId, type: ChatType.CHANNEL },
      ],
    });

    // If channel not found in database, try to resolve the channel ID first
    let targetChannelId = dto.channelId;
    if (!channel) {
      try {
        // If it's a username (@channel_name), try to get chat info
        if (dto.channelId.startsWith('@')) {
          const chatInfo = await this.bot.getChat(dto.channelId);
          targetChannelId = chatInfo.id.toString();

          // Create channel record in database for future use
          const newChannelData = {
            chatId: targetChannelId,
            type: ChatType.CHANNEL,
            status: ChatStatus.ACTIVE,
            username: dto.channelId,
            title: chatInfo.title || dto.channelId,
            lastActivity: new Date(),
          };

          channel = this.telegramChatRepo.create(newChannelData);
          await this.telegramChatRepo.save(channel);
        } else {
          // Use the channelId as-is and try to get chat info
          try {
            const chatInfo = await this.bot.getChat(dto.channelId);
            targetChannelId = dto.channelId;

            // Create channel record
            const newChannelData = {
              chatId: targetChannelId,
              type: ChatType.CHANNEL,
              status: ChatStatus.ACTIVE,
              username: chatInfo.username ? `@${chatInfo.username}` : undefined,
              title: chatInfo.title || dto.channelId,
              lastActivity: new Date(),
            };

            channel = this.telegramChatRepo.create(newChannelData);
            await this.telegramChatRepo.save(channel);
          } catch (error) {
            console.log(error);

            // Continue anyway - maybe bot doesn't have access yet
            targetChannelId = dto.channelId;
          }
        }
      } catch (error) {
        console.warn(
          `Could not resolve channel ${dto.channelId}:`,
          error.message,
        );
        // Use original channelId and try to send anyway
        targetChannelId = dto.channelId;
      }
    }

    try {
      // Send plain text message instead of PDF
      const caption = dto.customMessage
        ? `${dto.customMessage}\n\n� Test #${dto.testId}: ${test.title}`
        : `� Test #${dto.testId}: ${test.title}\n\nFan: ${test.subject?.name || "Noma'lum"}\nSavollar soni: ${test.questions?.length || 0} ta`;

      await this.bot.sendMessage(targetChannelId, caption, {
        parse_mode: 'HTML',
      });

      void this.logsService.log(
        `Test ${dto.testId} message sent successfully to channel ${targetChannelId} (requested: ${dto.channelId})`,
        'TelegramService',
      );
      return true;
    } catch (error) {
      void this.logsService.error(
        `Failed to send test message to channel: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      throw new BadRequestException(
        `Test xabarini Telegram kanaliga yuborishda xatolik: ${error.message}`,
      );
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
      throw new BadRequestException(
        'Talaba topilmadi. Avval Telegram hisobingizni ulang.',
      );
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
      throw new BadRequestException(
        'Bu savol uchun javob allaqachon yuborilgan',
      );
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
          order: answer.questionNumber,
        },
        relations: ['answers', 'test'],
      });

      if (!question) {
        this.logsService.warn(
          `Question not found for test ${answer.testId}, question ${answer.questionNumber}`,
          'TelegramService',
        );
        return;
      }

      const correctAnswer = question.answers.find((a) => a.isCorrect);
      if (!correctAnswer) {
        this.logsService.warn(
          `No correct answer found for question ${question.id}`,
          'TelegramService',
        );
        return;
      }

      // Check if the answer is correct
      const isCorrect = this.compareAnswers(
        answer.answerText,
        correctAnswer.text,
      );
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
      this.logsService.error(
        `Failed to check answer: ${error.message}`,
        error.stack,
        'TelegramService',
      );
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
      await this.bot.sendMessage(
        channelId,
        '📊 <b>Test Natijalari</b>\n\nHali hech qanday javob yuborilmagan.',
        {
          parse_mode: 'HTML',
        },
      );
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
      this.logsService.error(
        `Failed to publish results: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      throw new BadRequestException(
        "Natijalarni kanalga e'lon qilishda xatolik",
      );
    }
  }

  // ==================== Helper Methods ====================

  private formatTestMessage(test: Test, customMessage?: string): string {
    const header = '📝 <b>YANGI TEST MAVJUD</b>\n\n';
    const testInfo = `<b>📚 Fan:</b> ${test.subject?.name || 'Aniqlanmagan'}\n`;
    const title = `<b>🎯 Test:</b> ${test.title}\n`;
    const description = test.description
      ? `<b>📖 Tavsif:</b> ${test.description}\n`
      : '';
    const duration = `<b>⏱ Davomiyligi:</b> ${test.duration} daqiqa\n`;
    const questions = `<b>❓ Savollar:</b> ${test.questions?.length || 0}\n`;
    const points = `<b>🎯 Jami ball:</b> ${test.totalPoints}\n\n`;

    const custom = customMessage ? `${customMessage}\n\n` : '';

    return (
      header +
      testInfo +
      title +
      description +
      duration +
      questions +
      points +
      custom
    );
  }

  private formatQuestionMessage(
    question: Question,
    number: number,
    testId: number,
  ): string {
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
    return (
      `📋 <b>JAVOBLARNI QANDAY YUBORISH</b>\n\n` +
      `Javoblaringizni yuborish uchun quyidagi formatda xabar yuboring:\n` +
      `<code>#T${testId}Q1 A</code> (1-savol uchun, A javobi)\n` +
      `<code>#T${testId}Q2 B</code> (2-savol uchun, B javobi)\n\n` +
      `⚠️ <b>Muhim:</b>\n` +
      `• Yuqorida ko'rsatilgan aniq formatni ishlating\n` +
      `• Har bir savol uchun alohida xabar yuboring\n` +
      `• Yangi xabar yuborish orqali javobingizni o'zgartirishingiz mumkin\n` +
      `• Tekshirilgandan so'ng natijalar avtomatik e'lon qilinadi\n\n` +
      `Omad tilaymiz! 🍀`
    );
  }

  private async sendAnswerResult(answer: TelegramAnswer): Promise<void> {
    if (!this.bot || !answer.chat) return;

    const emoji = answer.isCorrect ? '✅' : '❌';
    const status = answer.isCorrect ? "To'g'ri" : "Noto'g'ri";

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
      console.error('Failed to send answer result:', error);
    }
  }

  private compareAnswers(
    studentAnswer: string,
    correctAnswer: string,
  ): boolean {
    // Normalize both answers for comparison
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' '); // Normalize whitespace

    return normalize(studentAnswer) === normalize(correctAnswer);
  }

  private groupAnswersByStudent(
    answers: TelegramAnswer[],
  ): Map<string, TelegramAnswer[]> {
    const grouped = new Map<string, TelegramAnswer[]>();

    answers.forEach((answer) => {
      const studentKey = `${answer.student.firstName} ${answer.student.lastName}`;
      if (!grouped.has(studentKey)) {
        grouped.set(studentKey, []);
      }
      grouped.get(studentKey)!.push(answer);
    });

    return grouped;
  }

  private formatResultsMessage(
    testId: number,
    studentResults: Map<string, TelegramAnswer[]>,
  ): string {
    let message = `📊 <b>TEST NATIJALARI - Test #${testId}</b>\n\n`;

    studentResults.forEach((answers, studentName) => {
      const totalPoints = answers.reduce(
        (sum, answer) => sum + (answer.points || 0),
        0,
      );
      const correctAnswers = answers.filter(
        (answer) => answer.isCorrect,
      ).length;
      const totalQuestions = answers.length;
      const percentage =
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0;

      message += `👤 <b>${studentName}</b>\n`;
      message += `   ✅ To'g'ri: ${correctAnswers}/${totalQuestions} (${percentage}%)\n`;
      message += `   🎯 Ball: ${totalPoints}\n\n`;
    });

    message += `<i>Yangilangan: ${new Date().toLocaleString()}</i>`;

    return message;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==================== Exam Helper Methods ====================

  private formatExamStartMessage(exam: Exam, customMessage?: string): string {
    const header = '🎯 <b>IMTIHON BOSHLANDI!</b>\n\n';
    const subjectNames =
      exam.subjects?.map((s) => s.name).join(', ') || 'Aniqlanmagan';
    const examInfo = `<b>📚 Fan:</b> ${subjectNames}\n`;
    const title = `<b>📝 Imtihon:</b> ${exam.title}\n`;
    const description = exam.description
      ? `<b>📖 Tavsif:</b> ${exam.description}\n`
      : '';
    const duration = `<b>⏱ Davomiyligi:</b> ${exam.duration} daqiqa\n`;
    const variants = `<b>🔢 Variantlar:</b> ${exam.variants?.length || 0}\n`;
    const startTime = `<b>🕐 Boshlanish vaqti:</b> ${exam.startTime ? new Date(exam.startTime).toLocaleString() : 'Hozir'}\n`;
    const endTime = `<b>🕕 Tugash vaqti:</b> ${exam.endTime ? new Date(exam.endTime).toLocaleString() : 'Belgilanmagan'}\n\n`;

    const custom = customMessage ? `${customMessage}\n\n` : '';

    return (
      header +
      examInfo +
      title +
      description +
      duration +
      variants +
      startTime +
      endTime +
      custom
    );
  }

  private formatExamStartMessageForStudent(exam: Exam, student: any): string {
    const header = '🎯 <b>IMTIHON BOSHLANDI!</b>\n\n';
    const greeting = `Salom ${student.firstName}!\n\n`;
    const subjectNames =
      exam.subjects?.map((s) => s.name).join(', ') || 'Aniqlanmagan';
    const examInfo = `<b>📚 Fan:</b> ${subjectNames}\n`;
    const title = `<b>📝 Imtihon:</b> ${exam.title}\n`;
    const description = exam.description
      ? `<b>📖 Tavsif:</b> ${exam.description}\n`
      : '';
    const duration = `<b>⏱ Davomiyligi:</b> ${exam.duration} daqiqa\n`;
    const startTime = `<b>🕐 Boshlanish vaqti:</b> ${exam.startTime ? new Date(exam.startTime).toLocaleString() : 'Hozir'}\n`;
    const endTime = `<b>🕕 Tugash vaqti:</b> ${exam.endTime ? new Date(exam.endTime).toLocaleString() : 'Belgilanmagan'}\n\n`;

    const personalNote = `🎓 <b>Sizning imtihon variantingiz tayyor!</b>\n\n`;

    return (
      header +
      greeting +
      examInfo +
      title +
      description +
      duration +
      startTime +
      endTime +
      personalNote
    );
  }

  private getExamInstructions(exam: Exam): string {
    return (
      `📋 <b>IMTIHON QOIDALARI</b>\n\n` +
      `⚠️ <b>Muhim ko'rsatmalar:</b>\n` +
      `• Imtihon ${exam.duration} daqiqa davom etadi\n` +
      `• Har bir variant uchun alohida javob varaqasi beriladi\n` +
      `• Vaqt tugagach, javob varaqlari yig'ib olinadi\n` +
      `• Imtihon davomida telefondan foydalanish taqiqlanadi\n` +
      `• Nusxa ko'chirish va gaplashish taqiqlanadi\n\n` +
      `🎯 <b>Muvaffaqiyat tilaymiz!</b>\n\n` +
      `📞 Savollar bo'lsa, nazoratchi bilan bog'laning.`
    );
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
    const correctAnswers = answers.filter((a) => a.isCorrect).length;

    return {
      testId,
      totalStudents,
      totalAnswers,
      correctAnswers,
      accuracy:
        totalAnswers > 0
          ? Math.round((correctAnswers / totalAnswers) * 100)
          : 0,
      studentResults: Array.from(studentResults.entries()).map(
        ([name, answers]) => ({
          student: name,
          totalQuestions: answers.length,
          correctAnswers: answers.filter((a) => a.isCorrect).length,
          totalPoints: answers.reduce((sum, a) => sum + (a.points || 0), 0),
        }),
      ),
    };
  }

  // ==================== Bot Command Handlers ====================

  async getUserTestResults(telegramUserId: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user'],
      });

      if (!chat || !chat.user) {
        return "❌ Hisobingiz ulanmagan. Avval /start buyrug'ini yuboring va o'qituvchingiz bilan bog'laning.";
      }

      // Get user's test results from TelegramAnswer
      const answers = await this.telegramAnswerRepo.find({
        where: { student: { id: chat.user.id } },
        relations: ['student'],
        order: { createdAt: 'DESC' },
        take: 10, // Last 10 tests
      });

      if (answers.length === 0) {
        return `📊 <b>Test Natijalarim</b>\n\n🔍 Hozircha test natijalari yo'q.\nTestlarga javob bergansizdan so'ng, natijalar bu yerda ko'rinadi.`;
      }

      // Group answers by test
      const testGroups = answers.reduce(
        (groups, answer) => {
          if (!groups[answer.testId]) {
            groups[answer.testId] = [];
          }
          groups[answer.testId].push(answer);
          return groups;
        },
        {} as Record<number, TelegramAnswer[]>,
      );

      let resultMessage = `📊 <b>${chat.user.firstName} ning Test Natijalari</b>\n\n`;

      Object.keys(testGroups).forEach((testId) => {
        const testAnswers = testGroups[parseInt(testId)];
        const correctAnswers = testAnswers.filter((a) => a.isCorrect).length;
        const totalQuestions = testAnswers.length;
        const percentage =
          totalQuestions > 0
            ? Math.round((correctAnswers / totalQuestions) * 100)
            : 0;
        const emoji = percentage >= 80 ? '🟢' : percentage >= 60 ? '🟡' : '🔴';

        resultMessage += `${emoji} <b>Test ${testId}</b>\n`;
        resultMessage += `   ✅ To'g'ri: ${correctAnswers}/${totalQuestions} (${percentage}%)\n`;
        resultMessage += `   📅 Sana: ${testAnswers[0].createdAt.toLocaleDateString()}\n\n`;
      });

      resultMessage += `💡 <b>Ko'rsatma:</b> Yanada yaxshi natijalar uchun darslarni takrorlang!`;

      return resultMessage;
    } catch (error) {
      console.error('Error getting user test results:', error);
      return "Natijalarni yuklab olishda xatolik yuz berdi. Keyinroq qayta urinib ko'ring.";
    }
  }

  async getUserAttendance(telegramUserId: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user'],
      });

      if (!chat || !chat.user) {
        return "❌ Hisobingiz ulanmagan. Avval /start buyrug'ini yuboring va o'qituvchingiz bilan bog'laning.";
      }

      // This would require implementing attendance tracking
      // For now, return a placeholder message
      return `📅 <b>${chat.user.firstName} ning Davomat Hisoboti</b>\n\n⏰ Davomat tizimi hali ishga tushirilmagan.\n\n📋 Tez orada quyidagi ma'lumotlar mavjud bo'ladi:\n• Darsga kelish statistikasi\n• Kechikishlar hisoboti\n• Oylik davomat foizi\n\n👨‍🏫 Batafsil ma'lumot uchun o'qituvchingiz bilan bog'laning.`;
    } catch (error) {
      console.error('Error getting user attendance:', error);
      return "Davomat ma'lumotlarini yuklab olishda xatolik yuz berdi.";
    }
  }

  async getUserAccountInfo(telegramUserId: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user', 'user.center'],
      });

      if (!chat || !chat.user) {
        return "❌ Hisobingiz ulanmagan. Avval /start buyrug'ini yuboring va o'qituvchingiz bilan bog'laning.";
      }

      const user = chat.user;
      let accountMessage = `👤 <b>Shaxsiy Ma'lumotlar</b>\n\n`;
      accountMessage += `📝 <b>Ism:</b> ${user.firstName}\n`;
      if (user.lastName) {
        accountMessage += `📝 <b>Familiya:</b> ${user.lastName}\n`;
      }
      accountMessage += `👤 <b>Foydalanuvchi nomi:</b> ${user.username}\n`;
      accountMessage += `👤 <b>Rol:</b> ${this.getRoleDisplayName(user.role)}\n`;

      if (user.center) {
        accountMessage += `🏢 <b>Markaz:</b> ${user.center.name}\n`;
      }

      accountMessage += `📱 <b>Telegram:</b> @${chat.telegramUsername || "username yo'q"}\n`;
      accountMessage += `🔗 <b>Ulangan sana:</b> ${chat.createdAt.toLocaleDateString()}\n\n`;
      accountMessage += `⚙️ Hisobingizni o'zgartirish uchun LMS tizimiga kiring yoki o'qituvchingiz bilan bog'laning.`;

      return accountMessage;
    } catch (error) {
      console.error('Error getting user account info:', error);
      return "Hisob ma'lumotlarini yuklab olishda xatolik yuz berdi.";
    }
  }

  async getTeacherGroups(telegramUserId: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user', 'user.center'],
      });

      if (!chat || !chat.user) {
        return "❌ Hisobingiz ulanmagan. Avval /start buyrug'ini yuboring va admin bilan bog'laning.";
      }

      if (chat.user.role !== UserRole.TEACHER) {
        return "🚫 Sizda o'qituvchi huquqi yo'q. Yo'qlama olish faqat o'qituvchilar uchun mavjud.";
      }

      // Get teacher's groups from the database
      const teacherGroups = await this.groupRepo.find({
        where: { teacher: { id: chat.user.id } },
        relations: ['teacher', 'subject', 'students', 'center'],
        order: { name: 'ASC' },
      });

      let groupMessage = `👨‍🏫 <b>Yo'qlama Olish - ${chat.user.firstName} ning Guruhlari</b>\n\n`;
      groupMessage += `📅 <b>Bugungi sana:</b> ${new Date().toLocaleDateString()}\n\n`;

      if (teacherGroups.length === 0) {
        return `❌ Sizda hozircha guruhlar mavjud emas.\n\nGuruhlar yaratilgandan keyin, ular bu yerda ko'rinadi.`;
      }

      groupMessage += `Yo'qlama olish uchun guruhni tanlang:\n\n`;

      teacherGroups.forEach((group) => {
        const studentsCount = group.students ? group.students.length : 0;
        const subjectName = group.subject
          ? group.subject.name
          : 'Fan belgilanmagan';

        groupMessage += `🔹 <b>grup_${group.id}</b> - ${group.name}\n`;
        groupMessage += `   📋 Fan: ${subjectName}\n`;
        groupMessage += `   👥 Studentlar: ${studentsCount} ta\n`;
        if (group.center) {
          groupMessage += `   🏢 Markaz: ${group.center.name}\n`;
        }
        groupMessage += `\n`;
      });

      groupMessage += `💡 <b>Qo'llanma:</b>\n`;
      groupMessage += `• Guruh kodini yozing (masalan: <b>grup_${teacherGroups[0].id}</b>)\n`;
      groupMessage += `• Keyin har bir student uchun yo'qlama belgilang\n`;
      groupMessage += `• /menu - Asosiy menyuga qaytish`;

      return groupMessage;
    } catch (error) {
      console.error('Error getting teacher groups:', error);
      return "Guruhlar ro'yxatini yuklab olishda xatolik yuz berdi.";
    }
  }

  async getGroupStudentsForAttendance(
    telegramUserId: string,
    groupId: string,
  ): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user'],
      });

      if (!chat || !chat.user || chat.user.role !== UserRole.TEACHER) {
        return "❌ Sizda ushbu amalni bajarish huquqi yo'q.";
      }

      const groupIdNum = parseInt(groupId);
      if (isNaN(groupIdNum)) {
        return "❌ Noto'g'ri guruh ID. Masalan: grup_1";
      }

      // Get group from database with all related data
      const group = await this.groupRepo.findOne({
        where: {
          id: groupIdNum,
          teacher: { id: chat.user.id }, // Ensure teacher owns this group
        },
        relations: ['teacher', 'subject', 'students', 'center'],
      });

      if (!group) {
        return `❌ Guruh topilmadi (ID: ${groupIdNum}). Faqat o'zingizning guruhlaringizni ko'rishingiz mumkin. /yoklama orqali mavjud guruhlarni ko'ring.`;
      }

      if (!group.students || group.students.length === 0) {
        return `🚫 <b>${group.name}</b> guruhida studentlar yo'q.\n\nStudentlar qo'shilgandan so'ng, ular bu yerda ko'rinadi.\n\n/yoklama - Guruhlar ro'yxatiga qaytish`;
      }

      let studentsMessage = `📋 <b>${group.name} - Yo'qlama</b>\n`;
      studentsMessage += `📋 <b>Fan:</b> ${group.subject?.name || 'Fan belgilanmagan'}\n`;
      if (group.center) {
        studentsMessage += `🏢 <b>Markaz:</b> ${group.center.name}\n`;
      }
      studentsMessage += `📅 <b>Sana:</b> ${new Date().toLocaleDateString()}\n`;
      studentsMessage += `⏰ <b>Vaqt:</b> ${new Date().toLocaleTimeString()}\n\n`;
      studentsMessage += `👥 <b>Studentlar ro'yxati (${group.students.length} ta):</b>\n\n`;

      // Sort students by name for better organization
      const sortedStudents = group.students.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });

      sortedStudents.forEach((student, index) => {
        studentsMessage += `👤 <b>${index + 1}. ${student.firstName} ${student.lastName}</b>\n`;
        studentsMessage += `   ✅ <code>${student.id}_keldi</code>\n`;
        studentsMessage += `   ❌ <code>${student.id}_kelmadi</code>\n`;
        studentsMessage += `   ⏰ <code>${student.id}_kechikdi</code>\n\n`;
      });

      studentsMessage += `💡 <b>Qo'llanma:</b>\n`;
      studentsMessage += `• Yuqoridagi kodlardan birini aynan yozing\n`;
      studentsMessage += `• Masalan: <code>${sortedStudents[0]?.id}_keldi</code> yoki <code>${sortedStudents[0]?.id}_kelmadi</code>\n`;
      studentsMessage += `• Har bir student uchun alohida kod yuboring\n`;
      studentsMessage += `• /yoklama - Guruhlar ro'yxatiga qaytish`;

      return studentsMessage;
    } catch (error) {
      console.error('Error getting group students:', error);
      return "Guruh ma'lumotlarini yuklab olishda xatolik yuz berdi.";
    }
  }

  async markStudentAttendance(
    telegramUserId: string,
    attendanceCode: string,
  ): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user'],
      });

      if (!chat || !chat.user || chat.user.role !== UserRole.TEACHER) {
        return "❌ Sizda ushbu amalni bajarish huquqi yo'q.";
      }

      // Parse attendance code: studentId_status
      const parts = attendanceCode.trim().split('_');
      if (parts.length !== 2) {
        return "❌ Noto'g'ri format. Masalan: <code>1_keldi</code>, <code>2_kelmadi</code>, <code>3_kechikdi</code>";
      }

      const studentId = parseInt(parts[0]);
      const status = parts[1].toLowerCase();

      if (isNaN(studentId)) {
        return "❌ Student ID raqam bo'lishi kerak. Masalan: <code>1_keldi</code>";
      }

      const validStatuses = ['keldi', 'kelmadi', 'kechikdi'];
      if (!validStatuses.includes(status)) {
        return "❌ Noto'g'ri status. Faqat: <code>keldi</code>, <code>kelmadi</code>, <code>kechikdi</code>";
      }

      // Get student from database
      const student = await this.userRepo.findOne({
        where: { id: studentId, role: UserRole.STUDENT },
      });

      if (!student) {
        return `❌ Student topilmadi (ID: ${studentId}). Faqat o'zingiz o'qitadigan studentlarni belgilashingiz mumkin.`;
      }

      // Get groups where this student is enrolled and teacher is teaching
      const teacherGroups = await this.groupRepo.find({
        where: {
          teacher: { id: chat.user.id },
          students: { id: student.id },
        },
        relations: ['teacher', 'subject', 'center', 'students'],
      });

      if (teacherGroups.length === 0) {
        return `❌ Sizda ${student.firstName} ${student.lastName} studentini yo'qlamalashda huquqingiz yo'q. Faqat o'z guruhlaringizdagi studentlarni belgilang.`;
      }

      // For now, we'll use the first group the student belongs to under this teacher
      const group = teacherGroups[0];

      // Here you would implement the actual attendance tracking logic
      // This could involve creating an Attendance entity and saving to database
      // For demonstration, we're showing what the implementation would look like

      // Example of attendance saving logic (would need Attendance entity):
      /*
      const attendance = await this.attendanceRepo.save({
        student: student,
        teacher: chat.user,
        group: group,
        date: new Date(),
        status: status as 'keldi' | 'kelmadi' | 'kechikdi',
        markedAt: new Date(),
        notes: `Telegram orqali belgilangan - ${chat.user.firstName}`,
      });
      */

      const statusEmoji =
        status === 'keldi' ? '✅' : status === 'kechikdi' ? '⏰' : '❌';
      const statusText =
        status === 'keldi'
          ? 'Keldi'
          : status === 'kechikdi'
            ? 'Kechikdi'
            : 'Kelmadi';
      const today = new Date();

      let resultMessage = `${statusEmoji} <b>Yo'qlama Muvaffaqiyatli Belgilandi!</b>\n\n`;
      resultMessage += `👤 <b>Student:</b> ${student.firstName} ${student.lastName}\n`;
      resultMessage += `📋 <b>Guruh:</b> ${group.name}\n`;
      if (group.subject) {
        resultMessage += `📚 <b>Fan:</b> ${group.subject.name}\n`;
      }
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

      resultMessage += `\n\n📊 Boshqa studentlar uchun yo'qlama davom ettiring yoki /yoklama orqali guruhlar ro'yxatiga qaytish.`;

      // Log the attendance action for audit trail
      console.log(
        `Attendance marked by teacher ${chat.user.firstName} (ID: ${chat.user.id}) for student ${student.firstName} ${student.lastName} (ID: ${student.id}): ${status}`,
      );

      // Send notification about attendance
      await this.notifyAttendanceTaken(
        group.name,
        chat.user.firstName + ' ' + (chat.user.lastName || ''),
        status === 'keldi' ? 1 : 0,
        1,
      );

      return resultMessage;
    } catch (error) {
      console.error('Error marking attendance:', error);
      return "Yo'qlama belgilashda xatolik yuz berdi. Qaytadan urinib ko'ring.";
    }
  }

  private getRoleDisplayName(role: string): string {
    switch (role) {
      case 'student':
        return 'Talaba';
      case 'teacher':
        return "O'qituvchi";
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
          { command: 'hisobim', description: "Shaxsiy ma'lumotlar" },
          { command: 'yoklama', description: "Yo'qlama olish (o'qituvchilar)" },
          { command: 'elon', description: "E'lonlar va xabarlar" },
          { command: 'testlar', description: 'Aktiv testlar' },
          { command: 'aloqa', description: "Aloqa ma'lumotlari" },
          { command: 'help', description: 'Yordam' },
        ];

        await this.bot.setMyCommands(commands, {
          scope: { type: 'chat', chat_id: chatId },
        });
        console.log(`Bot commands set for chat ${chatId}`);
      }
    } catch (error) {
      console.error('Error setting bot commands:', error);
    }
  }

  async getUserAnnouncements(telegramUserId: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user', 'user.center'],
      });

      if (!chat || !chat.user) {
        return "❌ Hisobingiz ulanmagan. Avval /start buyrug'ini yuboring va o'qituvchingiz bilan bog'laning.";
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
      console.error('Error getting user announcements:', error);
      return "E'lonlarni yuklab olishda xatolik yuz berdi.";
    }
  }

  async getUserActiveTests(telegramUserId: string): Promise<string> {
    try {
      const chat = await this.telegramChatRepo.findOne({
        where: { telegramUserId },
        relations: ['user', 'user.center'],
      });

      if (!chat || !chat.user) {
        return "❌ Hisobingiz ulanmagan. Avval /start buyrug'ini yuboring va o'qituvchingiz bilan bog'laning.";
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
      console.error('Error getting user active tests:', error);
      return 'Aktiv testlarni yuklab olishda xatolik yuz berdi.';
    }
  }

  // ==================== Enhanced Notification System ====================

  async sendNotificationToChannelsAndBot(
    message: string,
    testId?: number,
    targetRole?: UserRole,
  ): Promise<void> {
    try {
      // Get all active channels
      const channels = await this.telegramChatRepo.find({
        where: {
          type: ChatType.CHANNEL,
          status: ChatStatus.ACTIVE,
        },
        relations: ['center', 'subject'],
      });

      // Send to channels
      for (const channel of channels) {
        try {
          if (this.bot) {
            await this.bot.sendMessage(channel.chatId, message, {
              parse_mode: 'HTML',
            });
            await this.delay(100); // Small delay to avoid rate limiting
          }
        } catch (error) {
          console.error(`Failed to send to channel ${channel.chatId}:`, error);
        }
      }

      // Send to individual users based on role
      if (targetRole) {
        const users = await this.telegramChatRepo.find({
          where: {
            type: ChatType.PRIVATE,
            user: { role: targetRole },
          },
          relations: ['user'],
        });

        for (const userChat of users) {
          try {
            if (this.bot && userChat.telegramUserId) {
              await this.bot.sendMessage(userChat.telegramUserId, message, {
                parse_mode: 'HTML',
              });
              await this.delay(100);
            }
          } catch (error) {
            console.error(
              `Failed to send to user ${userChat.telegramUserId}:`,
              error,
            );
          }
        }
      }

      console.log(`Notification sent to ${channels.length} channels and users`);
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  async notifyTestCreated(
    testId: number,
    testName: string,
    subject: string,
    timeLimit: number,
  ): Promise<void> {
    const message = `🎆 <b>Yangi Test E'lon Qilindi!</b>\n\n📚 <b>Test:</b> ${testName}\n📋 <b>Fan:</b> ${subject}\n⏰ <b>Vaqt:</b> ${timeLimit} daqiqa\n🔢 <b>Test ID:</b> #T${testId}\n\n📝 <b>Javob formati:</b> #T${testId}Q1 A\n\n🔥 Testni boshlash uchun tayyor bo'ling!`;

    await this.sendNotificationToChannelsAndBot(
      message,
      testId,
      UserRole.STUDENT,
    );
  }

  async notifyAttendanceTaken(
    groupName: string,
    teacherName: string,
    presentCount: number,
    totalCount: number,
  ): Promise<void> {
    const message = `📋 <b>Yo'qlama Olindi</b>\n\n👥 <b>Guruh:</b> ${groupName}\n👨‍🏫 <b>O'qituvchi:</b> ${teacherName}\n✅ <b>Keldi:</b> ${presentCount}/${totalCount}\n📅 <b>Sana:</b> ${new Date().toLocaleDateString()}\n⏰ <b>Vaqt:</b> ${new Date().toLocaleTimeString()}`;

    await this.sendNotificationToChannelsAndBot(
      message,
      undefined,
      UserRole.ADMIN,
    );
  }

  // ==================== Exam Notifications ====================

  async notifyExamStart(
    examId: number,
    groupIds: number[],
  ): Promise<{
    success: boolean;
    message: string;
    sentCount?: number;
    failedCount?: number;
  }> {
    if (!this.bot) {
      throw new BadRequestException('Telegram bot sozlanmagan');
    }

    const exam = await this.examRepo.findOne({
      where: { id: examId },
      relations: [
        'subjects',
        'teacher',
        'variants',
        'groups',
        'groups.students',
      ],
    });

    if (!exam) {
      throw new BadRequestException('Imtihon topilmadi');
    }

    if (!groupIds || groupIds.length === 0) {
      return {
        success: false,
        message: 'Hech qanday guruh ID si berilmagan',
        sentCount: 0,
        failedCount: 0,
      };
    }

    // Get all students from specified groups
    const allStudents: any[] = [];
    for (const groupId of groupIds) {
      const group = exam.groups.find((g) => g.id === groupId);
      if (group && group.students) {
        allStudents.push(...group.students);
      }
    }

    // Remove duplicate students
    const uniqueStudents = allStudents.filter(
      (student, index, self) =>
        index === self.findIndex((s) => s.id === student.id),
    );

    if (uniqueStudents.length === 0) {
      return {
        success: false,
        message: 'Tanlangan guruhlarda studentlar topilmadi',
        sentCount: 0,
        failedCount: 0,
      };
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Send notification to each student's private chat
    for (const student of uniqueStudents) {
      try {
        // Find student's Telegram chat
        const studentChat = await this.telegramChatRepo.findOne({
          where: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            user: { id: student.id },
            type: ChatType.PRIVATE,
          },
          relations: ['user'],
        });

        if (!studentChat || !studentChat.telegramUserId) {
          failedCount++;
          errors.push(
            `${student.firstName} ${student.lastName}: Telegram hisobi ulanmagan`,
          );
          continue;
        }

        const message = this.formatExamStartMessageForStudent(exam, student);

        await this.bot.sendMessage(studentChat.telegramUserId, message, {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        });

        // Also send additional instructions
        const instructionsMessage = this.getExamInstructions(exam);
        await this.bot.sendMessage(
          studentChat.telegramUserId,
          instructionsMessage,
          {
            parse_mode: 'HTML',
          },
        );

        sentCount++;
        this.logsService.log(
          `Exam start notification sent to student ${student.firstName} ${student.lastName} (${studentChat.telegramUserId}) for exam ${examId}`,
          'TelegramService',
        );

        // Small delay to avoid rate limiting
        await this.delay(100);
      } catch (error) {
        failedCount++;
        errors.push(
          `${student.firstName} ${student.lastName}: ${error.message}`,
        );
        this.logsService.error(
          `Failed to send exam start notification to student ${student.id}: ${error.message}`,
          error.stack,
          'TelegramService',
        );
      }
    }

    const success = sentCount > 0;
    const message = success
      ? `Imtihon boshlanishi haqida xabar yuborildi. Muvaffaqiyatli: ${sentCount}, Xato: ${failedCount}`
      : `Hech qanday studentga xabar yuborib bo'lmadi. Xatolar: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`;

    return {
      success,
      message,
      sentCount,
      failedCount,
    };
  }

  async sendPDFToUser(
    userId: number,
    pdfBuffer: Buffer,
    fileName: string,
    caption?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find user's Telegram chat
      const userChat = await this.telegramChatRepo.findOne({
        where: { user: { id: userId }, type: ChatType.PRIVATE },
        relations: ['user'],
      });

      if (!userChat || !userChat.telegramUserId) {
        this.logsService.warn(
          `User ${userId} does not have a connected Telegram account`,
          'TelegramService',
        );
        return {
          success: false,
          message: 'Foydalanuvchining Telegram hisobi ulanmagan',
        };
      }

      if (!this.bot) {
        this.logsService.error(
          'Telegram bot not configured',
          undefined,
          'TelegramService',
        );
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

      this.logsService.log(
        `PDF sent successfully to user ${userId} (${userChat.telegramUserId})`,
        'TelegramService',
      );
      return {
        success: true,
        message: 'PDF muvaffaqiyatli yuborildi',
      };
    } catch (error) {
      this.logsService.error(
        `Failed to send PDF to user ${userId}: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      return {
        success: false,
        message: `PDF yuborishda xatolik: ${error.message}`,
      };
    }
  }

  async sendPDFToMultipleUsers(
    userIds: number[],
    pdfBuffer: Buffer,
    fileName: string,
    caption?: string,
  ): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    details: string[];
  }> {
    const results = {
      success: true,
      sentCount: 0,
      failedCount: 0,
      details: [] as string[],
    };

    for (const userId of userIds) {
      try {
        const result = await this.sendPDFToUser(
          userId,
          pdfBuffer,
          fileName,
          caption,
        );
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

    console.log(
      `PDF batch send completed: ${results.sentCount} sent, ${results.failedCount} failed`,
    );
    return results;
  }

  async testTelegramConnection(): Promise<boolean> {
    try {
      if (!this.bot) {
        console.warn('Telegram bot not configured');
        return false;
      }

      const botInfo = await this.bot.getMe();
      console.log(`Telegram bot connected: @${botInfo.username}`);
      return true;
    } catch (error) {
      console.error('Telegram connection test failed:', error);
      return false;
    }
  }

  // ==================== Payment Reminders ====================

  async sendPaymentReminder(studentId: number, payment: any): Promise<void> {
    if (!this.bot) {
      this.logsService.warn(
        'Telegram bot not configured - cannot send payment reminder',
        'TelegramService',
      );
      return;
    }

    try {
      // Find student's private chat
      const studentChat = await this.telegramChatRepo.findOne({
        where: {
          user: { id: studentId },
          type: ChatType.PRIVATE,
        },
        relations: ['user'],
      });

      if (!studentChat || !studentChat.telegramUserId) {
        this.logsService.warn(
          `Student ${studentId} does not have Telegram connected`,
          'TelegramService',
        );
        return;
      }

      const message =
        `💰 To'lov eslatmasi\n\n` +
        `📚 Guruh: ${payment.group?.name || "Noma'lum"}\n` +
        `💵 Miqdor: ${payment.amount} so'm\n` +
        `📅 Muddat: ${new Date(payment.dueDate).toLocaleDateString('uz-UZ')}\n` +
        `📋 Tavsif: ${payment.description}\n\n` +
        `⚠️ Iltimos, to'lovingizni muddatida amalga oshiring.\n` +
        `❓ Savollar bo'lsa o'qituvchingiz bilan bog'laning.`;

      await this.bot.sendMessage(studentChat.telegramUserId, message, {
        parse_mode: 'HTML',
      });

      this.logsService.log(
        `Payment reminder sent to student ${studentId}`,
        'TelegramService',
      );
    } catch (error) {
      this.logsService.error(
        `Failed to send payment reminder to student ${studentId}: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      throw error;
    }
  }

  async sendPaymentReminderToChannel(
    channelId: string,
    payment: any,
  ): Promise<void> {
    if (!this.bot) {
      this.logsService.warn(
        'Telegram bot not configured - cannot send payment reminder to channel',
        'TelegramService',
      );
      return;
    }

    try {
      const message =
        `💰 To'lov eslatmasi\n\n` +
        `👤 O'quvchi: ${payment.student?.firstName} ${payment.student?.lastName}\n` +
        `📚 Guruh: ${payment.group?.name || "Noma'lum"}\n` +
        `💵 Miqdor: ${payment.amount} so'm\n` +
        `📅 Muddat: ${new Date(payment.dueDate).toLocaleDateString('uz-UZ')}\n` +
        `📋 Tavsif: ${payment.description}\n\n` +
        `⚠️ To'lov muddati yetib keldi!`;

      await this.bot.sendMessage(channelId, message, {
        parse_mode: 'HTML',
      });

      this.logsService.log(
        `Payment reminder sent to channel ${channelId}`,
        'TelegramService',
      );
    } catch (error) {
      this.logsService.error(
        `Failed to send payment reminder to channel ${channelId}: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      throw error;
    }
  }

  async sendMonthlyPaymentNotifications(
    studentIds: number[],
    paymentData: {
      amount: number;
      description: string;
      dueDate: Date;
      groupName: string;
    },
  ): Promise<{ sentCount: number; failedCount: number }> {
    if (!this.bot) {
      this.logsService.warn(
        'Telegram bot not configured - cannot send monthly payment notifications',
        'TelegramService',
      );
      return { sentCount: 0, failedCount: studentIds.length };
    }

    let sentCount = 0;
    let failedCount = 0;

    const message =
      `🗓️ Yangi oylik to'lov\n\n` +
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
            type: ChatType.PRIVATE,
          },
          relations: ['user'],
        });

        if (studentChat && studentChat.telegramUserId) {
          await this.bot.sendMessage(studentChat.telegramUserId, message, {
            parse_mode: 'HTML',
          });
          sentCount++;
        } else {
          failedCount++;
        }

        // Small delay to avoid rate limiting
        await this.delay(200);
      } catch (error) {
        console.error(
          `Failed to send monthly payment notification to student ${studentId}:`,
          error,
        );
        failedCount++;
      }
    }

    this.logsService.log(
      `Monthly payment notifications sent: ${sentCount} sent, ${failedCount} failed`,
      'TelegramService',
    );
    return { sentCount, failedCount };
  }

  // ==================== Pending PDF Management ====================

  async createPendingPdf(
    userId: number,
    type: PendingPdfType,
    fileName: string,
    caption: string,
    metadata: Record<string, unknown>,
    pdfBuffer?: Buffer,
    expirationDays: number = 30,
  ): Promise<PendingPdf> {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Set expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      const pendingPdf = this.pendingPdfRepo.create({
        user,
        userId,
        type,
        fileName,
        caption,
        metadata: metadata,
        pdfData: pdfBuffer ? pdfBuffer.toString('base64') : null,
        status: PendingPdfStatus.PENDING,
        expiresAt,
      });

      const savedPendingPdf = await this.pendingPdfRepo.save(pendingPdf);

      this.logsService.log(
        `Created pending PDF ${savedPendingPdf.id} for user ${userId}: ${fileName}`,
        'TelegramService',
      );

      return savedPendingPdf;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.logsService.error(
        `Failed to create pending PDF for user ${userId}: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      throw error;
    }
  }

  async getUserPendingPdfs(
    userId: number,
    status?: PendingPdfStatus,
  ): Promise<PendingPdf[]> {
    try {
      const where: any = {
        userId,
        expiresAt: MoreThanOrEqual(new Date()), // Not expired
      };

      if (status) {
        where.status = status;
      }

      return await this.pendingPdfRepo.find({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where,
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logsService.error(
        `Failed to get pending PDFs for user ${userId}: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      return [];
    }
  }

  async sendAllPendingPdfs(userId: number): Promise<{
    sent: number;
    failed: number;
    details: string[];
  }> {
    const result = {
      sent: 0,
      failed: 0,
      details: [] as string[],
    };

    try {
      // Get all pending PDFs for the user
      const pendingPdfs = await this.getUserPendingPdfs(
        userId,
        PendingPdfStatus.PENDING,
      );

      if (pendingPdfs.length === 0) {
        this.logsService.log(
          `No pending PDFs found for user ${userId}`,
          'TelegramService',
        );
        return result;
      }

      this.logsService.log(
        `Found ${pendingPdfs.length} pending PDFs for user ${userId}`,
        'TelegramService',
      );

      for (const pendingPdf of pendingPdfs) {
        try {
          let pdfBuffer: Buffer;

          if (pendingPdf.pdfData) {
            // Use stored PDF data
            pdfBuffer = Buffer.from(pendingPdf.pdfData, 'base64');
          } else {
            // Regenerate PDF from metadata
            pdfBuffer = this.regeneratePdfFromMetadata(pendingPdf);
          }

          // Attempt to send the PDF
          const sendResult = await this.sendPDFToUser(
            userId,
            pdfBuffer,
            pendingPdf.fileName,
            pendingPdf.caption,
          );

          if (sendResult.success) {
            // Mark as sent
            pendingPdf.status = PendingPdfStatus.SENT;
            pendingPdf.sentAt = new Date();
            await this.pendingPdfRepo.save(pendingPdf);

            result.sent++;
            result.details.push(
              `✅ ${pendingPdf.fileName}: ${sendResult.message}`,
            );

            this.logsService.log(
              `Successfully sent pending PDF ${pendingPdf.id} to user ${userId}`,
              'TelegramService',
            );
          } else {
            // Mark as failed
            pendingPdf.status = PendingPdfStatus.FAILED;
            pendingPdf.failureReason = sendResult.message;
            await this.pendingPdfRepo.save(pendingPdf);

            result.failed++;
            result.details.push(
              `❌ ${pendingPdf.fileName}: ${sendResult.message}`,
            );

            this.logsService.warn(
              `Failed to send pending PDF ${pendingPdf.id} to user ${userId}: ${sendResult.message}`,
              'TelegramService',
            );
          }

          // Small delay between sends
          await this.delay(300);
        } catch (error) {
          // Mark as failed
          pendingPdf.status = PendingPdfStatus.FAILED;
          const errorMessage =
            typeof (error as unknown as { message?: unknown })?.message ===
            'string'
              ? (error as { message: string }).message
              : String(error);
          pendingPdf.failureReason = errorMessage;
          await this.pendingPdfRepo.save(pendingPdf);

          result.failed++;
          result.details.push(
            `❌ ${pendingPdf.fileName}: Error - ${error.message}`,
          );

          this.logsService.error(
            `Error sending pending PDF ${pendingPdf.id} to user ${userId}: ${error.message}`,
            error.stack,
            'TelegramService',
          );
        }
      }

      this.logsService.log(
        `Completed sending pending PDFs for user ${userId}: ${result.sent} sent, ${result.failed} failed`,
        'TelegramService',
      );
    } catch (error) {
      this.logsService.error(
        `Error processing pending PDFs for user ${userId}: ${error.message}`,
        error.stack,
        'TelegramService',
      );
    }

    return result;
  }

  private regeneratePdfFromMetadata(pendingPdf: PendingPdf): Buffer {
    // This method would regenerate the PDF based on the stored metadata
    // For now, we'll throw an error if no PDF data is stored
    if (!pendingPdf.pdfData) {
      throw new Error(
        `Cannot regenerate PDF for ${pendingPdf.fileName} - no stored data or regeneration logic`,
      );
    }

    return Buffer.from(pendingPdf.pdfData, 'base64');
  }

  async cleanupExpiredPendingPdfs(): Promise<number> {
    try {
      const result = await this.pendingPdfRepo
        .createQueryBuilder()
        .delete()
        .from(PendingPdf)
        .where('expiresAt < :now', { now: new Date() })
        .execute();

      const deletedCount = result.affected || 0;

      if (deletedCount > 0) {
        this.logsService.log(
          `Cleaned up ${deletedCount} expired pending PDFs`,
          'TelegramService',
        );
      }

      return deletedCount;
    } catch (error) {
      this.logsService.error(
        `Error cleaning up expired pending PDFs: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      return 0;
    }
  }

  async getpendingPdfStats(): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    expired: number;
  }> {
    try {
      const [total, pending, sent, failed, expired] = await Promise.all([
        this.pendingPdfRepo.count(),
        this.pendingPdfRepo.count({
          where: { status: PendingPdfStatus.PENDING },
        }),
        this.pendingPdfRepo.count({
          where: { status: PendingPdfStatus.SENT },
        }),
        this.pendingPdfRepo.count({
          where: { status: PendingPdfStatus.FAILED },
        }),
        this.pendingPdfRepo.count({
          where: { status: PendingPdfStatus.EXPIRED },
        }),
      ]);

      return { total, pending, sent, failed, expired };
    } catch (error) {
      this.logsService.error(
        `Error getting pending PDF stats: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      return { total: 0, pending: 0, sent: 0, failed: 0, expired: 0 };
    }
  }

  /**
   * Send message to Telegram user
   */
  async sendMessage(
    chatId: string,
    message: string,
    options: any = {},
  ): Promise<void> {
    if (!this.bot) {
      console.warn('Telegram bot not configured');
      return;
    }

    try {
      await this.bot.sendMessage(chatId, message, options);
      this.logsService.log(`Message sent to ${chatId}`, 'TelegramService');
    } catch (error) {
      this.logsService.error(
        `Failed to send message to ${chatId}: ${error.message}`,
        error.stack,
        'TelegramService',
      );
      throw error;
    }
  }
}
