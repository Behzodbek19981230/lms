import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  CreateMonthlyPaymentsDto,
  SendPaymentRemindersDto,
  SendMonthlyBillingDebtRemindersDto,
  BillingLedgerQueryDto,
  MonthlyBillingDebtQueryDto,
  UpdateStudentBillingProfileDto,
  CollectMonthlyPaymentDto,
  UpdateMonthlyPaymentDto,
  PreviewStudentSettlementDto,
  CloseStudentSettlementDto,
} from './dto/payment.dto';
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

  // ==========================
  // Monthly billing (NEW)
  // ==========================

  @Get('billing/ledger')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async getBillingLedger(
    @Query() query: BillingLedgerQueryDto,
    @Request() req,
  ) {
    return this.paymentsService.getBillingLedger(req.user, query as any);
  }

  @Patch('billing/students/:studentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async updateStudentBillingProfile(
    @Param('studentId') studentId: string,
    @Body() dto: UpdateStudentBillingProfileDto,
    @Request() req,
  ) {
    return this.paymentsService.updateStudentBillingProfile(
      Number(studentId),
      dto,
      req.user,
    );
  }

  @Patch('billing/students/:studentId/groups/:groupId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async updateStudentGroupBillingProfile(
    @Param('studentId') studentId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateStudentBillingProfileDto,
    @Request() req,
  ) {
    return this.paymentsService.updateStudentGroupBillingProfile(
      Number(studentId),
      Number(groupId),
      dto,
      req.user,
    );
  }

  @Post('billing/settlement/preview')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async previewSettlement(
    @Body() dto: PreviewStudentSettlementDto,
    @Request() req,
  ) {
    return this.paymentsService.previewStudentSettlement(dto as any, req.user);
  }

  @Post('billing/settlement/close')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async closeSettlement(
    @Body() dto: CloseStudentSettlementDto,
    @Request() req,
  ) {
    return this.paymentsService.closeStudentSettlement(dto as any, req.user);
  }

  @Post('billing/collect')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async collectMonthlyPayment(
    @Body() dto: CollectMonthlyPaymentDto,
    @Request() req,
  ) {
    return this.paymentsService.collectMonthlyPayment(dto as any, req.user);
  }

  @Post('billing/reminders/debts')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async sendMonthlyDebtReminders(
    @Body() dto: SendMonthlyBillingDebtRemindersDto,
    @Request() req,
  ) {
    return this.paymentsService.sendMonthlyBillingDebtReminders(
      req.user,
      dto as any,
    );
  }

  @Get('billing/debts')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async getMonthlyDebtSummary(
    @Query() query: MonthlyBillingDebtQueryDto,
    @Request() req,
  ) {
    return this.paymentsService.getMonthlyBillingDebtSummary(
      req.user,
      query as any,
    );
  }

  @Get('billing/me')
  @Roles(UserRole.STUDENT)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async getMyMonthlyBilling(
    @Query() query: BillingLedgerQueryDto,
    @Request() req,
  ) {
    return this.paymentsService.getMyMonthlyBilling(req.user, query?.month);
  }

  @Patch('billing/monthly/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async updateMonthlyPayment(
    @Param('id') id: string,
    @Body() dto: UpdateMonthlyPaymentDto,
    @Request() req,
  ) {
    return this.paymentsService.updateMonthlyPayment(
      Number(id),
      dto as any,
      req.user,
    );
  }

  @Get('billing/monthly/:id/history')
  @Roles(
    UserRole.TEACHER,
    UserRole.ADMIN,
    UserRole.SUPERADMIN,
    UserRole.STUDENT,
  )
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async getMonthlyHistory(@Param('id') id: string, @Request() req) {
    return this.paymentsService.getMonthlyPaymentHistory(Number(id), req.user);
  }

  // Create a new payment (admin/superadmin only)
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  //   @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async create(@Body() createPaymentDto: CreatePaymentDto, @Request() req) {
    return this.paymentsService.create(createPaymentDto, req.user.id);
  }

  // Get all payments for teacher
  @Get('teacher')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async findAllByTeacher(@Request() req) {
    if (req.user.role === UserRole.TEACHER) {
      const payments = await this.paymentsService.findAllByTeacher(req.user.id);
      return { payments, studentsWithoutGroup: [] };
    }
    const centerId = req.user?.center?.id as number;
    if (!centerId) return { payments: [], studentsWithoutGroup: [] };
    const [payments, studentsWithoutGroup] = await Promise.all([
      this.paymentsService.findAllByCenter(centerId),
      this.paymentsService.findStudentsWithoutGroup(centerId),
    ]);
    return { payments, studentsWithoutGroup };
  }

  // Get teacher payment statistics
  @Get('teacher/stats')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.REPORTS_PAYMENTS)
  async getTeacherStats(@Request() req) {
    if (req.user.role === UserRole.TEACHER) {
      return this.paymentsService.getTeacherStats(req.user.id);
    }
    const centerId = req.user?.center?.id as number;
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
  getPaymentStats() {
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
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Request() req,
  ) {
    return this.paymentsService.update(+id, updatePaymentDto, req.user);
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
    @Request() req,
  ) {
    return this.paymentsService.createMonthlyPayments(
      createMonthlyPaymentsDto,
      req.user.id,
    );
  }

  // Send payment reminders (admin/superadmin only)
  @Post('send-reminders')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(CenterPermissionKey.PAYMENTS)
  async sendReminders(
    @Body() sendRemindersDto: SendPaymentRemindersDto,
    @Request() req,
  ) {
    await this.paymentsService.sendReminders(
      sendRemindersDto.paymentIds,
      req.user.id,
    );
    return { message: 'Reminders sent successfully' };
  }
}
