import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Exam } from './entities/exam.entity';
import { ExamVariant } from './entities/exam-variant.entity';
import { ExamVariantQuestion } from './entities/exam-variant-question.entity';
import { UsersModule } from '../users/users.module';
import { GroupsModule } from '../groups/groups.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { TestsModule } from '../tests/tests.module';
import { QuestionsModule } from '../questions/questions.module';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exam, ExamVariant, ExamVariantQuestion]),
    UsersModule,
    GroupsModule,
    SubjectsModule,
    TestsModule,
    QuestionsModule,
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
