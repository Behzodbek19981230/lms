import {
  Controller,
  Get,
  UseGuards,
  Request,
  Param,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StudentsService } from './students.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Students')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('dashboard')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student dashboard data' })
  @ApiResponse({ status: 200, description: 'Student dashboard data' })
  async getDashboardData(@Request() req) {
    return this.studentsService.getDashboardData(req.user.id);
  }

  @Get('exams')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student exam variants' })
  @ApiResponse({ status: 200, description: 'List of student exam variants' })
  async getStudentExams(@Request() req) {
    return this.studentsService.getStudentExams(req.user.id);
  }

  @Get('assigned-tests')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student assigned tests' })
  @ApiResponse({ status: 200, description: 'List of student assigned tests' })
  async getAssignedTests(@Request() req) {
    return this.studentsService.getAssignedTests(req.user.id);
  }

  @Get('grades')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student grades and scores' })
  @ApiResponse({ status: 200, description: 'Student grades' })
  async getGrades(@Request() req) {
    return this.studentsService.getGrades(req.user.id);
  }

  @Get('notifications')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student notifications' })
  @ApiResponse({ status: 200, description: 'Student notifications' })
  async getNotifications(@Request() req) {
    return this.studentsService.getNotifications(req.user.id);
  }

  @Get('subjects')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student subjects/courses' })
  @ApiResponse({ status: 200, description: 'List of student subjects' })
  async getSubjects(@Request() req) {
    return this.studentsService.getSubjects(req.user.id);
  }

  @Get('exams/:variantId/info')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get exam variant info for debugging' })
  async getExamVariantInfo(
    @Param('variantId') variantId: string,
    @Request() req,
  ) {
    const variant = await this.studentsService.getExamVariantInfo(+variantId, req.user.id);
    return variant;
  }

  @Get('exams/:variantId/download')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Download student exam variant PDF' })
  @ApiResponse({ status: 200, description: 'PDF file downloaded and status updated' })
  async downloadExamVariant(
    @Param('variantId') variantId: string,
    @Request() req,
    @Res() res: Response,
  ): Promise<void> {
    console.log('Download request from user:', req.user?.id, 'role:', req.user?.role, 'for variant:', variantId);
    
    const buffer = await this.studentsService.downloadExamVariant(
      +variantId, 
      req.user.id
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="exam-variant-${variantId}.pdf"`,
    );
    res.send(buffer);
  }
}