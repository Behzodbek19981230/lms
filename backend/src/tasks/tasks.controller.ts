import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RequireCenterPermissions } from '../centers/permissions/center-permission.decorator';
import { CenterPermissionKey } from '../centers/permissions/center-permissions';
import { TasksService } from './tasks.service';
import { BulkTasksDto } from './dto/tasks.dto';

type RequestWithUser = { user: { id: number } };

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('bulk')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(
    CenterPermissionKey.TASKS as unknown as CenterPermissionKey,
  )
  async saveBulk(@Body() dto: BulkTasksDto, @Request() req: RequestWithUser) {
    return this.tasksService.saveBulk(dto, Number(req.user.id));
  }

  @Get('not-done/today/:groupId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(
    CenterPermissionKey.TASKS as unknown as CenterPermissionKey,
  )
  async getTodayNotDone(
    @Param('groupId') groupId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.tasksService.getTodayNotDone(
      Number(groupId),
      Number(req.user.id),
    );
  }

  @Get('not-done/:groupId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(
    CenterPermissionKey.TASKS as unknown as CenterPermissionKey,
  )
  async getNotDoneStudentIds(
    @Param('groupId') groupId: string,
    @Query('date') date: string | undefined,
    @Request() req: RequestWithUser,
  ) {
    const service = this.tasksService as unknown as {
      getNotDoneStudentIds: (
        groupId: number,
        userId: number,
        date?: string,
      ) => Promise<number[]>;
    };

    return await service.getNotDoneStudentIds(
      Number(groupId),
      Number(req.user.id),
      date,
    );
  }

  @Get('history/:groupId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequireCenterPermissions(
    CenterPermissionKey.TASKS as unknown as CenterPermissionKey,
  )
  async getHistory(
    @Param('groupId') groupId: string,
    @Query('limit') limit: string | undefined,
    @Request() req: RequestWithUser,
  ) {
    const service = this.tasksService as unknown as {
      getHistory: (
        groupId: number,
        userId: number,
        limit?: number,
      ) => Promise<Array<{ date: string; notDoneCount: number }>>;
    };

    const parsedLimit = limit ? Number(limit) : undefined;
    return await service.getHistory(
      Number(groupId),
      Number(req.user.id),
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    );
  }
}
