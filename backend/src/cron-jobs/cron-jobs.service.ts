import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TelegramService } from '../telegram/telegram.service';
import { ExamsService } from '../exams/exams.service';
import { AttendanceService } from '../attendance/attendance.service';
import { PaymentsService } from '../payments/payments.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Exam, ExamStatus } from '../exams/entities/exam.entity';
import { ExamVariant } from '../exams/entities/exam-variant.entity';
import { Payment, PaymentStatus } from '../payments/payment.entity';
import { CRON_JOB_CONFIGS } from './cron-jobs.config';

@Injectable()
export class CronJobsService {
  private readonly logger = new Logger(CronJobsService.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly examsService: ExamsService,
    private readonly attendanceService: AttendanceService,
    private readonly paymentsService: PaymentsService,
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    @InjectRepository(ExamVariant)
    private examVariantRepository: Repository<ExamVariant>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  // Send PDFs to students every day at 8:00 AM for scheduled exams
  @Cron(CRON_JOB_CONFIGS.DAILY_PDF_SENDER.schedule, {
    name: 'dailyPDFSender',
    timeZone: CRON_JOB_CONFIGS.DAILY_PDF_SENDER.timeZone,
  })
  async sendScheduledExamPDFs() {
    try {
      // Find all scheduled exams for today
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const todayEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1,
      );

      const scheduledExams = await this.examRepository.find({
        where: {
          status: ExamStatus.SCHEDULED,
          examDate: Between(todayStart, todayEnd),
        },
        relations: ['variants', 'variants.student'],
      });

      if (scheduledExams.length === 0) {
        return;
      }

      let totalSent = 0;
      let totalFailed = 0;

      for (const exam of scheduledExams) {
        try {
          if (exam.variants && exam.variants.length > 0) {
            const result =
              await this.examsService.generateAndSendAllVariantsPDFs(exam.id);
            totalSent += result.sent;
            totalFailed += result.failed;

            // Send summary notification to Telegram channels
            const message =
              `📚 <b>Bugungi Test PDF'lari Yuborildi</b>\n\n` +
              `📋 <b>Test:</b> ${exam.title}\n` +
              `✅ <b>Yuborildi:</b> ${result.sent}\n` +
              `❌ <b>Xatolik:</b> ${result.failed}\n` +
              `📅 <b>Sana:</b> ${new Date().toLocaleDateString()}`;

            await this.telegramService.sendNotificationToChannelsAndBot(
              message,
            );
          }
        } catch (error) {}
      }
    } catch (error) {}
  }

  // Send reminder for upcoming exams every day at 6:00 PM
  @Cron(CRON_JOB_CONFIGS.EXAM_REMINDER.schedule, {
    name: 'examReminder',
    timeZone: CRON_JOB_CONFIGS.EXAM_REMINDER.timeZone,
  })
  async sendExamReminders() {

    try {
      // Find exams scheduled for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStart = new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
      );
      const tomorrowEnd = new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate() + 1,
      );

      const upcomingExams = await this.examRepository.find({
        where: {
          status: ExamStatus.SCHEDULED,
          examDate: Between(tomorrowStart, tomorrowEnd),
        },
        relations: ['subjects', 'groups'],
      });

      if (upcomingExams.length === 0) {
        console.log('No exams scheduled for tomorrow');
        return;
      }

      for (const exam of upcomingExams) {
        const subjectNames =
          exam.subjects?.map((s) => s.name).join(', ') || 'Fan belgilanmagan';
        const groupNames =
          exam.groups?.map((g) => g.name).join(', ') || 'Guruh belgilanmagan';

        const message =
          `⏰ <b>Ertaga Test!</b>\n\n` +
          `📚 <b>Test:</b> ${exam.title}\n` +
          `📋 <b>Fan:</b> ${subjectNames}\n` +
          `👥 <b>Guruhlar:</b> ${groupNames}\n` +
          `📅 <b>Sana:</b> ${exam.examDate.toLocaleDateString()}\n` +
          `⏱️ <b>Davomiylik:</b> ${exam.duration} daqiqa\n\n` +
          `📝 Tayyor bo'ling va vaqtida keling!`;

        await this.telegramService.sendNotificationToChannelsAndBot(message);
        console.log(`Reminder sent for exam: ${exam.title}`);
      }

