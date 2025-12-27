export interface Payment {
  id: string;
  amount: number;
  status: PaymentStatus;
  dueDate: Date;
  paidDate?: Date;
  description: string;
  studentId: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  groupId: string;
  group: {
    id: string;
    name: string;
  };
  teacherId: string;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export interface PaymentStats {
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  monthlyRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
}

export interface CreatePaymentDto {
  amount: number;
  dueDate: string;
  description: string;
  studentId: number | string;
  groupId: number | string;
}

export interface UpdatePaymentDto {
  amount?: number;
  dueDate?: string;
  description?: string;
  status?: PaymentStatus;
}

export interface PaymentNotification {
  id: string;
  type: 'payment_due' | 'payment_overdue' | 'payment_reminder';
  message: string;
  paymentId: string;
  studentId: string;
  sentAt: Date;
}

export interface CreateMonthlyPaymentsDto {
  groupId: string;
  amount: number;
  description: string;
}

export interface SendPaymentRemindersDto {
  paymentIds: string[];
}

// ======================
// Monthly billing (NEW)
// ======================

export enum MonthlyPaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export interface StudentBillingProfile {
  joinDate: string; // ISO date
  monthlyAmount: number;
  dueDay: number;
}

export interface MonthlyPayment {
  id: number;
  billingMonth: string; // ISO date (YYYY-MM-01)
  dueDate: string; // ISO date
  amountDue: number;
  amountPaid: number;
  status: MonthlyPaymentStatus;
  lastPaymentAt?: string | null;
  paidAt?: string | null;
  note?: string | null;
}

export interface BillingLedgerItem {
  student: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
  center: { id: number; name: string } | null;
  profile: StudentBillingProfile;
  month: string; // ISO date for selected month start
  monthlyPayment: MonthlyPayment | null;
}

export interface BillingLedgerQuery {
  month?: string; // YYYY-MM
}

export interface UpdateStudentBillingProfileDto {
  joinDate?: string; // YYYY-MM-DD
  monthlyAmount?: number;
  dueDay?: number;
}

export interface CollectMonthlyPaymentDto {
  studentId: number;
  month?: string; // YYYY-MM
  amount: number;
  note?: string;
  amountDueOverride?: number;
}

export interface UpdateMonthlyPaymentDto {
  amountDue?: number;
  dueDate?: string; // YYYY-MM-DD
  status?: MonthlyPaymentStatus;
  note?: string;
}

export interface StudentSettlementPreviewDto {
  studentId: number;
  leaveDate: string; // YYYY-MM-DD
}

export interface StudentSettlementResult {
  student: { id: number; firstName: string; lastName: string; username: string };
  center: { id: number; name: string };
  joinDate: string; // YYYY-MM-DD
  leaveDate: string; // YYYY-MM-DD
  monthlyAmount: number;
  summary: {
    totalDue: number;
    totalPaid: number;
    totalRemaining: number;
  };
  months: Array<{
    billingMonth: string; // YYYY-MM-DD (month start)
    activeFrom: string; // YYYY-MM-DD
    activeTo: string; // YYYY-MM-DD
    activeDays: number;
    daysInMonth: number;
    amountDue: number;
    amountPaid: number;
    remaining: number;
    status: MonthlyPaymentStatus;
    monthlyPaymentId?: number;
  }>;
  persisted: boolean;
}