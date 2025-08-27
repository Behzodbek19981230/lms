import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssignedTestsService } from './assigned-tests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AssignedTests')
@Controller('assigned-tests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssignedTestsController {
  constructor(private readonly service: AssignedTestsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Guruh uchun blok test generatsiya qilish' })
  async generate(
    @Body()
    body: { baseTestId: number; groupId: number; numQuestions: number; shuffleAnswers?: boolean; title?: string },
    @Request() req,
  ) {
    return this.service.generate(body, req.user.id);
  }
}
