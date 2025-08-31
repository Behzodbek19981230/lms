import { IsNotEmpty, IsString, IsEnum, IsOptional, IsDateString, IsNumber, IsArray } from 'class-validator';
import { AttendanceStatus } from '../entities/attendance.entity';

export class CreateAttendanceDto {
  @IsNotEmpty()
  @IsNumber()
  studentId: number;

  @IsNotEmpty()
  @IsNumber()
  groupId: number;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  arrivedAt?: string;

  @IsOptional()
  @IsString()
  leftAt?: string;
}

export class BulkAttendanceDto {
  @IsNotEmpty()
  @IsNumber()
  groupId: number;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsArray()
  attendanceRecords: {
    studentId: number;
    status: AttendanceStatus;
    notes?: string;
    arrivedAt?: string;
    leftAt?: string;
  }[];
}

export class AttendanceQueryDto {
  @IsOptional()
  @IsNumber()
  groupId?: number;

  @IsOptional()
  @IsNumber()
  studentId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  period?: 'today' | 'week' | 'month' | 'custom';
}

export class UpdateAttendanceDto {
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  arrivedAt?: string;

  @IsOptional()
  @IsString()
  leftAt?: string;
}