import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TelegramService } from '../telegram/telegram.service';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';
import { ExamsService } from '../exams/exams.service';
import { AttendanceService } from '../attendance/attendance.service';
import { PaymentsService } from '../payments/payments.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Exam, ExamStatus } from '../exams/entities/exam.entity';
import { ExamVariant } from '../exams/entities/exam-variant.entity';
import { Payment, PaymentStatus } from '../payments/payment.entity';
import { CRON_JOB_CONFIGS } from './cron-jobs.config';

@Injectable()
export class CronJobsService {
    private readonly logger = new Logger(CronJobsService.name);

    constructor(
        private readonly telegramService: TelegramService,
        private readonly telegramNotificationService: TelegramNotificationService,
        private readonly examsService: ExamsService,
        private readonly attendanceService: AttendanceService,
        private readonly paymentsService: PaymentsService,
        @InjectRepository(Exam)
        private examRepository: Repository<Exam>,
        @InjectRepository(ExamVariant)
        private examVariantRepository: Repository<ExamVariant>,
        @InjectRepository(Payment)
        private paymentRepository: Repository<Payment>,
    ) { }

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

    // Weekly attendance summary every Sunday at 9:00 AM
    //   @Cron(CRON_JOB_CONFIGS.WEEKLY_ATTENDANCE_SUMMARY.schedule, {
    //     name: 'weeklyAttendanceSummary',
    //     timeZone: CRON_JOB_CONFIGS.WEEKLY_ATTENDANCE_SUMMARY.timeZone,
    //   })
    //   async sendWeeklyAttendanceSummary() {
    //     console.log('Generating weekly attendance summary...');

    //     try {
    //       // Calculate last week's date range
    //       const today = new Date();
    //       const lastWeekEnd = new Date(
    //         today.getFullYear(),
    //         today.getMonth(),
    //         today.getDate() - today.getDay(),
    //       );
    //       const lastWeekStart = new Date(
    //         lastWeekEnd.getTime() - 7 * 24 * 60 * 60 * 1000,
    //       );

    //       // This would typically involve getting attendance statistics
    //       // For now, we'll send a placeholder message
    //       const message =
    //         `📊 <b>Haftalik Davomat Hisoboti</b>\n\n` +
    //         `📅 <b>Muddat:</b> ${lastWeekStart.toLocaleDateString()} - ${lastWeekEnd.toLocaleDateString()}\n\n` +
    //         `📋 Batafsil hisobot uchun LMS tizimiga kiring.\n` +
    //         `📱 Telegram orqali davomat kuzatishda davom eting!`;

    //       await this.telegramService.sendNotificationToChannelsAndBot(message);
    //       console.log('Weekly attendance summary sent');
    //     } catch (error) {
    //       console.error('Failed to send weekly attendance summary:', error);
    //     }
    //   }

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
                    const paymentChannels = relevantChannels.filter((channel) => {
                        const isChannel = String(channel.type) === 'channel';
                        const isActive = String(channel.status) === 'active';
                        const sameCenter =
                            (channel.center?.id || null) ===
                            (payment.group?.center?.id || null) || !channel.center;
                        return isChannel && isActive && sameCenter;
                    });

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

    /**
     * Send reminders for payments that are DUE TODAY at 21:00 (Asia/Tashkent)
     * to the center-wide Telegram channel (single channel per center).
     */
    @Cron('0 21 * * *', {
        name: 'dailyDuePayments21',
        timeZone: 'Asia/Tashkent',
    })
    async sendDueTodayPaymentsAt21() {
        this.logger.log('Starting due-today payment reminders (21:00)...');

        try {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const end = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() + 1,
            );
            const dateStr = start.toISOString().split('T')[0];

            const dueToday = await this.paymentRepository.find({
                where: {
                    status: PaymentStatus.PENDING,
                    dueDate: Between(start, end),
                },
                relations: ['student', 'group', 'group.center'],
                order: { groupId: 'ASC', studentId: 'ASC' },
            });

            if (dueToday.length === 0) {
                this.logger.log('No due-today pending payments found');
                return;
            }

            // Group by centerId
            const byCenter = new Map<number, typeof dueToday>();
            for (const p of dueToday) {
                const centerId = p.group?.center?.id;
                if (!centerId) continue;
                const arr = byCenter.get(centerId) || [];
                arr.push(p);
                byCenter.set(centerId, arr);
            }

            for (const [centerId, payments] of byCenter.entries()) {
                const items = payments.map((p) => ({
                    groupName: p.group?.name || `Guruh #${p.groupId}`,
                    studentName: p.student
                        ? `${p.student.firstName} ${p.student.lastName}`
                        : `Student #${p.studentId}`,
                    amount: p.amount,
                    description: p.description,
                }));

                await this.telegramNotificationService.sendDuePaymentsReminderToCenterChannel(
                    {
                        centerId,
                        date: dateStr,
                        items,
                    },
                );
            }

            this.logger.log(
                `Due-today reminders queued for ${byCenter.size} centers, total payments: ${dueToday.length}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to send due-today payment reminders: ${error.message}`,
                error.stack,
            );
        }
    }
}
