import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { Subject } from './entities/subject.entity';
import { User } from '../users/entities/user.entity';
import { Center } from 'src/centers/entities/center.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subject, User, Center])],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
