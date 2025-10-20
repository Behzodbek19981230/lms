import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { TestGeneratorService } from './test-generator.service';
import { LatexProcessorService } from './latex-processor.service';
import { AnswerSheetScannerService } from './answer-sheet-scanner.service';
import { Test } from './entities/test.entity';
import {
  GeneratedTest,
  GeneratedTestVariant,
} from './entities/generated-test.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { User } from '../users/entities/user.entity';
import { Question } from '../questions/entities/question.entity';
import { LogsModule } from 'src/logs/logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Test,
      User,
      Subject,
      Question,
      GeneratedTest,
      GeneratedTestVariant,
    ]),
    LogsModule,
  ],
  controllers: [TestsController],
  providers: [
    TestsService,
    TestGeneratorService,
    LatexProcessorService,
    AnswerSheetScannerService,
  ],
  exports: [
    TestsService,
    TestGeneratorService,
    LatexProcessorService,
    AnswerSheetScannerService,
  ],
})
export class TestsModule {}
