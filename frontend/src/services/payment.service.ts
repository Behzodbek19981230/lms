import { APIResponse } from '../types/api.types';
import {
  Payment,
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentStats,
  BillingLedgerItem,
  BillingLedgerQuery,
  UpdateStudentBillingProfileDto,
  CollectMonthlyPaymentDto,
  UpdateMonthlyPaymentDto,
  MonthlyPayment,
  StudentSettlementPreviewDto,
  StudentSettlementResult,
} from '../types/payment';
import { request } from '../configs/request';
import { AxiosResponse } from 'axios';
import { getApiErrorMessage } from '../utils/api-error';

class PaymentService {
  private async handleResponse<T>(response: AxiosResponse): Promise<APIResponse<T>> {
    return {
      success: true,
      data: response.data,
      message: response.data.message
    };
  }

  // Get all payments for teacher
  async getTeacherPayments(): Promise<APIResponse<Payment[]>> {
    try {
      const response = await request.get('/payments/teacher');
      return this.handleResponse<Payment[]>(response);
    } catch (error) {
      throw new Error("O'qituvchi to'lovlarini yuklab bo'lmadi");
    }
  }

  // Get payments for specific group
  async getGroupPayments(groupId: string): Promise<APIResponse<Payment[]>> {
    try {
      const response = await request.get(`/payments/group/${groupId}`);
      return this.handleResponse<Payment[]>(response);
    } catch (error) {
      throw new Error("Guruh to'lovlarini yuklab bo'lmadi");
    }
  }

  // Get student payments
  async getStudentPayments(): Promise<APIResponse<Payment[]>> {
    try {
      const response = await request.get('/payments/student');
      return this.handleResponse<Payment[]>(response);
    } catch (error) {
      throw new Error("To'lovlarni yuklab bo'lmadi");
    }
  }

  // Create new payment
  async createPayment(paymentData: CreatePaymentDto): Promise<APIResponse<Payment>> {
    try {
      const response = await request.post('/payments', paymentData);
      return this.handleResponse<Payment>(response);
    } catch (error) {
      throw new Error("To'lov yaratib bo'lmadi");
    }
  }

  // Update payment
  async updatePayment(paymentId: string, paymentData: UpdatePaymentDto): Promise<APIResponse<Payment>> {
    try {
      const response = await request.patch(`/payments/${paymentId}`, paymentData);
      return this.handleResponse<Payment>(response);
    } catch (error) {
      throw new Error("To'lovni yangilab bo'lmadi");
    }
  }

  // Mark payment as paid
  async markPaymentAsPaid(paymentId: string): Promise<APIResponse<Payment>> {
    try {
      const response = await request.patch(`/payments/${paymentId}/mark-paid`);
      return this.handleResponse<Payment>(response);
    } catch (error) {
      throw new Error("To'lovni to'landi deb belgilab bo'lmadi");
    }
  }

  // Delete payment
  async deletePayment(paymentId: string): Promise<APIResponse<void>> {
    try {
      const response = await request.delete(`/payments/${paymentId}`);
      return this.handleResponse<void>(response);
    } catch (error) {
      throw new Error("To'lovni o'chirib bo'lmadi");
    }
  }

  // Get payment statistics
  async getPaymentStats(): Promise<APIResponse<PaymentStats>> {
    try {
      const response = await request.get('/payments/stats');
      return this.handleResponse<PaymentStats>(response);
    } catch (error) {
      throw new Error("To'lov statistikalarini yuklab bo'lmadi");
    }
  }

  // Get payment statistics for teacher
  async getTeacherPaymentStats(): Promise<APIResponse<PaymentStats>> {
    try {
      const response = await request.get('/payments/teacher/stats');
      return this.handleResponse<PaymentStats>(response);
    } catch (error) {
      throw new Error("To'lov statistikalarini yuklab bo'lmadi");
    }
  }

  // Get payment statistics for student
  async getStudentPaymentStats(): Promise<APIResponse<PaymentStats>> {
    try {
      const response = await request.get('/payments/student/stats');
      return this.handleResponse<PaymentStats>(response);
    } catch (error) {
      throw new Error("To'lov statistikalarini yuklab bo'lmadi");
    }
  }

  // Create monthly payments for group
  async createMonthlyPayments(groupId: string, amount: number, description: string): Promise<APIResponse<Payment[]>> {
    try {
      const response = await request.post('/payments/monthly', { groupId, amount, description });
      return this.handleResponse<Payment[]>(response);
    } catch (error) {
      throw new Error("Oylik to'lovlarni yaratib bo'lmadi");
    }
  }

  // Send payment reminders
  async sendPaymentReminders(paymentIds: string[]): Promise<APIResponse<void>> {
    try {
      const response = await request.post('/payments/send-reminders', { paymentIds });
      return this.handleResponse<void>(response);
    } catch (error) {
      throw new Error("To'lov eslatmalarini yuborib bo'lmadi");
    }
  }

  // ======================
  // Monthly billing (NEW)
  // ======================

  async getBillingLedger(query?: BillingLedgerQuery): Promise<APIResponse<BillingLedgerItem[]>> {
    try {
      const response = await request.get('/payments/billing/ledger', { params: query });
      return this.handleResponse<BillingLedgerItem[]>(response);
    } catch (error) {
      throw new Error("Oylik to'lovlar jadvalini yuklab bo'lmadi");
    }
  }

  async updateStudentBillingProfile(
    studentId: number | string,
    data: UpdateStudentBillingProfileDto,
  ): Promise<APIResponse<void>> {
    try {
      const response = await request.patch(`/payments/billing/students/${studentId}`, data);
      return this.handleResponse<void>(response);
    } catch (error) {
      throw new Error("O'quvchi to'lov sozlamalarini yangilab bo'lmadi");
    }
  }

  async collectMonthlyPayment(data: CollectMonthlyPaymentDto): Promise<APIResponse<MonthlyPayment>> {
    try {
      const response = await request.post('/payments/billing/collect', data);
      return this.handleResponse<MonthlyPayment>(response);
    } catch (error) {
      const msg = getApiErrorMessage(error) || "Oylik to'lovni kiritib bo'lmadi";
      throw new Error(msg);
    }
  }

  async updateMonthlyPayment(
    monthlyPaymentId: number | string,
    data: UpdateMonthlyPaymentDto,
  ): Promise<APIResponse<MonthlyPayment>> {
    try {
      const response = await request.patch(`/payments/billing/monthly/${monthlyPaymentId}`, data);
      return this.handleResponse<MonthlyPayment>(response);
    } catch (error) {
      throw new Error("Oylik to'lovni yangilab bo'lmadi");
    }
  }

  async previewStudentSettlement(
    data: StudentSettlementPreviewDto,
  ): Promise<APIResponse<StudentSettlementResult>> {
    try {
      const response = await request.post('/payments/billing/settlement/preview', data);
      return this.handleResponse<StudentSettlementResult>(response);
    } catch (error) {
      const msg = getApiErrorMessage(error) || "O'quvchi ketish hisob-kitobini hisoblab bo'lmadi";
      throw new Error(msg);
    }
  }

  async closeStudentSettlement(
    data: StudentSettlementPreviewDto,
  ): Promise<APIResponse<StudentSettlementResult>> {
    try {
      const response = await request.post('/payments/billing/settlement/close', data);
      return this.handleResponse<StudentSettlementResult>(response);
    } catch (error) {
      const msg = getApiErrorMessage(error) || "O'quvchini ketdi qilib yopib bo'lmadi (hisob-kitob xatosi)";
      throw new Error(msg);
    }
  }
}

export const paymentService = new PaymentService();
