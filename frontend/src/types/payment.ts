export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export enum PaymentType {
  MONTHLY_FEE = 'monthly_fee',
  REGISTRATION_FEE = 'registration_fee',
  EXAM_FEE = 'exam_fee',
  MATERIAL_FEE = 'material_fee',
  OTHER = 'other'
}

export interface Payment {
  id: number;
  student: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  teacher: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  group: {
    id: number;
    name: string;
    center?: {
      id: number;
      name: string;
    };
  };
  amount: number;
  currency: string;
  type: PaymentType;
  status: PaymentStatus;
  description?: string;
  dueDate: string;
  paidDate?: string;
  reminderSentAt?: string;
  reminderCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentDto {
  studentId: number;
  teacherId: number;
  groupId: number;
  amount: number;
  currency?: string;
  type: PaymentType;
  description?: string;
  dueDate: string;
}

export interface UpdatePaymentDto {
  amount?: number;
  currency?: string;
  type?: PaymentType;
  description?: string;
  dueDate?: string;
  status?: PaymentStatus;
}

export interface MarkPaymentPaidDto {
  paidDate?: string;
  notes?: string;
}

export interface PaymentQueryDto {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  type?: PaymentType;
  studentId?: number;
  teacherId?: number;
  groupId?: number;
  centerId?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  sortBy?: 'dueDate' | 'amount' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaymentStats {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  overduePayments: number;
  currentMonthAmount: number;
  previousMonthAmount: number;
  paymentsByType: {
    type: PaymentType;
    amount: number;
    count: number;
  }[];
  paymentsByStatus: {
    status: PaymentStatus;
    amount: number;
    count: number;
  }[];
  monthlyTrend: {
    month: string;
    amount: number;
    count: number;
  }[];
}

export interface StudentPaymentSummary {
  studentId: number;
  studentName: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  lastPaymentDate?: string;
  nextDueDate?: string;
}

export interface PaymentResponse {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardPaymentData {
  recentPayments: Payment[];
  upcomingPayments: Payment[];
  overduePayments: Payment[];
  stats: PaymentStats;
  studentSummaries: StudentPaymentSummary[];
}
