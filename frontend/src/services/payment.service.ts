import { request } from '@/configs/request';
import {
  Payment,
  CreatePaymentDto,
  UpdatePaymentDto,
  MarkPaymentPaidDto,
  PaymentQueryDto,
  PaymentResponse,
  PaymentStats,
  DashboardPaymentData,
  StudentPaymentSummary
} from '@/types/payment';

const PAYMENT_API_BASE = '/payments';

export class PaymentService {
  // ==================== General CRUD Operations ====================
  
  static async createPayment(data: CreatePaymentDto): Promise<Payment> {
    const response = await request.post(PAYMENT_API_BASE, data);
    return response.data;
  }

  static async getPayments(query?: PaymentQueryDto): Promise<PaymentResponse> {
    const response = await request.get(PAYMENT_API_BASE, { params: query });
    return response.data;
  }

  static async getPaymentById(id: number): Promise<Payment> {
    const response = await request.get(`${PAYMENT_API_BASE}/${id}`);
    return response.data;
  }

  static async updatePayment(id: number, data: UpdatePaymentDto): Promise<Payment> {
    const response = await request.put(`${PAYMENT_API_BASE}/${id}`, data);
    return response.data;
  }

  static async deletePayment(id: number): Promise<void> {
    await request.delete(`${PAYMENT_API_BASE}/${id}`);
  }

  static async markPaymentAsPaid(id: number, data?: MarkPaymentPaidDto): Promise<Payment> {
    const response = await request.patch(`${PAYMENT_API_BASE}/${id}/paid`, data);
    return response.data;
  }

  // ==================== Teacher Endpoints ====================

  static async getTeacherPayments(query?: PaymentQueryDto): Promise<PaymentResponse> {
    const response = await request.get(`${PAYMENT_API_BASE}/teacher`, { params: query });
    return response.data;
  }

  static async getTeacherPaymentStats(): Promise<PaymentStats> {
    const response = await request.get(`${PAYMENT_API_BASE}/teacher/stats`);
    return response.data;
  }

  static async getTeacherDashboardData(): Promise<DashboardPaymentData> {
    const response = await request.get(`${PAYMENT_API_BASE}/teacher/dashboard`);
    return response.data;
  }

  static async getGroupPaymentSummary(groupId: number): Promise<StudentPaymentSummary[]> {
    const response = await request.get(`${PAYMENT_API_BASE}/teacher/group/${groupId}/summary`);
    return response.data;
  }

  static async sendPaymentReminder(paymentId: number): Promise<void> {
    await request.post(`${PAYMENT_API_BASE}/teacher/${paymentId}/remind`);
  }

  static async sendGroupPaymentReminders(groupId: number): Promise<{ sent: number; failed: number }> {
    const response = await request.post(`${PAYMENT_API_BASE}/teacher/group/${groupId}/remind`);
    return response.data;
  }

  // ==================== Student Endpoints ====================

  static async getStudentPayments(query?: PaymentQueryDto): Promise<PaymentResponse> {
    const response = await request.get(`${PAYMENT_API_BASE}/student`, { params: query });
    return response.data;
  }

  static async getStudentPaymentStats(): Promise<PaymentStats> {
    const response = await request.get(`${PAYMENT_API_BASE}/student/stats`);
    return response.data;
  }

  static async getStudentDashboardData(): Promise<DashboardPaymentData> {
    const response = await request.get(`${PAYMENT_API_BASE}/student/dashboard`);
    return response.data;
  }

  // ==================== Admin Endpoints ====================

  static async getAllPayments(query?: PaymentQueryDto): Promise<PaymentResponse> {
    const response = await request.get(`${PAYMENT_API_BASE}/admin`, { params: query });
    return response.data;
  }

  static async getAdminPaymentStats(centerId?: number): Promise<PaymentStats> {
    const params = centerId ? { centerId } : {};
    const response = await request.get(`${PAYMENT_API_BASE}/admin/stats`, { params });
    return response.data;
  }

  static async getAdminDashboardData(centerId?: number): Promise<DashboardPaymentData> {
    const params = centerId ? { centerId } : {};
    const response = await request.get(`${PAYMENT_API_BASE}/admin/dashboard`, { params });
    return response.data;
  }

  static async getCenterPaymentSummary(centerId: number): Promise<StudentPaymentSummary[]> {
    const response = await request.get(`${PAYMENT_API_BASE}/admin/center/${centerId}/summary`);
    return response.data;
  }

  static async sendCenterPaymentReminders(centerId: number): Promise<{ sent: number; failed: number }> {
    const response = await request.post(`${PAYMENT_API_BASE}/admin/center/${centerId}/remind`);
    return response.data;
  }

  // ==================== Utility Methods ====================

  static async getOverduePayments(query?: PaymentQueryDto): Promise<PaymentResponse> {
    const overdueQuery = { ...query, status: 'overdue' as const };
    return this.getPayments(overdueQuery);
  }

  static async getUpcomingPayments(days: number = 7, query?: PaymentQueryDto): Promise<PaymentResponse> {
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + days);
    
    const upcomingQuery = {
      ...query,
      status: 'pending' as const,
      toDate: toDate.toISOString().split('T')[0]
    };
    
    return this.getPayments(upcomingQuery);
  }

  static async getPaymentsByDateRange(
    fromDate: string,
    toDate: string,
    query?: PaymentQueryDto
  ): Promise<PaymentResponse> {
    const dateRangeQuery = { ...query, fromDate, toDate };
    return this.getPayments(dateRangeQuery);
  }

  // ==================== Helper Methods ====================

  static formatCurrency(amount: number, currency: string = 'UZS'): string {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  static getPaymentTypeLabel(type: string): string {
    const labels = {
      monthly_fee: "Oylik to'lov",
      registration_fee: "Ro'yxatdan o'tish",
      exam_fee: "Imtihon to'lovi",
      material_fee: "Materiallar",
      other: "Boshqa"
    };
    return labels[type as keyof typeof labels] || type;
  }

  static getPaymentStatusLabel(status: string): string {
    const labels = {
      pending: "Kutilmoqda",
      paid: "To'langan",
      overdue: "Muddati o'tgan",
      cancelled: "Bekor qilingan"
    };
    return labels[status as keyof typeof labels] || status;
  }

  static getPaymentStatusColor(status: string): string {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      paid: 'text-green-600 bg-green-50 border-green-200',
      overdue: 'text-red-600 bg-red-50 border-red-200',
      cancelled: 'text-gray-600 bg-gray-50 border-gray-200'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  }

  static isPaymentOverdue(dueDate: string): boolean {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  }

  static isPaymentDueSoon(dueDate: string, days: number = 3): boolean {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= days;
  }

  static getDaysUntilDue(dueDate: string): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
