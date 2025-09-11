import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { TestGeneratorService } from './test-generator.service';
import { Test } from './entities/test.entity';
import {
  GeneratedTest,
  GeneratedTestVariant,
} from './entities/generated-test.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { User } from '../users/entities/user.entity';
import { Question } from '../questions/entities/question.entity';

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
  ],
  controllers: [TestsController],
  providers: [TestsService, TestGeneratorService],
  exports: [TestsService, TestGeneratorService],
})
export class TestsModule {}
