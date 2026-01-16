/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Center } from '../centers/entities/center.entity';
import {
  TelegramChat,
  ChatStatus,
  ChatType,
} from '../telegram/entities/telegram-chat.entity';
import { Test } from './entities/test.entity';
import { Question, QuestionType } from '../questions/entities/question.entity';
import { Subject } from '../subjects/entities/subject.entity';
import {
  GeneratedTest,
  GeneratedTestVariant,
} from './entities/generated-test.entity';
import { ExamVariant } from '../exams/entities/exam-variant.entity';
import { Results } from './entities/results.entity';
import { LatexProcessorService } from './latex-processor.service';
import { LogsService } from 'src/logs/logs.service';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';
import * as katex from 'katex';
import { TelegramService } from 'src/telegram/telegram.service';
import {
  MessagePriority,
  MessageType,
} from 'src/telegram/entities/telegram-message-log.entity';
import { TelegramQueueService } from 'src/telegram/telegram-queue.service';
// import { User } from 'src/users/entities/user.entity';

export interface GenerateManualPrintableHtmlOptions {
  testId: number;
  teacherId: number;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  ensureExists?: boolean;
  includeAnswers?: boolean;
  showTitleSheet?: boolean;
}

export interface GenerateTestDto {
  title: string;
  subjectId: number;
  questionCount: number;
  variantCount: number;
  timeLimit: number;
  difficulty: string;
  includeAnswers: boolean;
  showTitleSheet: boolean;
  testId?: number; // Optional: single test
  testIds?: number[]; // Optional: multiple tests
}

export interface TestVariant {
  id: string;
  variantNumber: string;
  uniqueNumber: string;
  questions: Question[];
  createdAt: Date;
}

export interface GenerateGeneratedTestPrintableOptions {
  generatedTestId: number;
  teacherId: number;
  ensureExists?: boolean;
}

