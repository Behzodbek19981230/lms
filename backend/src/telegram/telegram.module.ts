import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { TelegramAuthController } from './telegram-auth.controller';
import { TelegramAuthService } from './telegram-auth.service';
import { TestPDFGeneratorService } from './test-pdf-generator.service';
import { AnswerProcessorService } from './answer-processor.service';
import { TelegramChat } from './entities/telegram-chat.entity';
import { TelegramAnswer } from './entities/telegram-answer.entity';
import { PendingPdf } from './entities/pending-pdf.entity';
import { User } from '../users/entities/user.entity';
import { Center } from '../centers/entities/center.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Test } from '../tests/entities/test.entity';
import { Question } from '../questions/entities/question.entity';
import { Answer } from '../questions/entities/answer.entity';
import { Exam } from '../exams/entities/exam.entity';
import { Group } from '../groups/entities/group.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { TestsModule } from '../tests/tests.module'; // Add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TelegramChat,
      TelegramAnswer,
      PendingPdf,
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
    forwardRef(() => NotificationsModule),
    TestsModule, // Add this module import
  ],
  controllers: [TelegramController, TelegramAuthController],
  providers: [
    TelegramService, 
    TelegramAuthService,
    TestPDFGeneratorService,
    AnswerProcessorService,
  ],
  exports: [
    TelegramService, 
    TelegramAuthService,
    TestPDFGeneratorService,
    AnswerProcessorService,
  ],
})
export class TelegramModule {}