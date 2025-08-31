import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TelegramService } from '../telegram/telegram.service';
import { ExamsService } from '../exams/exams.service';
import { AttendanceService } from '../attendance/attendance.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Exam, ExamStatus } from '../exams/entities/exam.entity';
import { ExamVariant } from '../exams/entities/exam-variant.entity';
import { CRON_JOB_CONFIGS } from './cron-jobs.config';

@Injectable()
export class CronJobsService {
  private readonly logger = new Logger(CronJobsService.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly examsService: ExamsService,
    private readonly attendanceService: AttendanceService,
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    @InjectRepository(ExamVariant)
    private examVariantRepository: Repository<ExamVariant>,
  ) {}

  // Send PDFs to students every day at 8:00 AM for scheduled exams
  @Cron(CRON_JOB_CONFIGS.DAILY_PDF_SENDER.schedule, {
    name: 'dailyPDFSender',
    timeZone: CRON_JOB_CONFIGS.DAILY_PDF_SENDER.timeZone,
  })
  async sendScheduledExamPDFs() {
    this.logger.log('Starting daily PDF sending for scheduled exams...');
    
    try {
      // Find all scheduled exams for today
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const scheduledExams = await this.examRepository.find({
        where: {
          status: ExamStatus.SCHEDULED,
          examDate: Between(todayStart, todayEnd),
        },
        relations: ['variants', 'variants.student'],
      });

      if (scheduledExams.length === 0) {
        this.logger.log('No scheduled exams found for today');
        return;
      }

      let totalSent = 0;
      let totalFailed = 0;

      for (const exam of scheduledExams) {
        try {
          this.logger.log(`Processing exam: ${exam.title} (${exam.variants?.length || 0} variants)`);
          
          if (exam.variants && exam.variants.length > 0) {
            const result = await this.examsService.generateAndSendAllVariantsPDFs(exam.id);
            totalSent += result.sent;
            totalFailed += result.failed;
            
            this.logger.log(`Exam ${exam.title}: ${result.sent} sent, ${result.failed} failed`);
            
            // Send summary notification to Telegram channels
            const message = `📚 <b>Bugungi Test PDF'lari Yuborildi</b>\n\n` +
              `📋 <b>Test:</b> ${exam.title}\n` +
              `✅ <b>Yuborildi:</b> ${result.sent}\n` +
              `❌ <b>Xatolik:</b> ${result.failed}\n` +
              `📅 <b>Sana:</b> ${new Date().toLocaleDateString()}`;
            
            await this.telegramService.sendNotificationToChannelsAndBot(message);
          }
        } catch (error) {
          this.logger.error(`Failed to process exam ${exam.id}:`, error);
          totalFailed++;
        }
      }

      this.logger.log(`Daily PDF sending completed: ${totalSent} sent, ${totalFailed} failed`);
    } catch (error) {
      this.logger.error('Failed to send scheduled exam PDFs:', error);
    }
  }

  // Send reminder for upcoming exams every day at 6:00 PM
  @Cron(CRON_JOB_CONFIGS.EXAM_REMINDER.schedule, {
    name: 'examReminder',
    timeZone: CRON_JOB_CONFIGS.EXAM_REMINDER.timeZone,
  })
  async sendExamReminders() {
    this.logger.log('Starting exam reminders...');
    
    try {
      // Find exams scheduled for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      const tomorrowEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1);

      const upcomingExams = await this.examRepository.find({
        where: {
          status: ExamStatus.SCHEDULED,
          examDate: Between(tomorrowStart, tomorrowEnd),
        },
        relations: ['subjects', 'groups'],
      });

      if (upcomingExams.length === 0) {
        this.logger.log('No exams scheduled for tomorrow');
        return;
      }

      for (const exam of upcomingExams) {
        const subjectNames = exam.subjects?.map(s => s.name).join(', ') || 'Fan belgilanmagan';
        const groupNames = exam.groups?.map(g => g.name).join(', ') || 'Guruh belgilanmagan';
        
        const message = `⏰ <b>Ertaga Test!</b>\n\n` +
          `📚 <b>Test:</b> ${exam.title}\n` +
          `📋 <b>Fan:</b> ${subjectNames}\n` +
          `👥 <b>Guruhlar:</b> ${groupNames}\n` +
          `📅 <b>Sana:</b> ${exam.examDate.toLocaleDateString()}\n` +
          `⏱️ <b>Davomiylik:</b> ${exam.duration} daqiqa\n\n` +
          `📝 Tayyor bo'ling va vaqtida keling!`;

        await this.telegramService.sendNotificationToChannelsAndBot(message);
        this.logger.log(`Reminder sent for exam: ${exam.title}`);
      }

      this.logger.log(`Exam reminders completed for ${upcomingExams.length} exams`);
    } catch (error) {
      this.logger.error('Failed to send exam reminders:', error);
    }
  }

