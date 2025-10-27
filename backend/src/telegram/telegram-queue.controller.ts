import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { TelegramQueueService } from './telegram-queue.service';

@ApiTags('Telegram Queue')
@Controller('telegram/queue')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TelegramQueueController {
  private readonly logger = new Logger(TelegramQueueController.name);

  constructor(private readonly queueService: TelegramQueueService) {}

  @Get('statistics')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get message queue statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.queueService.getStatistics(start, end);
  }

  @Get('pending-count')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get pending message count' })
  @ApiResponse({ status: 200, description: 'Count retrieved' })
  async getPendingCount() {
    const count = await this.queueService.getPendingCount();
    return { count };
  }

  @Get('failed-count')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get failed message count' })
  @ApiResponse({ status: 200, description: 'Count retrieved' })
  async getFailedCount() {
    const count = await this.queueService.getFailedCount();
    return { count };
  }

  @Get('recent-logs')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get recent message logs' })
  @ApiResponse({ status: 200, description: 'Logs retrieved' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentLogs(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 50;
    return this.queueService.getRecentLogs(limitNum);
  }

  @Get('logs')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get message logs filtered by status' })
  @ApiResponse({ status: 200, description: 'Logs retrieved' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'sent', 'failed', 'retrying'],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLogsByStatus(
    @Query('status') status?: 'pending' | 'sent' | 'failed' | 'retrying',
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 50;

    if (!status) {
      return this.queueService.getRecentLogs(limitNum);
    }

    return this.queueService.getLogsByStatus(status as any, limitNum);
  }

  @Post('retry-failed')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Retry all failed messages' })
  @ApiResponse({ status: 200, description: 'Retry initiated' })
  async retryFailed() {
    const retried = await this.queueService.retryFailedMessages();

    this.logger.log(`Admin triggered retry for ${retried} failed messages`);

    return {
      success: true,
      retried,
      message: `${retried} ta xabar qayta yuborish navbatiga qo'shildi`,
    };
  }

  @Post('process')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Manually trigger queue processing' })
  @ApiResponse({ status: 200, description: 'Queue processed' })
  async processQueue() {
    this.logger.log('Manual queue processing triggered by admin');

    await this.queueService.processQueue();

    return {
      success: true,
      message: 'Navbat qayta ishlandi',
    };
  }
}
