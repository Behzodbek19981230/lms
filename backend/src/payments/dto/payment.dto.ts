import { IsNotEmpty, IsNumber, IsString, IsDateString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { PaymentStatus } from '../payment.entity';
import { MonthlyPaymentStatus } from '../monthly-payment.entity';

export class CreatePaymentDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  studentId: number;

  @IsNumber()
  @IsNotEmpty()
  groupId: number;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}

export class CreateMonthlyPaymentsDto {
  @IsNumber()
  @IsNotEmpty()
  groupId: number;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class SendPaymentRemindersDto {
  @IsArray()
  @IsNotEmpty()
  paymentIds: number[];
}

export class PaymentStatsDto {
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  monthlyRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
}

// ======================
// Monthly billing DTOs
// ======================

export class BillingLedgerQueryDto {
  @IsOptional()
  @IsString()
  // Format: YYYY-MM
  month?: string;
}

export class UpdateStudentBillingProfileDto {
  @IsOptional()
  @IsDateString()
  joinDate?: string;

  @IsOptional()
  @IsDateString()
  leaveDate?: string;

  @IsOptional()
  @IsNumber()
  monthlyAmount?: number;

  @IsOptional()
  @IsNumber()
  dueDay?: number;
}

export class CollectMonthlyPaymentDto {
  @IsNumber()
  @IsNotEmpty()
  studentId: number;

  @IsOptional()
  @IsString()
  // Format: YYYY-MM (defaults to current month)
  month?: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  // Optional override when creating missing monthly row
  amountDueOverride?: number;
}

export class UpdateMonthlyPaymentDto {
  @IsOptional()
  @IsNumber()
  amountDue?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(MonthlyPaymentStatus)
  status?: MonthlyPaymentStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class PreviewStudentSettlementDto {
  @IsNumber()
  @IsNotEmpty()
  studentId: number;

  @IsDateString()
  @IsNotEmpty()
  leaveDate: string;
}

export class CloseStudentSettlementDto {
  @IsNumber()
  @IsNotEmpty()
  studentId: number;

  @IsDateString()
  @IsNotEmpty()
  leaveDate: string;
}
