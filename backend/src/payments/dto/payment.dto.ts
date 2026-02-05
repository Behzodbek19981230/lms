import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { PaymentStatus, PaymentMethod } from '../payment.entity';
import { MonthlyPaymentStatus } from '../monthly-payment.entity';

export class CreatePaymentDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsNumber()
  studentId?: number;

  @IsNumber()
  @IsNotEmpty()
  groupId: number;

  @IsOptional()
  @IsBoolean()
  // If true, creates payments for all students in the group (single backend request)
  forAllGroupStudents?: boolean;
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
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

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

export class SendMonthlyBillingDebtRemindersDto {
  @IsOptional()
  @IsString()
  // Optional upper bound month (YYYY-MM). If omitted, uses current month.
  upToMonth?: string;

  @IsOptional()
  @IsNumber()
  // Required for superadmin; ignored for teacher/admin (uses own center)
  centerId?: number;
}

export class MonthlyBillingDebtQueryDto {
  @IsOptional()
  @IsString()
  upToMonth?: string; // YYYY-MM

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  pageSize?: number;

  @IsOptional()
  @IsString()
  search?: string;
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

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  pageSize?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  // all | pending | paid | overdue
  status?: string;

  @IsOptional()
  @IsNumber()
  // Filter by group ID
  groupId?: number;

  @IsOptional()
  @IsString()
  // all | withDebt | noDebt
  debt?: string;

  @IsOptional()
  @IsString()
  // student | group | joinDate | monthlyAmount | dueDate | due | paid | remain | status
  sortBy?: string;

  @IsOptional()
  @IsString()
  // asc | desc
  sortDir?: string;
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

  @IsNumber()
  @IsNotEmpty()
  groupId: number;

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
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

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
