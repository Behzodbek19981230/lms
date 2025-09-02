import { APIResponse } from '../types/api.types';
import { Payment, CreatePaymentDto, UpdatePaymentDto, PaymentStats } from '../types/payment';
import { request } from '../configs/request';
import { AxiosResponse } from 'axios';

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
      throw new Error('Failed to fetch teacher payments');
    }
  }

  // Get payments for specific group
  async getGroupPayments(groupId: string): Promise<APIResponse<Payment[]>> {
    try {
      const response = await request.get(`/payments/group/${groupId}`);
      return this.handleResponse<Payment[]>(response);
    } catch (error) {
      throw new Error('Failed to fetch group payments');
    }
  }

  // Get student payments
  async getStudentPayments(): Promise<APIResponse<Payment[]>> {
    try {
      const response = await request.get('/payments/student');
      return this.handleResponse<Payment[]>(response);
    } catch (error) {
      throw new Error('Failed to fetch student payments');
    }
  }

  // Create new payment
  async createPayment(paymentData: CreatePaymentDto): Promise<APIResponse<Payment>> {
    try {
      const response = await request.post('/payments', paymentData);
      return this.handleResponse<Payment>(response);
    } catch (error) {
      throw new Error('Failed to create payment');
    }
  }

  // Update payment
  async updatePayment(paymentId: string, paymentData: UpdatePaymentDto): Promise<APIResponse<Payment>> {
    try {
      const response = await request.patch(`/payments/${paymentId}`, paymentData);
      return this.handleResponse<Payment>(response);
    } catch (error) {
      throw new Error('Failed to update payment');
    }
  }

  // Mark payment as paid
  async markPaymentAsPaid(paymentId: string): Promise<APIResponse<Payment>> {
    try {
      const response = await request.patch(`/payments/${paymentId}/mark-paid`);
      return this.handleResponse<Payment>(response);
    } catch (error) {
      throw new Error('Failed to mark payment as paid');
    }
  }

  // Delete payment
  async deletePayment(paymentId: string): Promise<APIResponse<void>> {
    try {
      const response = await request.delete(`/payments/${paymentId}`);
      return this.handleResponse<void>(response);
    } catch (error) {
      throw new Error('Failed to delete payment');
    }
  }

  // Get payment statistics
  async getPaymentStats(): Promise<APIResponse<PaymentStats>> {
    try {
      const response = await request.get('/payments/stats');
      return this.handleResponse<PaymentStats>(response);
    } catch (error) {
      throw new Error('Failed to fetch payment statistics');
    }
  }

  // Get payment statistics for teacher
  async getTeacherPaymentStats(): Promise<APIResponse<PaymentStats>> {
    try {
      const response = await request.get('/payments/teacher/stats');
      return this.handleResponse<PaymentStats>(response);
    } catch (error) {
      throw new Error('Failed to fetch teacher payment statistics');
    }
  }

  // Get payment statistics for student
  async getStudentPaymentStats(): Promise<APIResponse<PaymentStats>> {
    try {
      const response = await request.get('/payments/student/stats');
      return this.handleResponse<PaymentStats>(response);
    } catch (error) {
      throw new Error('Failed to fetch student payment statistics');
    }
  }

  // Create monthly payments for group
  async createMonthlyPayments(groupId: string, amount: number, description: string): Promise<APIResponse<Payment[]>> {
    try {
      const response = await request.post('/payments/monthly', { groupId, amount, description });
      return this.handleResponse<Payment[]>(response);
    } catch (error) {
      throw new Error('Failed to create monthly payments');
    }
  }

  // Send payment reminders
  async sendPaymentReminders(paymentIds: string[]): Promise<APIResponse<void>> {
    try {
      const response = await request.post('/payments/send-reminders', { paymentIds });
      return this.handleResponse<void>(response);
    } catch (error) {
      throw new Error('Failed to send payment reminders');
    }
  }
}

export const paymentService = new PaymentService();
