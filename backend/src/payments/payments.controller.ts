import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto, CreateMonthlyPaymentsDto, SendPaymentRemindersDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RequireCenterPermissions } from '../centers/permissions/center-permission.decorator';
import { CenterPermissionKey } from '../centers/permissions/center-permissions';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Create a new payment (teacher only)
  @Post()
  @Roles(UserRole.TEACHER)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async create(@Body() createPaymentDto: CreatePaymentDto, @Request() req) {
    return this.paymentsService.create(createPaymentDto, req.user.id);
  }

  // Get all payments for teacher
  @Get('teacher')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async findAllByTeacher(@Request() req) {
    if (req.user.role === UserRole.TEACHER) {
      return this.paymentsService.findAllByTeacher(req.user.id);
    }
    const centerId = req.user?.center?.id;
    if (!centerId) return [];
    return this.paymentsService.findAllByCenter(centerId);
  }

  // Get teacher payment statistics
  @Get('teacher/stats')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.REPORTS_PAYMENTS)
  async getTeacherStats(@Request() req) {
    if (req.user.role === UserRole.TEACHER) {
      return this.paymentsService.getTeacherStats(req.user.id);
    }
    const centerId = req.user?.center?.id;
    if (!centerId) {
      return {
        totalPending: 0,
        totalPaid: 0,
        totalOverdue: 0,
        monthlyRevenue: 0,
        pendingAmount: 0,
        overdueAmount: 0,
      };
    }
    return this.paymentsService.getCenterStats(centerId);
  }

  // Get payments for specific group (teacher only)
  @Get('group/:groupId')
  @Roles(UserRole.TEACHER)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async findByGroup(@Param('groupId') groupId: string, @Request() req) {
    return this.paymentsService.findByGroup(+groupId, req.user.id);
  }

  // Get all payments for student
  @Get('student')
  @Roles(UserRole.STUDENT)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async findAllByStudent(@Request() req) {
    return this.paymentsService.findAllByStudent(req.user.id);
  }

  // Get student payment statistics
  @Get('student/stats')
  @Roles(UserRole.STUDENT)
  @RequireCenterPermissions(CenterPermissionKey.REPORTS_PAYMENTS)
  async getStudentStats(@Request() req) {
    return this.paymentsService.getStudentStats(req.user.id);
  }

  // Get payment statistics (admin)
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.REPORTS_PAYMENTS)
  async getPaymentStats() {
    // This would aggregate stats from all payments
    // Implementation would depend on admin requirements
    return { message: 'Admin stats endpoint - to be implemented' };
  }

  // Get payment by ID
  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.ADMIN)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(+id);
  }

  // Update payment (teacher only)
  @Patch(':id')
  @Roles(UserRole.TEACHER)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Request() req
  ) {
    return this.paymentsService.update(+id, updatePaymentDto, req.user.id);
  }

  // Mark payment as paid (teacher only)
  @Patch(':id/mark-paid')
  @Roles(UserRole.TEACHER)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async markAsPaid(@Param('id') id: string, @Request() req) {
    return this.paymentsService.markAsPaid(+id, req.user.id);
  }

  // Delete payment (teacher only)
  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    return this.paymentsService.remove(+id, req.user.id);
  }

  // Create monthly payments for group (teacher only)
  @Post('monthly')
  @Roles(UserRole.TEACHER)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async createMonthlyPayments(
    @Body() createMonthlyPaymentsDto: CreateMonthlyPaymentsDto,
    @Request() req
  ) {
    return this.paymentsService.createMonthlyPayments(createMonthlyPaymentsDto, req.user.id);
  }

  // Send payment reminders
  @Post('send-reminders')
  @Roles(UserRole.TEACHER, UserRole.STUDENT)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async sendReminders(
    @Body() sendRemindersDto: SendPaymentRemindersDto,
    @Request() req
  ) {
    await this.paymentsService.sendReminders(sendRemindersDto.paymentIds, req.user.id);
    return { message: 'Reminders sent successfully' };
  }
}
