import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto, BulkAttendanceDto, AttendanceQueryDto, UpdateAttendanceDto } from './dto/attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async create(@Body() dto: CreateAttendanceDto, @Request() req) {
    return this.attendanceService.create(dto, req.user.id);
  }

  @Post('bulk')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async createBulk(@Body() dto: BulkAttendanceDto, @Request() req) {
    return this.attendanceService.createBulk(dto, req.user.id);
  }

  @Get()
  async findAll(@Query() query: AttendanceQueryDto, @Request() req) {
    return this.attendanceService.findAll(query, req.user.id, req.user.role);
  }

  @Get('stats/:groupId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getStats(@Param('groupId') groupId: number, @Request() req) {
    return this.attendanceService.getAttendanceStats(groupId, req.user.id);
  }

  @Put(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async update(@Param('id') id: number, @Body() dto: UpdateAttendanceDto, @Request() req) {
    return this.attendanceService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async delete(@Param('id') id: number, @Request() req) {
    return this.attendanceService.delete(id, req.user.id);
  }

  // Get only present students for a specific group and date
  @Get('present/:groupId/:date')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getPresentStudents(
    @Param('groupId') groupId: number, 
    @Param('date') date: string, 
    @Request() req
  ) {
    return this.attendanceService.getPresentStudents(groupId, date, req.user.id);
  }

  // Get present students for today only
  @Get('present/today/:groupId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getTodayPresentStudents(@Param('groupId') groupId: number, @Request() req) {
    return this.attendanceService.getTodayPresentStudents(groupId, req.user.id);
  }
}
