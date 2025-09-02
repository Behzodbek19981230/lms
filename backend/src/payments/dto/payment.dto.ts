import { IsNotEmpty, IsNumber, IsString, IsDateString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { PaymentStatus } from '../payment.entity';

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
