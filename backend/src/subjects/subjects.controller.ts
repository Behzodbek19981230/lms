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
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectResponseDto } from './dto/subject-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Subjects')
@Controller('subjects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi fan yaratish' })
  @ApiResponse({
    status: 201,
    description: 'Fan muvaffaqiyatli yaratildi',
    type: SubjectResponseDto,
  })
  @ApiBody({ type: CreateSubjectDto })
  async create(
    @Body() createSubjectDto: CreateSubjectDto,
    @Request() req,
  ): Promise<SubjectResponseDto> {
    return this.subjectsService.create(createSubjectDto, req.user?.id);
  }

  @Get()
  @ApiOperation({ summary: "Fanlar ro'yxatini olish" })
  @ApiResponse({
    status: 200,
    description: "Fanlar ro'yxati",
    type: [SubjectResponseDto],
  })
  async findAll(@Request() req): Promise<SubjectResponseDto[]> {
    console.log('User ID:', req.user);
    return this.subjectsService.findAll(req.user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Fanlar statistikasi' })
  @ApiResponse({ status: 200, description: 'Fanlar statistikasi' })
  async getStats(@Request() req) {
    return this.subjectsService.getSubjectStats(req.user?.id);
  }

  @Get(':id')
  @ApiOperation({ summary: "Fanni ID bo'yicha olish" })
  @ApiResponse({
    status: 200,
    description: "Fan ma'lumotlari",
    type: SubjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Fan topilmadi' })
  async findOne(
    @Param('id') id: number,
    @Request() req,
  ): Promise<SubjectResponseDto> {
    return this.subjectsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Fanni yangilash' })
  @ApiResponse({
    status: 200,
    description: 'Fan muvaffaqiyatli yangilandi',
    type: SubjectResponseDto,
  })
  async update(
    @Param('id') id: number,
    @Body() updateSubjectDto: UpdateSubjectDto,
    @Request() req,
  ): Promise<SubjectResponseDto> {
    return this.subjectsService.update(id, updateSubjectDto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Fanni o'chirish" })
  @ApiResponse({ status: 204, description: "Fan muvaffaqiyatli o'chirildi" })
  async remove(@Param('id') id: number, @Request() req): Promise<void> {
    return this.subjectsService.remove(id, req.user.id);
  }
}
