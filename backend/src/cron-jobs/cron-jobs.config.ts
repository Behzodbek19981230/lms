export interface CronJobConfig {
  enabled: boolean;
  schedule: string;
  timeZone: string;
  description: string;
}

export const CRON_JOB_CONFIGS = {
  DAILY_PDF_SENDER: {
    enabled: true,
    schedule: '0 8 * * *', // Every day at 8:00 AM
    timeZone: 'Asia/Tashkent',
    description: 'Send PDFs to students for scheduled exams',
  } as CronJobConfig,

  EXAM_REMINDER: {
    enabled: true,
    schedule: '0 18 * * *', // Every day at 6:00 PM
    timeZone: 'Asia/Tashkent',
    description: 'Send reminders for upcoming exams',
  } as CronJobConfig,

  MISSING_PDF_CHECKER: {
    enabled: true,
    schedule: '0 */2 * * *', // Every 2 hours
    timeZone: 'Asia/Tashkent',
    description: 'Check and send missing PDFs',
  } as CronJobConfig,

  WEEKLY_ATTENDANCE_SUMMARY: {
    enabled: true,
    schedule: '0 9 * * 0', // Every Sunday at 9:00 AM
    timeZone: 'Asia/Tashkent',
    description: 'Send weekly attendance summary',
  } as CronJobConfig,

  DAILY_HEALTH_CHECK: {
    enabled: true,
    schedule: '0 12 * * *', // Every day at 12:00 PM
    timeZone: 'Asia/Tashkent',
    description: 'Perform system health checks',
  } as CronJobConfig,
};