import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ParseIntPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { TestsService } from './tests.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { TestResponseDto } from './dto/test-response.dto';
import { TestStatsDto } from './dto/test-stats.dto';
import { UpdateResultCountsDto } from './dto/update-result-counts.dto';
import { UpdateResultManualDto } from './dto/update-result-manual.dto';
import { CreateResultManualByVariantDto } from './dto/create-result-manual-by-variant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireCenterPermissions } from '../centers/permissions/center-permission.decorator';
import { CenterPermissionKey } from '../centers/permissions/center-permissions';
import { UserRole } from '../users/entities/user.entity';
import {
  TestGeneratorService,
  type GenerateTestDto,
} from './test-generator.service';
import { TestVariant } from './test-generator.service';

@ApiTags('Tests')
@Controller('tests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TestsController {
  constructor(
    private readonly testsService: TestsService,
    private readonly testGeneratorService: TestGeneratorService,
  ) {}

  @Post()
  @RequireCenterPermissions(CenterPermissionKey.TESTS)
  @ApiOperation({ summary: 'Yangi test yaratish' })
  @ApiResponse({
    status: 201,
    description: 'Test muvaffaqiyatli yaratildi',
    type: TestResponseDto,
  })
  async create(
    @Body() createTestDto: CreateTestDto,
    @Request() req: { user: { id: number | string } },
  ): Promise<TestResponseDto> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    return this.testsService.create(createTestDto, userId);
  }

  @Get()
  @RequireCenterPermissions(CenterPermissionKey.TESTS)
  @ApiOperation({ summary: "O'qituvchining barcha testlarini olish" })
  @ApiResponse({
    status: 200,
    description: "Testlar ro'yxati",
    type: [TestResponseDto],
  })
  @ApiQuery({
    name: 'subjectid',
    required: false,
    description: "Fan bo'yicha filtrlash",
  })
  async findAll(
    @Query('subjectid') subjectid: string | number | undefined,
    @Request() req: { user: { id: number | string } },
  ): Promise<TestResponseDto[]> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;
    const subjId =
      typeof subjectid === 'string' ? parseInt(subjectid, 10) : subjectid;

    if (subjId) {
      return this.testsService.findBySubject(subjId, userId);
    }
    return this.testsService.findAllByTeacher(userId);
  }

  @Get('my')
  @RequireCenterPermissions(CenterPermissionKey.TESTS)
  @ApiOperation({ summary: "O'qituvchining barcha testlarini olish" })
  @ApiResponse({
    status: 200,
    description: "Testlar ro'yxati",
    type: [TestResponseDto],
  })
  async findMyTests(
    @Request() req: { user: { id: number | string } },
  ): Promise<TestResponseDto[]> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    return this.testsService.findAllByTeacher(userId);
  }

  @Get('weekly')
  @RequireCenterPermissions(CenterPermissionKey.TESTS)
  @ApiOperation({ summary: "Haftalik testlar ro'yxati (superadmin: hammasi)" })
  @ApiResponse({
    status: 200,
    description: "Haftalik testlar ro'yxati",
    type: [TestResponseDto],
  })
  async listWeeklyTests(
    @Request() req: { user: { id: number | string; role?: UserRole } },
    @Query('teacherId') teacherIdRaw?: string,
    @Query('centerId') centerIdRaw?: string,
  ): Promise<TestResponseDto[]> {
    const role = req.user?.role;
    const parseOptionalInt = (v?: string) => {
      if (!v) return undefined;
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : undefined;
    };

    const teacherIdQuery = parseOptionalInt(teacherIdRaw);
    const centerIdQuery = parseOptionalInt(centerIdRaw);
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    if (role === UserRole.SUPERADMIN) {
      return this.testsService.findWeeklyTests({
        teacherId: teacherIdQuery,
        centerId: centerIdQuery,
      });
    }

    return this.testsService.findWeeklyTests({ teacherId: userId });
  }

  @Get('stats')
  @RequireCenterPermissions(CenterPermissionKey.TESTS)
  @ApiOperation({ summary: 'Testlar statistikasi' })
  @ApiResponse({
    status: 200,
    description: 'Testlar statistikasi',
    type: TestStatsDto,
  })
  async getStats(
    @Request() req: { user: { id: number | string } },
  ): Promise<TestStatsDto> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    return this.testsService.getTestStats(userId);
  }

  // Generated tests endpoints must be above ':id' to avoid route conflicts
  @Get('generated/variant/:uniqueNumber')
  @RequireCenterPermissions(CenterPermissionKey.TEST_GENERATION)
  @ApiOperation({
    summary: 'Generated variant maʼlumotini olish (uniqueNumber orqali)',
  })
  @ApiResponse({ status: 200, description: 'Variant topildi' })
  async getGeneratedVariantByUnique(
    @Param('uniqueNumber') uniqueNumber: string,
  ) {
    return this.testGeneratorService.getVariantByUniqueNumber(uniqueNumber);
  }

  @Get('generated')
  @RequireCenterPermissions(CenterPermissionKey.TEST_GENERATION)
  @ApiOperation({
    summary: "O'qituvchining yaratgan testlari (generator) ro'yxati",
  })
  @ApiResponse({ status: 200, description: 'Generated tests list' })
  async listGeneratedTests(
    @Request() req: { user: { id: number | string; role?: UserRole } },
    @Query('teacherId') teacherIdRaw?: string,
  ) {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    const role = req.user?.role;
    const teacherIdQuery = teacherIdRaw
      ? parseInt(teacherIdRaw, 10)
      : undefined;

    // Superadmin: can view all centers/teachers; optional teacherId filter
    if (role === UserRole.SUPERADMIN) {
      return this.testGeneratorService.listGeneratedTests(
        Number.isFinite(teacherIdQuery as number) ? teacherIdQuery : undefined,
      );
    }

    // Others: only their own
    return this.testGeneratorService.listGeneratedTests(userId);
  }

  @Get('generated/:id/variants')
  @RequireCenterPermissions(CenterPermissionKey.TEST_GENERATION)
  @ApiOperation({ summary: "Yaratilgan test variantlari ro'yxati" })
  @ApiResponse({ status: 200, description: 'Generated test variants list' })
  async listGeneratedTestVariants(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number | string; role?: UserRole } },
  ) {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;
    const isSuperadmin = req.user?.role === UserRole.SUPERADMIN;
    return this.testGeneratorService.listGeneratedTestVariants(
      id,
      userId,
      isSuperadmin,
    );
  }

  @Post('generated/:id/printable-html')
  @RequireCenterPermissions(CenterPermissionKey.TEST_GENERATION)
  @ApiOperation({
    summary:
      'Generated test uchun printable HTML yaratish (DBdan) (variantlar yo‘q bo‘lsa yaratadi)',
  })
  @ApiResponse({ status: 201, description: 'Printable HTML URLs returned' })
  async generatePrintableHtmlForGeneratedTest(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      ensureExists?: boolean;
    },
    @Request() req: { user: { id: number | string; role?: UserRole } },
  ) {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;
    return await this.testGeneratorService.generatePrintableHtmlForGeneratedTest(
      {
        generatedTestId: id,
        teacherId: userId,
        requesterRole: req.user?.role,
        ensureExists: body?.ensureExists,
      },
    );
  }

  @Delete('generated/:id')
  @RequireCenterPermissions(CenterPermissionKey.TEST_GENERATION)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Yaratilgan testni (generator) o'chirish" })
  @ApiResponse({
    status: 204,
    description: "Yaratilgan test muvaffaqiyatli o'chirildi",
  })
  async removeGeneratedTest(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number | string; role?: UserRole } },
  ): Promise<void> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    await this.testGeneratorService.removeGeneratedTest({
      generatedTestId: id,
      teacherId: userId,
      requesterRole: req.user?.role,
    });
  }

  @Post('generated/variant/:uniqueNumber/grade')
  @RequireCenterPermissions(CenterPermissionKey.CHECKING)
  @ApiOperation({ summary: 'Telefon skanerdan olingan javoblarni tekshirish' })
  @ApiResponse({ status: 200, description: 'Natijalar qaytariladi' })
  async gradeScanned(
    @Param('uniqueNumber') uniqueNumber: string,
    @Request()
    req: { user?: { center?: { id?: number | string } } },
    @Body()
    body: {
      // Example: ["A","C","-","B", ...]
      answers: string[];
      studentId?: number;
    },
  ) {
    if (!Array.isArray(body?.answers)) {
      return {
        statusCode: 400,
        message: "answers massiv bo'lishi kerak",
      };
    }

    return this.testGeneratorService.gradeScannedAnswers(
      uniqueNumber,
      body.answers,
      body.studentId,
      typeof req.user?.center?.id === 'number'
        ? req.user.center.id
        : typeof req.user?.center?.id === 'string'
          ? parseInt(req.user.center.id, 10)
          : undefined,
    );
  }

  @Get('results-list')
  @RequireCenterPermissions(CenterPermissionKey.REPORTS_TESTS)
  @ApiOperation({ summary: "Test natijalari ro'yxati" })
  @ApiResponse({ status: 200, description: 'Test natijalari', type: Object })
  async resultsList(
    @Request()
    req: { user?: { center?: { id?: number }; role?: string } },
    @Query('studentId') studentIdRaw?: string,
    @Query('uniqueNumber') uniqueNumber?: string,
    @Query('centerId') centerIdRaw?: string,
    @Query('subjectId') subjectIdRaw?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const requestCenterId =
      typeof req.user?.center?.id === 'number' ? req.user.center.id : undefined;

    const parseOptionalInt = (v?: string) => {
      if (!v) return undefined;
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : undefined;
    };

    const studentId = parseOptionalInt(studentIdRaw);
    const centerIdQuery = parseOptionalInt(centerIdRaw);
    const subjectId = parseOptionalInt(subjectIdRaw);
    const page = parseOptionalInt(pageRaw);
    const limit = parseOptionalInt(limitRaw);

    const centerId =
      centerIdQuery === undefined ? requestCenterId : centerIdQuery;
    // Only allow admin and teacher roles
    const role: string | undefined =
      typeof req.user === 'object' && req.user !== null
        ? (req.user as { role?: string }).role
        : undefined;
    if (role !== 'admin' && role !== 'teacher') {
      return {
        statusCode: 403,
        message: 'Faqat admin va o‘qituvchi ko‘ra oladi',
      };
    }
    return this.testGeneratorService.listResults({
      studentId,
      uniqueNumber,
      centerId,
      subjectId,
      q,
      from,
      to,
      page,
      limit,
    });
  }

  @Post('results/send-telegram')
  @RequireCenterPermissions(CenterPermissionKey.REPORTS_TESTS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tanlangan natijalarni Telegramga yuborish' })
  @ApiResponse({
    status: 200,
    description: 'Telegramga yuborish navbatga qo‘yildi',
  })
  async sendResultsToTelegram(
    @Request()
    req: { user?: { center?: { id?: number }; role?: string } },
    @Body() body: { ids?: number[] },
  ) {
    const centerId =
      typeof req.user?.center?.id === 'number' ? req.user.center.id : undefined;

    const role: string | undefined =
      typeof req.user === 'object' && req.user !== null
        ? (req.user as { role?: string }).role
        : undefined;
    if (role !== 'admin' && role !== 'teacher') {
      return {
        statusCode: 403,
        message: 'Faqat admin va o‘qituvchi yubora oladi',
      };
    }

    if (!centerId) {
      return {
        statusCode: 400,
        message: 'Center aniqlanmadi',
      };
    }

    return this.testGeneratorService.queueResultsToTelegram({
      centerId,
      ids: Array.isArray(body?.ids) ? body.ids : [],
    });
  }

  @Patch('results/:id')
  @RequireCenterPermissions(CenterPermissionKey.REPORTS_TESTS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Natija (correct/wrong) ni tahrirlash (faqat o'qituvchi)",
  })
  @ApiResponse({ status: 200, description: 'Natija yangilandi' })
  async updateResultCounts(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResultCountsDto,
    @Request()
    req: { user?: { center?: { id?: number }; role?: string } },
  ) {
    const centerId =
      typeof req.user?.center?.id === 'number' ? req.user.center.id : undefined;

    const role: string | undefined =
      typeof req.user === 'object' && req.user !== null
        ? (req.user as { role?: string }).role
        : undefined;
    if (role !== 'teacher') {
      return {
        statusCode: 403,
        message: "Faqat o'qituvchi tahrirlay oladi",
      };
    }
    if (!centerId) {
      return {
        statusCode: 400,
        message: 'Center aniqlanmadi',
      };
    }

    return this.testGeneratorService.updateResultCounts({
      centerId,
      id,
      correctCount:
        typeof dto?.correctCount === 'number' ? dto.correctCount : undefined,
      wrongCount:
        typeof dto?.wrongCount === 'number' ? dto.wrongCount : undefined,
    });
  }

  @Patch('results/:id/manual')
  @RequireCenterPermissions(CenterPermissionKey.REPORTS_TESTS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Natijani qo'lda kiritish (o'quvchi + jami savol + to'g'ri) (faqat o'qituvchi)",
  })
  @ApiResponse({ status: 200, description: 'Natija yangilandi' })
  async updateResultManual(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResultManualDto,
    @Request()
    req: { user?: { center?: { id?: number }; role?: string } },
  ) {
    const centerId =
      typeof req.user?.center?.id === 'number' ? req.user.center.id : undefined;

    const role: string | undefined =
      typeof req.user === 'object' && req.user !== null
        ? (req.user as { role?: string }).role
        : undefined;
    if (role !== 'teacher') {
      return {
        statusCode: 403,
        message: "Faqat o'qituvchi kiritishi mumkin",
      };
    }
    if (!centerId) {
      return {
        statusCode: 400,
        message: 'Center aniqlanmadi',
      };
    }

    return this.testGeneratorService.updateResultManual({
      centerId,
      id,
      studentId: dto.studentId,
      total: dto.total,
      correctCount: dto.correctCount,
    });
  }

  @Post('results/manual')
  @RequireCenterPermissions(CenterPermissionKey.REPORTS_TESTS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Natijani qo'lda kiritish (generated variant uniqueNumber orqali) (faqat o'qituvchi)",
  })
  @ApiResponse({ status: 200, description: 'Natija yaratildi/yangi' })
  async createOrUpdateResultManualByVariant(
    @Body() dto: CreateResultManualByVariantDto,
    @Request()
    req: {
      user?: { id?: number | string; center?: { id?: number }; role?: string };
    },
  ) {
    const centerId =
      typeof req.user?.center?.id === 'number' ? req.user.center.id : undefined;

    const role: string | undefined =
      typeof req.user === 'object' && req.user !== null
        ? (req.user as { role?: string }).role
        : undefined;
    if (role !== 'teacher') {
      return {
        statusCode: 403,
        message: "Faqat o'qituvchi kiritishi mumkin",
      };
    }
    if (!centerId) {
      return {
        statusCode: 400,
        message: 'Center aniqlanmadi',
      };
    }

    const teacherId =
      typeof req.user?.id === 'string'
        ? parseInt(req.user.id, 10)
        : typeof req.user?.id === 'number'
          ? req.user.id
          : undefined;
    if (!teacherId) {
      return {
        statusCode: 400,
        message: 'Teacher aniqlanmadi',
      };
    }

    return this.testGeneratorService.createOrUpdateResultManualByVariant({
      centerId,
      teacherId,
      uniqueNumber: dto.uniqueNumber,
      studentId: dto.studentId,
      total: dto.total,
      correctCount: dto.correctCount,
    });
  }

  @Get(':id')
  @RequireCenterPermissions(CenterPermissionKey.TESTS)
  @ApiOperation({ summary: "Testni ID bo'yicha olish" })
  @ApiResponse({
    status: 200,
    description: "Test ma'lumotlari",
    type: TestResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Test topilmadi' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number | string; role?: UserRole } },
  ): Promise<TestResponseDto> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    return this.testsService.findOne(id, userId, req.user?.role);
  }

  @Patch(':id')
  @RequireCenterPermissions(CenterPermissionKey.TESTS)
  @ApiOperation({ summary: 'Testni yangilash' })
  @ApiResponse({
    status: 200,
    description: 'Test muvaffaqiyatli yangilandi',
    type: TestResponseDto,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTestDto: UpdateTestDto,
    @Request() req: { user: { id: number | string; role?: UserRole } },
  ): Promise<TestResponseDto> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    return this.testsService.update(id, updateTestDto, userId, req.user?.role);
  }

  @Delete(':id')
  @RequireCenterPermissions(CenterPermissionKey.TESTS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Testni o'chirish" })
  @ApiResponse({ status: 204, description: "Test muvaffaqiyatli o'chirildi" })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number | string; role?: UserRole } },
  ): Promise<void> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    return this.testsService.remove(id, userId, req.user?.role);
  }

  @Post('generate')
  @RequireCenterPermissions(CenterPermissionKey.TEST_GENERATION)
  @ApiOperation({ summary: 'Random test yaratish' })
  @ApiResponse({
    status: 201,
    description: 'Test muvaffaqiyatli yaratildi',
  })
  async generateRandomTest(
    @Body() generateTestDto: GenerateTestDto,
    @Request() req: { user: { id: number | string } },
  ) {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    return this.testGeneratorService.generateRandomTest(
      generateTestDto,
      userId,
    );
  }

  @Post(':id/printable-html')
  @RequireCenterPermissions(CenterPermissionKey.TESTS)
  @ApiOperation({
    summary:
      'Manual test uchun bitta printable HTML variant + javoblar yaratish',
  })
  @ApiResponse({ status: 201, description: 'Printable HTML URL returned' })
  async generatePrintableHtmlForManualTest(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      shuffleQuestions?: boolean;
      shuffleAnswers?: boolean;
      ensureExists?: boolean;
      includeAnswers?: boolean;
      showTitleSheet?: boolean;
    },
    @Request() req: { user: { id: number | string; role?: UserRole } },
  ): Promise<{
    url: string;
    fileName: string;
    answerUrl: string;
    answerFileName: string;
    title: string;
  }> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    return await this.testGeneratorService.generatePrintableHtmlForManualTest({
      testId: id,
      teacherId: userId,
      requesterRole: req.user?.role,
      shuffleQuestions: body?.shuffleQuestions,
      shuffleAnswers: body?.shuffleAnswers,
      ensureExists: body?.ensureExists,
      includeAnswers: body?.includeAnswers,
      showTitleSheet: body?.showTitleSheet,
    });
  }

  // PDF generation endpoint removed
  @Post('generate/:nonce/pdf')
  @RequireCenterPermissions(CenterPermissionKey.TEST_GENERATION)
  @ApiOperation({
    summary:
      'Deprecated PDF route: returns printable HTML links for generated variants',
  })
  @ApiResponse({ status: 200, description: 'Printable HTML URLs returned' })
  async generatePrintableHtmlForGenerated(
    @Param('nonce') _nonce: string,
    @Body()
    body: {
      variants: TestVariant[];
      config: GenerateTestDto;
      subjectName: string;
    },
    @Request() req: { user: { id: number | string } },
  ): Promise<{
    files: {
      variantNumber: string;
      url: string;
      fileName: string;
      answerSheetUrl?: string;
    }[];
    title?: string;
    combinedUrl?: string;
  }> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;
    return await this.testGeneratorService.generatePrintableHtmlFiles({
      variants: body.variants,
      config: body.config,
      subjectName: body.subjectName,
      teacherId: userId,
    });
  }
}
