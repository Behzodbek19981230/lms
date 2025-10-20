import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
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
import {
  TestGeneratorService,
  type GenerateTestDto,
} from './test-generator.service';
import { TestVariant } from './test-generator.service';
import { AnswerSheetScannerService } from './answer-sheet-scanner.service';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
const memoryStorage = multer.memoryStorage();

@ApiTags('Tests')
@Controller('tests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TestsController {
  constructor(
    private readonly testsService: TestsService,
    private readonly testGeneratorService: TestGeneratorService,
    private readonly scanner: AnswerSheetScannerService,
  ) {}

  @Post()
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

  // Upload an image of the filled answer-sheet and return detected answers (letters) for grading
  @Post('scanner/answer-sheet/upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage }))
  @ApiOperation({ summary: 'Javob varagi rasmini skanerlash (telefon surat)' })
  @ApiResponse({ status: 200, description: 'Skaner natijalari' })
  async scanAnswerSheet(
    @UploadedFile() file: Express.Multer.File,
    @Body('totalQuestions') totalQuestionsRaw?: string,
  ) {
    if (!file?.buffer?.length) {
      return { statusCode: 400, message: 'Fayl topilmadi' };
    }

    // 1) Detect uniqueNumber (grid -> OCR)
    const detect = await this.scanner.scanAndDetectUnique(file.buffer);

    // 2) Determine total questions: prefer DB by unique, fallback to provided totalQuestions
    let totalQuestions = Number(totalQuestionsRaw || '0') || 0;
    if (!totalQuestions && detect.uniqueNumber) {
      try {
        type AnswerKey =
          | { total?: number; answers?: string[] }
          | null
          | undefined;
        const variantInfoRaw =
          await this.testGeneratorService.getVariantByUniqueNumber(
            detect.uniqueNumber,
          );
        const variantInfo = variantInfoRaw as { answerKey?: AnswerKey };
        const key = variantInfo?.answerKey;
        if (Array.isArray(key?.answers) && key.answers.length > 0) {
          totalQuestions = key.answers.length;
        } else if (typeof key?.total === 'number' && key.total > 0) {
          totalQuestions = key.total;
        }
      } catch {
        // ignore — maybe unique not found in DB
      }
    }

    // 3) If we have totalQuestions, detect answers from image
    if (totalQuestions > 0) {
      const detected = await this.scanner.detectAnswersFromImage(
        file.buffer,
        totalQuestions,
      );
      return {
        uniqueNumber: detect.uniqueNumber,
        method: detect.method,
        totalQuestions,
        answers: detected.answers,
      };
    }

    // 4) Try auto-detect totalQuestions and answers without prior knowledge
    const auto = await this.scanner.detectAnswersAuto(file.buffer);
    if (auto.totalQuestions > 0) {
      return {
        uniqueNumber: detect.uniqueNumber,
        method: detect.method,
        totalQuestions: auto.totalQuestions,
        answers: auto.answers,
      };
    }

    // Still unknown — return just unique and ask for clearer input
    return {
      uniqueNumber: detect.uniqueNumber,
      method: detect.method,
      needsTotalQuestions: true,
      message:
        'Savollar soni aniqlanmadi. Iltimos, yanada tiniq rasm yuklang yoki totalQuestions yuboring.',
    };
  }

  // Detect only answers (A/B/C/D) from the uploaded answer-sheet image with a heuristics-based approach
  @Post('scanner/answer-sheet/detect-answers')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage }))
  @ApiOperation({
    summary: 'Rasm ichidan belgilangan javoblarni aniqlash (A/B/C/D) — beta',
  })
  @ApiResponse({
    status: 200,
    description: 'Aniqlangan javoblar massivi qaytariladi',
  })
  async detectAnswersOnly(
    @UploadedFile() file: Express.Multer.File,
    @Body('totalQuestions') totalQuestionsRaw?: string,
  ) {
    if (!file?.buffer?.length) {
      return { statusCode: 400, message: 'Fayl topilmadi' };
    }
    const totalQuestions = Number(totalQuestionsRaw || '0') || 0;
    if (!totalQuestions || totalQuestions < 0) {
      return { statusCode: 400, message: "totalQuestions noto'g'ri" };
    }
    const detected = await this.scanner.detectAnswersFromImage(
      file.buffer,
      totalQuestions,
    );
    return detected;
  }

  // OCR uniqueNumber from uploaded image
  @Post('scanner/answer-sheet/ocr-unique')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage }))
  @ApiOperation({ summary: 'Rasmda uniqueNumber (ID)ni OCR bilan topish' })
  @ApiResponse({ status: 200, description: 'Topilgan ID qaytariladi' })
  async ocrUnique(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      return { statusCode: 400, message: 'Fayl topilmadi' };
    }
    return this.scanner.ocrUniqueNumber(file.buffer);
  }

  // One-shot: upload image -> detect uniqueNumber (grid/OCR) -> returns uniqueNumber only
  @Post('scanner/answer-sheet/detect-unique')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage }))
  @ApiOperation({ summary: "UniqueNumber (ID)ni to'g'ridan-to'g'ri aniqlash" })
  @ApiResponse({ status: 200, description: 'Topilgan ID qaytariladi' })
  async detectUnique(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      return { statusCode: 400, message: 'Fayl topilmadi' };
    }
    return this.scanner.scanAndDetectUnique(file.buffer);
  }

  // One-shot: upload image -> detect unique -> then later frontend calls /grade with answers[]

  @Post('scanner/answer-sheet/auto-grade')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage }))
  @ApiOperation({
    summary:
      'Rasmni yuklab: ID ni topish va ixtiyoriy answers bilan darhol tekshirish',
  })
  @ApiResponse({
    status: 200,
    description: 'Auto-grade natijasi yoki uniqueNumber',
  })
  async autoGrade(
    @UploadedFile() file: Express.Multer.File,
    @Body('answers') answersRaw?: string,
    @Body('totalQuestions') totalQuestionsRaw?: string,
  ) {
    if (!file?.buffer?.length) {
      return { statusCode: 400, message: 'Fayl topilmadi' };
    }

    const detect = await this.scanner.scanAndDetectUnique(file.buffer);
    if (!detect.uniqueNumber) {
      return {
        statusCode: 422,
        message:
          "UniqueNumber topilmadi. Iltimos, rasm sifatini yaxshilang yoki ID blok aniq ko'rinsin.",
      };
    }

    // Optional answers JSON
    let parsed: unknown = undefined;
    if (typeof answersRaw === 'string' && answersRaw.trim().length > 0) {
      try {
        parsed = JSON.parse(answersRaw);
      } catch {
        return { statusCode: 400, message: "answers noto'g'ri JSON" };
      }
    }

    if (Array.isArray(parsed)) {
      const res = await this.testGeneratorService.gradeScannedAnswers(
        detect.uniqueNumber,
        parsed as string[],
      );
      return {
        uniqueNumber: detect.uniqueNumber,
        method: detect.method,
        result: res,
      };
    }

    // No answers provided — attempt auto detection from image if we know totalQuestions
    let totalQuestions = Number(totalQuestionsRaw || '0') || 0;
    if (!totalQuestions && detect.uniqueNumber) {
      try {
        type AnswerKey =
          | { total?: number; answers?: string[] }
          | null
          | undefined;
        const variantInfoRaw =
          await this.testGeneratorService.getVariantByUniqueNumber(
            detect.uniqueNumber,
          );
        const variantInfo = variantInfoRaw as { answerKey?: AnswerKey };
        const key = variantInfo?.answerKey;
        if (Array.isArray(key?.answers) && key.answers.length > 0) {
          totalQuestions = key.answers.length;
        } else if (typeof key?.total === 'number' && key.total > 0) {
          totalQuestions = key.total;
        }
      } catch {
        // ignore
      }
    }
    if (totalQuestions > 0) {
      const detected = await this.scanner.detectAnswersFromImage(
        file.buffer,
        totalQuestions,
      );
      const graded = await this.testGeneratorService.gradeScannedAnswers(
        detect.uniqueNumber,
        detected.answers,
      );
      return {
        uniqueNumber: detect.uniqueNumber,
        method: detect.method,
        autoDetectedAnswers: detected.answers,
        result: graded,
      };
    }
    // Try fully automatic detection
    const autoA = await this.scanner.detectAnswersAuto(file.buffer);
    if (autoA.totalQuestions > 0) {
      const graded = await this.testGeneratorService.gradeScannedAnswers(
        detect.uniqueNumber,
        autoA.answers,
      );
      return {
        uniqueNumber: detect.uniqueNumber,
        method: detect.method,
        autoDetectedAnswers: autoA.answers,
        result: graded,
      };
    }

    // Try fully automatic detection of totalQuestions and answers from the image
    const autoB = await this.scanner.detectAnswersAuto(file.buffer);
    if (autoB.totalQuestions > 0) {
      const graded = await this.testGeneratorService.gradeScannedAnswers(
        detect.uniqueNumber,
        autoB.answers,
      );
      return {
        uniqueNumber: detect.uniqueNumber,
        method: detect.method,
        autoDetectedAnswers: autoB.answers,
        result: graded,
      };
    }

    // Still no answers — return unique and let client call /grade later
    return {
      uniqueNumber: detect.uniqueNumber,
      method: detect.method,
      needsAnswers: true,
    };
  }

  // Alias: more intuitive path name that does the same as auto-grade
  @Post('scanner/answer-sheet/grade')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage }))
  @ApiOperation({
    summary:
      'Rasmni yuklab baholash: ID autodetect va ixtiyoriy answers bilan tekshirish',
  })
  @ApiResponse({ status: 200, description: 'Grade natijasi yoki uniqueNumber' })
  async gradeFromUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body('answers') answersRaw?: string,
    @Body('totalQuestions') totalQuestionsRaw?: string,
  ) {
    if (!file?.buffer?.length) {
      return { statusCode: 400, message: 'Fayl topilmadi' };
    }
    const detect = await this.scanner.scanAndDetectUnique(file.buffer);
    if (!detect.uniqueNumber) {
      return {
        statusCode: 422,
        message:
          "UniqueNumber topilmadi. Iltimos, rasm sifatini yaxshilang yoki ID blok aniq ko'rinsin.",
      };
    }
    let parsed: unknown = undefined;
    if (typeof answersRaw === 'string' && answersRaw.trim().length > 0) {
      try {
        parsed = JSON.parse(answersRaw);
      } catch {
        return { statusCode: 400, message: "answers noto'g'ri JSON" };
      }
    }
    if (Array.isArray(parsed)) {
      const res = await this.testGeneratorService.gradeScannedAnswers(
        detect.uniqueNumber,
        parsed as string[],
      );
      return {
        uniqueNumber: detect.uniqueNumber,
        method: detect.method,
        result: res,
      };
    }
    // If answers not provided, try auto-detect, deriving totalQuestions from DB if possible
    let totalQuestions = Number(totalQuestionsRaw || '0') || 0;
    if (!totalQuestions && detect.uniqueNumber) {
      try {
        type AnswerKey =
          | { total?: number; answers?: string[] }
          | null
          | undefined;
        const variantInfoRaw =
          await this.testGeneratorService.getVariantByUniqueNumber(
            detect.uniqueNumber,
          );
        const variantInfo = variantInfoRaw as { answerKey?: AnswerKey };
        const key = variantInfo?.answerKey;
        if (Array.isArray(key?.answers) && key.answers.length > 0) {
          totalQuestions = key.answers.length;
        } else if (typeof key?.total === 'number' && key.total > 0) {
          totalQuestions = key.total;
        }
      } catch {
        // ignore
      }
    }
    if (totalQuestions > 0) {
      const detected = await this.scanner.detectAnswersFromImage(
        file.buffer,
        totalQuestions,
      );
      const graded = await this.testGeneratorService.gradeScannedAnswers(
        detect.uniqueNumber,
        detected.answers,
      );
      return {
        uniqueNumber: detect.uniqueNumber,
        method: detect.method,
        autoDetectedAnswers: detected.answers,
        result: graded,
      };
    }
    return {
      uniqueNumber: detect.uniqueNumber,
      method: detect.method,
      needsAnswers: true,
    };
  }

  @Get()
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
  @ApiOperation({ summary: 'Telefon skanerdan olingan javoblarni tekshirish' })
  @ApiResponse({ status: 200, description: 'Natijalar qaytariladi' })
  async gradeScanned(
    @Param('uniqueNumber') uniqueNumber: string,
    @Body()
    body: {
      // Example: ["A","C","-","B", ...]
      answers: string[];
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
    );
  }

  @Get(':id')
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

  // PDF generation endpoint removed
  @Post('generate/:nonce/pdf')
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
