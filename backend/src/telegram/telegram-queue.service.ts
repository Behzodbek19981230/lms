import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import TelegramBot from 'node-telegram-bot-api';
import { ConfigService } from '@nestjs/config';
import {
  TelegramMessageLog,
  MessageType,
  MessageStatus,
  MessagePriority,
} from './entities/telegram-message-log.entity';
import { LogsService } from '../logs/logs.service';
import { User, UserRole } from '../users/entities/user.entity';

interface QueueMessageParams {
  chatId: string;
  message: string;
  type: MessageType;
  priority?: MessagePriority;
  metadata?: any;
  parseMode?: 'HTML' | 'Markdown';
  centerId?: number;
}

@Injectable()
export class TelegramQueueService {
  private readonly logger = new Logger(TelegramQueueService.name);
  private bot: TelegramBot;
  private isProcessing = false;

  // Rate limiting: Telegram allows 30 messages/second
  private readonly MAX_MESSAGES_PER_SECOND = 25; // Stay under limit
  private readonly MESSAGE_DELAY_MS = 1000 / this.MAX_MESSAGES_PER_SECOND;

  constructor(
    @InjectRepository(TelegramMessageLog)
    private messageLogRepo: Repository<TelegramMessageLog>,
    private configService: ConfigService,
    private logsService: LogsService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (token) {
      this.bot = new TelegramBot(token, { polling: false });
      this.logger.log('✅ Telegram Queue Service initialized');
    } else {
      this.logger.warn('⚠️ Telegram bot token not configured');
    }
  }

  /**
   * Queue a message for delivery
   */
  async queueMessage(params: QueueMessageParams): Promise<TelegramMessageLog> {
    const messageLog = this.messageLogRepo.create({
      chatId: params.chatId,
      content: params.message,
      messageType: params.type,
      priority: params.priority || MessagePriority.NORMAL,
      status: MessageStatus.PENDING,
      centerId: params.centerId,
      metadata: {
        ...params.metadata,
        parseMode: params.parseMode || 'HTML',
      },
    });

    const saved = await this.messageLogRepo.save(messageLog);

    this.logger.log(
      `📬 Queued ${params.type} message to ${params.chatId} (ID: ${saved.id})`,
    );

    return saved;
  }

  /**
   * Queue multiple messages at once
   */
  async queueMessages(
    messages: QueueMessageParams[],
  ): Promise<TelegramMessageLog[]> {
    const messageLogs = messages.map((params) =>
      this.messageLogRepo.create({
        chatId: params.chatId,
        content: params.message,
        messageType: params.type,
        priority: params.priority || MessagePriority.NORMAL,
        status: MessageStatus.PENDING,
        centerId: params.centerId,
        metadata: {
          ...params.metadata,
          parseMode: params.parseMode || 'HTML',
        },
      }),
    );

    const saved = await this.messageLogRepo.save(messageLogs);

    this.logger.log(`📬 Queued ${saved.length} messages for delivery`);

    return saved;
  }

  /**
   * Process pending messages - runs every 30 seconds (for all centers)
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async processQueueCron(): Promise<void> {
    await this.processQueueInternal();
  }

  /**
   * Process pending messages manually (with center filtering)
   */
  async processQueue(user?: User): Promise<void> {
    await this.processQueueInternal(user);
  }

