import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { CustomLogger } from './custom-logger';
import { Log } from './entities/log.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsAdminController } from './analytics-admin.controller';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Log, User])],
  controllers: [LogsController, AnalyticsController, AnalyticsAdminController],
  providers: [LogsService, CustomLogger],
  exports: [LogsService, CustomLogger],
})
export class LogsModule {}
