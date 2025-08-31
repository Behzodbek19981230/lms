import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronJobsService } from './cron-jobs.service';
import { CronJobsController } from './cron-jobs.controller';
import { TelegramModule } from '../telegram/telegram.module';
import { ExamsModule } from '../exams/exams.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { Exam } from '../exams/entities/exam.entity';
import { ExamVariant } from '../exams/entities/exam-variant.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Exam, ExamVariant]),
    TelegramModule,
    ExamsModule,
    AttendanceModule,
  ],
  controllers: [CronJobsController],
  providers: [CronJobsService],
  exports: [CronJobsService],
})
export class CronJobsModule {}