  // Check for new variants without PDFs every 2 hours
  @Cron(CRON_JOB_CONFIGS.MISSING_PDF_CHECKER.schedule, {
    name: 'missingPDFChecker',
    timeZone: CRON_JOB_CONFIGS.MISSING_PDF_CHECKER.timeZone,
  })
  async checkAndSendMissingPDFs() {
    this.logger.log('Checking for variants without sent PDFs...');
    
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
        this.logger.log('No recent variants found');
        return;
      }

      let sent = 0;
      let failed = 0;

      for (const variant of recentVariants) {
        try {
          // Check if student has Telegram account
          const telegramStatus = await this.telegramService.getUserTelegramStatus(variant.student.id);
          
          if (telegramStatus.isLinked) {
            const result = await this.examsService.generateAndSendVariantPDF(variant.id);
            if (result.telegramSent) {
              sent++;
              this.logger.log(`PDF sent for variant ${variant.variantNumber}`);
            } else {
              failed++;
              this.logger.warn(`Failed to send PDF for variant ${variant.variantNumber}: ${result.message}`);
            }
          } else {
            this.logger.log(`Student ${variant.student.firstName} ${variant.student.lastName} doesn't have Telegram linked`);
          }
          
          // Small delay between sends
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          failed++;
          this.logger.error(`Error processing variant ${variant.id}:`, error);
        }
      }

      this.logger.log(`Missing PDF check completed: ${sent} sent, ${failed} failed`);
    } catch (error) {
      this.logger.error('Failed to check missing PDFs:', error);
    }
  }

  // Weekly attendance summary every Sunday at 9:00 AM
  @Cron(CRON_JOB_CONFIGS.WEEKLY_ATTENDANCE_SUMMARY.schedule, {
    name: 'weeklyAttendanceSummary',
    timeZone: CRON_JOB_CONFIGS.WEEKLY_ATTENDANCE_SUMMARY.timeZone,
  })
  async sendWeeklyAttendanceSummary() {
    this.logger.log('Generating weekly attendance summary...');
    
    try {
      // Calculate last week's date range
      const today = new Date();
      const lastWeekEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
      const lastWeekStart = new Date(lastWeekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

      // This would typically involve getting attendance statistics
      // For now, we'll send a placeholder message
      const message = `📊 <b>Haftalik Davomat Hisoboti</b>\n\n` +
        `📅 <b>Muddat:</b> ${lastWeekStart.toLocaleDateString()} - ${lastWeekEnd.toLocaleDateString()}\n\n` +
        `📋 Batafsil hisobot uchun LMS tizimiga kiring.\n` +
        `📱 Telegram orqali davomat kuzatishda davom eting!`;

      await this.telegramService.sendNotificationToChannelsAndBot(message);
      this.logger.log('Weekly attendance summary sent');
    } catch (error) {
      this.logger.error('Failed to send weekly attendance summary:', error);
    }
  }

  // Daily health check every day at 12:00 PM
  @Cron(CRON_JOB_CONFIGS.DAILY_HEALTH_CHECK.schedule, {
    name: 'dailyHealthCheck',
    timeZone: CRON_JOB_CONFIGS.DAILY_HEALTH_CHECK.timeZone,
  })
  async performDailyHealthCheck() {
    this.logger.log('Performing daily health check...');
    
    try {
      // Check if Telegram bot is working
      const botStatus = await this.telegramService.testTelegramConnection();
      
      if (!botStatus) {
        this.logger.error('Telegram bot health check failed!');
        // You could send an alert to administrators here
      } else {
        this.logger.log('Telegram bot health check passed');
      }

      // Additional health checks can be added here
      
    } catch (error) {
      this.logger.error('Health check failed:', error);
    }
  }
}