@Injectable()
export class TestGeneratorService {
  constructor(
    private moduleRef: ModuleRef,
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
    @InjectRepository(GeneratedTest)
    private generatedTestRepository: Repository<GeneratedTest>,
    @InjectRepository(GeneratedTestVariant)
    private generatedTestVariantRepository: Repository<GeneratedTestVariant>,
    @InjectRepository(ExamVariant)
    private examVariantRepository: Repository<ExamVariant>,
    @InjectRepository(Results)
    private resultsRepository: Repository<Results>,
    private latexProcessor: LatexProcessorService,
    private logService: LogsService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Center)
    private centerRepo: Repository<Center>,
    @InjectRepository(TelegramChat)
    private telegramChatRepo: Repository<TelegramChat>,
  ) {}

  /**
   * List all grading results, optionally filtered by student_id or uniqueNumber
   */
  async listResults(options?: {
    studentId?: number;
    uniqueNumber?: string;
    centerId?: number;
    subjectId?: number;
    q?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const enrich = async (rows: (Results & { user?: User | null })[]) => {
      const uniqueNumbers = Array.from(
        new Set(
          rows
            .map((r) =>
              typeof r.uniqueNumber === 'string' ? r.uniqueNumber : '',
            )
            .filter(Boolean),
        ),
      );

      const subjectByUniqueNumber = new Map<
        string,
        { id: number; name: string } | null
      >();
      if (uniqueNumbers.length > 0) {
        const variants = await this.generatedTestVariantRepository.find({
          where: { uniqueNumber: In(uniqueNumbers) },
          relations: ['generatedTest', 'generatedTest.subject'],
        });

        for (const v of variants) {
          const subject = v?.generatedTest?.subject;
          subjectByUniqueNumber.set(
            v.uniqueNumber,
            subject ? { id: subject.id, name: subject.name } : null,
          );
        }
      }

      return { subjectByUniqueNumber };
    };

    const mapRow = (
      r: Results & {
        center?: { name?: string };
        user?: { firstName?: string; lastName?: string };
      },
      maps?: {
        subjectByUniqueNumber: Map<string, { id: number; name: string } | null>;
      },
    ) => {
      const subject = maps?.subjectByUniqueNumber.get(r.uniqueNumber) ?? null;

      return {
        id: r.id,
        student_id: r.student_id,
        student_name: r.user
          ? `${r.user.firstName ?? ''} ${r.user.lastName ?? ''}`.trim()
          : undefined,
        center_id: r.center_id,
        center_name: r.center?.name ?? undefined,
        uniqueNumber: r.uniqueNumber,
        total: r.total,
        correctCount: r.correctCount,
        wrongCount: r.wrongCount,
        blankCount: r.blankCount,
        perQuestion: r.perQuestion,
        createdAt: r.createdAt,
        subject,
      };
    };

    const qb = this.resultsRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .leftJoinAndSelect('r.center', 'c');

    if (options?.subjectId !== undefined) {
      qb.leftJoin(
        GeneratedTestVariant,
        'gtv',
        'gtv.uniqueNumber = r.uniqueNumber',
      )
        .leftJoin('gtv.generatedTest', 'gt')
        .leftJoin('gt.subject', 's')
        .andWhere('s.id = :subjectId', { subjectId: options.subjectId });
    }

    if (options?.studentId !== undefined) {
      qb.andWhere('r.student_id = :studentId', {
        studentId: options.studentId,
      });
    }
    if (options?.uniqueNumber) {
      qb.andWhere('r.uniqueNumber ILIKE :uniqueNumber', {
        uniqueNumber: `%${options.uniqueNumber}%`,
      });
    }
    if (options?.centerId !== undefined) {
      qb.andWhere('r.center_id = :centerId', { centerId: options.centerId });
    }
    if (options?.q) {
      qb.andWhere('(u.firstName ILIKE :q OR u.lastName ILIKE :q)', {
        q: `%${options.q}%`,
      });
    }
    if (options?.from) {
      qb.andWhere('r.createdAt >= :from', { from: options.from });
    }
    if (options?.to) {
      qb.andWhere('r.createdAt <= :to', { to: options.to });
    }

    qb.orderBy('r.createdAt', 'DESC').addOrderBy('r.id', 'DESC');

    const page = options?.page;
    const limit = options?.limit;

    // Backward compatible: if pagination isn't requested, return an array like before.
    if (!page || !limit) {
      const rows = await qb.getMany();
      const maps = await enrich(rows as any);
      return rows.map((r) => mapRow(r as any, maps));
    }

    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safePage = Math.max(page, 1);
    const [rows, total] = await qb
      .take(safeLimit)
      .skip((safePage - 1) * safeLimit)
      .getManyAndCount();

    const maps = await enrich(rows as any);

    return {
      data: rows.map((r) => mapRow(r as any, maps)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }

  async updateResultCounts(params: {
    centerId: number;
    id: number;
    correctCount?: number;
    wrongCount?: number;
  }) {
    const result = await this.resultsRepository.findOne({
      where: { id: params.id, center_id: params.centerId },
      relations: ['user', 'center'],
    });

    if (!result) {
      throw new NotFoundException('Natija topilmadi');
    }

    const total = Number(result.total) || 0;
    const blank = Number(result.blankCount) || 0;
    const maxNonBlank = Math.max(0, total - blank);

    const toSafeInt = (v: unknown) => {
      if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
      return Math.max(0, Math.trunc(v));
    };

    const hasCorrect = typeof params.correctCount === 'number';
    const hasWrong = typeof params.wrongCount === 'number';
    if (!hasCorrect && !hasWrong) {
      throw new BadRequestException(
        'correctCount yoki wrongCount yuborish kerak',
      );
    }

    let nextCorrect = toSafeInt(params.correctCount);
    let nextWrong = toSafeInt(params.wrongCount);

    if (hasCorrect && hasWrong) {
      if (nextCorrect === undefined || nextWrong === undefined) {
        throw new BadRequestException('Noto‘g‘ri qiymat');
      }
      if (nextCorrect > maxNonBlank || nextWrong > maxNonBlank) {
        throw new BadRequestException(
          'Qiymat savollar sonidan katta bo‘lishi mumkin emas',
        );
      }
      if (nextCorrect + nextWrong !== maxNonBlank) {
        throw new BadRequestException(
          `To‘g‘ri + noto‘g‘ri = ${maxNonBlank} bo‘lishi kerak (bo‘sh=${blank})`,
        );
      }
    } else if (hasCorrect) {
      if (nextCorrect === undefined)
        throw new BadRequestException('Noto‘g‘ri qiymat');
      if (nextCorrect > maxNonBlank) nextCorrect = maxNonBlank;
      nextWrong = maxNonBlank - nextCorrect;
    } else {
      if (nextWrong === undefined)
        throw new BadRequestException('Noto‘g‘ri qiymat');
      if (nextWrong > maxNonBlank) nextWrong = maxNonBlank;
      nextCorrect = maxNonBlank - nextWrong;
    }

    result.correctCount = nextCorrect ?? 0;
    result.wrongCount = nextWrong ?? 0;
    await this.resultsRepository.save(result);

    return {
      id: result.id,
      student_id: result.student_id,
      student_name: result.user
        ? `${result.user.firstName ?? ''} ${result.user.lastName ?? ''}`.trim()
        : undefined,
      center_id: result.center_id,
      center_name: result.center?.name ?? undefined,
      uniqueNumber: result.uniqueNumber,
      total: result.total,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      blankCount: result.blankCount,
      perQuestion: result.perQuestion,
      createdAt: result.createdAt,
    };
  }

  async updateResultManual(params: {
    centerId: number;
    id: number;
    studentId: number;
    total: number;
    correctCount: number;
  }) {
    const result = await this.resultsRepository.findOne({
      where: { id: params.id, center_id: params.centerId },
      relations: ['user', 'center'],
    });

    if (!result) {
      throw new NotFoundException('Natija topilmadi');
    }

    const student = await this.userRepo.findOne({
      where: { id: params.studentId },
      relations: ['center'],
    });
    if (!student) {
      throw new NotFoundException("O'quvchi topilmadi");
    }
    if (student.role !== UserRole.STUDENT) {
      throw new BadRequestException("Tanlangan foydalanuvchi o'quvchi emas");
    }
    if (student.center?.id !== params.centerId) {
      throw new BadRequestException("O'quvchi boshqa markazga tegishli");
    }

    const total = Math.max(0, Math.trunc(Number(params.total) || 0));
    const correctCount = Math.max(
      0,
      Math.trunc(Number(params.correctCount) || 0),
    );
    if (correctCount > total) {
      throw new BadRequestException(
        "To'g'ri javoblar soni jami savoldan katta bo'lmasligi kerak",
      );
    }

    result.student_id = student.id;
    result.total = total;
    result.correctCount = correctCount;
    result.blankCount = 0;
    result.wrongCount = Math.max(0, total - correctCount);

    await this.resultsRepository.save(result);

    // Reuse listResults mapper shape by returning a minimal payload compatible with frontend.
    return {
      id: result.id,
      student_id: result.student_id,
      student_name:
        `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
      center_id: result.center_id,
      center_name: result.center?.name ?? undefined,
      uniqueNumber: result.uniqueNumber,
      total: result.total,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      blankCount: result.blankCount,
      perQuestion: result.perQuestion,
      createdAt: result.createdAt,
    };
  }

  async createOrUpdateResultManualByVariant(params: {
    centerId: number;
    teacherId: number;
    uniqueNumber: string;
    studentId: number;
    total: number;
    correctCount: number;
  }) {
    const uniqueNumber = (params.uniqueNumber || '').trim();
    if (!uniqueNumber) {
      throw new BadRequestException('Variant kodi (uniqueNumber) kerak');
    }

    const variant = await this.generatedTestVariantRepository.findOne({
      where: { uniqueNumber },
      relations: ['generatedTest', 'generatedTest.teacher'],
    });
    if (!variant) {
      throw new NotFoundException('Variant topilmadi');
    }
    if (variant.generatedTest?.teacher?.id !== params.teacherId) {
      throw new ForbiddenException('Bu variant sizga tegishli emas');
    }

    const student = await this.userRepo.findOne({
      where: { id: params.studentId },
      relations: ['center'],
    });
    if (!student) {
      throw new NotFoundException("O'quvchi topilmadi");
    }
    if (student.role !== UserRole.STUDENT) {
      throw new BadRequestException("Tanlangan foydalanuvchi o'quvchi emas");
    }
    if (student.center?.id !== params.centerId) {
      throw new BadRequestException("O'quvchi boshqa markazga tegishli");
    }

    const total = Math.max(0, Math.trunc(Number(params.total) || 0));
    const correctCount = Math.max(
      0,
      Math.trunc(Number(params.correctCount) || 0),
    );
    if (correctCount > total) {
      throw new BadRequestException(
        "To'g'ri javoblar soni jami savoldan katta bo'lmasligi kerak",
      );
    }

    const existing = await this.resultsRepository.findOne({
      where: {
        uniqueNumber,
        student_id: student.id,
        center_id: params.centerId,
      },
      relations: ['center'],
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    const result = existing
      ? existing
      : this.resultsRepository.create({
          student_id: student.id,
          center_id: params.centerId,
          uniqueNumber,
          total,
          correctCount,
          wrongCount: Math.max(0, total - correctCount),
          blankCount: 0,
          perQuestion: [],
        });

    result.student_id = student.id;
    result.center_id = params.centerId;
    result.uniqueNumber = uniqueNumber;
    result.total = total;
    result.correctCount = correctCount;
    result.blankCount = 0;
    result.wrongCount = Math.max(0, total - correctCount);
    result.perQuestion = [];

    await this.resultsRepository.save(result);

    return {
      id: result.id,
      student_id: result.student_id,
      student_name:
        `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
      center_id: result.center_id,
      center_name: result.center?.name ?? undefined,
      uniqueNumber: result.uniqueNumber,
      total: result.total,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      blankCount: result.blankCount,
      perQuestion: result.perQuestion,
      createdAt: result.createdAt,
    };
  }

  private escapeHtml(input: string): string {
    return (input ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private chunkTelegramMessage(params: {
    header: string;
    lines: string[];
    maxLen?: number;
  }): string[] {
    const maxLen = params.maxLen ?? 3500;
    const chunks: string[] = [];
    let current = params.header;

    for (const line of params.lines) {
      const next = current.length + line.length + 1;
      if (next > maxLen && current.trim().length > 0) {
        chunks.push(current.trim());
        current = params.header;
      }
      current += `${line}\n`;
    }
    if (current.trim().length > 0) chunks.push(current.trim());
    return chunks;
  }

  async queueResultsToTelegram(params: {
    centerId: number;
    ids: number[];
  }): Promise<{
    sent: number;
    queuedMessages: number;
    targets: Array<{ chatId: string; subjectId?: number }>;
  }> {
    if (!params?.centerId) {
      throw new BadRequestException('centerId required');
    }

    const ids = Array.from(
      new Set((params.ids || []).filter((x) => Number.isFinite(x))),
    ) as number[];
    if (ids.length === 0) {
      throw new BadRequestException('ids massiv bo‘lishi kerak');
    }
    if (ids.length > 200) {
      throw new BadRequestException(
        'Bir martada maksimum 200 ta natija yuborish mumkin',
      );
    }

    const telegramQueueService = this.moduleRef.get(TelegramQueueService, {
      strict: false,
    });

    const rows = await this.resultsRepository.find({
      where: { id: In(ids), center_id: params.centerId },
      relations: ['user', 'center'],
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    if (rows.length === 0) {
      return { sent: 0, queuedMessages: 0, targets: [] };
    }

    const uniqueNumbers = Array.from(
      new Set(rows.map((r) => r.uniqueNumber).filter(Boolean)),
    );

    const variants = uniqueNumbers.length
      ? await this.generatedTestVariantRepository.find({
          where: { uniqueNumber: In(uniqueNumbers) },
          relations: ['generatedTest', 'generatedTest.subject'],
        })
      : [];

    const subjectByUnique = new Map<
      string,
      { id: number; name?: string } | undefined
    >();
    for (const v of variants) {
      const subject = v.generatedTest?.subject;
      subjectByUnique.set(
        v.uniqueNumber,
        subject?.id ? { id: subject.id, name: subject.name } : undefined,
      );
    }

    const groups = new Map<
      string,
      { subject?: { id: number; name?: string }; rows: Results[] }
    >();

    for (const r of rows) {
      const subject = subjectByUnique.get(r.uniqueNumber);
      const key = subject?.id ? `subject:${subject.id}` : 'center';
      const entry = groups.get(key);
      if (entry) {
        entry.rows.push(r);
      } else {
        groups.set(key, { subject, rows: [r] });
      }
    }

    const targets: Array<{ chatId: string; subjectId?: number }> = [];
    let queuedMessages = 0;

    for (const group of groups.values()) {
      let targetChat: TelegramChat | null = null;

      if (group.subject?.id) {
        targetChat = await this.telegramChatRepo.findOne({
          where: {
            center: { id: params.centerId },
            subject: { id: group.subject.id },
            group: IsNull(),
            type: In([ChatType.CHANNEL, ChatType.GROUP]),
            status: ChatStatus.ACTIVE,
          },
          relations: ['center', 'subject'],
          order: { createdAt: 'ASC' },
        });
      }

      if (!targetChat) {
        targetChat = await this.telegramChatRepo.findOne({
          where: {
            center: { id: params.centerId },
            subject: IsNull(),
            group: IsNull(),
            type: In([ChatType.CHANNEL, ChatType.GROUP]),
            status: ChatStatus.ACTIVE,
          },
          relations: ['center'],
          order: { createdAt: 'ASC' },
        });
      }

      if (!targetChat?.chatId) {
        const suffix = group.subject?.name
          ? ` (Fan: ${group.subject.name})`
          : '';
        throw new BadRequestException(
          `Telegram kanal/guruh biriktirilmagan${suffix}. Telegram bo‘limidan biriktiring.`,
        );
      }

      targets.push({
        chatId: targetChat.chatId,
        subjectId: group.subject?.id,
      });

      const centerName =
        group.rows[0]?.center?.name ?? `centerId=${params.centerId}`;
      const subjectLine = group.subject?.name
        ? `Fan: <b>${this.escapeHtml(group.subject.name)}</b>\n`
        : '';

      const header =
        `📊 <b>Test natijalari</b>\n` +
        `Markaz: <b>${this.escapeHtml(centerName)}</b>\n` +
        subjectLine +
        `Soni: <b>${group.rows.length}</b>\n\n`;

      const lines = group.rows.map((r, idx) => {
        const fullName = r.user
          ? `${r.user.firstName ?? ''} ${r.user.lastName ?? ''}`.trim()
          : '-';
        const nameSafe = this.escapeHtml(fullName || '-');
        const total = Number(r.total) || 0;
        const correct = Number(r.correctCount) || 0;
        const pct = total > 0 ? (correct / total) * 100 : 0;
        return `${idx + 1}) <b>${nameSafe}</b> — <b>${pct.toFixed(
          1,
        )}%</b> (${r.correctCount}/${r.total} ✅ | ❌${r.wrongCount} | ⬜${
          r.blankCount
        }) | V:<code>${this.escapeHtml(r.uniqueNumber)}</code>`;
      });

      const chunks = this.chunkTelegramMessage({ header, lines });
      const logs = await telegramQueueService.queueMessages(
        chunks.map((message) => ({
          chatId: targetChat.chatId,
          message,
          type: MessageType.RESULTS,
          priority: MessagePriority.HIGH,
          parseMode: 'HTML' as const,
          centerId: params.centerId,
          metadata: {
            kind: 'manual_results_send',
            subjectId: group.subject?.id,
            resultIds: group.rows.map((x) => x.id),
          },
        })),
      );

      queuedMessages += logs.length;
    }

    return {
      sent: rows.length,
      queuedMessages,
      targets,
    };
  }

  /**
   * Generate printable HTML files for provided variants and return public URLs
   */
  async generatePrintableHtmlFiles(input: {
    variants: TestVariant[];
    config: GenerateTestDto;
    subjectName: string;
    teacherId: number;
  }): Promise<{
    files: Array<{
      variantNumber: string;
      url: string;
      fileName: string;
    }>;
    title: string;
    combinedUrl?: string;
  }> {
    const title = input.config.title || `${input.subjectName} testi`;
    const timestamp = Date.now();
    const uploadsDir = this.getUploadsDir();
    await fs.mkdir(uploadsDir, { recursive: true });

    const centerName = await this.getCenterNameByTeacherId(input.teacherId);

    const slug = (s: string) =>
      (s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 80);

    const files: Array<{
      variantNumber: string;
      url: string;
      fileName: string;
    }> = [];

    const variantInners: string[] = [];

    for (const variant of input.variants) {
      const inner = this.buildVariantHtml(variant, {
        config: input.config,
        subjectName: input.subjectName,
        centerName,
      });
      variantInners.push(inner);
      const pageTitle = `${title} — Variant ${variant.variantNumber} (#${variant.uniqueNumber})`;
      const html = this.wrapHtmlForBrowser(inner, pageTitle);

      const fileName = `${slug(title)}-variant-${slug(variant.variantNumber)}-${timestamp}.html`;
      const absolutePath = join(uploadsDir, fileName);
      await fs.writeFile(absolutePath, html, 'utf8');
      const url = `/uploads/${fileName}`;

      files.push({
        variantNumber: variant.variantNumber,
        url,
        fileName,
      });

      // Persist printable info and answer key by uniqueNumber
      try {
        const variantEntity = await this.generatedTestVariantRepository.findOne(
          {
            where: { uniqueNumber: variant.uniqueNumber },
            relations: ['generatedTest'],
          },
        );
        if (variantEntity) {
          const answerKey = this.buildAnswerKey(variant.questions);
          variantEntity.printableUrl = url;
          variantEntity.printableFileName = fileName;
          variantEntity.answerKey = answerKey;
          await this.generatedTestVariantRepository.save(variantEntity);
        } else {
          void this.logService.log(
            `Variant not found for uniqueNumber=${variant.uniqueNumber} to persist printable info`,
            'TestGenerator',
          );
        }
      } catch (e) {
        void this.logService.log(
          `Failed to persist printable info for variant ${variant.uniqueNumber}: ${String(e)}`,
          'TestGenerator',
        );
      }
    }

    // Build a combined HTML containing all variants and all answer sheets
    let combinedUrl: string | undefined;
    try {
      const combinedHtml = this.buildCombinedHtml({
        title,
        subjectName: input.subjectName,
        variantInners,
      });
      const combinedFileName = `${slug(title)}-combined-${timestamp}.html`;
      const combinedAbsolutePath = join(uploadsDir, combinedFileName);
      await fs.writeFile(combinedAbsolutePath, combinedHtml, 'utf8');
      combinedUrl = `/uploads/${combinedFileName}`;
    } catch (e) {
      void this.logService.log(
        `Failed to build combined HTML: ${String(e)}`,
        'TestGenerator',
      );
    }

    return { files, title, combinedUrl };
  }

  /**
   * Manual test uchun bitta "aralashgan" variant HTML + javoblar HTML yaratish.
   * Variant HTML generatsiyasi generatePrintableHtmlFiles orqali qilinadi.
   */
  async generatePrintableHtmlForManualTest(
    opts: GenerateManualPrintableHtmlOptions,
  ): Promise<{
    url: string;
    fileName: string;
    answerUrl: string;
    answerFileName: string;
    title: string;
  }> {
    const test = await this.testRepository.findOne({
      where: { id: opts.testId },
      relations: ['subject', 'teacher', 'questions', 'questions.answers'],
    });

    if (!test) throw new NotFoundException('Test topilmadi');
    if (!test.teacher || Number(test.teacher.id) !== Number(opts.teacherId)) {
      throw new BadRequestException('Bu test sizga tegishli emas');
    }

    const title = test.title;
    const subjectName = test.subject?.name ?? 'Test';
    const centerName = await this.getCenterNameByTeacherId(opts.teacherId);

    const uploadsDir = this.getUploadsDir();
    const weeklyDir = join(uploadsDir, 'weekly-tests');
    await fs.mkdir(weeklyDir, { recursive: true });

    const stableFileName = `weekly-test-${test.id}.html`;
    const stableAnswerFileName = `weekly-test-${test.id}-answers.html`;
    const stableAbsolutePath = join(weeklyDir, stableFileName);
    const stableAnswerAbsolutePath = join(weeklyDir, stableAnswerFileName);

    const url = `/uploads/weekly-tests/${stableFileName}`;
    const answerUrl = `/uploads/weekly-tests/${stableAnswerFileName}`;

    // IMPORTANT: default to regenerating so HTML/CSS fixes reflect immediately.
    // Callers that want caching should pass ensureExists=true explicitly.
    const ensureExists = opts.ensureExists ?? false;
    if (
      ensureExists &&
      existsSync(stableAbsolutePath) &&
      existsSync(stableAnswerAbsolutePath)
    ) {
      return {
        url,
        fileName: stableFileName,
        answerUrl,
        answerFileName: stableAnswerFileName,
        title,
      };
    }

    // Prepare questions (+ optional shuffles)
    const sourceQuestions = Array.isArray(test.questions)
      ? [...test.questions]
      : [];
    const orderedQuestions = opts.shuffleQuestions
      ? [...sourceQuestions].sort(() => 0.5 - Math.random())
      : [...sourceQuestions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const preparedQuestions: Question[] = orderedQuestions.map((q) => {
      if (
        opts.shuffleAnswers &&
        q.type === QuestionType.MULTIPLE_CHOICE &&
        Array.isArray(q.answers) &&
        q.answers.length > 1
      ) {
        return {
          ...q,
          answers: [...q.answers].sort(() => 0.5 - Math.random()),
        } as Question;
      }
      return q;
    });

    const uniqueNumber = await this.generateUniqueNumber();
    const variant: TestVariant = {
      id: `manual-${test.id}-${Date.now()}`,
      variantNumber: '1',
      uniqueNumber,
      questions: preparedQuestions,
      createdAt: new Date(),
    };

    // Use existing generator to produce variant HTML (timestamped in root uploads dir)
    const gen = await this.generatePrintableHtmlFiles({
      variants: [variant],
      config: {
        title,
        subjectId: test.subject?.id ?? 0,
        questionCount: preparedQuestions.length,
        variantCount: 1,
        timeLimit: test.duration ?? 60,
        difficulty: 'manual',
        includeAnswers: !!opts.includeAnswers,
        showTitleSheet: !!opts.showTitleSheet,
        testId: test.id,
      },
      subjectName,
      teacherId: opts.teacherId,
    });

    const first = gen.files?.[0];
    if (!first?.fileName) {
      throw new BadRequestException('Printable HTML yaratib bo‘lmadi');
    }

    // Copy generated variant HTML into stable weekly path
    const generatedAbsolutePath = join(uploadsDir, first.fileName);
    const variantHtml = await fs.readFile(generatedAbsolutePath, 'utf8');
    await fs.writeFile(stableAbsolutePath, variantHtml, 'utf8');

    // Write answers HTML into stable weekly path
    const answerKey = this.buildAnswerKey(preparedQuestions);
    const answersHtml = this.buildAnswerKeyHtml({
      title,
      subjectName,
      centerName,
      answerKey,
    });
    await fs.writeFile(stableAnswerAbsolutePath, answersHtml, 'utf8');

    return {
      url,
      fileName: stableFileName,
      answerUrl,
      answerFileName: stableAnswerFileName,
      title,
    };
  }

  private buildAnswerKeyHtml(input: {
    title: string;
    subjectName: string;
    centerName?: string;
    answerKey: { total: number; answers: string[] };
  }): string {
    const rows = (input.answerKey.answers || [])
      .map((a, i) => {
        const n = i + 1;
        return `<tr><td class="n">${n}</td><td class="a">${escapeHtml(a)}</td></tr>`;
      })
      .join('');

    return `<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)} — Javoblar</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #111; font-size: 12px; }
    .title { font-size: 18px; font-weight: 700; margin: 0 0 4px 0; }
    .meta { color: #555; font-size: 12px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; }
    th { background: #f8fafc; text-align: left; }
    .n { width: 60px; font-weight: 700; }
    .a { font-weight: 700; }
  </style>
</head>
<body>
  <h1 class="title">${escapeHtml(input.title)} — Javoblar</h1>
  <div class="meta">${input.centerName ? `O‘quv markazi: ${escapeHtml(input.centerName)} • ` : ''}Fan: ${escapeHtml(input.subjectName || '-')} • Savollar: ${input.answerKey.total}</div>
  <table>
    <thead><tr><th>Savol</th><th>Javob</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
  }

  private async getCenterNameByTeacherId(
    teacherId: number,
  ): Promise<string | undefined> {
    try {
      const teacher = await this.userRepo.findOne({
        where: { id: Number(teacherId) },
        relations: ['center'],
      });
      return teacher?.center?.name ? String(teacher.center.name) : undefined;
    } catch {
      return undefined;
    }
  }

  private getUploadsDir(): string {
    const candidates = [
      join(process.cwd(), 'public', 'uploads'),
      join(__dirname, '..', '..', 'public', 'uploads'),
      join(process.cwd(), 'dist', 'public', 'uploads'),
      join(__dirname, '..', 'public', 'uploads'),
    ];
    const existing = candidates.find((p) => {
      try {
        return existsSync(p);
      } catch {
        return false;
      }
    });
    return existing || candidates[0];
  }

  private getPublicDir(): string {
    return join(__dirname, '..', '..', 'public');
  }

  private buildVariantHtml(
    variant: TestVariant,
    ctx: { config: GenerateTestDto; subjectName: string; centerName?: string },
  ): string {
    const centerLine = ctx.centerName
      ? `<div class="subtitle">O‘quv markazi: ${escapeHtml(ctx.centerName)}</div>`
      : '';
    const header = `
      <div class="header">
        <div class="title">${escapeHtml(
          ctx.config.title || `${ctx.subjectName} testi`,
        )}</div>
        ${centerLine}
        <div class="subtitle">Variant: ${escapeHtml(variant.variantNumber)} — ID: #${escapeHtml(variant.uniqueNumber)}</div>
        <div class="meta">Sana: ${new Date().toLocaleDateString('uz-UZ')}</div>
      </div>`;

    const coverHtml = ctx.config.showTitleSheet
      ? `
        <div class="page cover">
          <div class="cover-inner">
            ${ctx.centerName ? `<div class="cover-center">${escapeHtml(ctx.centerName)}</div>` : ''}
            <div class="cover-title">${escapeHtml(
              ctx.config.title || `${ctx.subjectName} testi`,
            )}</div>
            <div class="cover-subject">Fan: ${escapeHtml(ctx.subjectName)}</div>
            <div class="cover-meta">
              Variant: ${escapeHtml(variant.variantNumber)} • ID: #${escapeHtml(
                variant.uniqueNumber,
              )} • Savollar: ${Number(ctx.config.questionCount || 0)} • Vaqt: ${Number(
                ctx.config.timeLimit || 0,
              )} daqiqa
            </div>

            <div class="cover-fields">
              <div class="field-row"><span class="field-label">Guruh:</span> <span class="field-line"></span></div>
              <div class="field-row"><span class="field-label">Ism:</span> <span class="field-line"></span></div>
              <div class="field-row"><span class="field-label">Familiya:</span> <span class="field-line"></span></div>
            </div>
          </div>
        </div>
      `
      : '';

    const questionsHtml = (variant.questions || [])
      .map((q, idx) => {
        const textProcessed = this.extractImageFromText(q.text || '');
        const renderedQuestionText = this.renderTextWithLatex(
          textProcessed.cleanedText,
        );

        // Prefer image extracted from text; otherwise use imageBase64 on question with normalization
        const fromTextUri = this.normalizeDataUri(
          textProcessed.imageDataUri || '',
        );
        const fromFieldUri = this.getImageSrc(q.imageBase64);
        const finalImageSrc = fromTextUri || fromFieldUri;
        const imgHtml = finalImageSrc
          ? `<div class="image-container"><img class="q-image" src="${finalImageSrc}" style="${textProcessed.imageStyles || ''}" alt="Savol rasmi" /></div>`
          : '';

        let answersHtml = '';
        if (
          q.type === QuestionType.MULTIPLE_CHOICE &&
          Array.isArray(q.answers) &&
          q.answers.length
        ) {
          answersHtml = `<div class="answers">${q.answers
            .map((a, i) => {
              const aProc = this.extractImageFromText(a.text || '');
              const aTextHtml = this.renderTextWithLatex(aProc.cleanedText);
              const aImgUri = this.normalizeDataUri(aProc.imageDataUri || '');
              const aImg = aImgUri
                ? `<div class="answer-image-container"><img class="answer-image" src="${aImgUri}" style="${aProc.imageStyles || ''}" alt="Javob rasmi"/></div>`
                : '';
              return `<div class="answer">${String.fromCharCode(65 + i)}) ${aTextHtml}${aImg}</div>`;
            })
            .join('')}</div>`;
        } else if (q.type === QuestionType.TRUE_FALSE) {
          answersHtml = `<div class="answers"><div class="answer">A) To'g'ri</div><div class="answer">B) Noto'g'ri</div></div>`;
        } else if (q.type === QuestionType.ESSAY) {
          answersHtml = `<div class="answers"><div class="answer">Javob: ___________________________</div></div>`;
        }

        return `<div class="question">
          <div class="q-row">
            <div class="q-no">${idx + 1}.</div>
            <div class="q-content">
              <div class="q-text">${renderedQuestionText}</div>
              ${imgHtml}
              ${answersHtml}
            </div>
          </div>
        </div>`;
      })
      .join('');

    const answerSheetHtml = (() => {
      if (!ctx.config.includeAnswers) return '';
      const answerKey = this.buildAnswerKey(variant.questions || []);
      const items = (answerKey.answers || [])
        .map((a, i) => {
          const n = i + 1;
          return `<div class="ak-item"><span class="ak-n">${n}.</span><span class="ak-a">${escapeHtml(
            a,
          )}</span></div>`;
        })
        .join('');

      return `
        <div class="page answer-sheet">
          <div class="header">
            <div class="title">${escapeHtml(
              ctx.config.title || `${ctx.subjectName} testi`,
            )}</div>
            ${centerLine}
            <div class="subtitle">Javoblar varagi — Variant: ${escapeHtml(
              variant.variantNumber,
            )} — ID: #${escapeHtml(variant.uniqueNumber)}</div>
            <div class="meta">Sana: ${new Date().toLocaleDateString(
              'uz-UZ',
            )} • Savollar: ${answerKey.total}</div>
          </div>
          <div class="ak-grid">${items}</div>
        </div>
      `;
    })();

    return `${coverHtml}<div class="page">${header}<div class="questions-container">${questionsHtml}</div></div>${answerSheetHtml}`;
  }

  // Build one combined HTML containing all variants and all answer sheets with print controls
  private buildCombinedHtml(input: {
    title: string;
    subjectName: string;
    variantInners: string[];
  }): string {
    const title = `${escapeHtml(input.title)} — Barcha variantlar va javoblar varagi`;
    // Ensure question numbers start from 1 for each variant
    // Remove extra page breaks at the top
    // NOTE: each variantInner already contains one or more `.page` blocks.
    // However, when printing/saving to PDF from the browser, some engines may
    // ignore `page-break-after` at certain boundaries and start the next variant
    // in the remaining space. To guarantee that every new variant starts from a
    // fresh page, insert an explicit page-break marker between variants.
    const variantsSection = input.variantInners
      .map((inner, idx) =>
        idx === 0 ? inner : `<div class="variant-break"></div>${inner}`,
      )
      .join('');

    return `<!DOCTYPE html>
    <html lang="uz">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
      <style>
        /* Print margins (match Chrome custom margin top=0.5") */
        @page { size: A4; margin: 0.5in; }
        * { box-sizing: border-box; }
        body { font-family: Times, 'Times New Roman', serif; margin: 0; color: #111; font-size: 16px; }
        .variant-break { page-break-before: always; break-before: page; height: 0; }
        .page { page-break-after: always; break-after: page; }
        .cover { page-break-after: always; break-after: page; }
        .answer-sheet { page-break-before: always; break-before: page; }
        .header { text-align: center; margin-bottom: 12px; }
        .title { font-size: 20px; font-weight: 700; margin: 0 0 6px 0; }
        .subtitle { font-size: 12px; margin: 2px 0; color: #333; }
        .meta { font-size: 10px; color: #666; }
        .q-row { display: flex; align-items: flex-start; gap: 8px; }
        .q-no { color: #000; font-weight: 600; min-width: 30px; flex-shrink: 0; text-align: left; font-size: 12px; }
        .q-content { flex: 1; padding-top: 0; font-size: 12px; }
        .q-text { padding-top: 0; margin-top: 0; margin-bottom: 6px; font-size: 12px; }
        .answers { margin-top: 6px; padding-left: 0; }
        .answer { margin: 2px 0; }
        .answer-sheet { }
        .ak-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px 10px; padding: 8px 12px; }
        .ak-item { display: flex; gap: 6px; align-items: baseline; }
        .ak-n { font-weight: 700; }
        .ak-a { font-weight: 800; }
        .image-container { margin: 8px 0; }
        .answer-image-container { margin: 4px 0 4px 20px; display: inline-block; }
        .answer-image { max-width: 200px; height: auto; max-height: 150px; border: 1px solid #ddd; border-radius: 4px; margin: 2px 0; break-inside: avoid; display: inline-block; vertical-align: middle; }
        img.q-image { max-width: 100%; height: auto; max-height: 300px; border: 1px solid #ddd; border-radius: 4px; margin: 6px 0; break-inside: avoid; display: block; }
        img[style*="width"], img[style*="height"] { max-width: none !important; max-height: none !important; }
        .cover { display: flex; align-items: center; justify-content: center; }
        .cover-inner { width: 100%; text-align: center; padding: 18mm 12mm; }
        .cover-center { font-size: 16px; margin-bottom: 10px; }
        .cover-title { font-size: 28px; font-weight: 700; margin: 8px 0; }
        .cover-subject { font-size: 16px; color: #333; margin-top: 4px; }
        .cover-meta { font-size: 14px; color: #444; margin-top: 14px; }
        .cover-fields { margin-top: 26px; max-width: 520px; margin-left: auto; margin-right: auto; text-align: left; }
        .field-row { display: flex; align-items: center; gap: 10px; margin: 14px 0; }
        .field-label { min-width: 90px; font-size: 14px; color: #111; }
        .field-line { flex: 1; border-bottom: 1px solid #111; height: 18px; }
        .toolbar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #eee; padding: 8px 12px; display:flex; gap:8px; align-items:center; z-index: 10; }
        .toolbar button { padding: 6px 10px; font-size: 14px; }
        .section { padding: 8px 12px; }
        .section-title { font-size: 18px; font-weight: 700; margin: 8px 0 12px; }
        .page-break { page-break-after: always; }
        .no-page-break { page-break-after: avoid !important; }
        .variants-container {
          column-count: 1;
          column-gap: 36px;
          padding: 8px 12px;
        }
        .questions-container {
          column-count: 2;
          column-gap: 36px;
          position: relative;
          padding: 8px 12px;
          font-size: inherit;
        }
        .questions-container:before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 1px;
          background: #ddd;
          transform: translateX(-0.5px);
          pointer-events: none;
        }
        @media print {
          .toolbar { display: none; }
          .question { page-break-inside: avoid; font-size: inherit; }
          html, body { margin: 0 !important; padding: 0 !important; font-size: 14px !important; overflow: visible !important; }
          .section#variants { page-break-before: auto !important; }
          .section-title { page-break-after: avoid !important; margin-bottom: 4px !important; padding-bottom: 4px !important; }
          .variants-container { page-break-before: avoid !important; margin-top: 0 !important; padding-top: 0 !important; }
          /* Allow the browser to break pages inside the variants section */
          .section { page-break-inside: auto; break-inside: auto; }
          .variant-break { page-break-before: always !important; break-before: page !important; }
          .page { page-break-after: always !important; break-after: page !important; }
          .cover { page-break-after: always !important; break-after: page !important; }
          .answer-sheet { page-break-before: always !important; break-before: page !important; }
        }
        /* Hide center separator on small screens when columns drop to one */
        @media screen and (max-width: 900px) {
          .questions-container { column-count: 1; }
          .questions-container:before { display: none; }
        }

        @media screen and (max-width: 900px) {
          .ak-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
      </style>
      <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
      <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
    </head>
    <body>
      <div class="toolbar">
        <button onclick="(function(){ document.body.classList.remove('print-sheets'); document.body.classList.add('print-variants'); setTimeout(function(){ window.print(); setTimeout(function(){ document.body.classList.remove('print-variants'); }, 100); }, 0); })()">Faqat variantlar</button>
        <span style="color:#666; font-size:13px;">Chop etish oynasida "Save as PDF"ni tanlang.</span>
      </div>
      <div class="section" id="variants">
        <div class="variants-container">${variantsSection}</div>
      </div>
      <script>
        window.addEventListener('DOMContentLoaded', function() {
          if (window.renderMathInElement) {
            try {
              window.renderMathInElement(document.body, {
                delimiters: [
                  {left: '$$', right: '$$', display: true},
                  {left: '$', right: '$', display: false},
                  {left: '\\(', right: '\\)', display: false},
                  {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
              });
            } catch (e) { console.warn('KaTeX render error', e); }
          }
          // No extra page breaks at top
        });
      </script>
    </body>
    </html>`;
  }

  private wrapHtmlForBrowser(inner: string, title: string): string {
    return `<!DOCTYPE html>
      <html lang="uz">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <style>
          /* Print margins (match Chrome custom margin top=0.5") */
          @page { size: A4; margin: 0.5in; }
          body { font-family: Times, 'Times New Roman', serif; margin: 0; padding: 0; color: #111; }
          .toolbar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #eee; padding: 8px 12px; display:flex; gap:8px; align-items:center; z-index: 10; }
          .toolbar button { padding: 6px 10px; font-size: 14px; }
          .page { page-break-after: always; padding: 0; }
          .cover { page-break-after: always; }
          .answer-sheet { page-break-before: always; }
          .header { text-align: center; margin-bottom: 12px; }
          .title { font-size: 20px; font-weight: 700; margin: 0 0 6px 0; }
          .subtitle { font-size: 12px; margin: 2px 0; color: #333; }
          .meta { font-size: 10px; color: #666; }

          /* Two-column questions container with centered vertical separator */
          .questions-container {
            column-count: 2;
            column-gap: 36px;
            position: relative; /* needed for centered separator */
            padding: 8px 12px;
            /* ensure content doesn't overlap separator */
          }
          .questions-container:before {
            content: "";
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 1px;
            background: #ddd;
            transform: translateX(-0.5px);
            pointer-events: none;
          }

          .question {
            margin: 10px 0 14px 0;
            break-inside: avoid;
            break-inside: avoid-column;
            -webkit-column-break-inside: avoid;
            -moz-column-break-inside: avoid;
            page-break-inside: avoid;
          }
          .q-row { display: flex; align-items: flex-start; gap: 8px; }
          .q-no { color: #000; font-weight: 600; min-width: 30px; flex-shrink: 0; text-align: left; font-size: 12px; }
          .q-content { flex: 1; padding-top: 0; font-size: 12px; }
          .q-text { padding-top: 0; margin-top: 0; margin-bottom: 6px; font-size: 12px; }
          .points { color: #666; font-size: 10px; font-weight: 500; align-self: flex-start; flex-shrink: 0; margin-left: 8px; }
          .answers { margin-top: 6px; padding-left: 0; }
          .answer { margin: 2px 0; }
          .answer-sheet { }
          .ak-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px 10px; padding: 8px 12px; }
          .ak-item { display: flex; gap: 6px; align-items: baseline; }
          .ak-n { font-weight: 700; }
          .ak-a { font-weight: 800; }
          .image-container { margin: 8px 0; }
          .answer-image-container { margin: 4px 0 4px 20px; display: inline-block; }
          .answer-image { max-width: 200px; height: auto; max-height: 150px; border: 1px solid #ddd; border-radius: 4px; margin: 2px 0; break-inside: avoid; display: inline-block; vertical-align: middle; }
          .katex-display { margin: 6px 0; }
          img.q-image { max-width: 100%; height: auto; max-height: 300px; border: 1px solid #ddd; border-radius: 4px; margin: 6px 0; break-inside: avoid; display: block; }
          img[style*="width"], img[style*="height"] { max-width: none !important; max-height: none !important; }
          .cover { display: flex; align-items: center; justify-content: center; }
          .cover-inner { width: 100%; text-align: center; padding: 18mm 12mm; }
          .cover-center { font-size: 16px; margin-bottom: 10px; }
          .cover-title { font-size: 28px; font-weight: 700; margin: 8px 0; }
          .cover-subject { font-size: 16px; color: #333; margin-top: 4px; }
          .cover-meta { font-size: 14px; color: #444; margin-top: 14px; }
          .cover-fields { margin-top: 26px; max-width: 520px; margin-left: auto; margin-right: auto; text-align: left; }
          .field-row { display: flex; align-items: center; gap: 10px; margin: 14px 0; }
          .field-label { min-width: 90px; font-size: 14px; color: #111; }
          .field-line { flex: 1; border-bottom: 1px solid #111; height: 18px; }
          .key-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
          .key-table th, .key-table td { border: 1px solid #ccc; padding: 6px 8px; text-align: center; }
          .key-table th { background: #f7f7f7; }
          @media print { 
            .toolbar { display: none; }
            .question { page-break-inside: avoid !important; }
            .q-no { vertical-align: top; }
            .q-content { vertical-align: top; }
          }

          /* Hide center separator on small screens when columns drop to one */
          @media screen and (max-width: 900px) {
            .questions-container { column-count: 1; }
            .questions-container:before { display: none; }
          }
        </style>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
      </head>
      <body>
        <div class="toolbar">
          <button onclick="window.print()">PDFga chop etish</button>
          <span style="color:#666; font-size:13px;">Chop etish oynasida "Save as PDF"ni tanlang.</span>
        </div>
        ${inner}
        <script>
          window.addEventListener('DOMContentLoaded', function() {
            if (window.renderMathInElement) {
              try {
                window.renderMathInElement(document.body, {
                  delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                  ],
                  throwOnError: false
                });
              } catch (e) {
                console.warn('KaTeX render error', e);
              }
            }
          });
        </script>
      </body>
      </html>`;
  }

  private extractImageFromText(text: string): {
    cleanedText: string;
    imageDataUri: string | null;
    imageStyles?: string;
  } {
    if (!text) {
      return { cleanedText: '', imageDataUri: null };
    }

    const markdownImageWithSizePattern =
      /!\[[^\]]*\|([^\]]+)\]\((data:image\/[^\s)]+[^)]*)\)/gs;
    let cleanedText = text;
    let imageDataUri: string | null = null;
    let imageStyles: string | undefined;

    for (const match of text.matchAll(markdownImageWithSizePattern)) {
      const styles = match[1];
      let imageSrc = match[2];
      imageSrc = this.extractDataUriFromText(imageSrc);
      if (imageSrc && imageSrc.startsWith('data:image/') && !imageDataUri) {
        imageDataUri = this.normalizeDataUri(imageSrc) ?? null;
        imageStyles = this.parseImageStyles(styles);
      }
      cleanedText = cleanedText.replace(match[0], '');
    }

    if (!imageDataUri) {
      const markdownImagePattern =
        /!\[[^\]]*\]\((data:image\/[^\s)]+[^)]*)\)/gs;
      for (const match of text.matchAll(markdownImagePattern)) {
        let imageSrc = match[1];
        imageSrc = this.extractDataUriFromText(imageSrc);
        if (imageSrc && imageSrc.startsWith('data:image/') && !imageDataUri) {
          imageDataUri = this.normalizeDataUri(imageSrc) ?? null;
        }
        cleanedText = cleanedText.replace(match[0], '');
      }
    }

    cleanedText = cleanedText.replace(/!\[[^\]]*\]/g, '').trim();
    return { cleanedText, imageDataUri, imageStyles };
  }

  private extractDataUriFromText(s: string): string {
    if (!s) return '';
    const cleaned = s.replace(/\s+/g, '');
    const m = cleaned.match(/(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/i);
    return m ? m[1] : cleaned;
  }

  private parseImageStyles(styleString: string): string {
    if (!styleString) return '';
    return styleString
      .split(';')
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
      .join('; ');
  }

  // Convert LaTeX delimiters in plain text to HTML using KaTeX; non-math text is HTML-escaped
  private renderTextWithLatex(text: string): string {
    try {
      return renderWithKatexAllowHtml(text ?? '');
    } catch (e) {
      void this.logService.log(
        `KaTeX render failed: ${e instanceof Error ? e.message : String(e)}`,
        'TestGenerator',
      );
      return escapeHtml(text ?? '');
    }
  }

  private getImageSrc(imageBase64?: string, mime?: string): string | null {
    if (!imageBase64) return null;

    try {
      const cleanBase64 = imageBase64.replace(/\s+/g, '');

      if (/^data:image\/[a-zA-Z]+;base64,/.test(cleanBase64)) {
        return this.normalizeDataUri(cleanBase64);
      }

      if (this.isValidBase64(cleanBase64)) {
        const safeMime =
          mime || this.detectImageMimeType(cleanBase64) || 'image/png';
        return `data:${safeMime};base64,${cleanBase64}`;
      }

      return null;
    } catch (error) {
      void this.logService.log(
        `Error processing image data: ${error instanceof Error ? error.message : String(error)}`,
        'TestGenerator',
      );
      return null;
    }
  }

  private isValidBase64(str: string): boolean {
    if (!str || str.length < 4) return false;
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(str)) return false;
    const paddedLength = str.length + ((4 - (str.length % 4)) % 4);
    if (paddedLength % 4 !== 0) return false;
    try {
      const decoded = Buffer.from(str, 'base64').toString('binary');
      const reencoded = Buffer.from(decoded, 'binary').toString('base64');
      return str.replace(/=+$/, '') === reencoded.replace(/=+$/, '');
    } catch {
      return false;
    }
  }

  private normalizeDataUri(dataUri: string): string | null {
    if (!dataUri || !dataUri.startsWith('data:image/')) {
      return null;
    }
    try {
      const [header, base64Data] = dataUri.split(',');
      if (!header || !base64Data) {
        void this.logService.log(
          'Invalid data URI format: missing header or base64 data',
          'TestGenerator',
        );
        return null;
      }
      let cleanBase64 = base64Data.replace(/\s+/g, '');
      cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, '');
      const paddingNeeded = (4 - (cleanBase64.length % 4)) % 4;
      if (paddingNeeded > 0) cleanBase64 += '='.repeat(paddingNeeded);
      if (!this.isValidBase64(cleanBase64)) {
        void this.logService.log(
          'Invalid base64 data detected',
          'TestGenerator',
        );
        return null;
      }
      try {
        const decoded = Buffer.from(cleanBase64, 'base64');
        if (decoded.length < 50) {
          void this.logService.log(
            'Base64 data too small to be a valid image',
            'TestGenerator',
          );
          return null;
        }
      } catch (err) {
        void this.logService.log(
          `Failed to decode base64 data: ${String(err)}`,
          'TestGenerator',
        );
        return null;
      }
      return `${header},${cleanBase64}`;
    } catch (error) {
      void this.logService.log(
        `Failed to normalize data URI: ${String(error)}`,
        'TestGenerator',
      );
      return null;
    }
  }

  private detectImageMimeType(base64: string): string | null {
    if (base64.startsWith('/9j/')) return 'image/jpeg';
    if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
    if (base64.startsWith('R0lGODlh') || base64.startsWith('R0lGODdh'))
      return 'image/gif';
    if (base64.startsWith('UklGR')) return 'image/webp';
    return null;
  }

  /**
   * Generate sequential 5-digit code for generated test variants.
   * Range: 00000..99999 (global across generated_test_variants).
   * Uses a Postgres advisory lock to keep allocation ordered under concurrency.
   */
  private async generateUniqueNumber(): Promise<string> {
    // Keep this constant stable; it defines the global lock used for allocation.
    const LOCK_KEY = 7310001;

    await this.generatedTestVariantRepository.query(
      'SELECT pg_advisory_lock($1)',
      [LOCK_KEY],
    );
    try {
      const rows: Array<{ max: string | number | null }> =
        await this.generatedTestVariantRepository.query(
          `SELECT MAX(CAST("uniqueNumber" AS int)) AS max
           FROM "generated_test_variants"
           WHERE "uniqueNumber" ~ '^[0-9]{5}$'`,
        );

      const currentMaxRaw = rows?.[0]?.max;
      const currentMax =
        currentMaxRaw === null || currentMaxRaw === undefined
          ? -1
          : Number(currentMaxRaw);

      if (!Number.isFinite(currentMax)) {
        throw new BadRequestException('Failed to compute next uniqueNumber');
      }

      for (let next = currentMax + 1; next <= 99_999; next++) {
        const code = String(next).padStart(5, '0');

        const genExists = await this.generatedTestVariantRepository.findOne({
          where: { uniqueNumber: code },
          select: ['id'],
        });
        if (genExists) continue;

        // Defensive: avoid collisions with exam scanner codes if any legacy 5-digit values exist.
        const examExists = await this.examVariantRepository.findOne({
          where: { variantNumber: code },
          select: ['id'],
        });
        if (examExists) continue;

        return code;
      }

      throw new BadRequestException(
        'uniqueNumber limit reached (00000..99999). Please contact admin.',
      );
    } finally {
      try {
        await this.generatedTestVariantRepository.query(
          'SELECT pg_advisory_unlock($1)',
          [LOCK_KEY],
        );
      } catch {
        // ignore unlock errors
      }
    }
  }

  /**
   * Generate random test variants
   */
  async generateRandomTest(dto: GenerateTestDto, teacherId: number) {
    // Validate subject
    const subject = await this.subjectRepository.findOne({
      where: { id: dto.subjectId },
    });

    if (!subject) {
      throw new NotFoundException('Fan topilmadi');
    }

    // Get available questions
    void this.logService.log(
      `Available questions for subject ${subject.name}: test id ${dto.testId}, test ids: ${(dto.testIds || []).join(',')}`,
      'TestGenerator',
    );

    let availableQuestions: Question[] = [];
    if (dto.testIds && dto.testIds.length > 0) {
      // Fetch questions from multiple tests
      availableQuestions = await this.questionRepository.find({
        where: dto.testIds.map((id) => ({ test: { id } })),
        relations: ['answers', 'test'],
      });
    } else {
      availableQuestions = await this.questionRepository.find({
        where: {
          test: dto.testId
            ? { id: dto.testId }
            : { subject: { id: dto.subjectId } },
        },
        relations: ['answers', 'test'],
      });
    }

    if (availableQuestions.length === 0) {
      throw new BadRequestException('Tanlangan fanda savollar mavjud emas');
    }

    if (availableQuestions.length < dto.questionCount) {
      throw new BadRequestException(
        `Fanda ${availableQuestions.length} ta savol bor, lekin ${dto.questionCount} ta so'rayapsiz`,
      );
    }

    // Create generated test record
    const generatedTest = this.generatedTestRepository.create({
      title: dto.title || `${subject.name} testi`,
      description: '',
      variantCount: dto.variantCount,
      questionCount: dto.questionCount,
      timeLimit: dto.timeLimit,
      difficulty: dto.difficulty,
      includeAnswers: dto.includeAnswers,
      showTitleSheet: dto.showTitleSheet,
      teacher: { id: teacherId },
      subject: { id: dto.subjectId },
    });

    const savedGeneratedTest =
      await this.generatedTestRepository.save(generatedTest);

    // Generate variants
    const variants: TestVariant[] = [];
    for (let v = 1; v <= dto.variantCount; v++) {
      // Randomly select questions for this variant
      const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, dto.questionCount);

      // Shuffle answer options for multiple choice questions
      const questionsWithShuffledAnswers = selectedQuestions.map((q) => {
        if (
          q.type === QuestionType.MULTIPLE_CHOICE &&
          q.answers &&
          q.answers.length > 1
        ) {
          const shuffledAnswers = [...q.answers].sort(
            () => 0.5 - Math.random(),
          );
          return { ...q, answers: shuffledAnswers };
        }
        return q;
      });

      const uniqueNumber = await this.generateUniqueNumber();

      // Save variant to database
      const variant = this.generatedTestVariantRepository.create({
        uniqueNumber,
        variantNumber: v,
        questionsData: questionsWithShuffledAnswers,
        generatedAt: new Date(),
        generatedTest: savedGeneratedTest,
        answerKey: this.buildAnswerKey(questionsWithShuffledAnswers),
      });

      await this.generatedTestVariantRepository.save(variant);

      variants.push({
        id: `${Date.now()}-${v}`,
        variantNumber: v.toString(),
        uniqueNumber,
        questions: questionsWithShuffledAnswers,
        createdAt: new Date(),
      });
    }

    return {
      id: savedGeneratedTest.id,
      title: dto.title || `${subject.name} testi`,
      subject: subject.name,
      variants,
      config: dto,
      totalQuestions: dto.questionCount,
      totalVariants: dto.variantCount,
    };
  }

  /**
   * Build answer key JSON from questions list
   */
  private buildAnswerKey(questions: Question[]): {
    total: number;
    answers: string[]; // e.g., ['C', 'A', '-', ...]
  } {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const answers = (questions || []).map((q) => {
      if (
        q.type === QuestionType.MULTIPLE_CHOICE &&
        q.answers &&
        q.answers.length > 0
      ) {
        const idx = q.answers.findIndex((a) => a.isCorrect);
        return idx >= 0 ? letters[idx] || 'X' : 'X';
      }
      if (q.type === QuestionType.TRUE_FALSE) {
        // If answers array provided, index 0 => A (True), 1 => B (False)
        if (q.answers && q.answers.length > 0) {
          const idx = q.answers.findIndex((a) => a.isCorrect);
          if (idx === 0) return 'A';
          if (idx === 1) return 'B';
        }
        // Fallback heuristic: default to 'A'
        return 'A';
      }
      // Essay / other types do not have a single correct option
      return '-';
    });
    return { total: answers.length, answers };
  }

  /**
   * Retrieve stored variant info by unique number
   */
  async getVariantByUniqueNumber(uniqueNumber: string) {
    const variant = await this.generatedTestVariantRepository.findOne({
      where: { uniqueNumber },
      relations: [
        'generatedTest',
        'generatedTest.subject',
        'generatedTest.teacher',
      ],
    });
    if (!variant) {
      throw new NotFoundException('Variant topilmadi');
    }
    return {
      uniqueNumber: variant.uniqueNumber,
      variantNumber: variant.variantNumber,
      printableUrl: variant.printableUrl,
      printableFileName: variant.printableFileName,
      answerKey: variant.answerKey,
      generatedTest: {
        id: variant.generatedTest.id,
        title: variant.generatedTest.title,
        subject: variant.generatedTest.subject?.id,
        teacher: variant.generatedTest.teacher?.id,
      },
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    };
  }

  /**
   * Grade scanned answers for a variant using its uniqueNumber
   */
  async gradeScannedAnswers(
    uniqueNumber: string,
    scannedAnswers: string[],
    studentId?: number,
    centerId?: number,
  ): Promise<{
    uniqueNumber: string;
    total: number;
    correctCount: number;
    wrongCount: number;
    blankCount: number;
    perQuestion: Array<{
      index: number; // 0-based
      scanned: string; // 'A'..'F' or '-' or 'X'
      correct: string; // 'A'..'F' or '-' or 'X'
      isCorrect: boolean;
    }>;
    resultId: number;
  }> {
    const variant = await this.generatedTestVariantRepository.findOne({
      where: { uniqueNumber },
    });
    if (!variant) throw new NotFoundException('Variant topilmadi');

    // Prevent duplicates for the same student + uniqueNumber (+ center).
    // If studentId is not provided, we cannot reliably de-duplicate.
    if (studentId !== undefined) {
      const where: any = {
        uniqueNumber,
        student_id: studentId,
      };
      if (centerId !== undefined) {
        where.center_id = centerId;
      }
      const existing = await this.resultsRepository.findOne({
        where,
        order: { createdAt: 'DESC', id: 'DESC' },
      });
      if (existing) {
        throw new ConflictException(
          "Bu o'quvchi uchun ushbu variant avval tekshirilgan",
        );
      }
    }

    const key = variant.answerKey as unknown as {
      total: number;
      answers: string[];
    } | null;
    if (!key || !Array.isArray(key.answers)) {
      throw new BadRequestException('Javoblar kaliti topilmadi');
    }

    const total = Math.min(key.answers.length, scannedAnswers.length);
    const perQuestion: Array<{
      index: number;
      scanned: string;
      correct: string;
      isCorrect: boolean;
    }> = [];
    let correctCount = 0;
    let blankCount = 0;
    for (let i = 0; i < total; i++) {
      const scanned = (scannedAnswers[i] || '-').toUpperCase();
      const correct = (key.answers[i] || '-').toUpperCase();
      const isBlank = scanned === '-' || scanned === '';
      if (isBlank) blankCount++;
      const isCorrect = !isBlank && scanned === correct;
      if (isCorrect) correctCount++;
      perQuestion.push({ index: i, scanned, correct, isCorrect });
    }
    const wrongCount = total - correctCount - blankCount;

    // Create a new result row (duplicates are blocked above for same student+variant).
    const result = this.resultsRepository.create({
      student_id: studentId,
      center_id: centerId,
      uniqueNumber,
      total,
      correctCount,
      wrongCount,
      blankCount,
      perQuestion,
    });
    await this.resultsRepository.save(result);

    // --- Yangi kod: Telegram kanalga natija yuborish ---
    try {
      const student = result.student_id
        ? await this.userRepo.findOne({ where: { id: result.student_id } })
        : undefined;
      const center = result.center_id
        ? await this.centerRepo.findOne({ where: { id: result.center_id } })
        : undefined;
      const variantEntity = await this.generatedTestVariantRepository.findOne({
        where: { uniqueNumber },
        relations: ['generatedTest', 'generatedTest.subject'],
      });
      const subject = variantEntity?.generatedTest?.subject;

      // Kanalga xabar yuborish uchun TelegramService dan foydalanamiz
      const telegramService = this.moduleRef.get(TelegramService, {
        strict: false,
      });
      await telegramService.sendTestResultToChannel({
        student: student ?? undefined,
        center: center ?? undefined,
        subject,
        correctCount,
        total,
      });
    } catch (err) {
      void this.logService.log(
        `Telegram kanalga natija yuborishda xatolik: ${err.message}`,
        'TestGenerator',
      );
    }

    return {
      uniqueNumber,
      total,
      correctCount,
      wrongCount,
      blankCount,
      perQuestion,
      resultId: result.id,
    };
  }

  /**
   * List generated tests for a teacher
   */
  async listGeneratedTests(teacherId: number) {
    const tests = await this.generatedTestRepository.find({
      where: { teacher: { id: teacherId } },
      relations: ['subject', 'teacher'],
      order: { createdAt: 'DESC' },
    });

    // Count variants per test without loading all questions
    const ids = tests.map((t) => t.id);
    const variantsByTest: Record<number, number> = {};
    if (ids.length > 0) {
      const qb = this.generatedTestVariantRepository
        .createQueryBuilder('v')
        .select('v.generatedTestId', 'generatedTestId')
        .addSelect('COUNT(*)', 'cnt')
        .where('v.generatedTestId IN (:...ids)', { ids })
        .groupBy('v.generatedTestId');
      const rows = await qb.getRawMany<{
        generatedTestId: string;
        cnt: string;
      }>();
      for (const r of rows)
        variantsByTest[Number(r.generatedTestId)] = Number(r.cnt);
    }

    return tests.map((t) => ({
      id: t.id,
      title: t.title,
      subject: {
        id: t.subject?.id,
        name: t.subject?.name,
      },
      teacher: {
        id: t.teacher?.id,
        fullName: (t as any).teacher?.fullName,
      },
      createdAt: t.createdAt,
      variantCount: variantsByTest[t.id] ?? t.variantCount ?? 0,
      questionCount: t.questionCount,
      timeLimit: t.timeLimit,
      difficulty: t.difficulty,
    }));
  }

  /**
   * List variants of a generated test, ensuring ownership
   */
  async listGeneratedTestVariants(testId: number, teacherId: number) {
    const test = await this.generatedTestRepository.findOne({
      where: { id: testId },
      relations: ['teacher'],
    });
    if (!test) throw new NotFoundException('Yaratilgan test topilmadi');
    if (test.teacher?.id !== teacherId)
      throw new BadRequestException("Bu testga ruxsatingiz yo'q");

    const variants = await this.generatedTestVariantRepository.find({
      where: { generatedTest: { id: testId } },
      order: { variantNumber: 'ASC' },
    });

    return variants.map((v) => ({
      uniqueNumber: v.uniqueNumber,
      variantNumber: v.variantNumber,
      printableUrl: v.printableUrl,
      printableFileName: v.printableFileName,
      generatedAt: v.generatedAt ?? v.createdAt,
      answerKey: v.answerKey,
    }));
  }

  /**
   * Generate printable HTML for an existing generated test (load data from DB).
   * If variants are missing, it will (re)create them using subject question pool.
   */
  async generatePrintableHtmlForGeneratedTest(
    opts: GenerateGeneratedTestPrintableOptions,
  ): Promise<{
    files: {
      variantNumber: string;
      url: string;
      fileName: string;
      answerSheetUrl?: string;
      uniqueNumber?: string;
    }[];
    title?: string;
    combinedUrl?: string;
  }> {
    const test = await this.generatedTestRepository.findOne({
      where: { id: opts.generatedTestId },
      relations: ['teacher', 'subject'],
    });
    if (!test) throw new NotFoundException('Yaratilgan test topilmadi');
    if (!test.teacher || Number(test.teacher.id) !== Number(opts.teacherId)) {
      throw new BadRequestException('Bu test sizga tegishli emas');
    }

    const ensureExists = opts.ensureExists ?? true;

    let variants = await this.generatedTestVariantRepository.find({
      where: { generatedTest: { id: test.id } },
      order: { variantNumber: 'ASC' },
    });

    // If variants were not created (e.g., generation crashed), recreate them.
    if (!variants.length) {
      const availableQuestions = await this.questionRepository.find({
        where: { test: { subject: { id: test.subject?.id } } },
        relations: ['answers', 'test'],
      });

      if (!availableQuestions.length) {
        throw new BadRequestException('Tanlangan fanda savollar mavjud emas');
      }
      if (availableQuestions.length < Number(test.questionCount || 0)) {
        throw new BadRequestException(
          `Fanda ${availableQuestions.length} ta savol bor, lekin ${Number(
            test.questionCount || 0,
          )} ta so'rayapsiz`,
        );
      }

      const toCreate = Math.max(1, Number(test.variantCount || 1));
      for (let v = 1; v <= toCreate; v++) {
        const shuffled = [...availableQuestions].sort(
          () => 0.5 - Math.random(),
        );
        const selectedQuestions = shuffled.slice(
          0,
          Number(test.questionCount || 0),
        );
        const questionsWithShuffledAnswers = selectedQuestions.map((q) => {
          if (
            q.type === QuestionType.MULTIPLE_CHOICE &&
            Array.isArray(q.answers) &&
            q.answers.length > 1
          ) {
            return {
              ...q,
              answers: [...q.answers].sort(() => 0.5 - Math.random()),
            } as Question;
          }
          return q;
        });

        const uniqueNumber = await this.generateUniqueNumber();
        const variant = this.generatedTestVariantRepository.create({
          uniqueNumber,
          variantNumber: v,
          questionsData: questionsWithShuffledAnswers,
          generatedAt: new Date(),
          generatedTest: test,
          answerKey: this.buildAnswerKey(questionsWithShuffledAnswers),
        });
        await this.generatedTestVariantRepository.save(variant);
      }

      variants = await this.generatedTestVariantRepository.find({
        where: { generatedTest: { id: test.id } },
        order: { variantNumber: 'ASC' },
      });
    }

    // If caller wants caching and all variants already have printable URLs, return them.
    if (
      ensureExists &&
      variants.length &&
      variants.every((v) => v.printableUrl && v.printableFileName)
    ) {
      return {
        files: variants.map((v) => ({
          variantNumber: String(v.variantNumber),
          url: String(v.printableUrl),
          fileName: String(v.printableFileName),
          uniqueNumber: v.uniqueNumber,
        })),
        title: test.title,
      };
    }

    const mappedVariants: TestVariant[] = variants.map((v) => ({
      id: `db-${test.id}-${v.uniqueNumber}`,
      variantNumber: String(v.variantNumber),
      uniqueNumber: v.uniqueNumber,
      questions: (Array.isArray(v.questionsData)
        ? v.questionsData
        : []) as Question[],
      createdAt: v.generatedAt ?? v.createdAt,
    }));

    return await this.generatePrintableHtmlFiles({
      variants: mappedVariants,
      config: {
        title: test.title,
        subjectId: test.subject?.id ?? 0,
        questionCount: test.questionCount,
        variantCount: test.variantCount,
        timeLimit: test.timeLimit,
        difficulty: test.difficulty,
        includeAnswers: test.includeAnswers,
        showTitleSheet: test.showTitleSheet,
      },
      subjectName: test.subject?.name ?? 'Test',
      teacherId: Number(opts.teacherId),
    });
  }

  /**
   * Generate PDF for test variants with 2-column layout
   */
  generateTestPDF(): Promise<Buffer> {
    // PDF generation is deprecated; use HTML printable flow instead
    return Promise.reject(
      new BadRequestException('PDF generation is disabled. Use HTML output.'),
    );
  }

  saveGeneratedTest(generatedTest: any, teacherId: number): Promise<any> {
    // For now, we'll just return the generated test without saving
    // In the future, you can implement saving to a separate table
    return Promise.resolve({
      ...generatedTest,
      savedAt: new Date(),
      teacherId,
    });
  }
}

// Small utility copied to keep this service self-contained
function escapeHtml(str: string) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Basic HTML sanitizer: removes scripts/styles, event handlers, and javascript: URLs; keeps common tags like div/span/b/i/br/ul/ol/li etc.
function sanitizeHtmlBasic(html: string): string {
  if (!html) return '';
  let out = String(html);
  // remove script/style blocks
  out = out.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  // remove event handler attributes like onclick="..."
  out = out.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // neutralize javascript: in href/src
  out = out.replace(
    /\s(href|src)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    (_m, attr, val) => {
      const v = String(val).replace(/^['"]|['"]$/g, '');
      if (/^\s*javascript:/i.test(v)) return '';
      return ` ${attr}="${v}"`;
    },
  );
  return out;
}

// Server-side KaTeX renderer that preserves sanitized HTML for non-math segments
function renderWithKatexAllowHtml(text: string): string {
  if (!text) return '';
  const parts: string[] = [];
  const regex =
    /\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$|\\\[((?:.|\n)*?)\\\]|\\\(((?:.|\n)*?)\\\)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const index = m.index;
    const before = text.slice(lastIndex, index);
    if (before) parts.push(sanitizeHtmlBasic(before));
    const formula = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').trim();
    const display = Boolean(m[1] || m[3]);
    try {
      const html: string = katex.renderToString(formula, {
        displayMode: display,
        throwOnError: false,
        strict: 'ignore',
        trust: false,
      });
      parts.push(html);
    } catch {
      parts.push(`<span class="katex-error">${escapeHtml(formula)}</span>`);
    }
    lastIndex = index + m[0].length;
  }
  const rest = text.slice(lastIndex);
  if (rest) parts.push(sanitizeHtmlBasic(rest));
  return parts.join('');
}
