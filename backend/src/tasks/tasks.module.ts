import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from '../groups/entities/group.entity';
import { User } from '../users/entities/user.entity';
import { TelegramModule } from '../telegram/telegram.module';
import { TaskNotDone } from './entities/task-not-done.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskNotDone, User, Group]),
    TelegramModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
