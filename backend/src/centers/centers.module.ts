import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';

import { Center } from './entities/center.entity';
import { CentersController } from './centers.controller';
import { CentersService } from './centers.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Center, User])],
  controllers: [CentersController],
  providers: [CentersService, RolesGuard],
  exports: [CentersService],
})
export class CentersModule {}
