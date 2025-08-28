import {
    BadRequestException,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionResponseDto } from './dto/question-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Questions')
@Controller('questions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi savol yaratish' })
  @ApiResponse({
    status: 201,
    description: 'Savol muvaffaqiyatli yaratildi',
    type: QuestionResponseDto,
  })
  async create(
    @Body() createQuestionDto: CreateQuestionDto,
    @Request() req,
  ): Promise<QuestionResponseDto> {
    return this.questionsService.create(createQuestionDto, req?.user?.id);
  }

  @Get()
  @ApiOperation({ summary: "Savollarni olish (test yoki fan bo‘yicha)" })
  @ApiResponse({
    status: 200,
    description: "Savollar ro'yxati",
    type: [QuestionResponseDto],
  })
  async findAll(
    @Query('testId') testId: number,
    @Query('subjectId') subjectId: number,
    @Request() req,
  ): Promise<QuestionResponseDto[]> {
    const teacherid = req.user.id;
  
    if (testId) {
      return this.questionsService.findAllByTest(testId, teacherid);
    }
  
    if (subjectId) {
      return this.questionsService.findAllBySubject(subjectId, teacherid);
    }
  
    throw new BadRequestException('testId yoki subjectId kerak');
  }

  @Get(':id')
  @ApiOperation({ summary: "Savolni ID bo'yicha olish" })
  @ApiResponse({
    status: 200,
    description: "Savol ma'lumotlari",
    type: QuestionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Savol topilmadi' })
  async findOne(@Param('id') id: number, @Request() req): Promise<QuestionResponseDto> {
    return this.questionsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Savolni yangilash' })
  @ApiResponse({
    status: 200,
    description: 'Savol muvaffaqiyatli yangilandi',
    type: QuestionResponseDto,
  })
  async update(
    @Param('id') id: number,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @Request() req,
  ): Promise<QuestionResponseDto> {
    return this.questionsService.update(id, updateQuestionDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Savolni o'chirish" })
  @ApiResponse({ status: 204, description: "Savol muvaffaqiyatli o'chirildi" })
  async remove(@Param('id') id: number, @Request() req): Promise<void> {
    return this.questionsService.remove(id, req.user.id);
  }

  @Patch('reorder/:testId')
  @ApiOperation({ summary: "Savollar tartibini o'zgartirish" })
  @ApiResponse({
    status: 200,
    description: "Savollar tartibi o'zgartirildi",
    type: [QuestionResponseDto],
  })
  async reorder(
    @Param('testId') testid: number,
    @Body() body: { questionIds: string[] },
    @Request() req,
  ): Promise<QuestionResponseDto[]> {
    return this.questionsService.reorderQuestions(
      testid,
      body.questionIds,
      req.user.id,
    );
  }
}
