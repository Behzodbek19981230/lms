import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { User } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { ExamVariant } from '../exams/entities/exam-variant.entity';
import { AssignedTestVariant } from '../assigned-tests/entities/assigned-test.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { ExamsModule } from '../exams/exams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Group,
      ExamVariant,
      AssignedTestVariant,
      Notification,
      Subject,
    ]),
    ExamsModule,
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}