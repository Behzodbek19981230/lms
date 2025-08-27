import { Controller, Get, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  async listMy(@Request() req) {
    return this.notificationsService.listMy(req.user);
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markRead(Number(id), req.user);
  }
}
