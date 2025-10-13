import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
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
  async getMyAssignedTests(@Request() req: { user: { id: number } }) {
    return this.service.getMyAssignedTests(Number(req.user.id));
  }

  // PDF download endpoint removed as part of cleanup

  @Get(':id/answers')
  @ApiOperation({ summary: "Blok test javoblarini ko'rish" })
  async getAnswers(
    @Param('id') id: string,
    @Request() req: { user: { id: number } },
  ) {
    return this.service.getTestAnswers(Number(id), Number(req.user.id));
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
    @Request() req: { user: { id: number } },
  ) {
    return this.service.generate(body, Number(req.user.id));
  }
}
