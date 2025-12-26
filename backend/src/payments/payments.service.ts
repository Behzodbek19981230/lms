import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, In } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';
import { CreatePaymentDto, UpdatePaymentDto, CreateMonthlyPaymentsDto, PaymentStatsDto } from './dto/payment.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { TelegramService } from '../telegram/telegram.service';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    private notificationsService: NotificationsService,
    private telegramService: TelegramService,
    private telegramNotificationService: TelegramNotificationService,
  ) {}

  // Create a new payment
  async create(createPaymentDto: CreatePaymentDto, teacherId: number): Promise<Payment> {
    // Verify student exists and is a student
    const student = await this.userRepository.findOne({
      where: { id: createPaymentDto.studentId, role: UserRole.STUDENT }
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Verify group exists and teacher has access to it
    const group = await this.groupRepository.findOne({
      where: { id: createPaymentDto.groupId, teacher: { id: teacherId } }
    });
    if (!group) {
      throw new NotFoundException('Group not found or you do not have access to it');
    }

    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      teacherId,
      dueDate: new Date(createPaymentDto.dueDate),
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // Create notification for student
    await this.notificationsService.createForUsers(
      [createPaymentDto.studentId],
      'Yangi to\'lov',
      `${createPaymentDto.description} - ${createPaymentDto.amount} so'm`,
      'system' as any,
      'medium' as any,
      { paymentId: savedPayment.id }
    );

    return this.findOne(savedPayment.id);
  }

  // Get all payments for teacher
  async findAllByTeacher(teacherId: number): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { teacherId },
      relations: ['student', 'group'],
      order: { createdAt: 'DESC' }
    });
  }

  // Get all payments for a center (admin view)
  async findAllByCenter(centerId: number): Promise<Payment[]> {
    const groups = await this.groupRepository.find({
      where: { center: { id: centerId } },
      select: ['id'],
    });
    const groupIds = groups.map((g) => g.id);
    if (groupIds.length === 0) return [];
    return this.paymentRepository.find({
      where: { groupId: In(groupIds) },
      relations: ['student', 'group', 'teacher'],
      order: { createdAt: 'DESC' },
    });
  }

  // Get all payments for student
  async findAllByStudent(studentId: number): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { studentId },
      relations: ['teacher', 'group'],
      order: { createdAt: 'DESC' }
    });
  }

  // Get payments for a specific group
  async findByGroup(groupId: number, teacherId: number): Promise<Payment[]> {
    // Verify teacher has access to group
    const group = await this.groupRepository.findOne({
      where: { id: groupId, teacher: { id: teacherId } }
    });
    if (!group) {
      throw new NotFoundException('Group not found or you do not have access to it');
    }

    return this.paymentRepository.find({
      where: { groupId },
      relations: ['student', 'group'],
      order: { createdAt: 'DESC' }
    });
  }

  // Get payment by ID
  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['student', 'teacher', 'group']
    });
    
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  // Update payment
  async update(
    id: number,
    updatePaymentDto: UpdatePaymentDto,
    user: User,
  ): Promise<Payment> {
    const payment = await this.findOne(id);

    // Disallow editing paid payments (amount/dueDate/etc)
    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException("To'langan to'lovni o'zgartirib bo'lmaydi");
    }

    // Permission rules:
    // - Teacher: can update only own payment
    // - Admin: can update payments within their center
    // - Superadmin: can update any
    if (user.role === UserRole.TEACHER) {
      if (payment.teacherId !== user.id) {
        throw new BadRequestException('You can only update your own payments');
      }
    } else if (user.role === UserRole.ADMIN) {
      const centerId = user.center?.id;
      if (!centerId) throw new ForbiddenException('Markaz biriktirilmagan');
      const group = await this.groupRepository.findOne({
        where: { id: payment.groupId },
        relations: ['center'],
      });
      if (!group?.center?.id || group.center.id !== centerId) {
        throw new ForbiddenException("Faqat o'z markazingiz to'lovlari");
      }
    } else if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException("Ruxsat yo'q");
    }

    if (updatePaymentDto.dueDate) {
      payment.dueDate = new Date(updatePaymentDto.dueDate);
    }

    Object.assign(payment, updatePaymentDto);
    await this.paymentRepository.save(payment);

    return this.findOne(id);
  }

  // Mark payment as paid
  async markAsPaid(id: number, teacherId: number): Promise<Payment> {
    const payment = await this.findOne(id);

    if (payment.teacherId !== teacherId) {
      throw new BadRequestException('You can only update your own payments');
    }

    payment.status = PaymentStatus.PAID;
    payment.paidDate = new Date();

    await this.paymentRepository.save(payment);

    // Create notification for student
    await this.notificationsService.createForUsers(
      [payment.studentId],
      'To\'lov tasdiqlandi',
      `${payment.description} to\'lovingiz tasdiqlandi - ${payment.amount} so'm`,
      'system' as any,
      'medium' as any,
      { paymentId: payment.id }
    );

    // ✅ Push to Telegram center channel (and group channel if exists)
    try {
      const group = await this.groupRepository.findOne({
        where: { id: payment.groupId },
        relations: ['center'],
      });

      const studentName = payment.student
        ? `${payment.student.firstName} ${payment.student.lastName}`
        : `Student #${payment.studentId}`;

      if (group?.center?.id) {
        await this.telegramNotificationService.notifyPaymentPaid({
          payment,
          centerId: group.center.id,
          groupName: group.name || `Guruh #${payment.groupId}`,
          studentName,
        });
      }
    } catch (error) {
      // Don't fail the request if Telegram fails
      console.log(`Failed to send payment paid notification to Telegram:`, error);
    }

    return this.findOne(id);
  }

  // Delete payment
  async remove(id: number, teacherId: number): Promise<void> {
    const payment = await this.findOne(id);

    if (payment.teacherId !== teacherId) {
      throw new BadRequestException('You can only delete your own payments');
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Cannot delete paid payments');
    }

    await this.paymentRepository.remove(payment);
  }

  // Create monthly payments for all students in a group
  async createMonthlyPayments(createDto: CreateMonthlyPaymentsDto, teacherId: number): Promise<Payment[]> {
    const group = await this.groupRepository.findOne({
      where: { id: createDto.groupId, teacher: { id: teacherId } },
      relations: ['students']
    });

    if (!group) {
      throw new NotFoundException('Group not found or you do not have access to it');
    }

    const payments: Payment[] = [];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1); // First day of next month

    for (const student of group.students) {
      const payment = this.paymentRepository.create({
        amount: createDto.amount,
        description: createDto.description,
        studentId: student.id,
        groupId: createDto.groupId,
        teacherId,
        dueDate: nextMonth,
      });

      const savedPayment = await this.paymentRepository.save(payment);
      payments.push(await this.findOne(savedPayment.id));

      // Create notification for each student
      await this.notificationsService.createForUsers(
        [student.id],
        'Yangi oylik to\'lov',
        `${createDto.description} - ${createDto.amount} so'm`,
        'system' as any,
        'medium' as any,
        { paymentId: savedPayment.id }
      );
    }

    return payments;
  }

  // Send payment reminders
  async sendReminders(paymentIds: number[], userId: number): Promise<void> {
    const payments = await this.paymentRepository.find({
      where: paymentIds.map(id => ({ id })),
      relations: ['student', 'teacher', 'group']
    });

    for (const payment of payments) {
      // Verify user has permission to send reminders for this payment
      if (payment.teacherId !== userId && payment.studentId !== userId) {
        continue;
      }

      // Send notification
      await this.notificationsService.createForUsers(
        [payment.studentId],
        'To\'lov eslatmasi',
        `${payment.description} to\'lovingiz muddati yetib keldi - ${payment.amount} so'm`,
        'system' as any,
        'high' as any,
        { paymentId: payment.id }
      );

      // Send Telegram notification if user has telegram connected
      try {
        await this.telegramService.sendPaymentReminder(payment.studentId, payment);
      } catch (error) {
        console.log(`Failed to send telegram reminder for payment ${payment.id}:`, error);
      }
    }
  }

  // Get payment statistics for teacher
  async getTeacherStats(teacherId: number): Promise<PaymentStatsDto> {
    const payments = await this.paymentRepository.find({
      where: { teacherId }
    });

    const currentMonth = new Date();
    currentMonth.setDate(1);
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const monthlyPayments = payments.filter(p => 
      p.createdAt >= currentMonth && p.createdAt < nextMonth
    );

    const pendingPayments = payments.filter(p => p.status === PaymentStatus.PENDING);
    const paidPayments = payments.filter(p => p.status === PaymentStatus.PAID);
    const overduePayments = payments.filter(p => 
      p.status === PaymentStatus.PENDING && p.dueDate < new Date()
    );

    return {
      totalPending: pendingPayments.length,
      totalPaid: paidPayments.length,
      totalOverdue: overduePayments.length,
      monthlyRevenue: monthlyPayments
        .filter(p => p.status === PaymentStatus.PAID)
        .reduce((sum, p) => sum + Number(p.amount), 0),
      pendingAmount: pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      overdueAmount: overduePayments.reduce((sum, p) => sum + Number(p.amount), 0),
    };
  }

  async getCenterStats(centerId: number): Promise<PaymentStatsDto> {
    const payments = await this.findAllByCenter(centerId);

    const currentMonth = new Date();
    currentMonth.setDate(1);
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const monthlyPayments = payments.filter(
      (p) => p.createdAt >= currentMonth && p.createdAt < nextMonth,
    );

    const pendingPayments = payments.filter(
      (p) => p.status === PaymentStatus.PENDING,
    );
    const paidPayments = payments.filter((p) => p.status === PaymentStatus.PAID);
    const overduePayments = payments.filter(
      (p) => p.status === PaymentStatus.PENDING && p.dueDate < new Date(),
    );

    return {
      totalPending: pendingPayments.length,
      totalPaid: paidPayments.length,
      totalOverdue: overduePayments.length,
      monthlyRevenue: monthlyPayments
        .filter((p) => p.status === PaymentStatus.PAID)
        .reduce((sum, p) => sum + Number(p.amount), 0),
      pendingAmount: pendingPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      ),
      overdueAmount: overduePayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      ),
    };
  }

  // Get payment statistics for student
  async getStudentStats(studentId: number): Promise<PaymentStatsDto> {
    const payments = await this.paymentRepository.find({
      where: { studentId }
    });

    const pendingPayments = payments.filter(p => p.status === PaymentStatus.PENDING);
    const paidPayments = payments.filter(p => p.status === PaymentStatus.PAID);
    const overduePayments = payments.filter(p => 
      p.status === PaymentStatus.PENDING && p.dueDate < new Date()
    );

    return {
      totalPending: pendingPayments.length,
      totalPaid: paidPayments.length,
      totalOverdue: overduePayments.length,
      monthlyRevenue: 0, // Not relevant for students
      pendingAmount: pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      overdueAmount: overduePayments.reduce((sum, p) => sum + Number(p.amount), 0),
    };
  }

  // Update overdue payments (called by cron job)
  async updateOverduePayments(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.paymentRepository.update(
      {
        status: PaymentStatus.PENDING,
        dueDate: LessThan(today)
      },
      {
        status: PaymentStatus.OVERDUE
      }
    );
  }

  // Get overdue payments for reminder notifications
  async getOverduePayments(): Promise<Payment[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.paymentRepository.find({
      where: {
        status: PaymentStatus.OVERDUE,
        dueDate: LessThan(today)
      },
      relations: ['student', 'teacher', 'group']
    });
  }
}
