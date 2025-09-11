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
  Res,
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
    @Request() req,
  ): Promise<TestResponseDto> {
    return this.testsService.create(createTestDto, req.user.id);
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
    @Query('subjectid') subjectid: number,
    @Request() req,
  ): Promise<TestResponseDto[]> {
    if (subjectid) {
      return this.testsService.findBySubject(subjectid, req.user.id);
    }
    return this.testsService.findAllByTeacher(req.user.id);
  }

  @Get('my')
  @ApiOperation({ summary: "O'qituvchining barcha testlarini olish" })
  @ApiResponse({
    status: 200,
    description: "Testlar ro'yxati",
    type: [TestResponseDto],
  })
  async findMyTests(@Request() req): Promise<TestResponseDto[]> {
    return this.testsService.findAllByTeacher(req.user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Testlar statistikasi' })
  @ApiResponse({
    status: 200,
    description: 'Testlar statistikasi',
    type: TestStatsDto,
  })
  async getStats(@Request() req): Promise<TestStatsDto> {
    return this.testsService.getTestStats(req.user.id);
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
    @Param('id') id: number,
    @Request() req,
  ): Promise<TestResponseDto> {
    return this.testsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Testni yangilash' })
  @ApiResponse({
    status: 200,
    description: 'Test muvaffaqiyatli yangilandi',
    type: TestResponseDto,
  })
  async update(
    @Param('id') id: number,
    @Body() updateTestDto: UpdateTestDto,
    @Request() req,
  ): Promise<TestResponseDto> {
    return this.testsService.update(id, updateTestDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Testni o'chirish" })
  @ApiResponse({ status: 204, description: "Test muvaffaqiyatli o'chirildi" })
  async remove(@Param('id') id: number, @Request() req): Promise<void> {
    return this.testsService.remove(id, req.user.id);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Random test yaratish' })
  @ApiResponse({
    status: 201,
    description: 'Test muvaffaqiyatli yaratildi',
  })
  async generateRandomTest(
    @Body() generateTestDto: GenerateTestDto,
    @Request() req,
  ) {
    return this.testGeneratorService.generateRandomTest(
      generateTestDto,
      req.user.id,
    );
  }

  @Post('generate/:id/pdf')
  @ApiOperation({ summary: 'Yaratilgan test uchun PDF generatsiya qilish' })
  @ApiResponse({
    status: 200,
    description: 'PDF muvaffaqiyatli yaratildi',
  })
  async generateTestPDF(
    @Param('id') id: string,
    @Body()
    body: {
      variants: any[];
      config: GenerateTestDto;
      subjectName: string;
    },
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.testGeneratorService.generateTestPDF(
      body.variants as any,
      body.config,
      body.subjectName,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="generated_test_${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}
