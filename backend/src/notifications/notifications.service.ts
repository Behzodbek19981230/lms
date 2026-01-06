import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
  ) {}

  async listMy(user: User): Promise<Notification[]> {
    return this.notifRepo.find({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
      take: 50, // Limit to last 50 notifications
    });
  }

  async markRead(id: number, user: User): Promise<Notification> {
    const notif = await this.notifRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!notif || notif.user.id !== user.id)
      throw new NotFoundException('Notification topilmadi');
    notif.isRead = true;
    return this.notifRepo.save(notif);
  }

  async markAllRead(user: User): Promise<void> {
    await this.notifRepo.update(
      { user: { id: user.id }, isRead: false },
      { isRead: true },
    );
  }

  async clearAll(user: User): Promise<void> {
    await this.notifRepo
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('userId = :userId', { userId: user.id })
      .execute();
  }

  async createFor(
    user: User,
    title: string,
    message?: string,
    type: NotificationType = NotificationType.SYSTEM,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    metadata?: any,
  ) {
    const notif = this.notifRepo.create({
      title,
      message: message || null,
      user,
      type,
      priority,
      metadata: metadata || null,
    });
    return this.notifRepo.save(notif);
  }

  async createForUsers(
    userIds: number[],
    title: string,
    message?: string,
    type: NotificationType = NotificationType.SYSTEM,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    metadata?: any,
  ) {
    const users = await this.userRepo.find({
      where: { id: In(userIds) },
    });

    const notifications = users.map((user) =>
      this.notifRepo.create({
        title,
        message: message || null,
        user,
        type,
        priority,
        metadata: metadata || null,
      }),
    );

    return this.notifRepo.save(notifications);
  }

  async createExamNotification(
    examId: number,
    examTitle: string,
    studentIds: number[],
  ) {
    // Create in-app notifications
    const notifications = await this.createForUsers(
      studentIds,
      'Yangi imtihon mavjud',
      `${examTitle} imtihoni uchun tayyor`,
      NotificationType.EXAM,
      NotificationPriority.HIGH,
      { examId, examTitle },
    );

    // Send to Telegram channels for each student's group
    try {
      await this.sendExamToTelegramChannels(examId, examTitle, studentIds);
    } catch (error) {
      console.log('Failed to send exam to Telegram channels:', error);
    }

    return notifications;
  }

  async createTestNotification(
    testId: number,
    testTitle: string,
    studentIds: number[],
  ) {
    // Create in-app notifications
    const notifications = await this.createForUsers(
      studentIds,
      'Yangi test tayinlandi',
      `${testTitle} testini bajarishingiz kerak`,
      NotificationType.TEST,
      NotificationPriority.MEDIUM,
      { testId, testTitle },
    );

    // Send to Telegram channels for each student's group
    try {
      await this.sendTestToTelegramChannels(testId, testTitle, studentIds);
    } catch (error) {
      console.log('Failed to send test to Telegram channels:', error);
    }

    return notifications;
  }

  async createGradeNotification(
    studentId: number,
    examTitle: string,
    score: number,
    maxScore: number,
  ) {
    const user = await this.userRepo.findOne({ where: { id: studentId } });
    if (!user) return;

    return this.createFor(
      user,
      'Yangi natija',
      `${examTitle} uchun natijangiz: ${score}/${maxScore}`,
      NotificationType.GRADE,
      NotificationPriority.MEDIUM,
      { examTitle, score, maxScore },
    );
  }

  // ==================== Telegram Integration Methods ====================

  private async sendTestToTelegramChannels(
    testId: number,
    testTitle: string,
    studentIds: number[],
  ) {
    // Get users and their associated Telegram channels
    const users = await this.userRepo.find({
      where: { id: In(studentIds) },
      relations: ['center', 'groups'],
    });

    // Get test information to determine subject
    const test = await this.getTestWithSubject(testId);
    if (!test) {
      console.log('Test not found for Telegram distribution');
      return;
    }

    // Group students by center-subject combination for targeted channels
    const channelGroups = new Map<string, number[]>();

    for (const user of users) {
      // Create unique key for center-subject combination
      const channelKey = `${user.center?.id || 'default'}_${test.subject?.id || 'default'}`;

      if (!channelGroups.has(channelKey)) {
        channelGroups.set(channelKey, []);
      }
      channelGroups.get(channelKey)!.push(user.id);
    }

    // Send test to each appropriate channel
    for (const [centerSubjectKey, userIds] of channelGroups.entries()) {
      try {
        const channelId = await this.getChannelForCenter(centerSubjectKey);

        if (channelId) {
          await this.telegramService.sendTestToChannel({
            testId,
            channelId,
            customMessage: `📚 ${testTitle}\n👥 Students: ${userIds.length}\n🏢 Center-Subject: ${centerSubjectKey}`,
          });

          console.log(
            `Test ${testId} sent to channel ${channelId} for ${userIds.length} students`,
          );
        } else {
          console.log(
            `No channel found for center-subject: ${centerSubjectKey}`,
          );
        }
      } catch (error) {
        console.log(
          `Failed to send test to channel for ${centerSubjectKey}:`,
          error,
        );
      }
    }
  }

  private async sendExamToTelegramChannels(
    examId: number,
    examTitle: string,
    studentIds: number[],
  ) {
    // Similar to sendTestToTelegramChannels but for exams
    const users = await this.userRepo.find({
      where: { id: In(studentIds) },
      relations: ['center', 'groups'],
    });

    const channelGroups = new Map<string, number[]>();

    for (const user of users) {
      const channelKey = user.center?.id?.toString() || 'default';

      if (!channelGroups.has(channelKey)) {
        channelGroups.set(channelKey, []);
      }
      channelGroups.get(channelKey)!.push(user.id);
    }

    for (const [centerKey, userIds] of channelGroups.entries()) {
      try {
        const channelId = await this.getChannelForCenter(centerKey);

        if (channelId) {
          // For exams, we might want to handle differently
          // This would need integration with the exam system
          console.log(
            `Would send exam ${examId} to channel ${channelId} for ${userIds.length} students`,
          );
        }
      } catch (error) {
        console.log(
          `Failed to send exam to channel for center ${centerKey}:`,
          error,
        );
      }
    }
  }

  private async getChannelForCenter(centerKey: string): Promise<string | null> {
    // Enhanced method to get channel for center-subject combination
    // This would map to actual database lookup

    try {
      // Query TelegramChat table for center-subject specific channel
      const centerSubjectParts = centerKey.split('_');
      const centerId = parseInt(centerSubjectParts[0]);
      const subjectId = parseInt(centerSubjectParts[1]);

      if (isNaN(centerId) || isNaN(subjectId)) {
        return null;
      }

      // This would be implemented when TelegramService is properly injected
      // For now, return a structured mapping
      const channelMappings = {
        '1_1': '@universal_center1_math',
        '1_2': '@universal_center1_physics',
        '1_3': '@universal_center1_chemistry',
        '2_1': '@universal_center2_math',
        '2_2': '@universal_center2_physics',
        '2_3': '@universal_center2_chemistry',
        default: '@universal_general',
      };

      return (
        channelMappings[`${centerId}_${subjectId}`] ||
        channelMappings['default']
      );
    } catch (error) {
      console.log('Error getting channel for center:', error);
      return null;
    }
  }

  private async getTestWithSubject(testId: number): Promise<any> {
    // This should query the Test entity with Subject relation
    // For now, return a mock structure
    // In actual implementation, you would inject TestService or use TestRepository

    try {
      // This would be: await this.testRepo.findOne({ where: { id: testId }, relations: ['subject'] });
      return {
        id: testId,
        subject: {
          id: 1, // This should come from actual test data
          name: 'Mathematics',
        },
      };
    } catch (error) {
      console.log('Error getting test with subject:', error);
      return null;
    }
  }
}