  /**
   * Internal queue processing logic
   */
  private async processQueueInternal(user?: User): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('⏭️ Queue processing already in progress, skipping...');
      return;
    }

    if (!this.bot) {
      this.logger.warn('⚠️ Bot not initialized, skipping queue processing');
      return;
    }

    this.isProcessing = true;

    try {
      const whereClause: any[] = [
        { status: MessageStatus.PENDING },
        {
          status: MessageStatus.FAILED,
          nextRetryAt: LessThan(new Date()),
        },
      ];

      // Agar user berilgan bo'lsa va superadmin bo'lmasa, faqat o'z centerining xabarlarini process qiladi
      if (user && user.role !== UserRole.SUPERADMIN && user.center?.id) {
        whereClause[0].centerId = user.center.id;
        whereClause[1].centerId = user.center.id;
      }

      // Get pending and retry messages, ordered by priority and creation time
      const pendingMessages = await this.messageLogRepo.find({
        where: whereClause,
        order: {
          priority: 'DESC', // HIGH > NORMAL > LOW
          createdAt: 'ASC', // Oldest first
        },
        take: 50, // Process max 50 messages per run
      });

      if (pendingMessages.length === 0) {
        return;
      }

      this.logger.log(
        `🔄 Processing ${pendingMessages.length} messages from queue`,
      );

      let sentCount = 0;
      let failedCount = 0;

      for (const message of pendingMessages) {
        try {
          await this.sendMessage(message);
          sentCount++;

          // Rate limiting delay
          await this.delay(this.MESSAGE_DELAY_MS);
        } catch (error) {
          failedCount++;
          this.logger.error(
            `❌ Failed to send message ${message.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `✅ Queue processing complete: ${sentCount} sent, ${failedCount} failed`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error processing queue: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send a single message with proper error handling
   */
  private async sendMessage(messageLog: TelegramMessageLog): Promise<void> {
    try {
      // Update status to retrying if applicable
      if (messageLog.status === MessageStatus.FAILED) {
        messageLog.status = MessageStatus.RETRYING;
        await this.messageLogRepo.save(messageLog);
      }

      const parseMode = messageLog.metadata?.parseMode || 'HTML';

      const result = await this.bot.sendMessage(
        messageLog.chatId,
        messageLog.content,
        {
          parse_mode: parseMode,
        },
      );

      // Update as successfully sent
      messageLog.status = MessageStatus.SENT;
      messageLog.sentAt = new Date();
      messageLog.telegramMessageId = result.message_id.toString();
      messageLog.error = undefined;

      await this.messageLogRepo.save(messageLog);

      this.logger.log(
        `✅ Sent ${messageLog.messageType} message to ${messageLog.chatId} (Log ID: ${messageLog.id})`,
      );

      // Log to system logs
      this.logsService.log(
        `Telegram message sent: ${messageLog.messageType} to ${messageLog.chatId}`,
        'TelegramQueueService',
      );
    } catch (error) {
      await this.handleSendFailure(messageLog, error);
      throw error;
    }
  }

  /**
   * Handle message send failure with retry logic
   */
  private async handleSendFailure(
    messageLog: TelegramMessageLog,
    error: any,
  ): Promise<void> {
    messageLog.retryCount += 1;
    messageLog.error = error.message || String(error);

    if (messageLog.canRetry()) {
      // Schedule retry with exponential backoff
      messageLog.status = MessageStatus.FAILED;
      messageLog.nextRetryAt = messageLog.calculateNextRetry();

      this.logger.warn(
        `⚠️ Message ${messageLog.id} failed, retry ${messageLog.retryCount}/3 scheduled for ${messageLog.nextRetryAt.toISOString()}`,
      );
    } else {
      // Max retries reached
      messageLog.status = MessageStatus.FAILED;

      this.logger.error(
        `❌ Message ${messageLog.id} permanently failed after ${messageLog.retryCount} retries`,
      );

      // Log critical failure
      this.logsService.error(
        `Telegram message permanently failed: ${messageLog.messageType} to ${messageLog.chatId}`,
        messageLog.error,
        'TelegramQueueService',
      );

      // TODO: Notify admin of permanent failure
      await this.notifyAdminOfFailure(messageLog);
    }

    await this.messageLogRepo.save(messageLog);
  }

  /**
   * Notify admin when message permanently fails
   */
  private async notifyAdminOfFailure(
    messageLog: TelegramMessageLog,
  ): Promise<void> {
    try {
      // Get admin chat IDs from environment or database
      const adminChatIds = this.configService
        .get<string>('TELEGRAM_ADMIN_CHAT_IDS', '')
        .split(',')
        .filter(Boolean);

      if (adminChatIds.length === 0) {
        this.logger.warn(
          '⚠️ No admin chat IDs configured for failure notifications',
        );
        return;
      }

      const notificationMessage =
        `🚨 <b>Telegram Message Failed</b>\n\n` +
        `<b>Type:</b> ${messageLog.messageType}\n` +
        `<b>Chat ID:</b> ${messageLog.chatId}\n` +
        `<b>Retries:</b> ${messageLog.retryCount}\n` +
        `<b>Error:</b> ${messageLog.error}\n` +
        `<b>Message ID:</b> ${messageLog.id}\n\n` +
        `Please investigate and take action.`;

      for (const adminChatId of adminChatIds) {
        try {
          await this.bot.sendMessage(adminChatId, notificationMessage, {
            parse_mode: 'HTML',
          });
        } catch (error) {
          this.logger.error(
            `Failed to notify admin ${adminChatId}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error notifying admin of failure: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get delivery statistics
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date,
    user?: User,
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    retrying: number;
    successRate: number;
    byType: Record<MessageType, number>;
  }> {
    const whereClause: any = {};

    if (startDate && endDate) {
      whereClause.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Agar superadmin bo'lmasa, faqat o'z centerining statistikasini ko'rsat
    if (user && user.role !== UserRole.SUPERADMIN && user.center?.id) {
      whereClause.centerId = user.center.id;
    }

    const [total, sent, failed, pending, retrying] = await Promise.all([
      this.messageLogRepo.count(whereClause),
      this.messageLogRepo.count({ ...whereClause, status: MessageStatus.SENT }),
      this.messageLogRepo.count({
        ...whereClause,
        status: MessageStatus.FAILED,
      }),
      this.messageLogRepo.count({
        ...whereClause,
        status: MessageStatus.PENDING,
      }),
      this.messageLogRepo.count({
        ...whereClause,
        status: MessageStatus.RETRYING,
      }),
    ]);

    const byType: Record<MessageType, number> = {} as any;

    for (const type of Object.values(MessageType)) {
      byType[type] = await this.messageLogRepo.count({
        ...whereClause,
        messageType: type,
        status: MessageStatus.SENT,
      });
    }

    return {
      total,
      sent,
      failed,
      pending,
      retrying,
      successRate: total > 0 ? (sent / total) * 100 : 0,
      byType,
    };
  }

  /**
   * Clean up old successfully sent messages (optional - for database maintenance)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldMessages(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.messageLogRepo.delete({
        status: MessageStatus.SENT,
        sentAt: LessThan(thirtyDaysAgo),
      });

      this.logger.log(`🧹 Cleaned up ${result.affected} old message logs`);
    } catch (error) {
      this.logger.error(
        `Error cleaning up old messages: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get pending message count (for monitoring)
   */
  async getPendingCount(user?: User): Promise<number> {
    const whereClause: any = {
      status: In([MessageStatus.PENDING, MessageStatus.RETRYING]),
    };

    // Agar superadmin bo'lmasa, faqat o'z centerining pending xabarlarini sanaydi
    if (user && user.role !== UserRole.SUPERADMIN && user.center?.id) {
      whereClause.centerId = user.center.id;
    }

    return this.messageLogRepo.count({
      where: whereClause,
    });
  }

  /**
   * Get failed message count (for monitoring)
   */
  async getFailedCount(user?: User): Promise<number> {
    const whereClause: any = { status: MessageStatus.FAILED };

    // Agar superadmin bo'lmasa, faqat o'z centerining failed xabarlarini sanaydi
    if (user && user.role !== UserRole.SUPERADMIN && user.center?.id) {
      whereClause.centerId = user.center.id;
    }

    return this.messageLogRepo.count({
      where: whereClause,
    });
  }

  /**
   * Retry all permanently failed messages (manual admin action)
   */
  async retryFailedMessages(user?: User): Promise<number> {
    const whereClause: any = { status: MessageStatus.FAILED };

    // Agar superadmin bo'lmasa, faqat o'z centerining failed xabarlarini retry qiladi
    if (user && user.role !== UserRole.SUPERADMIN && user.center?.id) {
      whereClause.centerId = user.center.id;
    }

    const failedMessages = await this.messageLogRepo.find({
      where: whereClause,
      take: 100, // Limit to prevent overload
    });

    for (const message of failedMessages) {
      message.status = MessageStatus.PENDING;
      message.retryCount = 0;
      message.error = undefined;
      message.nextRetryAt = undefined;
    }

    await this.messageLogRepo.save(failedMessages);

    this.logger.log(`♻️ Retrying ${failedMessages.length} failed messages`);

    return failedMessages.length;
  }

  /**
   * Get recent message logs (for frontend monitoring)
   */
  async getRecentLogs(
    limit: number = 50,
    user?: User,
  ): Promise<TelegramMessageLog[]> {
    const whereClause: any = {};

    // Agar superadmin bo'lmasa, faqat o'z centerining loglarini ko'rsat
    if (user && user.role !== UserRole.SUPERADMIN && user.center?.id) {
      whereClause.centerId = user.center.id;
    }

    return this.messageLogRepo.find({
      where: whereClause,
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Get message logs by status (for frontend filtering)
   */
  async getLogsByStatus(
    status: MessageStatus,
    limit: number = 50,
    user?: User,
  ): Promise<TelegramMessageLog[]> {
    const whereClause: any = { status };

    // Agar superadmin bo'lmasa, faqat o'z centerining loglarini ko'rsat
    if (user && user.role !== UserRole.SUPERADMIN && user.center?.id) {
      whereClause.centerId = user.center.id;
    }

    return this.messageLogRepo.find({
      where: whereClause,
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }
}
