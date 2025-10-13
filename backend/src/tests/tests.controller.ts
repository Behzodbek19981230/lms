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

  @Get(':id')
  @ApiOperation({ summary: "Testni ID bo'yicha olish" })
  @ApiResponse({
    status: 200,
    description: "Test ma'lumotlari",
    type: TestResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Test topilmadi' })
  async findOne(
    @Param('id') id: string,
    @Request() req: { user: { id: number | string } },
  ): Promise<TestResponseDto> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    return this.testsService.findOne(parseInt(id, 10), userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Testni yangilash' })
  @ApiResponse({
    status: 200,
    description: 'Test muvaffaqiyatli yangilandi',
    type: TestResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateTestDto: UpdateTestDto,
    @Request() req: { user: { id: number | string } },
  ): Promise<TestResponseDto> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    return this.testsService.update(parseInt(id, 10), updateTestDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Testni o'chirish" })
  @ApiResponse({ status: 204, description: "Test muvaffaqiyatli o'chirildi" })
  async remove(
    @Param('id') id: string,
    @Request() req: { user: { id: number | string } },
  ): Promise<void> {
    const userId =
      typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;

    return this.testsService.remove(parseInt(id, 10), userId);
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
    files: { variantNumber: string; url: string; fileName: string }[];
    title?: string;
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
