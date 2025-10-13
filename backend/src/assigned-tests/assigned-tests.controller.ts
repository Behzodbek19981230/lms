import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssignedTestsService } from './assigned-tests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Response } from 'express';

@ApiTags('AssignedTests')
@Controller('assigned-tests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssignedTestsController {
  constructor(private readonly service: AssignedTestsService) {}

  @Get()
  @ApiOperation({ summary: "O'qituvchining blok testlarini olish" })
  async getMyAssignedTests(@Request() req) {
    return this.service.getMyAssignedTests(req.user.id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Blok testni PDF formatida yuklab olish' })
  async downloadPdf(
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.service.generatePdf(Number(id), req.user.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="block-test-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get(':id/answers')
  @ApiOperation({ summary: "Blok test javoblarini ko'rish" })
  async getAnswers(@Param('id') id: string, @Request() req) {
    return this.service.getTestAnswers(Number(id), req.user.id);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Guruh uchun blok test generatsiya qilish' })
  async generate(
    @Body()
    body: {
      baseTestId: number;
      groupId: number;
      numQuestions: number;
      shuffleAnswers?: boolean;
      title?: string;
    },
    @Request() req,
  ) {
    return this.service.generate(body, req.user.id);
  }
}
