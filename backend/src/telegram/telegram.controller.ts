import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { TelegramService } from './telegram.service';
import { CreateTelegramChatDto, SendTestToChannelDto, SubmitAnswerDto } from './dto/telegram.dto';

@ApiTags('Telegram')
@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly telegramService: TelegramService) {}

  // ==================== Webhook Endpoint ====================

  @Post('webhook')
  @ApiOperation({ summary: 'Telegram webhook endpoint for receiving messages' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Body() update: any) {
    this.logger.log('Received Telegram webhook:', JSON.stringify(update, null, 2));

    try {
      if (update.message) {
        await this.processMessage(update.message);
      }

      if (update.channel_post) {
        await this.processChannelPost(update.channel_post);
      }

      return { ok: true };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      return { ok: false, error: error.message };
    }
  }

  // ==================== Chat Management ====================

  @Post('chats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new Telegram chat/channel' })
  @ApiResponse({ status: 201, description: 'Chat registered successfully' })
  async createChat(@Body() dto: CreateTelegramChatDto) {
    return this.telegramService.createOrUpdateChat(dto);
  }

  @Post('chats/:chatId/link/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link a user to a Telegram chat' })
  @ApiResponse({ status: 200, description: 'User linked successfully' })
  async linkUserToChat(
    @Param('chatId') chatId: string,
    @Param('userId') userId: string,
  ) {
    return this.telegramService.linkUserToChat(+userId, chatId);
  }

  @Get('chats/user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all chats for a user' })
  @ApiResponse({ status: 200, description: 'User chats retrieved' })
  async getUserChats(@Param('userId') userId: string) {
    return this.telegramService.getUserChats(+userId);
  }

  // ==================== Test Distribution ====================

  @Post('send-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a test to a Telegram channel' })
  @ApiResponse({ status: 200, description: 'Test sent successfully' })
  async sendTestToChannel(@Body() dto: SendTestToChannelDto) {
    const success = await this.telegramService.sendTestToChannel(dto);
    return { success, message: 'Test sent to Telegram channel' };
  }

  @Post('answers')
  @ApiOperation({ summary: 'Submit an answer from Telegram' })
  @ApiResponse({ status: 201, description: 'Answer submitted successfully' })
  async submitAnswer(@Body() dto: SubmitAnswerDto) {
    return this.telegramService.processAnswer(dto);
  }

  // ==================== Results Management ====================

  @Post('publish-results/:testId/:channelId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish test results to a channel' })
  @ApiResponse({ status: 200, description: 'Results published successfully' })
  async publishResults(
    @Param('testId') testId: string,
    @Param('channelId') channelId: string,
  ) {
    await this.telegramService.publishTestResults(+testId, channelId);
    return { success: true, message: 'Results published to channel' };
  }

  @Get('statistics/:testId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get test statistics from Telegram submissions' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getTestStatistics(@Param('testId') testId: string) {
    return this.telegramService.getTestStatistics(+testId);
  }

  // ==================== Private Helper Methods ====================

  private async processMessage(message: any) {
    this.logger.log(`Processing message from ${message.from?.username || message.from?.first_name}`);

    // Check if this is an answer submission
    if (message.text && message.text.startsWith('#T')) {
      await this.processAnswerSubmission(message);
      return;
    }

    // Handle chat registration
    if (message.text === '/start' || message.text === '/register') {
      await this.handleRegistration(message);
      return;
    }

    // Handle help command
    if (message.text === '/help') {
      await this.handleHelp(message);
      return;
    }

    this.logger.log(`Unhandled message type: ${message.text}`);
  }

  private async processChannelPost(channelPost: any) {
    this.logger.log('Processing channel post:', channelPost.text?.substring(0, 100));
    // Handle channel posts if needed
  }

  private async processAnswerSubmission(message: any) {
    try {
      // Parse the answer format: #T123Q1 A
      const text = message.text.trim();
      const match = text.match(/^#T(\d+)Q(\d+)\s+(.+)$/i);

      if (!match) {
        this.logger.warn(`Invalid answer format: ${text}`);
        return;
      }

      const [, testId, questionNumber, answerText] = match;

      const dto: SubmitAnswerDto = {
        messageId: message.message_id.toString(),
        testId: parseInt(testId),
        questionNumber: parseInt(questionNumber),
        answerText: answerText.trim(),
        chatId: message.chat.id.toString(),
        telegramUserId: message.from.id.toString(),
      };

      await this.telegramService.processAnswer(dto);
      this.logger.log(`Answer processed for test ${testId}, question ${questionNumber}`);

    } catch (error) {
      this.logger.error('Error processing answer submission:', error);
    }
  }

  private async handleRegistration(message: any) {
    // This would help users link their Telegram account
    // Implementation would depend on your user linking strategy
    this.logger.log(`Registration request from ${message.from.username}`);
  }

  private async handleHelp(message: any) {
    // Send help message to user
    this.logger.log(`Help request from ${message.from.username}`);
  }
}