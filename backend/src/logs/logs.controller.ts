import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LogsService } from './logs.service';
import { Log, LogLevel } from './entities/log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('logs')
@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get all logs with advanced filtering' })
  @ApiResponse({
    status: 200,
    description: 'Return filtered logs',
    type: [Log],
  })
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('level') level?: LogLevel,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('context') context?: string,
  ): Promise<Log[]> {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.logsService.findAll(
      limitNum,
      offsetNum,
      level,
      search,
      startDate,
      endDate,
      context,
    );
  }

  @Get('stats')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get log statistics' })
  @ApiResponse({ status: 200, description: 'Return log statistics' })
  async getStats() {
    return this.logsService.getLogStats();
  }
}