      console.log(`Exam reminders completed for ${upcomingExams.length} exams`);
    } catch (error) {
      console.error('Failed to send exam reminders:', error);
    }
  }

  // Check for new variants without PDFs every 2 hours
  @Cron(CRON_JOB_CONFIGS.MISSING_PDF_CHECKER.schedule, {
    name: 'missingPDFChecker',
    timeZone: CRON_JOB_CONFIGS.MISSING_PDF_CHECKER.timeZone,
  })
  async checkAndSendMissingPDFs() {
    console.log('Checking for variants without sent PDFs...');

    try {
      // Find variants that need PDFs sent (created in the last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const recentVariants = await this.examVariantRepository.find({
        where: {
          createdAt: MoreThanOrEqual(yesterday),
        },
        relations: ['student', 'exam'],
      });

      if (recentVariants.length === 0) {
        console.log('No recent variants found');
        return;
      }

      let sent = 0;
      let failed = 0;

      for (const variant of recentVariants) {
        try {
          // Check if student has Telegram account
          const telegramStatus =
            await this.telegramService.getUserTelegramStatus(
              variant.student.id,
            );

          if (telegramStatus.isLinked) {
            const result = await this.examsService.generateAndSendVariantPDF(
              variant.id,
            );
            if (result.telegramSent) {
              sent++;
              console.log(`PDF sent for variant ${variant.variantNumber}`);
            } else {
              failed++;
              console.warn(
                `Failed to send PDF for variant ${variant.variantNumber}: ${result.message}`,
              );
            }
          } else {
            console.log(
              `Student ${variant.student.firstName} ${variant.student.lastName} doesn't have Telegram linked`,
            );
          }

          // Small delay between sends
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          failed++;
          console.error(`Error processing variant ${variant.id}:`, error);
        }
      }

      console.log(
        `Missing PDF check completed: ${sent} sent, ${failed} failed`,
      );
    } catch (error) {
      console.error('Failed to check missing PDFs:', error);
    }
  }

  // Weekly attendance summary every Sunday at 9:00 AM
  @Cron(CRON_JOB_CONFIGS.WEEKLY_ATTENDANCE_SUMMARY.schedule, {
    name: 'weeklyAttendanceSummary',
    timeZone: CRON_JOB_CONFIGS.WEEKLY_ATTENDANCE_SUMMARY.timeZone,
  })
  async sendWeeklyAttendanceSummary() {
    console.log('Generating weekly attendance summary...');

    try {
      // Calculate last week's date range
      const today = new Date();
      const lastWeekEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - today.getDay(),
      );
      const lastWeekStart = new Date(
        lastWeekEnd.getTime() - 7 * 24 * 60 * 60 * 1000,
      );

      // This would typically involve getting attendance statistics
      // For now, we'll send a placeholder message
      const message =
        `📊 <b>Haftalik Davomat Hisoboti</b>\n\n` +
        `📅 <b>Muddat:</b> ${lastWeekStart.toLocaleDateString()} - ${lastWeekEnd.toLocaleDateString()}\n\n` +
        `📋 Batafsil hisobot uchun LMS tizimiga kiring.\n` +
        `📱 Telegram orqali davomat kuzatishda davom eting!`;

      await this.telegramService.sendNotificationToChannelsAndBot(message);
      console.log('Weekly attendance summary sent');
    } catch (error) {
      console.error('Failed to send weekly attendance summary:', error);
    }
  }

  // Daily health check every day at 12:00 PM
  @Cron(CRON_JOB_CONFIGS.DAILY_HEALTH_CHECK.schedule, {
    name: 'dailyHealthCheck',
    timeZone: CRON_JOB_CONFIGS.DAILY_HEALTH_CHECK.timeZone,
  })
  async performDailyHealthCheck() {
    console.log('Performing daily health check...');

    try {
      // Check if Telegram bot is working
      const botStatus = await this.telegramService.testTelegramConnection();

      if (!botStatus) {
        console.error('Telegram bot health check failed!');
        // You could send an alert to administrators here
      } else {
        console.log('Telegram bot health check passed');
      }

      // Additional health checks can be added here
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  // Send payment reminders every day at 10:00 AM for overdue payments
  @Cron('0 10 * * *', {
    name: 'dailyPaymentReminders',
    timeZone: 'Asia/Tashkent',
  })
  async sendDailyPaymentReminders() {
    console.log('Starting daily payment reminders...');

    try {
      // Update overdue payments status first
      await this.paymentsService.updateOverduePayments();

      // Get overdue payments
      const overduePayments = await this.paymentsService.getOverduePayments();

      if (overduePayments.length === 0) {
        console.log('No overdue payments found');
        return;
      }

      console.log(`Found ${overduePayments.length} overdue payments`);

      let sentCount = 0;
      let failedCount = 0;

      for (const payment of overduePayments) {
        try {
          // Send individual payment reminder via Telegram
          await this.telegramService.sendPaymentReminder(
            payment.studentId,
            payment,
          );

          // Also send to channels if configured
          const relevantChannels = await this.telegramService.getAllChats();
          const paymentChannels = relevantChannels.filter(
            (channel) =>
              channel.type === 'channel' &&
              channel.status === 'active' &&
              (channel.center?.id === payment.group?.center?.id ||
                !channel.center),
          );

          for (const channel of paymentChannels) {
            try {
              await this.telegramService.sendPaymentReminderToChannel(
                channel.chatId,
                payment,
              );
            } catch (error) {
              console.warn(
                `Failed to send payment reminder to channel ${channel.chatId}:`,
                error.message,
              );
            }
          }

          sentCount++;
          console.log(
            `Payment reminder sent for payment ${payment.id} to student ${payment.student?.firstName} ${payment.student?.lastName}`,
          );

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          failedCount++;
          console.error(
            `Failed to send payment reminder for payment ${payment.id}:`,
            error,
          );
        }
      }

      // Send summary notification to channels
      if (sentCount > 0 || failedCount > 0) {
        const summaryMessage =
          `💰 <b>Kunlik To'lov Eslatmalari</b>\n\n` +
          `📊 <b>Jami muddati o'tgan to'lovlar:</b> ${overduePayments.length}\n` +
          `✅ <b>Eslatma yuborildi:</b> ${sentCount}\n` +
          `❌ <b>Xatolik:</b> ${failedCount}\n` +
          `📅 <b>Sana:</b> ${new Date().toLocaleDateString()}\n\n` +
          `💡 <b>Ota-onalar, iltimos to'lovlarni muddatida amalga oshiring!</b>`;

        await this.telegramService.sendNotificationToChannelsAndBot(
          summaryMessage,
        );
      }

      console.log(
        `Payment reminders completed: ${sentCount} sent, ${failedCount} failed`,
      );
    } catch (error) {
      console.error('Failed to send payment reminders:', error);
    }
  }

  // Send upcoming payment notifications every Monday at 9:00 AM
  @Cron('0 9 * * 1', {
    name: 'weeklyUpcomingPayments',
    timeZone: 'Asia/Tashkent',
  })
  async sendUpcomingPaymentNotifications() {
    console.log('Starting weekly upcoming payment notifications...');

    try {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Get payments due in the next week
      const upcomingPayments = await this.paymentRepository.find({
        where: {
          status: PaymentStatus.PENDING,
          dueDate: Between(today, nextWeek),
        },
        relations: ['student', 'teacher', 'group'],
      });

      if (upcomingPayments.length === 0) {
        console.log('No upcoming payments found for next week');
        return;
      }

      console.log(
        `Found ${upcomingPayments.length} payments due in the next week`,
      );

      let sentCount = 0;
      let failedCount = 0;

      for (const payment of upcomingPayments) {
        try {
          // Send upcoming payment notification
          const message =
            `📅 To'lov eslatmasi\n\n` +
            `📚 Guruh: ${payment.group?.name || "Noma'lum"}\n` +
            `💵 Miqdor: ${payment.amount} so'm\n` +
            `📅 To'lash muddati: ${new Date(payment.dueDate).toLocaleDateString('uz-UZ')}\n` +
            `📋 Tavsif: ${payment.description}\n\n` +
            `💡 To'lovni muddatida amalga oshirishni eslatamiz.\n` +
            `❓ Savollar bo'lsa o'qituvchingiz bilan bog'laning.`;

          await this.telegramService.sendPaymentReminder(payment.studentId, {
            ...payment,
            message: message,
          });

          sentCount++;

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (error) {
          failedCount++;
          console.error(
            `Failed to send upcoming payment notification for payment ${payment.id}:`,
            error,
          );
        }
      }

      // Send summary
      if (sentCount > 0 || failedCount > 0) {
        const summaryMessage =
          `📅 <b>Haftalik To'lov Eslatmalari</b>\n\n` +
          `📊 <b>Kelasi hafta muddati yetadigan to'lovlar:</b> ${upcomingPayments.length}\n` +
          `✅ <b>Eslatma yuborildi:</b> ${sentCount}\n` +
          `❌ <b>Xatolik:</b> ${failedCount}\n` +
          `📅 <b>Sana:</b> ${new Date().toLocaleDateString()}\n\n` +
          `💰 Muddatini unutmang!`;

        await this.telegramService.sendNotificationToChannelsAndBot(
          summaryMessage,
        );
      }

      console.log(
        `Upcoming payment notifications completed: ${sentCount} sent, ${failedCount} failed`,
      );
    } catch (error) {
      console.error('Failed to send upcoming payment notifications:', error);
    }
  }
}
