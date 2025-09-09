import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Exam } from './entities/exam.entity';
import { ExamVariant } from './entities/exam-variant.entity';
import { ExamVariantQuestion } from './entities/exam-variant-question.entity';
import { Group } from '../groups/entities/group.entity';
import { UsersModule } from '../users/users.module';
import { GroupsModule } from '../groups/groups.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { TestsModule } from '../tests/tests.module';
import { QuestionsModule } from '../questions/questions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelegramModule } from '../telegram/telegram.module';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { LogsModule } from 'src/logs/logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exam, ExamVariant, ExamVariantQuestion, Group]),
    UsersModule,
    GroupsModule,
    SubjectsModule,
    TestsModule,
    QuestionsModule,
    NotificationsModule,
    TelegramModule,
    LogsModule,
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
