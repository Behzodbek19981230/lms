import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TelegramAuthService } from './telegram-auth.service';
import { TelegramAuthDto } from '../auth/dto/telegram-auth.dto';

@ApiTags('Telegram Auth')
@Controller('telegram/auth')
export class TelegramAuthController {
  constructor(private readonly telegramAuthService: TelegramAuthService) {}

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect current user to Telegram' })
  @ApiResponse({ status: 200, description: 'Connection successful' })
  async connectToTelegram(@Body() authData: TelegramAuthDto, @Request() req) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('User not authenticated');
    }

    return this.telegramAuthService.connectUserToTelegram(req.user.id, {
      telegramUserId: authData.telegramUserId,
      username: authData.telegramUsername,
      firstName: authData.firstName,
      lastName: authData.lastName,
      photoUrl: authData.photoUrl,
      authDate: authData.authDate,
      hash: authData.hash,
    });
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user Telegram connection status' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  async getTelegramStatus(@Request() req) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('User not authenticated');
    }

    return this.telegramAuthService.getUserTelegramStatus(req.user.id);
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect current user from Telegram' })
  @ApiResponse({ status: 200, description: 'Disconnection successful' })
  async disconnectFromTelegram(@Request() req) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('User not authenticated');
    }

    return this.telegramAuthService.disconnectUserFromTelegram(req.user.id);
  }

  @Post('widget-auth')
  @ApiOperation({ summary: 'Authenticate via Telegram widget (public)' })
  @ApiResponse({ status: 200, description: 'Authentication result' })
  async authenticateViaWidget(@Body() authData: TelegramAuthDto) {
    return this.telegramAuthService.authenticateFromWidget({
      telegramUserId: authData.telegramUserId,
      username: authData.telegramUsername,
      firstName: authData.firstName,
      lastName: authData.lastName,
      photoUrl: authData.photoUrl,
      authDate: authData.authDate,
      hash: authData.hash,
    });
  }
}
