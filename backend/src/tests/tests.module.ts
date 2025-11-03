import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { TestGeneratorService } from './test-generator.service';
import { LatexProcessorService } from './latex-processor.service';
import { Test } from './entities/test.entity';
import {
  GeneratedTest,
  GeneratedTestVariant,
} from './entities/generated-test.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { User } from '../users/entities/user.entity';
import { Question } from '../questions/entities/question.entity';
import { LogsModule } from 'src/logs/logs.module';
import { Results } from './entities/results.entity';
import { Center } from 'src/centers/entities/center.entity';
import { TelegramChat } from 'src/telegram/entities/telegram-chat.entity';
import { ExamVariant } from '../exams/entities/exam-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Test,
      User,
      Subject,
      Question,
      GeneratedTest,
      GeneratedTestVariant,
      Results,
      Center,
      TelegramChat,
      ExamVariant,
    ]),
    LogsModule,
  ],
  controllers: [TestsController],
  providers: [TestsService, TestGeneratorService, LatexProcessorService],
  exports: [TestsService, TestGeneratorService, LatexProcessorService],
})
export class TestsModule {}
