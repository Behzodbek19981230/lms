import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LogsService } from './logs.service';
import { AnalyticsEventType } from './entities/log.entity';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly logsService: LogsService) {}

  @Post('pageview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track a page view (authenticated)' })
  @ApiResponse({ status: 201, description: 'Tracked' })
  async trackPageView(
    @Body() body: { path: string; referrer?: string },
    @Req() req: any,
  ) {
    const userAgent = req?.headers?.['user-agent'];
    const ip =
      (req?.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req?.ip;

    await this.logsService.trackEvent({
      eventType: AnalyticsEventType.PAGE_VIEW,
      path: body?.path,
      method: 'NAV',
      referrer: body?.referrer,
      userId: req?.user?.id,
      userAgent,
      ip,
      message: `pageview:${body?.path}`,
    });

    return { success: true };
  }
}
