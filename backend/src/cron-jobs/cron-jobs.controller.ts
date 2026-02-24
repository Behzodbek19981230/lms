import { Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CronJobsService } from './cron-jobs.service';
import { CRON_JOB_CONFIGS } from './cron-jobs.config';

@ApiTags('Cron Jobs')
@Controller('cron-jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
@ApiBearerAuth()
export class CronJobsController {
  constructor(private readonly cronJobsService: CronJobsService) {}

  @Post('send-exam-reminders')
  @ApiOperation({ summary: 'Manually trigger exam reminders' })
  @ApiResponse({ status: 200, description: 'Exam reminders triggered' })
  async triggerExamReminders() {
    await this.cronJobsService.sendExamReminders();
    return {
      success: true,
      message: 'Exam reminders triggered',
    };
  }

  //   @Post('send-attendance-summary')
  //   @ApiOperation({ summary: 'Manually trigger weekly attendance summary' })
  //   @ApiResponse({ status: 200, description: 'Attendance summary triggered' })
  //   async triggerAttendanceSummary() {
  //     await this.cronJobsService.sendWeeklyAttendanceSummary();
  //     return {
  //       success: true,
  //       message: 'Weekly attendance summary triggered',
  //     };
  //   }

  @Post('health-check')
  @ApiOperation({ summary: 'Manually trigger health check' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  async triggerHealthCheck() {
    await this.cronJobsService.performDailyHealthCheck();
    return {
      success: true,
      message: 'Health check completed',
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get cron job status information' })
  @ApiResponse({ status: 200, description: 'Cron job status' })
  getCronJobStatus() {
    return {
      success: true,
      cronJobs: [
        {
          name: 'examReminder',
          schedule: CRON_JOB_CONFIGS.EXAM_REMINDER.schedule,
          description: CRON_JOB_CONFIGS.EXAM_REMINDER.description,
          timeZone: CRON_JOB_CONFIGS.EXAM_REMINDER.timeZone,
          enabled: CRON_JOB_CONFIGS.EXAM_REMINDER.enabled,
        },
        {
          name: 'weeklyAttendanceSummary',
          schedule: CRON_JOB_CONFIGS.WEEKLY_ATTENDANCE_SUMMARY.schedule,
          description: CRON_JOB_CONFIGS.WEEKLY_ATTENDANCE_SUMMARY.description,
          timeZone: CRON_JOB_CONFIGS.WEEKLY_ATTENDANCE_SUMMARY.timeZone,
          enabled: CRON_JOB_CONFIGS.WEEKLY_ATTENDANCE_SUMMARY.enabled,
        },
        {
          name: 'dailyHealthCheck',
          schedule: CRON_JOB_CONFIGS.DAILY_HEALTH_CHECK.schedule,
          description: CRON_JOB_CONFIGS.DAILY_HEALTH_CHECK.description,
          timeZone: CRON_JOB_CONFIGS.DAILY_HEALTH_CHECK.timeZone,
          enabled: CRON_JOB_CONFIGS.DAILY_HEALTH_CHECK.enabled,
        },
        {
          name: 'dailyDuePayments21',
          schedule: '0 21 * * *',
          description:
            'Send due-today payment reminders to center channel at 21:00',
          timeZone: 'Asia/Tashkent',
          enabled: true,
        },
      ],
      message: 'All cron jobs are configured and running',
    };
  }
}
