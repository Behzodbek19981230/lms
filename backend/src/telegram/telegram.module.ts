import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { TelegramQueueController } from './telegram-queue.controller';
import { TelegramAuthController } from './telegram-auth.controller';
import { TelegramAuthService } from './telegram-auth.service';
import { AnswerProcessorService } from './answer-processor.service';
import { TelegramQueueService } from './telegram-queue.service';
import { TelegramNotificationService } from './telegram-notification.service';
import { TelegramChat } from './entities/telegram-chat.entity';
import { TelegramAnswer } from './entities/telegram-answer.entity';
import { TelegramMessageLog } from './entities/telegram-message-log.entity';
import { PendingPdf } from './entities/pending-pdf.entity';
import { TelegramLinkToken } from './entities/telegram-link-token.entity';
import { User } from '../users/entities/user.entity';
import { Center } from '../centers/entities/center.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Test } from '../tests/entities/test.entity';
import { Question } from '../questions/entities/question.entity';
import { Answer } from '../questions/entities/answer.entity';
import { Exam } from '../exams/entities/exam.entity';
import { Group } from '../groups/entities/group.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { TestsModule } from '../tests/tests.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TelegramChat,
      TelegramAnswer,
      TelegramMessageLog,
      PendingPdf,
      TelegramLinkToken,
      User,
      Center,
      Subject,
      Test,
      Question,
      Answer,
      Exam,
      Group,
    ]),
    ConfigModule,
    ScheduleModule.forRoot(),
    forwardRef(() => NotificationsModule),
    forwardRef(() => TestsModule),
    LogsModule,
  ],
  controllers: [
    TelegramController,
    TelegramQueueController,
    TelegramAuthController,
  ],
  providers: [
    TelegramService,
    TelegramAuthService,
    AnswerProcessorService,
    TelegramQueueService,
    TelegramNotificationService,
  ],
  exports: [
    TelegramService,
    TelegramAuthService,
    AnswerProcessorService,
    TelegramQueueService,
    TelegramNotificationService,
  ],
})
export class TelegramModule {}
