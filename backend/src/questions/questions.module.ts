import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { Question } from './entities/question.entity';
import { Answer } from './entities/answer.entity';
import { Test } from '../tests/entities/test.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Answer, Test])],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
