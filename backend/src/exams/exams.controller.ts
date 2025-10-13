import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExamsService } from './exams.service';
import type { CreateExamDto, GenerateVariantsDto } from './exams.service';
import { Exam, ExamStatus } from './entities/exam.entity';
import { ExamVariant } from './entities/exam-variant.entity';

@ApiTags('Exams')
@Controller('exams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new exam' })
  @ApiResponse({ status: 201, description: 'Exam created successfully' })
  async createExam(
    @Body() createExamDto: CreateExamDto,
    @Request() req: { user: { id: number } },
  ): Promise<Exam> {
    return this.examsService.createExam({
      ...createExamDto,
      teacherId: req.user.id,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all exams for the current teacher' })
  @ApiResponse({ status: 200, description: 'List of exams' })
  async getExams(@Request() req): Promise<Exam[]> {
    return this.examsService.findAllByTeacher(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exam by ID' })
  @ApiResponse({ status: 200, description: 'Exam details' })
  async getExam(@Param('id') id: string): Promise<Exam> {
    return this.examsService.findById(+id);
  }

  @Get('variants/:variantId/debug')
  @ApiOperation({ summary: 'Debug variant data for PDF generation' })
  @ApiResponse({ status: 200, description: 'Variant debug info' })
  async debugVariant(@Param('variantId') variantId: string): Promise<any> {
    return this.examsService.debugVariant(+variantId);
  }

  @Post(':id/generate-variants')
  @ApiOperation({ summary: 'Generate variants for an exam' })
  @ApiResponse({ status: 201, description: 'Variants generated successfully' })
  async generateVariants(
    @Param('id') id: string,
    @Body() generateVariantsDto: GenerateVariantsDto,
  ): Promise<ExamVariant[]> {
    return this.examsService.generateVariants({
      ...generateVariantsDto,
      examId: +id,
    });
  }

  @Get(':id/variants')
  @ApiOperation({ summary: 'Get all variants for an exam' })
  @ApiResponse({ status: 200, description: 'List of variants' })
  async getExamVariants(@Param('id') id: string): Promise<ExamVariant[]> {
    return this.examsService.getExamVariants(+id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update exam status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateExamStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ): Promise<Exam> {
    // Coerce and validate incoming status
    const allowed = Object.values(ExamStatus);
    if (!allowed.includes(status as ExamStatus)) {
      throw new BadRequestException(
        `Invalid status: ${status}. Allowed: ${allowed.join(', ')}`,
      );
    }
    return this.examsService.updateExamStatus(+id, status as ExamStatus);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an exam' })
  @ApiResponse({ status: 200, description: 'Exam deleted successfully' })
  async deleteExam(@Param('id') id: string): Promise<void> {
    return this.examsService.deleteExam(+id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start an exam' })
  @ApiResponse({ status: 200, description: 'Exam started successfully' })
  async startExam(@Param('id') id: string): Promise<Exam> {
    return this.examsService.updateExamStatus(+id, ExamStatus.IN_PROGRESS);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete an exam' })
  @ApiResponse({ status: 200, description: 'Exam completed successfully' })
  async completeExam(@Param('id') id: string): Promise<Exam> {
    return this.examsService.updateExamStatus(+id, ExamStatus.COMPLETED);
  }

  @Post(':id/schedule')
  @ApiOperation({ summary: 'Schedule an exam' })
  @ApiResponse({ status: 200, description: 'Exam scheduled successfully' })
  async scheduleExam(@Param('id') id: string): Promise<Exam> {
    return this.examsService.updateExamStatus(+id, ExamStatus.SCHEDULED);
  }

  @Get('variants/:variantId/pdf')
  @ApiOperation({
    summary: 'Deprecated: Redirect to printable HTML instead of PDF',
  })
  @ApiResponse({ status: 303, description: 'Redirects to printable HTML file' })
  async downloadVariantPDF(
    @Param('variantId') variantId: string,
    @Res() res: Response,
  ) {
    // Generate printable HTML file and redirect to its public URL
    const { url } =
      await this.examsService.generateVariantPrintableFile(+variantId);

    return res.send({ url });
  }

  @Get('variants/:variantId/html')
  @ApiOperation({ summary: 'Preview exam variant as HTML (browser printable)' })
  @ApiResponse({ status: 200, description: 'HTML content' })
  async previewVariantHTML(
    @Param('variantId') variantId: string,
    @Res() res: Response,
  ): Promise<void> {
    const html = await this.examsService.generateVariantHTML(+variantId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Post('variants/:variantId/printable')
  @ApiOperation({
    summary: 'Generate printable HTML file for a variant and return its URL',
  })
  @ApiResponse({
    status: 201,
    description: 'Printable HTML generated',
    type: Object,
  })
  async createPrintableHtml(
    @Param('variantId') variantId: string,
  ): Promise<{ url: string }> {
    const { url } =
      await this.examsService.generateVariantPrintableFile(+variantId);
    return { url };
  }

  // All PDF and Telegram-related endpoints removed as part of PDF cleanup
}
