import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
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
    @Request() req,
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
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw new Error(
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
  @ApiOperation({ summary: 'Download exam variant PDF' })
  @ApiResponse({ status: 200, description: 'PDF file' })
  async downloadVariantPDF(
    @Param('variantId') variantId: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.examsService.generateVariantPDF(+variantId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="variant-${variantId}.pdf"`,
    );
    res.send(buffer);
  }

  @Get('variants/:variantId/answer-key')
  @ApiOperation({ summary: 'Download exam variant answer key PDF' })
  @ApiResponse({ status: 200, description: 'Answer key PDF file' })
  async downloadAnswerKeyPDF(
    @Param('variantId') variantId: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.examsService.generateAnswerKeyPDF(+variantId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="answer-key-${variantId}.pdf"`,
    );
    res.send(buffer);
  }

  @Get(':id/variants/pdf')
  @ApiOperation({ summary: 'Download all exam variants PDF' })
  @ApiResponse({ status: 200, description: 'All variants PDF file' })
  async downloadAllVariantsPDF(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.examsService.generateAllVariantsPDF(+id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="exam-${id}-variants.pdf"`,
    );
    res.send(buffer);
  }

  @Get(':id/variants/answer-keys')
  @ApiOperation({ summary: 'Download all exam answer keys PDF' })
  @ApiResponse({ status: 200, description: 'All answer keys PDF file' })
  async downloadAllAnswerKeysPDF(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.examsService.generateAllAnswerKeysPDF(+id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="exam-${id}-answer-keys.pdf"`,
    );
    res.send(buffer);
  }
}
