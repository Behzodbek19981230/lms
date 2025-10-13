import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignedTestsService } from './assigned-tests.service';
import { AssignedTestsController } from './assigned-tests.controller';
import {
  AssignedTest,
  AssignedTestVariant,
} from './entities/assigned-test.entity';
import { Test } from '../tests/entities/test.entity';
import { Question } from '../questions/entities/question.entity';
import { Answer } from '../questions/entities/answer.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssignedTest,
      AssignedTestVariant,
      Test,
      Question,
      Answer,
      Group,
      User,
    ]),
    NotificationsModule,
  ],
  providers: [AssignedTestsService],
  controllers: [AssignedTestsController],
})
export class AssignedTestsModule {}
