import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { LogsService } from './logs.service';

@ApiTags('analytics')
@Controller('analytics/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
@ApiBearerAuth()
export class AnalyticsAdminController {
  constructor(private readonly logsService: LogsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Analytics summary (superadmin)' })
  @ApiResponse({ status: 200 })
  async summary(@Query('days') days?: string) {
    const daysNum = days ? Math.min(Math.max(parseInt(days, 10), 1), 90) : 14;
    return this.logsService.getAnalyticsSummary(daysNum);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Recent analytics events (superadmin)' })
  @ApiResponse({ status: 200 })
  async recent(@Query('limit') limit?: string) {
    const limitNum = limit ? Math.min(Math.max(parseInt(limit, 10), 10), 500) : 100;
    return this.logsService.getRecentAnalytics(limitNum);
  }
}
