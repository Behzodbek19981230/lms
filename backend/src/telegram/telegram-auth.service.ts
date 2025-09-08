import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TelegramChat,
  ChatType,
  ChatStatus,
} from './entities/telegram-chat.entity';
import { User } from '../users/entities/user.entity';
import { Center } from '../centers/entities/center.entity';
import { TelegramService } from './telegram.service';

interface TelegramAuthData {
  telegramUserId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  authDate: number;
  hash: string;
}

export interface TelegramConnectionResult {
  success: boolean;
  message: string;
  userId?: number;
  autoConnected?: boolean;
  telegramStatus?: {
    isLinked: boolean;
    telegramUsername?: string;
    firstName?: string;
    lastName?: string;
    telegramUserId?: string;
  };
}

@Injectable()
export class TelegramAuthService {
  private readonly logger = new Logger(TelegramAuthService.name);

  constructor(
    @InjectRepository(TelegramChat)
    private telegramChatRepo: Repository<TelegramChat>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Center)
    private centerRepo: Repository<Center>,
    private telegramService: TelegramService,
  ) {}

  /**
   * Dashboard dan foydalanuvchini Telegram ga ulash
   */
  async connectUserToTelegram(
    userId: number,
    authData: TelegramAuthData,
  ): Promise<TelegramConnectionResult> {
    try {
      this.logger.log(
        `Connecting user ${userId} to Telegram ${authData.telegramUserId}`,
      );

      // Get current user with center
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['center', 'subjects'],
      });

      if (!user) {
        return {
          success: false,
          message: 'Foydalanuvchi topilmadi',
        };
      }

      // Check if this Telegram account is already linked to someone else
      const existingTelegramChat = await this.telegramChatRepo.findOne({
        where: {
          telegramUserId: authData.telegramUserId,
          type: ChatType.PRIVATE,
        },
        relations: ['user'],
      });

      if (
        existingTelegramChat &&
        existingTelegramChat.user &&
        existingTelegramChat.user.id !== userId
      ) {
        return {
          success: false,
          message: `Bu Telegram hisobi boshqa foydalanuvchi (${existingTelegramChat.user.firstName} ${existingTelegramChat.user.lastName}) ga ulangan`,
        };
      }

      // Check if user is already connected to Telegram
      const existingUserChat = await this.telegramChatRepo.findOne({
        where: {
          user: { id: userId },
          type: ChatType.PRIVATE,
        },
      });

      let telegramChat: TelegramChat;

      if (existingUserChat) {
        // Update existing connection
        existingUserChat.telegramUserId = authData.telegramUserId;
        existingUserChat.telegramUsername = authData.username || '';
        existingUserChat.firstName = authData.firstName || '';
        existingUserChat.lastName = authData.lastName || '';
        existingUserChat.chatId = authData.telegramUserId; // Use telegramUserId as chatId for private chats
        existingUserChat.status = ChatStatus.ACTIVE;
        existingUserChat.lastActivity = new Date();

        telegramChat = await this.telegramChatRepo.save(existingUserChat);
        this.logger.log(
          `Updated existing Telegram connection for user ${userId}`,
        );
      } else if (existingTelegramChat) {
        // Link existing Telegram chat to new user
        existingTelegramChat.user = user;
        existingTelegramChat.center = user.center;
        existingTelegramChat.status = ChatStatus.ACTIVE;
        existingTelegramChat.lastActivity = new Date();

        telegramChat = await this.telegramChatRepo.save(existingTelegramChat);
        this.logger.log(`Linked existing Telegram chat to user ${userId}`);
      } else {
        // Create new connection
        telegramChat = this.telegramChatRepo.create({
          chatId: authData.telegramUserId,
          type: ChatType.PRIVATE,
          telegramUserId: authData.telegramUserId,
          telegramUsername: authData.username,
          firstName: authData.firstName,
          lastName: authData.lastName,
          user: user,
          center: user.center, // Auto-assign user's center
          status: ChatStatus.ACTIVE,
          lastActivity: new Date(),
        });

        telegramChat = await this.telegramChatRepo.save(telegramChat);
        this.logger.log(`Created new Telegram connection for user ${userId}`);
      }

      // Update user's telegram fields
      user.telegramConnected = true;
      user.telegramId = authData.telegramUserId;
      await this.userRepo.save(user);

      // Send welcome message and channel invitations
      await this.sendWelcomeAndChannelInvitations(user);

      // Send pending PDFs if any
      try {
        const pendingResult =
          await this.telegramService.sendAllPendingPdfs(userId);
        if (pendingResult.sent > 0) {
          this.logger.log(
            `Sent ${pendingResult.sent} pending PDFs to user ${userId}`,
          );
        }
      } catch (pdfError) {
        this.logger.warn(
          `Failed to send pending PDFs to user ${userId}:`,
          pdfError,
        );
      }

      return {
        success: true,
        message: `🎉 Telegram hisobingiz muvaffaqiyatli ulandi! Kanallar va guruhlar haqida ma'lumot yuborildi.`,
        userId: user.id,
        autoConnected: true,
        telegramStatus: {
          isLinked: true,
          telegramUsername: telegramChat.telegramUsername,
          firstName: telegramChat.firstName,
          lastName: telegramChat.lastName,
          telegramUserId: telegramChat.telegramUserId,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to connect user ${userId} to Telegram:`, error);
      return {
        success: false,
        message:
          "Telegram ga ulanishda xatolik yuz berdi. Keyinroq qayta urinib ko'ring.",
      };
    }
  }

  /**
   * Foydalanuvchining Telegram ulanish holatini olish (yangilangan)
   */
  async getUserTelegramStatus(userId: number): Promise<{
    isLinked: boolean;
    telegramUsername?: string;
    firstName?: string;
    lastName?: string;
    telegramUserId?: string;
    centerName?: string;
    availableChannels: any[];
  }> {
    try {
      // Get user's Telegram connection
      const userChat = await this.telegramChatRepo.findOne({
        where: {
          user: { id: userId },
          type: ChatType.PRIVATE,
        },
        relations: ['user', 'center'],
      });

      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['center'],
      });

      // Get available channels for this user's center
      let availableChannels: any[] = [];

      if (user && user.center) {
        const centerChannels = await this.telegramChatRepo.find({
          where: {
            type: ChatType.CHANNEL,
            status: ChatStatus.ACTIVE,
            center: { id: user.center.id },
          },
          relations: ['center'],
          order: { title: 'ASC' },
        });

        availableChannels = centerChannels.map((channel) => ({
          id: channel.id,
          title: channel.title,
          chatId: channel.chatId,
          username: channel.username,
          inviteLink: channel.inviteLink,
        }));
      }

      return {
        isLinked: !!userChat,
        telegramUsername: userChat?.telegramUsername,
        firstName: userChat?.firstName,
        lastName: userChat?.lastName,
        telegramUserId: userChat?.telegramUserId,
        centerName: user?.center?.name,
        availableChannels,
      };
    } catch (error) {
      this.logger.error(`Failed to get user ${userId} Telegram status:`, error);
      return {
        isLinked: false,
        availableChannels: [],
      };
    }
  }

  /**
   * Foydalanuvchini Telegram dan uzish
   */
  async disconnectUserFromTelegram(userId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Find and remove user's Telegram connection
      const userChat = await this.telegramChatRepo.findOne({
        where: {
          user: { id: userId },
          type: ChatType.PRIVATE,
        },
      });

      if (!userChat) {
        return {
          success: false,
          message: 'Telegram ulanish topilmadi',
        };
      }

      // Get user to update telegram fields
      const user = await this.userRepo.findOne({
        where: { id: userId },
      });

      if (user) {
        user.telegramConnected = false;
        user.telegramId = null;
        await this.userRepo.save(user);
      }

      await this.telegramChatRepo.remove(userChat);

      this.logger.log(`Disconnected user ${userId} from Telegram`);

      return {
        success: true,
        message: 'Telegram hisobingiz muvaffaqiyatli uzildi',
      };
    } catch (error) {
      this.logger.error(
        `Failed to disconnect user ${userId} from Telegram:`,
        error,
      );
      return {
        success: false,
        message: 'Telegram hisobni uzishda xatolik yuz berdi',
      };
    }
  }

  /**
   * Telegram bot authentication (from widget)
   */
  async authenticateFromWidget(
    authData: TelegramAuthData,
  ): Promise<TelegramConnectionResult> {
    try {
      // Verify Telegram auth hash (implement hash verification if needed)

      // Check if this Telegram user exists
      const existingChat = await this.telegramChatRepo.findOne({
        where: {
          telegramUserId: authData.telegramUserId,
          type: ChatType.PRIVATE,
        },
        relations: ['user', 'center'],
      });

      if (existingChat && existingChat.user) {
        // User is already connected
        return {
          success: true,
          message: `Xush kelibsiz, ${existingChat.firstName || existingChat.user.firstName}!`,
          userId: existingChat.user.id,
          autoConnected: true,
          telegramStatus: {
            isLinked: true,
            telegramUsername: existingChat.telegramUsername,
            firstName: existingChat.firstName,
            lastName: existingChat.lastName,
            telegramUserId: existingChat.telegramUserId,
          },
        };
      }

      // Try to find matching user by name
      const matchingUsers = await this.findMatchingUsers(
        authData.firstName,
        authData.lastName,
        authData.username,
      );

      if (matchingUsers.length === 1) {
        // Auto-connect to the matching user
        return this.connectUserToTelegram(matchingUsers[0].id, authData);
      } else if (matchingUsers.length > 1) {
        // Multiple matches - store for manual linking
        await this.storeUnlinkedTelegramUser(authData);
        return {
          success: false,
          message:
            "Bir nechta mos foydalanuvchi topildi. Admin bilan bog'laning.",
        };
      } else {
        // No matches - store for manual linking
        await this.storeUnlinkedTelegramUser(authData);
        return {
          success: false,
          message:
            "Telegram hisobingizni LMS hisobiga ulash uchun admin bilan bog'laning.",
        };
      }
    } catch (error) {
      this.logger.error('Failed to authenticate from Telegram widget:', error);
      return {
        success: false,
        message: 'Autentifikatsiyada xatolik yuz berdi',
      };
    }
  }

  /**
   * Moslashtiruvchi foydalanuvchilarni qidirish
   */
  private async findMatchingUsers(
    firstName?: string,
    lastName?: string,
    username?: string,
  ): Promise<User[]> {
    const searchConditions: any[] = [];

    if (firstName && lastName) {
      searchConditions.push(
        { firstName: firstName, lastName: lastName },
        { firstName: lastName, lastName: firstName }, // Reversed names
      );
    }

    if (firstName) {
      searchConditions.push({ firstName: firstName });
    }

    if (lastName) {
      searchConditions.push({ lastName: lastName });
    }

    if (username) {
      searchConditions.push({ username: username });
    }

    if (searchConditions.length === 0) {
      return [];
    }

    return this.userRepo.find({
      where: searchConditions,
      relations: ['center', 'subjects'],
    });
  }

  /**
   * Ulanmagan Telegram foydalanuvchini saqlash
   */
  private async storeUnlinkedTelegramUser(
    authData: TelegramAuthData,
  ): Promise<void> {
    const existingChat = await this.telegramChatRepo.findOne({
      where: { telegramUserId: authData.telegramUserId },
    });

    if (existingChat) {
      // Update existing unlinked chat
      existingChat.telegramUsername = authData.username || '';
      existingChat.firstName = authData.firstName || '';
      existingChat.lastName = authData.lastName || '';
      existingChat.lastActivity = new Date();
      await this.telegramChatRepo.save(existingChat);
    } else {
      // Create new unlinked chat
      const unlinkedChat = this.telegramChatRepo.create({
        chatId: authData.telegramUserId,
        type: ChatType.PRIVATE,
        telegramUserId: authData.telegramUserId,
        telegramUsername: authData.username,
        firstName: authData.firstName,
        lastName: authData.lastName,
        status: ChatStatus.PENDING, // Pending manual linking
        lastActivity: new Date(),
      });

      await this.telegramChatRepo.save(unlinkedChat);
    }
  }

  /**
   * Welcome message va kanal takliflarini yuborish
   */
  private async sendWelcomeAndChannelInvitations(user: User): Promise<void> {
    try {
      if (!user.center) {
        this.logger.warn(`User ${user.id} has no center assigned`);
        return;
      }

      // Get user's Telegram chat
      const userChat = await this.telegramChatRepo.findOne({
        where: {
          user: { id: user.id },
          type: ChatType.PRIVATE,
        },
      });

      if (!userChat || !userChat.telegramUserId) {
        this.logger.warn(`User ${user.id} has no Telegram connection`);
        return;
      }

      // Get center channels
      const centerChannels = await this.telegramChatRepo.find({
        where: {
          type: ChatType.CHANNEL,
          status: ChatStatus.ACTIVE,
          center: { id: user.center.id },
        },
        order: { title: 'ASC' },
      });

      if (centerChannels.length === 0) {
        // Send basic welcome message
        const welcomeMessage = `🎓 Salom ${user.firstName}!\n\nSizning Telegram hisobingiz ${user.center.name} markaziga muvaffaqiyatli ulandi.\n\nTez orada test va ma'lumotlar bu yerga yuboriladi.`;

        await this.telegramService.sendMessage(
          userChat.telegramUserId,
          welcomeMessage,
        );
        return;
      }

      // Send welcome message with channel invitations
      const channelsList = centerChannels
        .map((channel) => {
          const inviteText = channel.inviteLink
            ? `[${channel.title || channel.username || 'Kanal'}](${channel.inviteLink})`
            : `${channel.title || channel.username || 'Kanal'}`;
          return `📚 ${inviteText}`;
        })
        .join('\n');

      const welcomeMessage = `🎓 Salom ${user.firstName}!\n\nSizning Telegram hisobingiz ${user.center.name} markaziga muvaffaqiyatli ulandi.\n\n📢 Markazning Telegram kanallari:\n\n${channelsList}\n\n💡 Bu kanallarga qo'shilib, testlar va muhim ma'lumotlarni birinchi bo'lib oling!\n\n📝 Test javob berish formati: #T123Q1 A\n(Test 123, Savol 1, Javob A)`;

      await this.telegramService.sendMessage(
        userChat.telegramUserId,
        welcomeMessage,
        {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        },
      );

      this.logger.log(
        `Sent welcome message and channel invitations to user ${user.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send welcome message to user ${user.id}:`,
        error,
      );
    }
  }
}
