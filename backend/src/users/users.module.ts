import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Center } from 'src/centers/entities/center.entity';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User, Center])],
  providers: [UsersService, RolesGuard],
  exports: [UsersService, TypeOrmModule],
  controllers: [UsersController],
})
export class UsersModule {} 
