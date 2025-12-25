import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  TelegramChat,
  ChatType,
  ChatStatus,
} from './entities/telegram-chat.entity';
import { TelegramQueueService } from './telegram-queue.service';
import {
  MessageType,
  MessagePriority,
} from './entities/telegram-message-log.entity';
import { Exam } from '../exams/entities/exam.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../users/entities/user.entity';
import { LogsService } from '../logs/logs.service';
import { Payment } from '../payments/payment.entity';

/**
 * Service responsible for sending Telegram notifications
 * Uses queue-based delivery for reliability
 */
@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);

  constructor(
    @InjectRepository(TelegramChat)
    private telegramChatRepo: Repository<TelegramChat>,
    @InjectRepository(Exam)
    private examRepo: Repository<Exam>,
    @InjectRepository(Group)
    private groupRepo: Repository<Group>,
    private telegramQueueService: TelegramQueueService,
    private logsService: LogsService,
  ) {}

  /**
   * Resolve the main (single) center Telegram channel for admin notifications.
   * We pick a channel mapped to the center with no subject/group binding (center-wide).
   */
  private async getCenterMainChannel(centerId: number): Promise<TelegramChat | null> {
    if (!centerId) return null;
    return this.telegramChatRepo.findOne({
      where: {
        center: { id: centerId },
        type: ChatType.CHANNEL,
        status: ChatStatus.ACTIVE,
        group: IsNull(),
        subject: IsNull(),
      },
      relations: ['center'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Send attendance summary to the center-wide channel (single channel per center).
   */
  async sendAttendanceSummaryToCenterChannel(params: {
    centerId: number;
    groupName: string;
    date: string;
    presentCount: number;
    absentCount: number;
    lateCount?: number;
    absentStudents?: string[];
  }): Promise<void> {
    const centerChannel = await this.getCenterMainChannel(params.centerId);
    if (!centerChannel) {
      this.logger.debug(
        `No center channel found for centerId=${params.centerId}, skipping attendance summary`,
      );
      return;
    }

    const late = params.lateCount ?? 0;
    const messageLines: string[] = [];
    messageLines.push(`📋 <b>Davomat</b>`);
    messageLines.push(`🏷️ <b>Guruh:</b> ${params.groupName}`);
    messageLines.push(`📅 <b>Sana:</b> ${params.date}`);
    messageLines.push(
      `✅ <b>Keldi:</b> ${params.presentCount}   ❌ <b>Kelmadi:</b> ${params.absentCount}   ⏰ <b>Kech:</b> ${late}`,
    );
    if (params.absentStudents && params.absentStudents.length > 0) {
      const list = params.absentStudents
        .slice(0, 25)
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n');
      messageLines.push('');
      messageLines.push(`❌ <b>Kelmadi ro‘yxati (${params.absentStudents.length}):</b>`);
      messageLines.push(list);
      if (params.absentStudents.length > 25) {
        messageLines.push(`... va yana ${params.absentStudents.length - 25} ta`);
      }
    }

    await this.telegramQueueService.queueMessage({
      chatId: centerChannel.chatId,
      message: messageLines.join('\n'),
      type: MessageType.ATTENDANCE,
      priority: MessagePriority.NORMAL,
      metadata: {
        centerId: params.centerId,
        groupName: params.groupName,
        date: params.date,
        presentCount: params.presentCount,
        absentCount: params.absentCount,
        lateCount: late,
      },
    });
  }

  /**
   * Send "payment received" notification to:
   * - group-specific channel (if exists)
   * - center-wide channel (single channel per center)
   */
  async notifyPaymentPaid(params: {
    payment: Payment;
    centerId: number;
    groupName: string;
    studentName: string;
  }): Promise<void> {
    const { payment, centerId, groupName, studentName } = params;

    const message =
      `💰 <b>To‘lov qabul qilindi</b>\n\n` +
      `👤 <b>O‘quvchi:</b> ${studentName}\n` +
      `👥 <b>Guruh:</b> ${groupName}\n` +
      `💵 <b>Miqdor:</b> ${payment.amount} so‘m\n` +
      `📅 <b>Sana:</b> ${new Date(payment.paidDate || new Date()).toLocaleDateString('uz-UZ')}\n` +
      (payment.description ? `📝 <b>Izoh:</b> ${payment.description}\n` : '');

    // 1) Group channel (if mapped)
    const groupChat = await this.telegramChatRepo.findOne({
      where: {
        group: { id: payment.groupId },
        type: ChatType.CHANNEL,
        status: ChatStatus.ACTIVE,
      },
      relations: ['group'],
    });

    const queuedChatIds = new Set<string>();
    if (groupChat?.chatId) {
      queuedChatIds.add(groupChat.chatId);
      await this.telegramQueueService.queueMessage({
        chatId: groupChat.chatId,
        message,
        type: MessageType.PAYMENT,
        priority: MessagePriority.NORMAL,
        metadata: {
          paymentId: payment.id,
          groupId: payment.groupId,
          groupName,
        },
      });
    }

    // 2) Center channel
    const centerChannel = await this.getCenterMainChannel(centerId);
    if (centerChannel?.chatId && !queuedChatIds.has(centerChannel.chatId)) {
      await this.telegramQueueService.queueMessage({
        chatId: centerChannel.chatId,
        message,
        type: MessageType.PAYMENT,
        priority: MessagePriority.NORMAL,
        metadata: {
          paymentId: payment.id,
          centerId,
          groupId: payment.groupId,
          groupName,
        },
      });
    }
  }

  /**
   * Daily reminder for payments due today (center-wide single channel).
   * Sends a grouped list by group name. Chunks messages to stay within Telegram limits.
   */
  async sendDuePaymentsReminderToCenterChannel(params: {
    centerId: number;
    date: string; // YYYY-MM-DD
    items: Array<{
      groupName: string;
      studentName: string;
      amount: number | string;
      description?: string | null;
    }>;
  }): Promise<void> {
    const centerChannel = await this.getCenterMainChannel(params.centerId);
    if (!centerChannel) {
      this.logger.debug(
        `No center channel found for centerId=${params.centerId}, skipping due payments reminder`,
      );
      return;
    }

    if (!params.items || params.items.length === 0) return;

    // Group by groupName
    const byGroup = new Map<string, Array<(typeof params.items)[number]>>();
    for (const item of params.items) {
      const key = item.groupName || 'Guruh';
      const arr = byGroup.get(key) || [];
      arr.push(item);
      byGroup.set(key, arr);
    }

    const header =
      `💰 <b>To‘lov eslatmasi</b>\n` +
      `📅 <b>Sana:</b> ${params.date}\n` +
      `⏰ <b>Eslatma vaqti:</b> 21:00\n\n` +
      `<i>Bugun to‘lov muddati. Iltimos, qarzdorlarni ogohlantiring.</i>\n\n`;

    // Build chunks up to ~3500 chars to be safe (Telegram limit is 4096)
    const maxLen = 3500;
    const messages: string[] = [];
    let current = header;

    const pushCurrent = () => {
      if (current.trim().length > 0) messages.push(current);
      current = header;
    };

    for (const [groupName, rows] of byGroup.entries()) {
      const groupBlockLines: string[] = [];
      groupBlockLines.push(`👥 <b>${groupName}</b>`);

      rows.forEach((r, idx) => {
        const amount = typeof r.amount === 'number' ? String(r.amount) : r.amount;
        const desc = r.description ? ` — ${r.description}` : '';
        groupBlockLines.push(`${idx + 1}. ${r.studentName} — ${amount} so‘m${desc}`);
      });
      groupBlockLines.push(''); // blank line

      const block = groupBlockLines.join('\n');
      if ((current + block).length > maxLen) {
        pushCurrent();
      }
      current += block;
    }

    // Push last chunk
    if (current !== header) pushCurrent();

    for (const msg of messages) {
      await this.telegramQueueService.queueMessage({
        chatId: centerChannel.chatId,
        message: msg,
        type: MessageType.PAYMENT,
        priority: MessagePriority.HIGH,
        metadata: {
          centerId: params.centerId,
          date: params.date,
          count: params.items.length,
          kind: 'due_today',
        },
      });
    }
  }

  /**
   * ✅ IMPROVED: Notify exam start to GROUP channels (not just private chats)
   */
  async notifyExamStart(
    examId: number,
    groupIds: number[],
  ): Promise<{
    success: boolean;
    message: string;
    channelsSent: number;
    studentsSent: number;
    failed: number;
  }> {
    try {
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
        throw new BadRequestException('Hech qanday guruh tanlanmagan');
      }

      const examMessage = this.formatExamStartMessage(exam);

      let channelsSent = 0;
      let studentsSent = 0;
      let failed = 0;

      // PRIORITY 1: Send to group-specific channels
      for (const groupId of groupIds) {
        try {
          const groupChat = await this.telegramChatRepo.findOne({
            where: {
              group: { id: groupId },
              type: ChatType.CHANNEL,
              status: ChatStatus.ACTIVE,
            },
            relations: ['group'],
          });

          if (groupChat) {
            await this.telegramQueueService.queueMessage({
              chatId: groupChat.chatId,
              message: examMessage,
              type: MessageType.EXAM_START,
              priority: MessagePriority.HIGH,
              metadata: {
                examId,
                groupId,
                groupName: groupChat.group?.name,
              },
            });

            channelsSent++;
            this.logger.log(
              `📢 Queued exam start notification for group ${groupChat.group?.name}`,
            );
          } else {
            this.logger.warn(`⚠️ No active channel found for group ${groupId}`);
          }
        } catch (error) {
          this.logger.error(
            `Error queuing exam start for group ${groupId}: ${error.message}`,
          );
          failed++;
        }
      }

      // PRIORITY 2: Send to students' private chats as backup
      const allStudents: User[] = [];
      for (const groupId of groupIds) {
        const group = exam.groups.find((g) => g.id === groupId);
        if (group && group.students) {
          allStudents.push(...group.students);
        }
      }

      // Remove duplicates
      const uniqueStudents = allStudents.filter(
        (student, index, self) =>
          index === self.findIndex((s) => s.id === student.id),
      );

      for (const student of uniqueStudents) {
        try {
          const studentChat = await this.telegramChatRepo.findOne({
            where: {
              user: { id: student.id },
              type: ChatType.PRIVATE,
              status: ChatStatus.ACTIVE,
            },
          });

          if (studentChat && studentChat.telegramUserId) {
            await this.telegramQueueService.queueMessage({
              chatId: studentChat.telegramUserId,
              message: examMessage,
              type: MessageType.EXAM_START,
              priority: MessagePriority.NORMAL,
              metadata: {
                examId,
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`,
              },
            });

            studentsSent++;
          }
        } catch (error) {
          this.logger.error(
            `Error queuing exam start for student ${student.id}: ${error.message}`,
          );
          failed++;
        }
      }

      this.logsService.log(
        `Exam start notifications queued: ${channelsSent} channels, ${studentsSent} students`,
        'TelegramNotificationService',
      );

      return {
        success: true,
        message: `Imtihon boshlanishi haqida xabarlar navbatga qo'shildi`,
        channelsSent,
        studentsSent,
        failed,
      };
    } catch (error) {
      this.logger.error(
        `Error in notifyExamStart: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * ✅ IMPROVED: Send absent students list to GROUP-specific channel (not subject-wide)
   */
  async sendAbsentListToGroupChat(
    groupId: number,
    date: string,
    absentStudents: string[],
  ): Promise<void> {
    if (!absentStudents || absentStudents.length === 0) {
      this.logger.debug(
        `No absent students for group ${groupId}, skipping notification`,
      );
      return;
    }

    try {
      const group = await this.groupRepo.findOne({
        where: { id: groupId },
        relations: ['subject', 'center'],
      });

      if (!group) {
        this.logger.warn(`Group ${groupId} not found`);
        return;
      }

      // PRIORITY 1: Try to send to group-specific channel
      const groupChat = await this.telegramChatRepo.findOne({
        where: {
          group: { id: groupId },
          type: ChatType.CHANNEL,
          status: ChatStatus.ACTIVE,
        },
      });

      if (groupChat) {
        const message = this.formatAttendanceMessage(
          group,
          date,
          absentStudents,
        );

        await this.telegramQueueService.queueMessage({
          chatId: groupChat.chatId,
          message,
          type: MessageType.ATTENDANCE,
          priority: MessagePriority.NORMAL,
          metadata: {
            groupId,
            groupName: group.name,
            date,
            absentCount: absentStudents.length,
          },
        });

        this.logger.log(
          `📋 Queued attendance notification for group ${group.name} (${absentStudents.length} absent)`,
        );
        return;
      }

      // FALLBACK: Send to subject channel if group channel doesn't exist
      if (group.subject) {
        const subjectChat = await this.telegramChatRepo.findOne({
          where: {
            subject: { id: group.subject.id },
            type: ChatType.CHANNEL,
            status: ChatStatus.ACTIVE,
          },
        });

        if (subjectChat) {
          const message = this.formatAttendanceMessage(
            group,
            date,
            absentStudents,
          );

          await this.telegramQueueService.queueMessage({
            chatId: subjectChat.chatId,
            message,
            type: MessageType.ATTENDANCE,
            priority: MessagePriority.NORMAL,
            metadata: {
              groupId,
              groupName: group.name,
              subjectId: group.subject.id,
              subjectName: group.subject.name,
              date,
              absentCount: absentStudents.length,
            },
          });

          this.logger.log(
            `📋 Queued attendance notification to subject channel (fallback) for ${group.name}`,
          );
          return;
        }
      }

      this.logger.warn(
        `⚠️ No active channel found for group ${groupId} or its subject. Attendance notification not sent.`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending absent list for group ${groupId}: ${error.message}`,
        error.stack,
      );

      this.logsService.error(
        `Failed to send attendance notification for group ${groupId}`,
        error.message,
        'TelegramNotificationService',
      );
    }
  }

  /**
   * ✅ IMPROVED: Send test results to correct channel with payment reminders
   */
  async publishTestResultsWithPaymentCheck(
    testId: number,
    groupId: number,
    results: Array<{
      studentName: string;
      score: number;
      correctCount: number;
      totalQuestions: number;
      hasOverduePayments?: boolean;
    }>,
  ): Promise<void> {
    try {
      const group = await this.groupRepo.findOne({
        where: { id: groupId },
        relations: ['subject', 'center'],
      });

      if (!group) {
        throw new BadRequestException('Guruh topilmadi');
      }

      // Find appropriate channel (group-specific or subject)
      let targetChat = await this.telegramChatRepo.findOne({
        where: {
          group: { id: groupId },
          type: ChatType.CHANNEL,
          status: ChatStatus.ACTIVE,
        },
      });

      if (!targetChat && group.subject) {
        targetChat = await this.telegramChatRepo.findOne({
          where: {
            subject: { id: group.subject.id },
            type: ChatType.CHANNEL,
            status: ChatStatus.ACTIVE,
          },
        });
      }

      if (!targetChat) {
        throw new BadRequestException(
          `Guruh yoki fan uchun faol kanal topilmadi: ${group.name}`,
        );
      }

      // Format results message
      const resultsMessage = this.formatTestResultsMessage(
        testId,
        group,
        results,
      );

      await this.telegramQueueService.queueMessage({
        chatId: targetChat.chatId,
        message: resultsMessage,
        type: MessageType.RESULTS,
        priority: MessagePriority.HIGH,
        metadata: {
          testId,
          groupId,
          groupName: group.name,
          studentCount: results.length,
        },
      });

      // Send payment reminders for students with overdue payments
      const studentsWithOverdue = results.filter((r) => r.hasOverduePayments);

      if (studentsWithOverdue.length > 0) {
        const paymentMessage = this.formatPaymentReminderMessage(
          group,
          studentsWithOverdue,
        );

        await this.telegramQueueService.queueMessage({
          chatId: targetChat.chatId,
          message: paymentMessage,
          type: MessageType.PAYMENT,
          priority: MessagePriority.NORMAL,
          metadata: {
            groupId,
            groupName: group.name,
            overdueCount: studentsWithOverdue.length,
          },
        });

        this.logger.log(
          `💰 Queued payment reminder for ${studentsWithOverdue.length} students in ${group.name}`,
        );
      }

      this.logsService.log(
        `Test results published for test ${testId}, group ${group.name}`,
        'TelegramNotificationService',
      );
    } catch (error) {
      this.logger.error(
        `Error publishing test results: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Format exam start message
   */
  private formatExamStartMessage(exam: Exam): string {
    let message = `🎓 <b>Imtihon Boshlandi!</b>\n\n`;
    message += `📚 <b>Fan:</b> ${exam.subjects?.map((s) => s.name).join(', ') || "Noma'lum"}\n`;
    message += `👨‍🏫 <b>O\'qituvchi:</b> ${exam.teacher?.firstName || ''} ${exam.teacher?.lastName || ''}\n`;

    // Check if duration exists
    if (exam.duration) {
      message += `⏱ <b>Davomiyligi:</b> ${exam.duration} daqiqa\n`;
    }

    if (exam.variants && exam.variants.length > 0) {
      message += `📋 <b>Variantlar:</b> ${exam.variants.length} ta\n`;
    }

    message += `\n🚀 <b>Imtihon hozir boshlanadi!</b>\n`;
    message += `✏️ Javoblarni botga yuboring.\n`;
    message += `⏰ Vaqtni unutmang!\n\n`;
    message += `<i>Omad!</i> 🍀`;

    return message;
  }

  /**
   * Format attendance message
   */
  private formatAttendanceMessage(
    group: Group,
    date: string,
    absentStudents: string[],
  ): string {
    let message = `📊 <b>Davomat Hisoboti</b>\n\n`;
    message += `👥 <b>Guruh:</b> ${group.name}\n`;

    if (group.subject) {
      message += `📚 <b>Fan:</b> ${group.subject.name}\n`;
    }

    message += `📅 <b>Sana:</b> ${date}\n\n`;
    message += `❌ <b>Darsga kelmaganlar (${absentStudents.length}):</b>\n\n`;

    absentStudents.forEach((student, index) => {
      message += `${index + 1}. ${student}\n`;
    });

    return message;
  }

  /**
   * Format test results message
   */
  private formatTestResultsMessage(
    testId: number,
    group: Group,
    results: Array<{
      studentName: string;
      score: number;
      correctCount: number;
      totalQuestions: number;
    }>,
  ): string {
    let message = `📊 <b>Test Natijalari</b>\n\n`;
    message += `📝 <b>Test ID:</b> #T${testId}\n`;
    message += `👥 <b>Guruh:</b> ${group.name}\n`;

    if (group.subject) {
      message += `📚 <b>Fan:</b> ${group.subject.name}\n`;
    }

    message += `\n<b>Natijalar:</b>\n\n`;

    // Sort by score descending
    const sorted = [...results].sort((a, b) => b.score - a.score);

    sorted.forEach((result, index) => {
      const emoji =
        index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '▫️';
      message += `${emoji} <b>${result.studentName}</b>\n`;
      message += `   ${result.correctCount}/${result.totalQuestions} to'g'ri - ${result.score} ball\n\n`;
    });

    return message;
  }

  /**
   * Format payment reminder message
   */
  private formatPaymentReminderMessage(
    group: Group,
    studentsWithOverdue: Array<{ studentName: string }>,
  ): string {
    let message = `💰 <b>To'lov Eslatmasi</b>\n\n`;
    message += `👥 <b>Guruh:</b> ${group.name}\n\n`;
    message += `⚠️ <b>To'lovi kechikkan o'quvchilar (${studentsWithOverdue.length}):</b>\n\n`;

    studentsWithOverdue.forEach((student, index) => {
      message += `${index + 1}. ${student.studentName}\n`;
    });

    message += `\n<i>Iltimos, to'lovingizni muddatida amalga oshiring.</i>\n`;
    message += `📞 Savollar bo'lsa o'qituvchi bilan bog'laning.`;

    return message;
  }

  /**
   * Send announcement to all channels in a center
   */
  async sendAnnouncementToCenter(
    centerId: number,
    message: string,
    priority: MessagePriority = MessagePriority.NORMAL,
  ): Promise<{ sent: number; failed: number }> {
    try {
      const channels = await this.telegramChatRepo.find({
        where: {
          center: { id: centerId },
          type: ChatType.CHANNEL,
          status: ChatStatus.ACTIVE,
        },
      });

      let sent = 0;
      let failed = 0;

      for (const channel of channels) {
        try {
          await this.telegramQueueService.queueMessage({
            chatId: channel.chatId,
            message,
            type: MessageType.ANNOUNCEMENT,
            priority,
            metadata: {
              centerId,
              channelId: channel.id,
            },
          });
          sent++;
        } catch (error) {
          this.logger.error(
            `Error queuing announcement to channel ${channel.chatId}: ${error.message}`,
          );
          failed++;
        }
      }

      return { sent, failed };
    } catch (error) {
      this.logger.error(
        `Error sending announcement to center ${centerId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
