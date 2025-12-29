/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In, Between } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  CreateMonthlyPaymentsDto,
  PaymentStatsDto,
} from './dto/payment.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { TelegramService } from '../telegram/telegram.service';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';
import {
  MessagePriority,
  MessageType,
} from '../telegram/entities/telegram-message-log.entity';
import { StudentBillingProfile } from './billing-profile.entity';
import { MonthlyPayment, MonthlyPaymentStatus } from './monthly-payment.entity';
import { MonthlyPaymentTransaction } from './monthly-payment-transaction.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(StudentBillingProfile)
    private billingProfileRepository: Repository<StudentBillingProfile>,
    @InjectRepository(MonthlyPayment)
    private monthlyPaymentRepository: Repository<MonthlyPayment>,
    @InjectRepository(MonthlyPaymentTransaction)
    private monthlyPaymentTransactionRepository: Repository<MonthlyPaymentTransaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    private notificationsService: NotificationsService,
    private telegramService: TelegramService,
    private telegramNotificationService: TelegramNotificationService,
  ) {}

  private parseMonthOrThrow(month?: string): Date {
    // month format: YYYY-MM
    const m = (month || '').trim();
    if (!m) {
      const now = new Date();
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    }
    const match = /^(\d{4})-(\d{2})$/.exec(m);
    if (!match)
      throw new BadRequestException('month formati noto‘g‘ri (YYYY-MM)');
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(monthIndex) ||
      monthIndex < 0 ||
      monthIndex > 11
    ) {
      throw new BadRequestException('month formati noto‘g‘ri (YYYY-MM)');
    }
    return new Date(Date.UTC(year, monthIndex, 1));
  }

  private clampDayToMonth(
    year: number,
    monthIndex: number,
    day: number,
  ): number {
    const d = Math.max(1, Math.min(31, Math.floor(day)));
    const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    return Math.min(d, lastDay);
  }

  private computeDueDateForMonth(billingMonth: Date, dueDay: number): Date {
    const year = billingMonth.getUTCFullYear();
    const monthIndex = billingMonth.getUTCMonth();
    const dd = this.clampDayToMonth(year, monthIndex, dueDay);
    return new Date(Date.UTC(year, monthIndex, dd));
  }

  private toUtcDateOnly(date: Date | string): Date {
    const d =
      typeof date === 'string' ? new Date(`${date}T00:00:00.000Z`) : date;
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
      throw new BadRequestException('Sana noto‘g‘ri');
    }
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }

  private diffDaysInclusiveUtc(a: Date, b: Date): number {
    const start = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
    const end = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
    if (end < start) return 0;
    return Math.floor((end - start) / 86400000) + 1;
  }

  private monthEndUtc(monthStart: Date): Date {
    return new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
    );
  }

  private monthStartUtc(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  private addMonthsUtc(monthStart: Date, delta: number): Date {
    return new Date(
      Date.UTC(
        monthStart.getUTCFullYear(),
        monthStart.getUTCMonth() + delta,
        1,
      ),
    );
  }

  private roundMoney(n: number): number {
    // keep 2 decimals (DB numeric(10,2))
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  private getActiveCoverageForMonth(params: {
    billingMonth: Date;
    joinDate: Date | string;
    leaveDate?: Date | string | null;
  }): null | {
    activeFrom: Date;
    activeTo: Date;
    activeDays: number;
    daysInMonth: number;
  } {
    const monthStart = params.billingMonth;
    const monthEnd = this.monthEndUtc(monthStart);
    const join = this.toUtcDateOnly(params.joinDate);
    const leave = params.leaveDate
      ? this.toUtcDateOnly(params.leaveDate)
      : null;

    const activeFrom = join > monthStart ? join : monthStart;
    const activeTo = leave && leave < monthEnd ? leave : monthEnd;
    if (activeTo < activeFrom) return null;

    const activeDays = this.diffDaysInclusiveUtc(activeFrom, activeTo);
    const daysInMonth = monthEnd.getUTCDate();
    if (activeDays <= 0) return null;
    return { activeFrom, activeTo, activeDays, daysInMonth };
  }

  private computeProratedAmountDue(params: {
    billingMonth: Date;
    monthlyAmount: number;
    joinDate: Date | string;
    leaveDate?: Date | string | null;
  }): number {
    const cov = this.getActiveCoverageForMonth({
      billingMonth: params.billingMonth,
      joinDate: params.joinDate,
      leaveDate: params.leaveDate,
    });
    if (!cov) return 0;
    return this.roundMoney(
      (params.monthlyAmount * cov.activeDays) / cov.daysInMonth,
    );
  }

  private async ensureBillingProfile(
    student: User,
  ): Promise<StudentBillingProfile> {
    const existing = await this.billingProfileRepository.findOne({
      where: { studentId: student.id },
    });
    if (existing) return existing;

    const createdAt = (student as any).createdAt
      ? new Date((student as any).createdAt)
      : new Date();
    const joinDate = new Date(
      Date.UTC(
        createdAt.getUTCFullYear(),
        createdAt.getUTCMonth(),
        createdAt.getUTCDate(),
      ),
    );
    const dueDay = joinDate.getUTCDate();
    const profile = this.billingProfileRepository.create({
      studentId: student.id,
      joinDate,
      leaveDate: null,
      monthlyAmount: 0,
      dueDay,
    });
    return this.billingProfileRepository.save(profile);
  }

  async getBillingLedger(
    user: User,
    query?: {
      month?: string;
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      debt?: string;
    },
  ) {
    if (!user?.role) throw new BadRequestException('Foydalanuvchi aniqlanmadi');
    const centerId = user.center?.id;
    if (user.role !== UserRole.SUPERADMIN && !centerId) return [];

    const billingMonth = this.parseMonthOrThrow(query?.month);
    const page = Math.max(1, Math.floor(Number(query?.page || 1)));
    const pageSizeRaw = Math.floor(Number(query?.pageSize || 20));
    const pageSize = Math.min(
      200,
      Math.max(5, Number.isFinite(pageSizeRaw) ? pageSizeRaw : 20),
    );
    const search = (query?.search || '').trim().toLowerCase();
    const statusFilter = (query?.status || 'all').trim().toLowerCase(); // all|pending|paid|overdue
    const debtFilter = (query?.debt || 'all').trim().toLowerCase(); // all|withDebt|noDebt

    const qb = this.userRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.center', 'center')
      .leftJoinAndSelect('u.groups', 'g')
      .leftJoinAndSelect('g.subject', 'subject')
      .where('u.role = :role', { role: UserRole.STUDENT })
      .orderBy('u.createdAt', 'DESC');

    if (user.role !== UserRole.SUPERADMIN) {
      qb.andWhere('center.id = :centerId', { centerId: Number(centerId) });
    }

    if (search) {
      qb.andWhere(
        `(LOWER(u.firstName) LIKE :q OR LOWER(u.lastName) LIKE :q OR LOWER(u.username) LIKE :q)`,
        { q: `%${search}%` },
      );
    }

    // We paginate AFTER applying computed filters (status/debt). To keep totals correct, we load
    // candidates here (already center+search filtered), then compute + filter in memory.
    const students = await qb.getMany();

    const studentIds = students.map((s) => s.id);
    if (studentIds.length === 0) {
      return { items: [], total: 0, page, pageSize };
    }

    // Ensure profiles exist (lightweight upsert)
    const profiles = await this.billingProfileRepository.find({
      where: { studentId: In(studentIds) } as any,
    });
    const profileByStudentId = new Map<number, StudentBillingProfile>();
    profiles.forEach((p) => profileByStudentId.set(p.studentId, p));

    // Create missing profiles for students not yet in table
    const missing = students.filter((s) => !profileByStudentId.has(s.id));
    for (const s of missing) {
      const p = await this.ensureBillingProfile(s);
      profileByStudentId.set(s.id, p);
    }

    // If profile.monthlyAmount is not set, infer it from the student's primary group (latest created),
    // using the latest legacy payment amount for that group.
    const studentPrimaryGroupId = new Map<number, number>();
    const groupIds: number[] = [];
    for (const s of students) {
      const groups = ((s as any).groups || []) as Array<{
        id: number;
        createdAt?: any;
      }>;
      if (!groups || groups.length === 0) continue;
      const sorted = [...groups].sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      });
      const gid = Number(sorted[0]?.id);
      if (!gid) continue;
      studentPrimaryGroupId.set(s.id, gid);
      groupIds.push(gid);
    }
    const uniqueGroupIds = Array.from(new Set(groupIds));
    const amountByGroupId = new Map<number, number>();
    if (uniqueGroupIds.length > 0) {
      // Postgres: pick latest payment per group
      const rows = await this.paymentRepository
        .createQueryBuilder('p')
        .select('p.groupId', 'groupId')
        .addSelect('p.amount', 'amount')
        .where('p.groupId IN (:...ids)', { ids: uniqueGroupIds })
        .distinctOn(['p.groupId'])
        .orderBy('p.groupId', 'ASC')
        .addOrderBy('p.createdAt', 'DESC')
        .getRawMany();
      for (const r of rows as any[]) {
        const gid = Number(r.groupId);
        const amt = Number(r.amount);
        if (gid && Number.isFinite(amt) && amt > 0)
          amountByGroupId.set(gid, amt);
      }
    }
    const profilesToUpdate: StudentBillingProfile[] = [];
    for (const s of students) {
      const p = profileByStudentId.get(s.id);
      if (!p) continue;
      const currentAmt = Number((p as any).monthlyAmount || 0);
      if (Number.isFinite(currentAmt) && currentAmt > 0) continue;
      const gid = studentPrimaryGroupId.get(s.id);
      if (!gid) continue;
      const inferred = amountByGroupId.get(gid) || 0;
      if (!Number.isFinite(inferred) || inferred <= 0) continue;
      (p as any).monthlyAmount = inferred;
      profilesToUpdate.push(p);
    }
    if (profilesToUpdate.length > 0) {
      await this.billingProfileRepository.save(profilesToUpdate);
    }

    const monthly = await this.monthlyPaymentRepository.find({
      where: { studentId: In(studentIds), billingMonth } as any,
      order: { updatedAt: 'DESC' } as any,
    });
    const monthlyByStudentId = new Map<number, MonthlyPayment>();
    monthly.forEach((m) => monthlyByStudentId.set(m.studentId, m));

    // Auto-create monthly rows for the selected month when possible (batch)
    const toCreate: MonthlyPayment[] = [];
    for (const s of students) {
      const profile = profileByStudentId.get(s.id);
      if (!profile) continue;
      if (monthlyByStudentId.has(s.id)) continue;

      const monthlyAmount = Number(profile.monthlyAmount || 0);
      if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) continue;

      const amountDue = this.computeProratedAmountDue({
        billingMonth,
        monthlyAmount,
        joinDate: profile.joinDate,
        leaveDate: (profile as any).leaveDate || null,
      });
      if (amountDue <= 0) continue;

      const dueDate = this.computeDueDateForMonth(
        billingMonth,
        profile.dueDay || 1,
      );
      toCreate.push(
        this.monthlyPaymentRepository.create({
          studentId: s.id,
          centerId: s.center?.id as number,
          billingMonth,
          dueDate,
          amountDue,
          amountPaid: 0,
          status: MonthlyPaymentStatus.PENDING,
          note: 'Avtomatik yaratildi',
        }),
      );
    }
    if (toCreate.length > 0) {
      const created = await this.monthlyPaymentRepository.save(toCreate);
      created.forEach((mp) => monthlyByStudentId.set(mp.studentId, mp));
    }

    const today = this.toUtcDateOnly(new Date());

    const allItems = students.map((s) => {
      const p = profileByStudentId.get(s.id)!;
      const mp = monthlyByStudentId.get(s.id) || null;

      const amountDue = mp ? Number(mp.amountDue) : 0;
      const amountPaid = mp ? Number(mp.amountPaid) : 0;
      const dueDate = mp?.dueDate
        ? this.toUtcDateOnly(mp.dueDate as any)
        : null;
      const remaining = Math.max(0, amountDue - amountPaid);

      // Status should reflect current dueDate + remaining, not stale DB status.
      // (Important after dueDay edits.)
      let effectiveStatus: MonthlyPaymentStatus | null = mp
        ? (mp.status as any)
        : null;
      if (mp && effectiveStatus !== MonthlyPaymentStatus.CANCELLED) {
        if (remaining <= 0 && amountDue > 0) {
          effectiveStatus = MonthlyPaymentStatus.PAID;
        } else if (dueDate && remaining > 0 && dueDate < today) {
          effectiveStatus = MonthlyPaymentStatus.OVERDUE;
        } else {
          effectiveStatus = MonthlyPaymentStatus.PENDING;
        }
      }

      return {
        student: {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          username: s.username,
        },
        center: s.center ? { id: s.center.id, name: s.center.name } : null,
        profile: {
          joinDate: p.joinDate,
          monthlyAmount: Number(p.monthlyAmount),
          dueDay: p.dueDay,
        },
        month: billingMonth,
        monthlyPayment: mp
          ? {
              id: mp.id,
              billingMonth: mp.billingMonth,
              dueDate: mp.dueDate,
              amountDue: Number(mp.amountDue),
              amountPaid: Number(mp.amountPaid),
              status: effectiveStatus || mp.status,
              paidAt: mp.paidAt,
              lastPaymentAt: mp.lastPaymentAt,
              note: mp.note,
            }
          : null,
      };
    });

    const filtered = allItems.filter((row) => {
      const mp = row.monthlyPayment;
      const amountDue = mp ? Number(mp.amountDue) : 0;
      const amountPaid = mp ? Number(mp.amountPaid) : 0;
      const remaining = Math.max(0, amountDue - amountPaid);
      const st = (mp?.status || 'pending').toString().toLowerCase();

      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (debtFilter === 'withdebt' && remaining <= 0) return false;
      if (debtFilter === 'nodebt' && remaining > 0) return false;
      return true;
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return { items, total, page, pageSize };
  }

  async updateStudentBillingProfile(
    studentId: number,
    dto: { joinDate?: string; monthlyAmount?: number; dueDay?: number },
    user: User,
  ) {
    const student = await this.userRepository.findOne({
      where: { id: studentId, role: UserRole.STUDENT } as any,
      relations: ['center'],
    });
    if (!student) throw new NotFoundException('Student topilmadi');

    if (user.role !== UserRole.SUPERADMIN) {
      const centerId = user.center?.id;
      if (!centerId) throw new ForbiddenException('Markaz biriktirilmagan');
      if (!student.center?.id || student.center.id !== centerId) {
        throw new ForbiddenException("Faqat o'z markazingiz studentlari");
      }
    }

    const profile = await this.ensureBillingProfile(student);
    const prevDueDay = profile.dueDay;

    if (dto.joinDate) {
      const jd = new Date(dto.joinDate);
      if (Number.isNaN(jd.getTime()))
        throw new BadRequestException('joinDate noto‘g‘ri');
      profile.joinDate = new Date(
        Date.UTC(jd.getUTCFullYear(), jd.getUTCMonth(), jd.getUTCDate()),
      );
    }
    if ((dto as any).leaveDate) {
      const ld = new Date((dto as any).leaveDate);
      if (Number.isNaN(ld.getTime()))
        throw new BadRequestException('leaveDate noto‘g‘ri');
      profile.leaveDate = this.toUtcDateOnly(ld);
    }
    if (dto.monthlyAmount !== undefined) {
      const amt = Number(dto.monthlyAmount);
      if (!Number.isFinite(amt) || amt < 0)
        throw new BadRequestException('monthlyAmount noto‘g‘ri');
      profile.monthlyAmount = amt as any;
    }
    if (dto.dueDay !== undefined) {
      const dd = Math.floor(Number(dto.dueDay));
      if (!Number.isFinite(dd) || dd < 1 || dd > 31)
        throw new BadRequestException('dueDay 1..31 bo‘lishi kerak');
      profile.dueDay = dd;
    }

    await this.billingProfileRepository.save(profile);

    // If dueDay changed, recompute dueDate for existing unpaid months
    if (dto.dueDay !== undefined && profile.dueDay !== prevDueDay) {
      const unpaid = await this.monthlyPaymentRepository.find({
        where: {
          studentId,
        } as any,
        order: { billingMonth: 'ASC' } as any,
      });
      const toUpdate: MonthlyPayment[] = [];
      for (const mp of unpaid) {
        if (mp.status === MonthlyPaymentStatus.CANCELLED) continue;
        const due = Number(mp.amountDue);
        const paid = Number(mp.amountPaid);
        if (!(due > 0) || paid >= due) continue; // already settled
        mp.dueDate = this.computeDueDateForMonth(
          this.toUtcDateOnly(mp.billingMonth as any),
          profile.dueDay,
        ) as any;
        toUpdate.push(mp);
      }
      if (toUpdate.length > 0) {
        await this.monthlyPaymentRepository.save(toUpdate);
      }
    }
    return profile;
  }

  async previewStudentSettlement(
    dto: { studentId: number; leaveDate: string },
    user: User,
  ) {
    return this.buildStudentSettlement(dto, user, false);
  }

  async closeStudentSettlement(
    dto: { studentId: number; leaveDate: string },
    user: User,
  ) {
    return this.buildStudentSettlement(dto, user, true);
  }

  private async buildStudentSettlement(
    dto: { studentId: number; leaveDate: string },
    user: User,
    persist: boolean,
  ) {
    const student = await this.userRepository.findOne({
      where: { id: dto.studentId, role: UserRole.STUDENT } as any,
      relations: ['center'],
    });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");
    if (!student.center?.id)
      throw new BadRequestException('Student markazga biriktirilmagan');

    if (user.role !== UserRole.SUPERADMIN) {
      const centerId = user.center?.id;
      if (!centerId) throw new ForbiddenException('Markaz biriktirilmagan');
      if (student.center.id !== centerId)
        throw new ForbiddenException("Faqat o'z markazingiz o'quvchilari");
    }

    const profile = await this.ensureBillingProfile(student);
    const joinDate = this.toUtcDateOnly(new Date(profile.joinDate));
    const leaveDate = this.toUtcDateOnly(new Date(dto.leaveDate));
    if (Number.isNaN(leaveDate.getTime()))
      throw new BadRequestException('leaveDate noto‘g‘ri');
    if (leaveDate < joinDate) {
      throw new BadRequestException(
        "Ketish sanasi qo'shilgan sanadan oldin bo‘lishi mumkin emas",
      );
    }

    const monthlyAmount = Number(profile.monthlyAmount || 0);
    if (!Number.isFinite(monthlyAmount) || monthlyAmount < 0) {
      throw new BadRequestException('monthlyAmount noto‘g‘ri');
    }
    if (monthlyAmount === 0) {
      throw new BadRequestException(
        "Oylik summa 0. Avval o'quvchi uchun oylik summani belgilang",
      );
    }

    const dueDay = Number(profile.dueDay || 1);
    const startMonth = this.monthStartUtc(joinDate);
    const endMonth = this.monthStartUtc(leaveDate);

    const months: Array<{
      billingMonth: Date;
      daysInMonth: number;
      activeDays: number;
      activeFrom: Date;
      activeTo: Date;
      amountDue: number;
      amountPaid: number;
      remaining: number;
      status: MonthlyPaymentStatus;
      monthlyPaymentId?: number;
    }> = [];

    // Load existing monthly payments for student in range
    const existing = await this.monthlyPaymentRepository.find({
      where: {
        studentId: student.id,
        billingMonth: In(this.enumerateMonthStarts(startMonth, endMonth)),
      } as any,
      order: { billingMonth: 'ASC' } as any,
    });
    const existingByMonth = new Map<string, MonthlyPayment>();
    existing.forEach((m) => existingByMonth.set(String(m.billingMonth), m));

    let totalDue = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    // Iterate months
    for (let m = startMonth; m <= endMonth; m = this.addMonthsUtc(m, 1)) {
      const monthEnd = this.monthEndUtc(m);
      const daysInMonth = monthEnd.getUTCDate();
      const activeStart = joinDate > m ? joinDate : m;
      const activeEnd = leaveDate < monthEnd ? leaveDate : monthEnd;
      const activeDays = this.diffDaysInclusiveUtc(activeStart, activeEnd);
      if (activeDays <= 0) continue;

      const amountDue = this.roundMoney(
        (monthlyAmount * activeDays) / daysInMonth,
      );
      const dueDate = this.computeDueDateForMonth(m, dueDay);

      const existingMp = existingByMonth.get(String(m)) || null;
      const amountPaid = existingMp ? Number(existingMp.amountPaid || 0) : 0;
      const remaining = this.roundMoney(Math.max(0, amountDue - amountPaid));
      const status =
        amountPaid >= amountDue && amountDue > 0
          ? MonthlyPaymentStatus.PAID
          : MonthlyPaymentStatus.PENDING;

      months.push({
        billingMonth: m,
        daysInMonth,
        activeDays,
        activeFrom: activeStart,
        activeTo: activeEnd,
        amountDue,
        amountPaid,
        remaining,
        status,
        monthlyPaymentId: existingMp?.id,
      });

      totalDue += amountDue;
      totalPaid += amountPaid;
      totalRemaining += remaining;

      if (persist) {
        if (!existingMp) {
          const created = await this.monthlyPaymentRepository.save(
            this.monthlyPaymentRepository.create({
              studentId: student.id,
              centerId: student.center.id,
              billingMonth: m,
              dueDate,
              amountDue,
              amountPaid: 0,
              status: MonthlyPaymentStatus.PENDING,
              note: `Ketish hisob-kitobi (${dto.leaveDate})`,
            }),
          );
          // Update id in response
          months[months.length - 1].monthlyPaymentId = created.id;
        } else {
          // Update existing month row to match prorated due
          existingMp.dueDate = dueDate;
          existingMp.amountDue = amountDue as any;
          existingMp.status = status;
          if (status === MonthlyPaymentStatus.PAID) {
            existingMp.paidAt = existingMp.paidAt || new Date();
          } else {
            existingMp.paidAt = null;
          }
          if (!existingMp.note) {
            existingMp.note = `Ketish hisob-kitobi (${dto.leaveDate})`;
          }
          await this.monthlyPaymentRepository.save(existingMp);
        }
      }
    }

    if (persist) {
      profile.leaveDate = leaveDate;
      await this.billingProfileRepository.save(profile);
    }

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        username: student.username,
      },
      center: { id: student.center.id, name: student.center.name },
      joinDate: joinDate.toISOString().slice(0, 10),
      leaveDate: leaveDate.toISOString().slice(0, 10),
      monthlyAmount,
      summary: {
        totalDue: this.roundMoney(totalDue),
        totalPaid: this.roundMoney(totalPaid),
        totalRemaining: this.roundMoney(totalRemaining),
      },
      months: months.map((x) => ({
        billingMonth: x.billingMonth.toISOString().slice(0, 10),
        activeFrom: x.activeFrom.toISOString().slice(0, 10),
        activeTo: x.activeTo.toISOString().slice(0, 10),
        activeDays: x.activeDays,
        daysInMonth: x.daysInMonth,
        amountDue: x.amountDue,
        amountPaid: x.amountPaid,
        remaining: x.remaining,
        status: x.status,
        monthlyPaymentId: x.monthlyPaymentId,
      })),
      persisted: persist,
    };
  }

  private enumerateMonthStarts(startMonth: Date, endMonth: Date): Date[] {
    const res: Date[] = [];
    for (let m = startMonth; m <= endMonth; m = this.addMonthsUtc(m, 1)) {
      res.push(m);
    }
    return res;
  }

  async updateMonthlyPayment(
    id: number,
    dto: {
      amountDue?: number;
      dueDate?: string;
      status?: MonthlyPaymentStatus;
      note?: string;
    },
    user: User,
  ) {
    const mp = await this.monthlyPaymentRepository.findOne({
      where: { id },
      relations: ['student', 'center'],
    } as any);
    if (!mp) throw new NotFoundException('Oylik to‘lov topilmadi');

    if (user.role !== UserRole.SUPERADMIN) {
      const centerId = user.center?.id;
      if (!centerId) throw new ForbiddenException('Markaz biriktirilmagan');
      if (mp.centerId !== centerId)
        throw new ForbiddenException("Faqat o'z markazingiz to'lovlari");
    }

    if (
      mp.status === MonthlyPaymentStatus.PAID &&
      (dto.amountDue !== undefined || dto.dueDate || dto.status)
    ) {
      throw new BadRequestException(
        "To'langan oylik to'lovni o'zgartirib bo'lmaydi",
      );
    }

    if (dto.amountDue !== undefined) {
      const amt = Number(dto.amountDue);
      if (!Number.isFinite(amt) || amt < 0)
        throw new BadRequestException('amountDue noto‘g‘ri');
      mp.amountDue = amt as any;
      // Re-evaluate status if needed
      if (Number(mp.amountPaid) >= amt && amt > 0) {
        mp.status = MonthlyPaymentStatus.PAID;
        mp.paidAt = mp.paidAt || new Date();
      }
    }
    if (dto.dueDate) {
      const d = new Date(dto.dueDate);
      if (Number.isNaN(d.getTime()))
        throw new BadRequestException('dueDate noto‘g‘ri');
      mp.dueDate = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      );
    }
    if (dto.status) {
      mp.status = dto.status;
    }
    if (dto.note !== undefined) {
      mp.note = dto.note || null;
    }

    await this.monthlyPaymentRepository.save(mp);
    return mp;
  }

  async collectMonthlyPayment(
    dto: {
      studentId: number;
      month?: string;
      amount: number;
      note?: string;
      amountDueOverride?: number;
    },
    user: User,
  ) {
    const student = await this.userRepository.findOne({
      where: { id: dto.studentId, role: UserRole.STUDENT } as any,
      relations: ['center'],
    });
    if (!student) throw new NotFoundException('Student topilmadi');
    if (!student.center?.id)
      throw new BadRequestException('Student markazga biriktirilmagan');

    if (user.role !== UserRole.SUPERADMIN) {
      const centerId = user.center?.id;
      if (!centerId) throw new ForbiddenException('Markaz biriktirilmagan');
      if (student.center.id !== centerId)
        throw new ForbiddenException("Faqat o'z markazingiz studentlari");
    }

    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0)
      throw new BadRequestException('amount noto‘g‘ri');

    const profile = await this.ensureBillingProfile(student);

    // Disallow collecting payments if monthly amount is not set.
    // (User can still adjust schedule via profile first.)
    const monthlyAmount = Number(profile.monthlyAmount || 0);
    if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
      throw new BadRequestException(
        "Oylik summa kiritilmagan. Avval o'quvchi uchun oylik summani belgilang",
      );
    }
    const billingMonth = this.parseMonthOrThrow(dto.month);

    let mp = await this.monthlyPaymentRepository.findOne({
      where: { studentId: student.id, billingMonth } as any,
    });

    if (!mp) {
      const dueDate = this.computeDueDateForMonth(
        billingMonth,
        profile.dueDay || 1,
      );
      const amountDue =
        dto.amountDueOverride !== undefined
          ? Number(dto.amountDueOverride)
          : this.computeProratedAmountDue({
              billingMonth,
              monthlyAmount,
              joinDate: profile.joinDate,
              leaveDate: (profile as any).leaveDate || null,
            });
      mp = this.monthlyPaymentRepository.create({
        studentId: student.id,
        centerId: student.center.id,
        billingMonth,
        dueDate,
        amountDue: Number.isFinite(amountDue) ? amountDue : 0,
        amountPaid: 0,
        status: MonthlyPaymentStatus.PENDING,
        note: dto.note || null,
      });
      mp = await this.monthlyPaymentRepository.save(mp);
    } else if (dto.note !== undefined) {
      mp.note = dto.note || null;
    }

    // Create transaction (history)
    await this.monthlyPaymentTransactionRepository.save(
      this.monthlyPaymentTransactionRepository.create({
        monthlyPaymentId: mp.id,
        studentId: student.id,
        centerId: student.center.id,
        amount,
        note: dto.note || null,
        paidAt: new Date(),
        createdByUserId: user?.id ?? null,
      }),
    );

    mp.amountPaid = (Number(mp.amountPaid) + amount) as any;
    mp.lastPaymentAt = new Date();

    if (
      Number(mp.amountDue) > 0 &&
      Number(mp.amountPaid) >= Number(mp.amountDue)
    ) {
      mp.status = MonthlyPaymentStatus.PAID;
      mp.paidAt = mp.paidAt || new Date();
    }

    mp = await this.monthlyPaymentRepository.save(mp);

    // Notify student about payment status
    try {
      const remaining = Math.max(
        0,
        Number(mp.amountDue) - Number(mp.amountPaid),
      );
      const monthLabel = mp.billingMonth
        ? `${new Date(mp.billingMonth).toISOString().slice(0, 7)}`
        : '';
      const title =
        mp.status === MonthlyPaymentStatus.PAID
          ? "Oylik to'lov yopildi"
          : "To'lov qabul qilindi";
      const message =
        mp.status === MonthlyPaymentStatus.PAID
          ? `${monthLabel} oyi uchun to'lovingiz yopildi.`
          : `${monthLabel} oyi uchun to'lov qabul qilindi. Qoldiq: ${remaining} so'm`;

      await this.notificationsService.createForUsers(
        [student.id],
        title,
        message,
        'system' as any,
        'medium' as any,
        { monthlyPaymentId: mp.id },
      );
    } catch {
      // ignore notification failure
    }

    // If paid, create next month payment automatically
    if (mp.status === MonthlyPaymentStatus.PAID) {
      const nextMonth = new Date(
        Date.UTC(
          billingMonth.getUTCFullYear(),
          billingMonth.getUTCMonth() + 1,
          1,
        ),
      );
      const existingNext = await this.monthlyPaymentRepository.findOne({
        where: { studentId: student.id, billingMonth: nextMonth } as any,
      });
      if (!existingNext) {
        const nextDue = this.computeDueDateForMonth(
          nextMonth,
          profile.dueDay || 1,
        );
        await this.monthlyPaymentRepository.save(
          this.monthlyPaymentRepository.create({
            studentId: student.id,
            centerId: student.center.id,
            billingMonth: nextMonth,
            dueDate: nextDue,
            amountDue: Number(profile.monthlyAmount),
            amountPaid: 0,
            status: MonthlyPaymentStatus.PENDING,
          }),
        );
      }
    }

    return mp;
  }

  async getMonthlyPaymentHistory(
    monthlyPaymentId: number,
    user: User,
  ): Promise<
    Array<{
      id: number;
      amount: number;
      note: string | null;
      paidAt: Date;
      createdAt: Date;
      createdByUserId: number | null;
    }>
  > {
    const mp = await this.monthlyPaymentRepository.findOne({
      where: { id: monthlyPaymentId } as any,
      relations: ['center'],
    });
    if (!mp) throw new NotFoundException("Oylik to'lov topilmadi");

    // Student can only view own history
    if (user.role === UserRole.STUDENT) {
      if (mp.studentId !== user.id) {
        throw new ForbiddenException(
          "Faqat o'zingizning to'lov tarixingizni ko'ra olasiz",
        );
      }
    } else if (user.role !== UserRole.SUPERADMIN) {
      const centerId = user.center?.id;
      if (!centerId) throw new ForbiddenException('Markaz biriktirilmagan');
      if (mp.centerId !== centerId) {
        throw new ForbiddenException("Faqat o'z markazingiz to'lovlari");
      }
    }

    const txs = await this.monthlyPaymentTransactionRepository.find({
      where: { monthlyPaymentId } as any,
      order: { paidAt: 'DESC' } as any,
      take: 200,
    });

    return txs.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      note: t.note,
      paidAt: t.paidAt,
      createdAt: t.createdAt,
      createdByUserId: t.createdByUserId,
    }));
  }

  async getMyMonthlyBilling(user: User, month?: string) {
    if (user.role !== UserRole.STUDENT) {
      throw new ForbiddenException("Faqat o'quvchi uchun");
    }
    const student = await this.userRepository.findOne({
      where: { id: user.id, role: UserRole.STUDENT } as any,
      relations: ['center'],
    });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");
    if (!student.center?.id)
      throw new BadRequestException('Markaz biriktirilmagan');

    const billingMonth = this.parseMonthOrThrow(month);
    const profile = await this.ensureBillingProfile(student);

    let mp = await this.monthlyPaymentRepository.findOne({
      where: { studentId: student.id, billingMonth } as any,
    });
    if (!mp) {
      const monthlyAmount = Number(profile.monthlyAmount || 0);
      if (Number.isFinite(monthlyAmount) && monthlyAmount > 0) {
        const amountDue = this.computeProratedAmountDue({
          billingMonth,
          monthlyAmount,
          joinDate: profile.joinDate,
          leaveDate: (profile as any).leaveDate || null,
        });
        if (amountDue > 0) {
          const dueDate = this.computeDueDateForMonth(
            billingMonth,
            profile.dueDay || 1,
          );
          mp = await this.monthlyPaymentRepository.save(
            this.monthlyPaymentRepository.create({
              studentId: student.id,
              centerId: student.center.id,
              billingMonth,
              dueDate,
              amountDue,
              amountPaid: 0,
              status: MonthlyPaymentStatus.PENDING,
              note: 'Avtomatik yaratildi',
            }),
          );
        }
      }
    }

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        username: student.username,
      },
      center: { id: student.center.id, name: student.center.name },
      profile: {
        joinDate: profile.joinDate,
        monthlyAmount: Number(profile.monthlyAmount || 0),
        dueDay: profile.dueDay,
      },
      month: billingMonth,
      monthlyPayment: mp
        ? {
            id: mp.id,
            billingMonth: mp.billingMonth,
            dueDate: mp.dueDate,
            amountDue: Number(mp.amountDue),
            amountPaid: Number(mp.amountPaid),
            status:
              mp.status === MonthlyPaymentStatus.CANCELLED
                ? mp.status
                : (() => {
                    const due = Number(mp.amountDue);
                    const paid = Number(mp.amountPaid);
                    const remaining = Math.max(0, due - paid);
                    const dd = mp.dueDate
                      ? this.toUtcDateOnly(mp.dueDate as any)
                      : null;
                    const today = this.toUtcDateOnly(new Date());
                    if (remaining <= 0 && due > 0)
                      return MonthlyPaymentStatus.PAID;
                    if (dd && remaining > 0 && dd < today)
                      return MonthlyPaymentStatus.OVERDUE;
                    return MonthlyPaymentStatus.PENDING;
                  })(),
            lastPaymentAt: mp.lastPaymentAt,
            paidAt: mp.paidAt,
            note: mp.note,
          }
        : null,
    };
  }

  async sendMonthlyBillingDebtReminders(
    user: User,
    dto: { upToMonth?: string; centerId?: number },
  ): Promise<{
    studentsNotified: number;
    channelQueued: boolean;
    totalDebtors: number;
  }> {
    const upTo = this.parseMonthOrThrow(dto?.upToMonth);
    const upToLabel = upTo.toISOString().slice(0, 7);

    let centerId = user.center?.id ? Number(user.center.id) : null;
    if (user.role === UserRole.SUPERADMIN) {
      if (!dto?.centerId) throw new BadRequestException('centerId majburiy');
      centerId = Number(dto.centerId);
    }
    if (!centerId) throw new BadRequestException('Markaz aniqlanmadi');

    // Load center students
    const students = await this.userRepository.find({
      where: { role: UserRole.STUDENT, center: { id: centerId } } as any,
      relations: ['center'],
      order: { createdAt: 'DESC' } as any,
    });
    if (students.length === 0) {
      return { studentsNotified: 0, channelQueued: false, totalDebtors: 0 };
    }

    const studentIds = students.map((s) => s.id);

    // Ensure billing profiles
    const profiles = await this.billingProfileRepository.find({
      where: { studentId: In(studentIds) } as any,
    });
    const profileByStudentId = new Map<number, StudentBillingProfile>();
    profiles.forEach((p) => profileByStudentId.set(p.studentId, p));
    for (const s of students) {
      if (!profileByStudentId.has(s.id)) {
        const p = await this.ensureBillingProfile(s);
        profileByStudentId.set(s.id, p);
      }
    }

    // Ensure monthly payments exist from join month up to upTo month
    const joinMonths = students.map((s) => {
      const p = profileByStudentId.get(s.id)!;
      const jd = this.toUtcDateOnly(p.joinDate as any);
      return this.monthStartUtc(jd);
    });
    const minMonth = joinMonths.reduce((a, b) => (a < b ? a : b), upTo);

    const existing = await this.monthlyPaymentRepository.find({
      where: {
        studentId: In(studentIds),
        billingMonth: Between(minMonth, upTo),
      } as any,
      select: ['id', 'studentId', 'billingMonth'] as any,
    });
    const existingKey = new Set<string>(
      existing.map(
        (m) =>
          `${m.studentId}_${new Date(m.billingMonth as any).toISOString().slice(0, 10)}`,
      ),
    );

    const toCreate: MonthlyPayment[] = [];
    for (const s of students) {
      const profile = profileByStudentId.get(s.id)!;
      const monthlyAmount = Number(profile.monthlyAmount || 0);
      if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) continue;

      const joinMonth = this.monthStartUtc(
        this.toUtcDateOnly(profile.joinDate as any),
      );
      for (let m = joinMonth; m <= upTo; m = this.addMonthsUtc(m, 1)) {
        const key = `${s.id}_${m.toISOString().slice(0, 10)}`;
        if (existingKey.has(key)) continue;

        const amountDue = this.computeProratedAmountDue({
          billingMonth: m,
          monthlyAmount,
          joinDate: profile.joinDate as any,
          leaveDate: (profile as any).leaveDate || null,
        });
        if (amountDue <= 0) continue;

        const dueDate = this.computeDueDateForMonth(m, profile.dueDay || 1);
        toCreate.push(
          this.monthlyPaymentRepository.create({
            studentId: s.id,
            centerId,
            billingMonth: m,
            dueDate,
            amountDue,
            amountPaid: 0,
            status: MonthlyPaymentStatus.PENDING,
            note: 'Avtomatik yaratildi',
          }),
        );
      }
    }
    if (toCreate.length > 0) {
      await this.monthlyPaymentRepository.save(toCreate);
    }

    // Now fetch all debts up to month
    const debts = await this.monthlyPaymentRepository
      .createQueryBuilder('mp')
      .where('mp.centerId = :centerId', { centerId })
      .andWhere('mp.billingMonth <= :upTo', { upTo })
      .andWhere('mp.status != :cancelled', {
        cancelled: MonthlyPaymentStatus.CANCELLED,
      })
      .andWhere('mp.amountPaid < mp.amountDue')
      .orderBy('mp.studentId', 'ASC')
      .addOrderBy('mp.billingMonth', 'ASC')
      .getMany();

    const byStudent = new Map<number, MonthlyPayment[]>();
    for (const mp of debts) {
      const arr = byStudent.get(mp.studentId) || [];
      arr.push(mp);
      byStudent.set(mp.studentId, arr);
    }

    let studentsNotified = 0;
    const channelItems: Array<{
      studentName: string;
      months: Array<{ month: string; remaining: number }>;
      totalRemaining: number;
    }> = [];

    for (const s of students) {
      const arr = byStudent.get(s.id) || [];
      if (arr.length === 0) continue;

      const months = arr.map((mp) => {
        const month = new Date(mp.billingMonth as any)
          .toISOString()
          .slice(0, 7);
        const remaining = Math.max(
          0,
          Number(mp.amountDue) - Number(mp.amountPaid),
        );
        return { month, remaining };
      });
      const totalRemaining = months.reduce(
        (sum, m) => sum + Number(m.remaining || 0),
        0,
      );

      const studentName =
        `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.username;
      channelItems.push({ studentName, months, totalRemaining });

      const lines: string[] = [];
      lines.push(`💰 <b>To‘lov eslatmasi</b>`);
      lines.push(`👤 <b>O‘quvchi:</b> ${studentName}`);
      lines.push(`⚠️ Sizda quyidagi oylar bo‘yicha qarzdorlik bor:`);
      months.slice(0, 12).forEach((m) => {
        lines.push(`- <b>${m.month}</b>: ${Math.round(m.remaining)} so‘m`);
      });
      if (months.length > 12)
        lines.push(`... va yana ${months.length - 12} oy`);
      lines.push('');
      lines.push(
        `Iltimos, to‘lovni amalga oshiring yoki o‘qituvchi bilan bog‘laning.`,
      );
      const message = lines.join('\n');

      // In-app notification
      await this.notificationsService.createForUsers(
        [s.id],
        "To'lov eslatmasi",
        `${upToLabel} holatiga ko‘ra sizda qarzdorlik bor. Oylar: ${months
          .slice(0, 6)
          .map((m) => m.month)
          .join(', ')}${months.length > 6 ? ' ...' : ''}`,
        'system' as any,
        'high' as any,
        { kind: 'monthly_billing_debt', upToMonth: upToLabel, months },
      );

      // Telegram private (queued)
      await this.telegramNotificationService.queuePrivateMessageToUser({
        userId: s.id,
        message,
        metadata: { kind: 'monthly_billing_debt', upToMonth: upToLabel },
        priority: MessagePriority.HIGH,
        type: MessageType.PAYMENT,
      } as any);

      studentsNotified++;
    }

    // Telegram channel summary (queued)
    let channelQueued = false;
    try {
      await this.telegramNotificationService.sendMonthlyBillingDebtSummaryToCenterChannel(
        {
          centerId,
          title: upToLabel,
          items: channelItems.sort(
            (a, b) => b.totalRemaining - a.totalRemaining,
          ),
        },
      );
      channelQueued = channelItems.length > 0;
    } catch {
      // ignore telegram channel failure
    }

    return {
      studentsNotified,
      channelQueued,
      totalDebtors: channelItems.length,
    };
  }

  async getMonthlyBillingDebtSummary(
    user: User,
    query?: {
      upToMonth?: string;
      page?: number;
      pageSize?: number;
      search?: string;
    },
  ): Promise<{
    items: Array<{
      student: {
        id: number;
        firstName: string;
        lastName: string;
        username: string;
      };
      months: Array<{ month: string; remaining: number }>;
      totalRemaining: number;
    }>;
    total: number;
    page: number;
    pageSize: number;
    summary: { totalRemainingAll: number; debtorsCount: number };
  }> {
    const upTo = this.parseMonthOrThrow(query?.upToMonth);
    const page = Math.max(1, Math.floor(Number(query?.page || 1)));
    const pageSizeRaw = Math.floor(Number(query?.pageSize || 20));
    const pageSize = Math.min(
      100,
      Math.max(5, Number.isFinite(pageSizeRaw) ? pageSizeRaw : 20),
    );
    const search = (query?.search || '').trim().toLowerCase();

    const centerId = user.center?.id ? Number(user.center.id) : null;
    if (!centerId) throw new BadRequestException('Markaz aniqlanmadi');

    // Ensure month rows exist up to month (so debts list is accurate), without sending notifications/telegram
    await this.ensureMonthlyPaymentsUpToMonth(centerId, upTo);

    // Base query for debt rows
    const base = this.monthlyPaymentRepository
      .createQueryBuilder('mp')
      .innerJoin('mp.student', 'student')
      .where('mp.centerId = :centerId', { centerId })
      .andWhere('mp.billingMonth <= :upTo', { upTo })
      .andWhere('mp.status != :cancelled', {
        cancelled: MonthlyPaymentStatus.CANCELLED,
      })
      .andWhere('mp.amountPaid < mp.amountDue');

    if (search) {
      base.andWhere(
        `(LOWER(student.firstName) LIKE :q OR LOWER(student.lastName) LIKE :q OR LOWER(student.username) LIKE :q)`,
        { q: `%${search}%` },
      );
    }

    // total debtors
    const totalRaw = await base
      .clone()
      .select('COUNT(DISTINCT mp.studentId)', 'cnt')
      .getRawOne();
    const total = Number(totalRaw?.cnt || 0);

    const sumRaw = await base
      .clone()
      .select('COALESCE(SUM(mp.amountDue - mp.amountPaid), 0)', 'sum')
      .getRawOne();
    const totalRemainingAll = Number(sumRaw?.sum || 0);

    // Get page studentIds ordered by totalRemaining desc
    // IMPORTANT: Use lowercase alias for Postgres (unquoted ORDER BY lowercases identifiers)
    const pageRows = await base
      .clone()
      .select('mp.studentId', 'studentId')
      .addSelect(
        'COALESCE(SUM(mp.amountDue - mp.amountPaid), 0)',
        'totalremaining',
      )
      .groupBy('mp.studentId')
      .orderBy('totalremaining', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    const studentIds = pageRows.map((r) => Number(r.studentId));
    if (studentIds.length === 0) {
      return {
        items: [],
        total,
        page,
        pageSize,
        summary: { totalRemainingAll, debtorsCount: total },
      };
    }

    const students = await this.userRepository.find({
      where: { id: In(studentIds) } as any,
      select: ['id', 'firstName', 'lastName', 'username'] as any,
    });
    const studentById = new Map<number, any>();
    students.forEach((s) => studentById.set(s.id, s));

    const debtRows = await this.monthlyPaymentRepository.find({
      where: {
        centerId,
        studentId: In(studentIds),
        billingMonth: Between(new Date('1970-01-01'), upTo),
      } as any,
      order: { studentId: 'ASC' as any, billingMonth: 'ASC' as any },
    });
    const monthsByStudent = new Map<
      number,
      Array<{ month: string; remaining: number }>
    >();
    for (const mp of debtRows) {
      if (mp.status === MonthlyPaymentStatus.CANCELLED) continue;
      const remaining = Math.max(
        0,
        Number(mp.amountDue) - Number(mp.amountPaid),
      );
      if (remaining <= 0) continue;
      const month = new Date(mp.billingMonth as any).toISOString().slice(0, 7);
      const arr = monthsByStudent.get(mp.studentId) || [];
      arr.push({ month, remaining });
      monthsByStudent.set(mp.studentId, arr);
    }

    const totalByStudentId = new Map<number, number>();
    pageRows.forEach((r) =>
      totalByStudentId.set(Number(r.studentId), Number(r.totalremaining || 0)),
    );

    const items = studentIds.map((id) => ({
      student: {
        id,
        firstName: studentById.get(id)?.firstName || '',
        lastName: studentById.get(id)?.lastName || '',
        username: studentById.get(id)?.username || '',
      },
      months: monthsByStudent.get(id) || [],
      totalRemaining: Number(totalByStudentId.get(id) || 0),
    }));

    return {
      items,
      total,
      page,
      pageSize,
      summary: { totalRemainingAll, debtorsCount: total },
    };
  }

  private async ensureMonthlyPaymentsUpToMonth(
    centerId: number,
    upTo: Date,
  ): Promise<void> {
    const students = await this.userRepository.find({
      where: { role: UserRole.STUDENT, center: { id: centerId } } as any,
      relations: ['center', 'groups'],
    });
    if (students.length === 0) return;
    const studentIds = students.map((s) => s.id);

    const profiles = await this.billingProfileRepository.find({
      where: { studentId: In(studentIds) } as any,
    });
    const profileByStudentId = new Map<number, StudentBillingProfile>();
    profiles.forEach((p) => profileByStudentId.set(p.studentId, p));
    for (const s of students) {
      if (!profileByStudentId.has(s.id)) {
        const p = await this.ensureBillingProfile(s);
        profileByStudentId.set(s.id, p);
      }
    }

    // Infer monthlyAmount from student's primary group using latest legacy payment amount for that group
    const studentPrimaryGroupId = new Map<number, number>();
    const groupIds: number[] = [];
    for (const s of students) {
      const groups = ((s as any).groups || []) as Array<{
        id: number;
        createdAt?: any;
      }>;
      if (!groups || groups.length === 0) continue;
      const sorted = [...groups].sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bd - ad;
      });
      const gid = Number(sorted[0]?.id);
      if (!gid) continue;
      studentPrimaryGroupId.set(s.id, gid);
      groupIds.push(gid);
    }
    const uniqueGroupIds = Array.from(new Set(groupIds));
    const amountByGroupId = new Map<number, number>();
    if (uniqueGroupIds.length > 0) {
      const rows = await this.paymentRepository
        .createQueryBuilder('p')
        .select('p.groupId', 'groupId')
        .addSelect('p.amount', 'amount')
        .where('p.groupId IN (:...ids)', { ids: uniqueGroupIds })
        .distinctOn(['p.groupId'])
        .orderBy('p.groupId', 'ASC')
        .addOrderBy('p.createdAt', 'DESC')
        .getRawMany();
      for (const r of rows as any[]) {
        const gid = Number(r.groupId);
        const amt = Number(r.amount);
        if (gid && Number.isFinite(amt) && amt > 0)
          amountByGroupId.set(gid, amt);
      }
    }
    const profilesToUpdate: StudentBillingProfile[] = [];
    for (const s of students) {
      const p = profileByStudentId.get(s.id);
      if (!p) continue;
      const currentAmt = Number((p as any).monthlyAmount || 0);
      if (Number.isFinite(currentAmt) && currentAmt > 0) continue;
      const gid = studentPrimaryGroupId.get(s.id);
      if (!gid) continue;
      const inferred = amountByGroupId.get(gid) || 0;
      if (!Number.isFinite(inferred) || inferred <= 0) continue;
      (p as any).monthlyAmount = inferred;
      profilesToUpdate.push(p);
    }
    if (profilesToUpdate.length > 0) {
      await this.billingProfileRepository.save(profilesToUpdate);
    }

    const joinMonths = students.map((s) => {
      const p = profileByStudentId.get(s.id)!;
      const jd = this.toUtcDateOnly(p.joinDate as any);
      return this.monthStartUtc(jd);
    });
    const minMonth = joinMonths.reduce((a, b) => (a < b ? a : b), upTo);

    const existing = await this.monthlyPaymentRepository.find({
      where: {
        studentId: In(studentIds),
        billingMonth: Between(minMonth, upTo),
      } as any,
      select: ['id', 'studentId', 'billingMonth'] as any,
    });
    const existingKey = new Set<string>(
      existing.map(
        (m) =>
          `${m.studentId}_${new Date(m.billingMonth as any).toISOString().slice(0, 10)}`,
      ),
    );

    const toCreate: MonthlyPayment[] = [];
    for (const s of students) {
      const profile = profileByStudentId.get(s.id)!;
      const monthlyAmount = Number(profile.monthlyAmount || 0);
      if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) continue;

      const joinMonth = this.monthStartUtc(
        this.toUtcDateOnly(profile.joinDate as any),
      );
      for (let m = joinMonth; m <= upTo; m = this.addMonthsUtc(m, 1)) {
        const key = `${s.id}_${m.toISOString().slice(0, 10)}`;
        if (existingKey.has(key)) continue;

        const amountDue = this.computeProratedAmountDue({
          billingMonth: m,
          monthlyAmount,
          joinDate: profile.joinDate as any,
          leaveDate: (profile as any).leaveDate || null,
        });
        if (amountDue <= 0) continue;

        const dueDate = this.computeDueDateForMonth(m, profile.dueDay || 1);
        toCreate.push(
          this.monthlyPaymentRepository.create({
            studentId: s.id,
            centerId,
            billingMonth: m,
            dueDate,
            amountDue,
            amountPaid: 0,
            status: MonthlyPaymentStatus.PENDING,
            note: 'Avtomatik yaratildi',
          }),
        );
      }
    }
    if (toCreate.length > 0) {
      await this.monthlyPaymentRepository.save(toCreate);
    }
  }

  // Create a new payment
  async create(
    createPaymentDto: CreatePaymentDto,
    teacherId: number,
  ): Promise<Payment> {
    // Verify student exists and is a student
    const student = await this.userRepository.findOne({
      where: { id: createPaymentDto.studentId, role: UserRole.STUDENT },
    });
    if (!student) {
      throw new NotFoundException("O'quvchi topilmadi");
    }

    // Verify group exists and teacher has access to it
    const group = await this.groupRepository.findOne({
      where: { id: createPaymentDto.groupId, teacher: { id: teacherId } },
      relations: ['students'],
    });
    if (!group) {
      throw new NotFoundException("Guruh topilmadi yoki sizda ruxsat yo'q");
    }

    // Ensure student belongs to the selected group
    const inGroup = Array.isArray(group.students)
      ? group.students.some((s) => Number((s as any).id) === Number(student.id))
      : false;
    if (!inGroup) {
      throw new BadRequestException(
        "O'quvchi tanlangan guruhga biriktirilmagan",
      );
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
      "Yangi to'lov",
      `${createPaymentDto.description} - ${createPaymentDto.amount} so'm`,
      'system' as any,
      'medium' as any,
      { paymentId: savedPayment.id },
    );

    return this.findOne(savedPayment.id);
  }

  // Get all payments for teacher
  async findAllByTeacher(teacherId: number): Promise<Payment[]> {
    return this.paymentRepository
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.group', 'g')
      .leftJoinAndSelect('g.subject', 'subject')
      .leftJoinAndSelect('p.student', 'student')
      .leftJoinAndSelect('p.teacher', 'teacher')
      .where('g.teacherId = :teacherId', { teacherId })
      .orderBy('p.createdAt', 'DESC')
      .getMany();
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
      relations: ['student', 'group', 'group.subject', 'teacher'],
      order: { createdAt: 'DESC' },
    });
  }

  async findStudentsWithoutGroup(centerId: number): Promise<
    Array<{
      id: number;
      firstName: string;
      lastName: string;
      username: string;
    }>
  > {
    const rows = await this.userRepository
      .createQueryBuilder('u')
      .leftJoin('u.center', 'center')
      .leftJoin('u.groups', 'g')
      .where('u.role = :role', { role: UserRole.STUDENT })
      .andWhere('center.id = :centerId', { centerId })
      .groupBy('u.id')
      .having('COUNT(g.id) = 0')
      .select(['u.id', 'u.firstName', 'u.lastName', 'u.username'])
      .orderBy('u.createdAt', 'DESC')
      .getMany();

    return rows.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
    }));
  }

  // Get all payments for student
  async findAllByStudent(studentId: number): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { studentId },
      relations: ['teacher', 'group', 'group.subject'],
      order: { createdAt: 'DESC' },
    });
  }

  // Get payments for a specific group
  async findByGroup(groupId: number, teacherId: number): Promise<Payment[]> {
    // Verify teacher has access to group
    const group = await this.groupRepository.findOne({
      where: { id: groupId, teacher: { id: teacherId } },
    });
    if (!group) {
      throw new NotFoundException("Guruh topilmadi yoki sizda ruxsat yo'q");
    }

    return this.paymentRepository.find({
      where: { groupId },
      relations: ['student', 'group', 'group.subject'],
      order: { createdAt: 'DESC' },
    });
  }

  // Get payment by ID
  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['student', 'teacher', 'group', 'group.subject'],
    });

    if (!payment) {
      throw new NotFoundException("To'lov topilmadi");
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
      "To'lov tasdiqlandi",
      `${payment.description} to\'lovingiz tasdiqlandi - ${payment.amount} so'm`,
      'system' as any,
      'medium' as any,
      { paymentId: payment.id },
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
      console.log(`Telegramga to'lov xabarini yuborib bo'lmadi:`, error);
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
  async createMonthlyPayments(
    createDto: CreateMonthlyPaymentsDto,
    teacherId: number,
  ): Promise<Payment[]> {
    const group = await this.groupRepository.findOne({
      where: { id: createDto.groupId, teacher: { id: teacherId } },
      relations: ['students'],
    });

    if (!group) {
      throw new NotFoundException("Guruh topilmadi yoki sizda ruxsat yo'q");
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
        "Yangi oylik to'lov",
        `${createDto.description} - ${createDto.amount} so'm`,
        'system' as any,
        'medium' as any,
        { paymentId: savedPayment.id },
      );
    }

    return payments;
  }

  // Send payment reminders
  async sendReminders(paymentIds: number[], userId: number): Promise<void> {
    const payments = await this.paymentRepository.find({
      where: paymentIds.map((id) => ({ id })),
      relations: ['student', 'teacher', 'group'],
    });

    for (const payment of payments) {
      // Verify user has permission to send reminders for this payment
      if (payment.teacherId !== userId && payment.studentId !== userId) {
        continue;
      }

      // Send notification
      await this.notificationsService.createForUsers(
        [payment.studentId],
        "To'lov eslatmasi",
        `${payment.description} to\'lovingiz muddati yetib keldi - ${payment.amount} so'm`,
        'system' as any,
        'high' as any,
        { paymentId: payment.id },
      );

      // Send Telegram notification if user has telegram connected
      try {
        await this.telegramService.sendPaymentReminder(
          payment.studentId,
          payment,
        );
      } catch (error) {
        console.log(
          `Telegram eslatmasini yuborib bo'lmadi (payment ${payment.id}):`,
          error,
        );
      }
    }
  }

  // Get payment statistics for teacher
  async getTeacherStats(teacherId: number): Promise<PaymentStatsDto> {
    const payments = await this.paymentRepository
      .createQueryBuilder('p')
      .innerJoin('p.group', 'g')
      .where('g.teacherId = :teacherId', { teacherId })
      .getMany();

    const now = new Date();
    const currentMonthStart = new Date(now);
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    const nextMonthStart = new Date(currentMonthStart);
    nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

    const pendingPayments = payments.filter(
      (p) => p.status === PaymentStatus.PENDING,
    );
    const paidPayments = payments.filter(
      (p) => p.status === PaymentStatus.PAID,
    );
    const overduePayments = payments.filter((p) => {
      if (p.status === PaymentStatus.OVERDUE) return true;
      if (p.status !== PaymentStatus.PENDING) return false;
      if (!p.dueDate) return false;
      return new Date(p.dueDate) < now;
    });
    const paidThisMonth = paidPayments.filter((p) => {
      if (!p.paidDate) return false;
      const pd = new Date(p.paidDate);
      return pd >= currentMonthStart && pd < nextMonthStart;
    });

    return {
      totalPending: pendingPayments.length,
      totalPaid: paidPayments.length,
      totalOverdue: overduePayments.length,
      monthlyRevenue: paidThisMonth.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      ),
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

  async getCenterStats(centerId: number): Promise<PaymentStatsDto> {
    const payments = await this.findAllByCenter(centerId);

    const now = new Date();
    const currentMonthStart = new Date(now);
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    const nextMonthStart = new Date(currentMonthStart);
    nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

    const pendingPayments = payments.filter(
      (p) => p.status === PaymentStatus.PENDING,
    );
    const paidPayments = payments.filter(
      (p) => p.status === PaymentStatus.PAID,
    );
    const overduePayments = payments.filter((p) => {
      if (p.status === PaymentStatus.OVERDUE) return true;
      if (p.status !== PaymentStatus.PENDING) return false;
      if (!p.dueDate) return false;
      return new Date(p.dueDate) < now;
    });
    const paidThisMonth = paidPayments.filter((p) => {
      if (!p.paidDate) return false;
      const pd = new Date(p.paidDate);
      return pd >= currentMonthStart && pd < nextMonthStart;
    });

    return {
      totalPending: pendingPayments.length,
      totalPaid: paidPayments.length,
      totalOverdue: overduePayments.length,
      monthlyRevenue: paidThisMonth.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      ),
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
      where: { studentId },
    });

    const now = new Date();
    const pendingPayments = payments.filter(
      (p) => p.status === PaymentStatus.PENDING,
    );
    const paidPayments = payments.filter(
      (p) => p.status === PaymentStatus.PAID,
    );
    const overduePayments = payments.filter((p) => {
      if (p.status === PaymentStatus.OVERDUE) return true;
      if (p.status !== PaymentStatus.PENDING) return false;
      if (!p.dueDate) return false;
      return new Date(p.dueDate) < now;
    });

    return {
      totalPending: pendingPayments.length,
      totalPaid: paidPayments.length,
      totalOverdue: overduePayments.length,
      monthlyRevenue: 0, // Not relevant for students
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

  // Update overdue payments (called by cron job)
  async updateOverduePayments(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.paymentRepository.update(
      {
        status: PaymentStatus.PENDING,
        dueDate: LessThan(today),
      },
      {
        status: PaymentStatus.OVERDUE,
      },
    );
  }

  // Get overdue payments for reminder notifications
  async getOverduePayments(): Promise<Payment[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.paymentRepository.find({
      where: {
        status: PaymentStatus.OVERDUE,
        dueDate: LessThan(today),
      },
      relations: ['student', 'teacher', 'group'],
    });
  }
}
