import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';

import { Center } from './entities/center.entity';
import { CentersController } from './centers.controller';
import { CentersService } from './centers.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CenterImportService } from './import/center-import.service';
import { Subject } from '../subjects/entities/subject.entity';
import { Group } from '../groups/entities/group.entity';
import { Payment } from '../payments/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Center, User, Subject, Group, Payment])],
  controllers: [CentersController],
  providers: [CentersService, CenterImportService, RolesGuard],
  exports: [CentersService],
})
export class CentersModule {}
