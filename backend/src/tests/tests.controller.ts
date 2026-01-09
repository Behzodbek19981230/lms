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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireCenterPermissions } from '../centers/permissions/center-permission.decorator';
import { CenterPermissionKey } from '../centers/permissions/center-permissions';
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
  async listGeneratedTests(@Request() req: { user: { id: number | string } }) {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;
    return this.testGeneratorService.listGeneratedTests(userId);
  }

  @Get('generated/:id/variants')
  @RequireCenterPermissions(CenterPermissionKey.TEST_GENERATION)
  @ApiOperation({ summary: "Yaratilgan test variantlari ro'yxati" })
  @ApiResponse({ status: 200, description: 'Generated test variants list' })
  async listGeneratedTestVariants(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number | string } },
  ) {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;
    return this.testGeneratorService.listGeneratedTestVariants(id, userId);
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
    @Query('studentId') studentId?: number,
    @Query('uniqueNumber') uniqueNumber?: string,
    @Query('centerId') centerId?: number,
  ) {
    const requestCenterId =
      typeof req.user?.center?.id === 'number' ? req.user.center.id : undefined;
    centerId = centerId === undefined ? requestCenterId : centerId;
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
    @Request() req: { user: { id: number | string } },
  ): Promise<TestResponseDto> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    return this.testsService.findOne(id, userId);
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
    @Request() req: { user: { id: number | string } },
  ): Promise<TestResponseDto> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    return this.testsService.update(id, updateTestDto, userId);
  }

  @Delete(':id')
  @RequireCenterPermissions(CenterPermissionKey.TESTS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Testni o'chirish" })
  @ApiResponse({ status: 204, description: "Test muvaffaqiyatli o'chirildi" })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number | string } },
  ): Promise<void> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    return this.testsService.remove(id, userId);
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
    @Request() req: { user: { id: number | string } },
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
