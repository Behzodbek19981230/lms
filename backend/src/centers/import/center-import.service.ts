import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { In } from 'typeorm';
import * as XLSX from 'xlsx';
import * as bcrypt from 'bcryptjs';

import { Center } from '../entities/center.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { Group } from '../../groups/entities/group.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { Payment, PaymentStatus } from '../../payments/payment.entity';
import {
  asNumber,
  asString,
  findSheetName,
  parseExcelDate,
  pick,
  readSheetRows,
} from './center-import.utils';
import type { CenterExcelImportResult, ImportError } from './center-import.types';

@Injectable()
export class CenterImportService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Center) private readonly centerRepo: Repository<Center>,
  ) {}

  async importExcel(centerId: number, fileBuffer: Buffer): Promise<CenterExcelImportResult> {
    const center = await this.centerRepo.findOne({ where: { id: centerId } });
    if (!center) throw new NotFoundException('Markaz topilmadi');
    if ((center as any).isActive === false) {
      throw new BadRequestException('Markaz nofaol. Avval markazni faol qiling');
    }

    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(fileBuffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('Excel faylni o‘qib bo‘lmadi (xlsx/xls bo‘lishi kerak)');
    }

    const groupsSheet = findSheetName(wb, ['Groups', 'Guruhlar', 'Group']);
    const studentsSheet = findSheetName(wb, ['Students', "O'quvchilar", 'Oquvchilar', 'Student']);
    const paymentsSheet = findSheetName(wb, ['Payments', "To'lovlar", 'Tolovlar', 'Payment']);

    const errors: ImportError[] = [];
    const result: CenterExcelImportResult = {
      summary: {
        subjectsCreated: 0,
        groupsCreated: 0,
        groupsUpdated: 0,
        studentsCreated: 0,
        studentsUpdated: 0,
        studentGroupLinksCreated: 0,
        paymentsCreated: 0,
        paymentsSkipped: 0,
      },
      errors,
    };

    // Parse rows
    const groupRows = groupsSheet ? readSheetRows(wb, groupsSheet) : [];
    const studentRows = studentsSheet ? readSheetRows(wb, studentsSheet) : [];
    const paymentRows = paymentsSheet ? readSheetRows(wb, paymentsSheet) : [];

    if (groupRows.length === 0 && studentRows.length === 0 && paymentRows.length === 0) {
      throw new BadRequestException('Excel ichida hech qanday ma’lumot topilmadi (sheet nomlarini tekshiring)');
    }

    // Transaction: all-or-nothing
    return this.dataSource.transaction(async (manager) => {
      const subjectRepo = manager.getRepository(Subject);
      const groupRepo = manager.getRepository(Group);
      const userRepo = manager.getRepository(User);
      const paymentRepo = manager.getRepository(Payment);
      const centerRepo = manager.getRepository(Center);

      const freshCenter = await centerRepo.findOne({ where: { id: centerId } });
      if (!freshCenter) throw new NotFoundException('Markaz topilmadi');

      const dateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

      // --- Subjects cache by name ---
      const subjectCache = new Map<string, Subject>();
      const existingSubjects = await subjectRepo.find({ where: { center: { id: centerId } } as any });
      existingSubjects.forEach((s) => subjectCache.set(s.name.toLowerCase(), s));

      const getOrCreateSubject = async (name: string | undefined) => {
        const n = asString(name);
        if (!n) return null;
        const key = n.toLowerCase();
        const cached = subjectCache.get(key);
        if (cached) return cached;
        const createdSubject = subjectRepo.create({
          name: n,
          description: (null as any),
          center: freshCenter,
        } as Partial<Subject>);
        const savedSubject = await subjectRepo.save(createdSubject);
        subjectCache.set(key, savedSubject);
        result.summary.subjectsCreated += 1;
        return savedSubject;
      };

      // --- Teachers cache by username ---
      const teacherUsernames = new Set<string>();
      groupRows.forEach((r) => {
        const t = asString(pick(r, ['teacherUsername', 'teacher', 'teacher_user', 'teacherusername']));
        if (t) teacherUsernames.add(t);
      });
      const teachers = teacherUsernames.size
        ? await userRepo.find({
            where: {
              username: In(Array.from(teacherUsernames)),
              role: UserRole.TEACHER,
            } as any,
            relations: ['center'],
          })
        : [];
      const teacherByUsername = new Map<string, User>();
      teachers.forEach((t) => teacherByUsername.set(t.username, t));

      // --- Groups upsert by name ---
      const groupByName = new Map<string, Group>();

      for (let i = 0; i < groupRows.length; i++) {
        const row = groupRows[i];
        const rowNo = i + 1;

        const name = asString(pick(row, ['name', 'groupName', 'guruh', 'guruhNomi', 'group']));
        const teacherUsername = asString(pick(row, ['teacherUsername', 'teacher', 'teacherusername']));
        const days = asString(pick(row, ['daysOfWeek', 'days', 'kunlar', 'scheduleDays']));
        const startTime = asString(pick(row, ['startTime', 'start', 'boshlanish', 'start_time']));
        const endTime = asString(pick(row, ['endTime', 'end', 'tugash', 'end_time']));
        const description = asString(pick(row, ['description', 'desc', 'izoh']));
        const subjectName = asString(pick(row, ['subject', 'subjectName', 'fan', 'fanNomi']));

        if (!name) {
          errors.push({ sheet: groupsSheet || 'Groups', row: rowNo, message: 'Group name kerak' });
          continue;
        }
        if (!teacherUsername) {
          errors.push({ sheet: groupsSheet || 'Groups', row: rowNo, message: 'teacherUsername kerak' });
          continue;
        }
        const teacher = teacherByUsername.get(teacherUsername);
        if (!teacher) {
          errors.push({
            sheet: groupsSheet || 'Groups',
            row: rowNo,
            message: `Teacher topilmadi: ${teacherUsername}`,
          });
          continue;
        }
        if (!teacher.center || teacher.center.id !== centerId) {
          errors.push({
            sheet: groupsSheet || 'Groups',
            row: rowNo,
            message: `Teacher markazi mos emas: ${teacherUsername}`,
          });
          continue;
        }
        if (!startTime || !endTime) {
          errors.push({ sheet: groupsSheet || 'Groups', row: rowNo, message: 'startTime/endTime kerak' });
          continue;
        }

        const daysOfWeek = (days || '')
          .split(/[,\s]+/)
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean);

        const subject = await getOrCreateSubject(subjectName);

        // Find existing by name+center
        let group: Group | null = await groupRepo.findOne({
          where: { name, center: { id: centerId } } as any,
          relations: ['students', 'center', 'teacher', 'subject'],
        });
        if (!group) {
          const createdGroup = groupRepo.create({
            name,
            description: (description || null) as any,
            subject: subject || null,
            teacher,
            center: freshCenter,
            students: [],
            daysOfWeek,
            startTime,
            endTime,
          } as Partial<Group>);
          group = await groupRepo.save(createdGroup);
          result.summary.groupsCreated += 1;
        } else {
          group.description = description || group.description;
          group.subject = subject || group.subject;
          group.teacher = teacher;
          group.daysOfWeek = daysOfWeek.length ? daysOfWeek : group.daysOfWeek;
          group.startTime = startTime;
          group.endTime = endTime;
          group = await groupRepo.save(group);
          result.summary.groupsUpdated += 1;
        }
        groupByName.set(name.toLowerCase(), group);
      }

      // --- Students upsert by username ---
      const studentByUsername = new Map<string, User>();

      // preload existing students in this center by usernames present in sheet
      const studentUsernames = studentRows
        .map((r) => asString(pick(r, ['username', 'user', 'login'])))
        .filter(Boolean) as string[];
      if (studentUsernames.length) {
        const existing = await userRepo.find({
          where: { username: In(studentUsernames) } as any,
          relations: ['center'],
        });
        existing.forEach((u) => studentByUsername.set(u.username, u));
      }

      for (let i = 0; i < studentRows.length; i++) {
        const row = studentRows[i];
        const rowNo = i + 1;

        const username = asString(pick(row, ['username', 'user', 'login']));
        const password = asString(pick(row, ['password', 'pass', 'parol']));
        const firstName = asString(pick(row, ['firstName', 'firstname', 'ism']));
        const lastName = asString(pick(row, ['lastName', 'lastname', 'familiya']));
        const phone = asString(pick(row, ['phone', 'telefon', 'tel']));
        const groupName = asString(pick(row, ['groupName', 'group', 'guruh']));

        if (!username) {
          errors.push({ sheet: studentsSheet || 'Students', row: rowNo, message: 'username kerak' });
          continue;
        }
        if (!firstName || !lastName) {
          errors.push({ sheet: studentsSheet || 'Students', row: rowNo, message: 'firstName/lastName kerak' });
          continue;
        }

        let student: User | undefined = studentByUsername.get(username);
        if (!student) {
          const hashed = await bcrypt.hash(password || 'lms1234', 12);
          const createdStudent = userRepo.create({
            username,
            password: hashed,
            firstName,
            lastName,
            phone: (phone || null) as any,
            role: UserRole.STUDENT,
            center: freshCenter,
            isActive: true,
          } as Partial<User>);
          student = await userRepo.save(createdStudent);
          result.summary.studentsCreated += 1;
        } else {
          // Validate role/center
          if (student.role !== UserRole.STUDENT) {
            errors.push({
              sheet: studentsSheet || 'Students',
              row: rowNo,
              message: `Bu username student emas: ${username} (${student.role})`,
            });
            continue;
          }
          if (!student.center || student.center.id !== centerId) {
            errors.push({
              sheet: studentsSheet || 'Students',
              row: rowNo,
              message: `Student boshqa markazda: ${username}`,
            });
            continue;
          }
          student.firstName = firstName;
          student.lastName = lastName;
          student.phone = phone || student.phone;
          if (password) {
            student.password = await bcrypt.hash(password, 12);
          }
          student = await userRepo.save(student);
          result.summary.studentsUpdated += 1;
        }
        studentByUsername.set(username, student as User);

        // Link to group if provided
        if (groupName) {
          const g =
            groupByName.get(groupName.toLowerCase()) ||
            ((await groupRepo.findOne({
                where: { name: groupName, center: { id: centerId } } as any,
                relations: ['students', 'center'],
              })) as Group | null);
          if (!g) {
            errors.push({
              sheet: studentsSheet || 'Students',
              row: rowNo,
              message: `Group topilmadi: ${groupName}`,
            });
            continue;
          }
          g.students = g.students || [];
          if (!g.students.some((s) => s.id === (student as User).id)) {
            g.students.push(student as User);
            await groupRepo.save(g);
            result.summary.studentGroupLinksCreated += 1;
          }
          groupByName.set(g.name.toLowerCase(), g);
        }
      }

      // --- Payments ---
      // preload groups by names if only payments sheet provided
      const paymentGroupNames = paymentRows
        .map((r) => asString(pick(r, ['groupName', 'group', 'guruh'])))
        .filter(Boolean) as string[];
      if (paymentGroupNames.length) {
        const unique = Array.from(new Set(paymentGroupNames.map((n) => n.trim())));
        const groups = await groupRepo.find({
          where: { name: In(unique), center: { id: centerId } } as any,
          relations: ['teacher', 'center'],
        });
        groups.forEach((g) => groupByName.set(g.name.toLowerCase(), g));
      }

      for (let i = 0; i < paymentRows.length; i++) {
        const row = paymentRows[i];
        const rowNo = i + 1;

        const studentUsername = asString(pick(row, ['studentUsername', 'student', 'username', 'oquvchiUsername']));
        const groupName = asString(pick(row, ['groupName', 'group', 'guruh']));
        const amount = asNumber(pick(row, ['amount', 'summa', "to'lov", 'tolov']));
        const dueDateRaw = pick(row, ['dueDate', 'duedate', 'sana', 'toLovSana']);
        const statusRaw = asString(pick(row, ['status', 'paymentStatus']));
        const paidDateRaw = pick(row, ['paidDate', 'paiddate', 'tolanganSana']);
        const description = asString(pick(row, ['description', 'desc', 'izoh'])) || 'Oylik to‘lov';

        if (!studentUsername || !groupName) {
          errors.push({
            sheet: paymentsSheet || 'Payments',
            row: rowNo,
            message: 'studentUsername va groupName kerak',
          });
          continue;
        }
        if (amount === undefined) {
          errors.push({ sheet: paymentsSheet || 'Payments', row: rowNo, message: 'amount kerak' });
          continue;
        }
        const dueDate = parseExcelDate(dueDateRaw);
        if (!dueDate) {
          errors.push({ sheet: paymentsSheet || 'Payments', row: rowNo, message: 'dueDate noto‘g‘ri' });
          continue;
        }
        const due = dateOnly(dueDate);

        const student = studentByUsername.get(studentUsername)
          || (await userRepo.findOne({ where: { username: studentUsername, role: UserRole.STUDENT } as any, relations: ['center'] }));
        if (!student) {
          errors.push({
            sheet: paymentsSheet || 'Payments',
            row: rowNo,
            message: `Student topilmadi: ${studentUsername}`,
          });
          continue;
        }
        if (!student.center || student.center.id !== centerId) {
          errors.push({
            sheet: paymentsSheet || 'Payments',
            row: rowNo,
            message: `Student boshqa markazda: ${studentUsername}`,
          });
          continue;
        }

        const group = groupByName.get(groupName.toLowerCase())
          || (await groupRepo.findOne({ where: { name: groupName, center: { id: centerId } } as any, relations: ['teacher', 'center'] }));
        if (!group) {
          errors.push({
            sheet: paymentsSheet || 'Payments',
            row: rowNo,
            message: `Group topilmadi: ${groupName}`,
          });
          continue;
        }

        const status =
          statusRaw && Object.values(PaymentStatus).includes(statusRaw as any)
            ? (statusRaw as PaymentStatus)
            : PaymentStatus.PENDING;

        const paidDate =
          status === PaymentStatus.PAID ? (parseExcelDate(paidDateRaw) || new Date()) : undefined;

        // de-dup: skip if same (studentId, groupId, dueDate, amount, description) exists
        const existing = await paymentRepo.findOne({
          where: {
            studentId: student.id,
            groupId: group.id,
            dueDate: due as any,
            amount: amount as any,
            description: description as any,
          } as any,
        });
        if (existing) {
          result.summary.paymentsSkipped += 1;
          continue;
        }

        await paymentRepo.save(
          paymentRepo.create({
            amount,
            status,
            dueDate: due,
            paidDate: paidDate || null,
            description,
            studentId: student.id,
            groupId: group.id,
            teacherId: (group.teacher as any)?.id,
          } as any),
        );
        result.summary.paymentsCreated += 1;
      }

      if (errors.length) {
        throw new BadRequestException({
          message: 'Excel import xatoliklari bor. Hech narsa saqlanmadi.',
          errors,
        });
      }

      return result;
    });
  }
}
