import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CentersService } from './centers.service';
import { CreateCenterDto } from './dto/create-center.dto';
import { Center } from './entities/center.entity';

@ApiTags('Centers')
@Controller('centers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CentersController {
  constructor(private readonly centerService: CentersService) {}

  @Post()
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Yangi markaz yaratish' })
  @ApiResponse({
    status: 201,
    description: 'Markaz muvaffaqiyatli yaratildi',
  })
  @ApiBody({ type: CreateCenterDto })
  async create(
    @Body() createCenterDto: CreateCenterDto,
    @Request() req,
  ): Promise<any> {
    return this.centerService.create(createCenterDto, req.user);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Markazlar ro‘yxatini olish' })
  @ApiResponse({
    status: 200,
    description: 'Markazlar ro‘yxati',
    type: [Center],
  })
  async findAll(@Request() req): Promise<Center[]> {
    return this.centerService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Markaz ma‘lumotlarini olish' })
  @ApiResponse({
    status: 200,
    description: 'Markaz ma‘lumotlari',
    type: Center,
  })
  async findOne(@Param('id') id: number, @Request() req): Promise<Center> {
    return this.centerService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Markaz ma‘lumotlarini yangilash' })
  @ApiResponse({
    status: 200,
    description: 'Markaz ma‘lumotlari yangilandi',
    type: Center,
  })
  async update(
    @Param('id') id: number,
    @Body() updateCenterDto: CreateCenterDto,
    @Request() req,
  ): Promise<Center> {
    return this.centerService.update(id, updateCenterDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Markaz ma‘lumotlarini o‘chirish' })
  @ApiResponse({
    status: 200,
    description: 'Markaz ma‘lumotlari o‘chirildi',
  })
  async remove(@Param('id') id: number, @Request() req): Promise<void> {
    return this.centerService.remove(id, req.user);
  }
}
