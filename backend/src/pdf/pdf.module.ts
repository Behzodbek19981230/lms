import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfService } from './pdf.service';
import { PuppeteerPdfService } from './puppeteer-pdf.service';
import { PdfController } from './pdf.controller';
import { ImprovedExamsService } from '../exams/improved-exams.service';
import { Test } from '../tests/entities/test.entity';
import { Question } from '../questions/entities/question.entity';
import { ExamVariant } from '../exams/entities/exam-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Test, Question, ExamVariant]),
  ],
  controllers: [PdfController],
  providers: [PdfService, PuppeteerPdfService, ImprovedExamsService],
  exports: [PdfService, PuppeteerPdfService, ImprovedExamsService],
})
export class PdfModule {}
