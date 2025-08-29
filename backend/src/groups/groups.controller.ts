import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';

@ApiTags('Groups')
@Controller('groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  async create(
    @Body() dto: CreateGroupDto,
    @Request() req,
  ): Promise<GroupResponseDto> {
    return this.groupsService.create(dto, req.user.id);
  }

  @Get()
  async findAll(@Request() req): Promise<GroupResponseDto[]> {
    return this.groupsService.listMy(req.user.id);
  }

  @Get('me')
  async listMy(@Request() req): Promise<GroupResponseDto[]> {
    return this.groupsService.listMy(req.user.id);
  }

  @Patch(':groupId/students')
  async addStudents(
    @Param('groupId') groupId: string,
    @Body('studentIds') studentIds: number[],
    @Request() req,
  ): Promise<GroupResponseDto> {
    return this.groupsService.addStudents(
      Number(groupId),
      studentIds || [],
      req.user.id,
    );
  }

  @Patch(':groupId/students/:studentId/remove')
  async removeStudent(
    @Param('groupId') groupId: string,
    @Param('studentId') studentId: string,
    @Request() req,
  ): Promise<GroupResponseDto> {
    return this.groupsService.removeStudent(
      Number(groupId),
      Number(studentId),
      req.user.id,
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateGroupDto>,
    @Request() req,
  ): Promise<GroupResponseDto> {
    return this.groupsService.update(Number(id), dto, req.user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req): Promise<void> {
    return this.groupsService.delete(Number(id), req.user.id);
  }
}
