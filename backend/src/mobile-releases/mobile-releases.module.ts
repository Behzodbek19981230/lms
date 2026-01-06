import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MobileReleasesController } from './mobile-releases.controller';
import { MobileReleasesService } from './mobile-releases.service';
import { MobileRelease } from './entities/mobile-release.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MobileRelease, User]),
    NotificationsModule,
  ],
  controllers: [MobileReleasesController],
  providers: [MobileReleasesService],
  exports: [MobileReleasesService],
})
export class MobileReleasesModule {}
