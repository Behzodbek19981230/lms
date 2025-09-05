import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { PdfService } from './pdf.service';
import { PuppeteerPdfService } from './puppeteer-pdf.service';
import { ImprovedExamsService } from '../exams/improved-exams.service';

@ApiTags('PDF')
@Controller('pdf')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PdfController {
  constructor(
    private pdfService: PdfService,
    private puppeteerPdfService: PuppeteerPdfService,
    private improvedExamsService: ImprovedExamsService,
  ) {}

  @Get('test/:testId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Generate PDF for test' })
  @ApiResponse({ status: 200, description: 'PDF generated successfully' })
  @ApiQuery({ name: 'method', enum: ['pdfkit', 'puppeteer'], required: false })
  @ApiQuery({ name: 'isAnswerKey', type: 'boolean', required: false })
  @ApiQuery({ name: 'variantNumber', type: 'string', required: false })
  @ApiQuery({ name: 'studentName', type: 'string', required: false })
  async generateTestPDF(
    @Param('testId') testId: string,
    @Res() res: Response,
    @Query('method') method: 'pdfkit' | 'puppeteer' = 'pdfkit',
    @Query('isAnswerKey') isAnswerKey: boolean = false,
    @Query('variantNumber') variantNumber?: string,
    @Query('studentName') studentName?: string,
  ) {
    try {
      const pdfBuffer = await this.improvedExamsService.generateTestPDF(
        parseInt(testId),
        {
          method,
          isAnswerKey,
          variantNumber,
          studentName,
        }
      );

      const filename = `test_${testId}${variantNumber ? `_variant_${variantNumber}` : ''}${isAnswerKey ? '_answers' : ''}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      throw new BadRequestException(`PDF yaratishda xatolik: ${error.message}`);
    }
  }

  @Get('exam-variant/:variantId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Generate PDF for exam variant' })
  @ApiResponse({ status: 200, description: 'PDF generated successfully' })
  @ApiQuery({ name: 'method', enum: ['pdfkit', 'puppeteer'], required: false })
  @ApiQuery({ name: 'isAnswerKey', type: 'boolean', required: false })
  async generateExamVariantPDF(
    @Param('variantId') variantId: string,
    @Query('method') method: 'pdfkit' | 'puppeteer' = 'pdfkit',
    @Query('isAnswerKey') isAnswerKey: boolean = false,
    @Res() res: Response,
  ) {
    try {
      const pdfBuffer = await this.improvedExamsService.generateExamVariantPDF(
        parseInt(variantId),
        { method, isAnswerKey }
      );

      const filename = `exam_variant_${variantId}${isAnswerKey ? '_answers' : ''}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      throw new BadRequestException(`PDF yaratishda xatolik: ${error.message}`);
    }
  }

  @Get('test/:testId/debug')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Test PDF generation methods' })
  @ApiResponse({ status: 200, description: 'PDF generation test results' })
  async testPDFGeneration(@Param('testId') testId: string) {
    return this.improvedExamsService.testPDFGeneration(parseInt(testId));
  }

  @Post('test/:testId/html-preview')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Generate HTML preview for test' })
  @ApiResponse({ status: 200, description: 'HTML preview generated' })
  async generateHTMLPreview(
    @Param('testId') testId: string,
    @Res() res: Response,
    @Query('isAnswerKey') isAnswerKey: boolean = false,
    @Query('variantNumber') variantNumber?: string,
    @Query('studentName') studentName?: string,
  ) {
    try {
      // Test ma'lumotlarini olish
      const questions = await this.improvedExamsService.getTestQuestions(parseInt(testId));
      
      const testData = {
        title: `Test ${testId}`,
        subject: 'Test Subject',
        questions: questions.map(q => ({
          text: q.text,
          type: q.type,
          points: q.points,
          imageBase64: q.imageBase64,
          answers: q.answers?.map(a => ({
            text: a.text,
            isCorrect: a.isCorrect
          }))
        })),
        variantNumber,
        studentName,
        isAnswerKey
      };

      const html = this.puppeteerPdfService.generateTestHTML(testData);
      
      res.set('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      throw new BadRequestException(`HTML yaratishda xatolik: ${error.message}`);
    }
  }
}
