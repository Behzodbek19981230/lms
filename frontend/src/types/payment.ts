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
    email: string;
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
