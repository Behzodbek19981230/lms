import { Controller, Get, Param, Patch, UseGuards, Request, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiResponse({ status: 200, description: 'List of user notifications' })
  async listMy(@Request() req) {
    return this.notificationsService.listMy(req.user);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markRead(Number(id), req.user);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllRead(@Request() req) {
    await this.notificationsService.markAllRead(req.user);
    return { message: 'Barcha bildirishnomalar o\'qilgan deb belgilandi' };
  }
}
