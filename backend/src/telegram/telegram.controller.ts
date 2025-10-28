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
  Delete,
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
import { User, UserRole } from '../users/entities/user.entity';
import { TelegramService } from './telegram.service';
import { AnswerProcessorService } from './answer-processor.service';
import { TestsService } from '../tests/tests.service';
// Import DTOs
import {
  CreateTelegramChatDto,
  SubmitAnswerDto,
  AuthenticateUserDto,
} from './dto/telegram.dto';

@ApiTags('Telegram')
@Controller('telegram')
export class TelegramController {
  @Delete('chats/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Telegram chatni o'chirish" })
  @ApiResponse({ status: 200, description: "Chat o'chirildi" })
  async deleteChat(@Param('id') id: string) {
    await this.telegramService.deleteChatById(+id);
    return { success: true, message: "Chat o'chirildi" };
  }

  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private readonly telegramService: TelegramService,
    // PDF generation service removed
    private readonly answerProcessorService: AnswerProcessorService,
    private readonly testsService: TestsService,
  ) {}

  // ==================== Webhook Endpoint ====================

  @Post('webhook')
  @ApiOperation({ summary: 'Telegram webhook endpoint for receiving messages' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Body() update: any) {
    console.log('Received Telegram webhook:', JSON.stringify(update, null, 2));

    try {
      if (update.message) {
        await this.processMessage(update.message);
      }

      if (update.channel_post) {
        this.processChannelPost(update.channel_post);
      }

      return { ok: true };
    } catch (error) {
      console.error('Error processing webhook:', error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
  async createChat(@Body() dto: CreateTelegramChatDto, @Request() req) {
    return this.telegramService.createOrUpdateChat(dto, req.user);
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

  @Get('chats/user/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's Telegram chats" })
  @ApiResponse({ status: 200, description: 'User chats retrieved' })
  async getMyChats(@Request() req) {
    return this.telegramService.getUserChats(req.user.id);
  }

  @Get('chats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all Telegram chats' })
  @ApiResponse({ status: 200, description: 'All chats retrieved' })
  async getAllChats() {
    return this.telegramService.getAllChats();
  }

  // ==================== Authentication ====================

  @Get('user-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user Telegram connection status' })
  @ApiResponse({
    status: 200,
    description: 'User status retrieved successfully',
  })
  async getUserStatus(@Request() req) {
    return this.telegramService.getUserTelegramStatus(req.user.id);
  }

  @Post('authenticate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Authenticate user via Telegram widget' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  async authenticate(@Body() dto: AuthenticateUserDto, @Request() req) {
    if (!dto || !req.user) {
      throw new BadRequestException('Invalid request');
    }
    return this.telegramService.authenticateUser({
      dto,
      user: req.user as User,
    });
  }

  @Post('link/:telegramUserId/:lmsUserId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link Telegram user to LMS user' })
  @ApiResponse({ status: 200, description: 'Users linked successfully' })
  async linkUsers(
    @Param('telegramUserId') telegramUserId: string,
    @Param('lmsUserId') lmsUserId: string,
  ) {
    return this.telegramService.linkTelegramUserToLmsUser(
      telegramUserId,
      +lmsUserId,
    );
  }

  @Get('unlinked-users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unlinked Telegram users' })
  @ApiResponse({ status: 200, description: 'Unlinked users retrieved' })
  async getUnlinkedUsers(@Request() req) {
    console.log(`Getting unlinked users. User: ${JSON.stringify(req.user)}`);

    if (!req.user) {
      console.error('No user found in request');
      throw new BadRequestException('User not authenticated');
    }

    console.log(`User role: ${req.user.role}, User ID: ${req.user.id}`);
    return this.telegramService.getUnlinkedTelegramUsers();
  }

  // ==================== Test Debug Endpoints ====================

  @Get('test-auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  testAuth(@Request() req) {
    console.log(`Test auth endpoint hit. User: ${JSON.stringify(req.user)}`);
    return {
      message: 'Authentication successful',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      user: req.user,
    };
  }

  // ==================== Channel/Answers/Notifications ====================
  @Post('generate-invite/:channelId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate invite link for a channel' })
  @ApiResponse({ status: 200, description: 'Invite link generated' })
  async generateInvite(@Param('channelId') channelId: string) {
    return this.telegramService.generateChannelInviteLink(channelId);
  }

  @Post('answers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit an answer via API' })
  @ApiResponse({ status: 201, description: 'Answer accepted' })
  async submitAnswer(@Body() dto: SubmitAnswerDto) {
    return this.telegramService.processAnswer(dto);
  }

  @Post('notify-exam-start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Notify students that the exam has started' })
  @ApiResponse({ status: 200, description: 'Notifications sent' })
  async notifyExamStart(@Body() body: { examId: number; groupIds: number[] }) {
    if (!body?.examId || !Array.isArray(body.groupIds)) {
      throw new BadRequestException('examId and groupIds are required');
    }
    return this.telegramService.notifyExamStart(body.examId, body.groupIds);
  }

  @Post('publish-results/:testId/:channelId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish test results to a channel' })
  @ApiResponse({ status: 200, description: 'Results published' })
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
  async getTestStatistics(@Param('testId') testId: string): Promise<unknown> {
    return this.telegramService.getTestStatistics(+testId) as Promise<unknown>;
  }

  // PDF-related endpoints removed

  @Post('process-answer-message')
  @ApiOperation({ summary: 'Process answer message from Telegram webhook' })
  @ApiResponse({ status: 200, description: 'Answer processed successfully' })
  async processAnswerMessage(
    @Body()
    body: {
      messageText: string;
      telegramUserId: string;
      messageId: string;
    },
  ) {
    return this.answerProcessorService.processAnswerFromMessage(
      body.messageText,
      body.telegramUserId,
      body.messageId,
    );
  }

  @Get('user-results/:telegramUserId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user test results by telegram ID' })
  @ApiResponse({ status: 200, description: 'User results retrieved' })
  async getUserResultsByTelegramId(
    @Param('telegramUserId') telegramUserId: string,
  ) {
    const results =
      await this.answerProcessorService.getUserTestResults(telegramUserId);
    return { results };
  }

  @Get('test-stats/:testId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed test statistics' })
  @ApiResponse({ status: 200, description: 'Test statistics retrieved' })
  async getDetailedTestStatistics(@Param('testId') testId: string) {
    return this.answerProcessorService.getTestStatistics(+testId);
  }

  // ==================== Private Helper Methods ====================

  private async processMessage(message: any) {
    console.log(
      `Processing message from ${message.from?.username || message.from?.first_name}`,
    );

    // Check if this is an answer submission
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    if (message.text && message.text.startsWith('#T')) {
      await this.processAnswerSubmission(message);
      return;
    }

    // Handle bot commands
    if (message.text) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const command = message.text.toLowerCase().trim();

      switch (command) {
        case '/start':
        case '/register':
          await this.handleRegistration(message);
          return;
        case '/help':
          await this.handleHelp(message);
          return;
        case '/menu':
          await this.handleMainMenu(message);
          return;
        case '/natijalarim':
        case 'natijalarim':
          await this.handleMyResults(message);
          return;
        case '/davomatim':
        case 'davomatim':
          await this.handleMyAttendance(message);
          return;
        case '/hisobim':
        case 'hisobim':
          await this.handleMyAccount(message);
          return;
        case '/yoklama':
        case 'yoklama':
          await this.handleAttendanceTaking(message);
          return;
        case '/elon':
        case 'elon':
          await this.handleAnnouncements(message);
          return;
        case '/testlar':
        case 'testlar':
          await this.handleActiveTests(message);
          return;
        case '/aloqa':
        case 'aloqa':
          await this.handleContact(message);
          return;
        default:
          // Check if it's a group selection for attendance
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          if (command.startsWith('grup_')) {
            await this.handleGroupSelection(message);
            return;
          }
          // Check if it's attendance marking (new format: studentId_status)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          if (command.match(/^\d+_(keldi|kelmadi|kechikdi)$/)) {
            await this.handleAttendanceMarking(message);
            return;
          }
          // Check if it's old format attendance marking
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          if (command.includes('_yoklama_')) {
            await this.handleAttendanceMarking(message);
            return;
          }
          break;
      }
    }

    console.log(`Unhandled message: ${message.text}`);
  }

  private processChannelPost(channelPost: unknown): void {
    let preview: string | undefined;
    if (
      channelPost &&
      typeof channelPost === 'object' &&
      'text' in channelPost &&
      typeof (channelPost as any).text === 'string'
    ) {
      preview = (channelPost as { text: string }).text.substring(0, 100);
    }

    console.log('Processing channel post:', preview);
    // Handle channel posts if needed
  }

  private async processAnswerSubmission(message: any) {
    try {
      // Parse the answer format: #T123Q1 A
      // Soddalashtirilgan universal olish
      const text = String(message?.text ?? '').trim();
      const match: RegExpMatchArray | null = text.match(
        /^#T(\d+)Q(\d+)\s+(.+)$/i,
      );

      if (!match || match.length < 4) {
        console.warn(`Invalid answer format: ${text}`);
        return;
      }

      const [, testId, questionNumber, answerText] = match;

      const dto: SubmitAnswerDto = {
        messageId: String(message?.message_id ?? ''),
        testId: parseInt(testId),
        questionNumber: parseInt(questionNumber),
        answerText: String(answerText ?? '').trim(),
        chatId: String(message?.chat?.id ?? ''),
        telegramUserId: String(message?.from?.id ?? ''),
      };

      await this.telegramService.processAnswer(dto);
      console.log(
        `Answer processed for test ${testId}, question ${questionNumber}`,
      );
    } catch (error) {
      console.error('Error processing answer submission:', error);
    }
  }

  private async handleRegistration(message: unknown) {
    // Safely extract and normalize incoming values from an `unknown` message object
    const msg =
      typeof message === 'object' && message !== null
        ? (message as Record<string, unknown>)
        : undefined;

    const from =
      msg && typeof msg['from'] === 'object' && msg['from'] !== null
        ? (msg['from'] as Record<string, unknown>)
        : undefined;

    const chat =
      msg && typeof msg['chat'] === 'object' && msg['chat'] !== null
        ? (msg['chat'] as Record<string, unknown>)
        : undefined;

    const telegramUserId =
      from && (typeof from['id'] === 'number' || typeof from['id'] === 'string')
        ? String(from['id'])
        : '';

    const username =
      from && typeof from['username'] === 'string'
        ? from['username']
        : undefined;

    const firstName =
      from && typeof from['first_name'] === 'string'
        ? from['first_name']
        : undefined;

    const lastName =
      from && typeof from['last_name'] === 'string'
        ? from['last_name']
        : undefined;

    const chatId =
      chat && (typeof chat['id'] === 'number' || typeof chat['id'] === 'string')
        ? chat['id']
        : undefined;

    try {
      // Set bot commands menu for this user (only if chatId exists)
      if (chatId !== undefined) {
        const numericChatId = Number(chatId);
        if (!Number.isNaN(numericChatId)) {
          await this.telegramService.setBotCommands(numericChatId);
        } else {
          // chatId is non-numeric (e.g. channel username); service expects a numeric chat id, so skip.
          this.logger.log(
            `Skipping setBotCommands for non-numeric chatId: ${chatId}`,
          );
        }
      }

      // Use new authentication method that auto-connects users
      const result = await this.telegramService.authenticateAndConnectUser(
        telegramUserId,
        username,
        firstName,
        lastName,
      );

      let welcomeMessage = `🎓 <b>Assalomu alaykum, EduOne LMS botiga xush kelibsiz!</b>\n\n`;

      if (result.autoConnected) {
        welcomeMessage += result.message;
      } else {
        welcomeMessage += `📝 Ro'yxatdan o'tish muvaffaqiyatli!\n\n📋 <b>Asosiy buyruqlar:</b>\n`;
      }

      welcomeMessage += `\n📊 /natijalarim - Test natijalarimni ko'rish`;
      welcomeMessage += `\n📅 /davomatim - Davomat hisobotim`;
      welcomeMessage += `\n👤 /hisobim - Shaxsiy ma'lumotlar`;
      welcomeMessage += `\n📋 /menu - Asosiy menyu`;
      welcomeMessage += `\n✅ /yoklama - Yo'qlama olish (o'qituvchilar uchun)`;
      welcomeMessage += `\n📢 /elon - E'lonlar va xabarlar`;
      welcomeMessage += `\n❓ /help - Yordam`;

      if (result.autoConnected) {
        welcomeMessage += `\n\n🎯 <b>Test formatiga misol:</b>\n#T123Q1 A`;
        welcomeMessage += `\n\n📢 <b>E'lonlar:</b>\nBarcha e'lonlar sizga avtomatik yuboriladi`;
      } else {
        welcomeMessage += `\n\n🔗 <b>Hisobni ulash uchun:</b>\nO'qituvchingiz bilan bog'laning`;
      }

      if (chatId !== undefined && this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(chatId, welcomeMessage, {
          parse_mode: 'HTML',
        });
      }

      console.log(
        `Registration handled for ${username ?? ''}: ${result.success}, auto-connected: ${result.autoConnected}`,
      );
    } catch (error) {
      console.error('Error handling registration:', error);

      if (chatId !== undefined && this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          chatId,
          "Kechirasiz, ro'yxatdan o'tishda xatolik. Keyinroq qayta urinib ko'ring.",
        );
      }
    }
  }

  private async handleHelp(message: any) {
    const helpMessage = this.getHelpMessage();

    if (this.telegramService['bot']) {
      await this.telegramService['bot'].sendMessage(
        message.chat.id,
        helpMessage,
        { parse_mode: 'HTML' },
      );
    }

    console.log(`Help request from ${message.from.username}`);
  }

  private async handleMainMenu(message: any) {
    const menuMessage = `🎓 <b>EduOne LMS - Asosiy Menu</b>\n\nQuyidagi bo'limlardan birini tanlang:\n\n📊 /natijalarim - Test natijalarim\n📅 /davomatim - Davomat hisobotim\n👤 /hisobim - Shaxsiy ma'lumotlar\n\n---\n📚 <b>Ta'lim jarayoni:</b>\n✅ /yoklama - Yo'qlama olish (o'qituvchilar)\n📢 /elon - E'lonlar va xabarlar\n📝 /testlar - Aktiv testlar\n\n---\n📞 <b>Yordam:</b>\n❓ /help - To'liq yordam\n📞 /aloqa - Aloqa ma'lumotlari`;

    if (this.telegramService['bot']) {
      await this.telegramService['bot'].sendMessage(
        message.chat.id,
        menuMessage,
        { parse_mode: 'HTML' },
      );
    }
  }

  private async handleMyResults(message: any) {
    try {
      const results = await this.telegramService.getUserTestResults(
        message.from.id.toString(),
      );

      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          results,
          { parse_mode: 'HTML' },
        );
      }
    } catch (error) {
      console.error('Error getting user results:', error);
      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          "Natijalarni yuklab olishda xatolik. Keyinroq qayta urinib ko'ring.",
        );
      }
    }
  }

  private async handleMyAttendance(message: any) {
    try {
      const attendance = await this.telegramService.getUserAttendance(
        message.from.id.toString(),
      );

      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          attendance,
          { parse_mode: 'HTML' },
        );
      }
    } catch (error) {
      console.error('Error getting user attendance:', error);
      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          "Davomat ma'lumotlarini yuklab olishda xatolik. Keyinroq qayta urinib ko'ring.",
        );
      }
    }
  }

  private async handleMyAccount(message: any) {
    try {
      const account = await this.telegramService.getUserAccountInfo(
        message.from.id.toString(),
      );

      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          account,
          { parse_mode: 'HTML' },
        );
      }
    } catch (error) {
      console.error('Error getting user account info:', error);
      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          "Hisob ma'lumotlarini yuklab olishda xatolik. Keyinroq qayta urinib ko'ring.",
        );
      }
    }
  }

  private async handleAttendanceTaking(message: any) {
    try {
      const groups = await this.telegramService.getTeacherGroups(
        message.from.id.toString(),
      );

      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(message.chat.id, groups, {
          parse_mode: 'HTML',
        });
      }
    } catch (error) {
      console.error('Error getting teacher groups:', error);
      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          "Sizda o'qituvchi huquqi yo'q yoki guruhlar yuklanmadi.",
        );
      }
    }
  }

  private async handleGroupSelection(message: any) {
    try {
      const groupId = message.text.replace('grup_', '');
      const students = await this.telegramService.getGroupStudentsForAttendance(
        message.from.id.toString(),
        groupId,
      );

      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          students,
          { parse_mode: 'HTML' },
        );
      }
    } catch (error) {
      console.error('Error getting group students:', error);
      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          "Guruh ma'lumotlarini yuklab olishda xatolik.",
        );
      }
    }
  }

  private async handleAttendanceMarking(message: any) {
    try {
      const result = await this.telegramService.markStudentAttendance(
        message.from.id.toString(),
        message.text,
      );

      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(message.chat.id, result, {
          parse_mode: 'HTML',
        });
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          "Yo'qlama belgilashda xatolik.",
        );
      }
    }
  }

  private async handleAnnouncements(message: any) {
    try {
      const announcements = await this.telegramService.getUserAnnouncements(
        message.from.id.toString(),
      );

      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          announcements,
          { parse_mode: 'HTML' },
        );
      }
    } catch (error) {
      console.error('Error getting announcements:', error);
      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          "E'lonlarni yuklab olishda xatolik yuz berdi.",
        );
      }
    }
  }

  private async handleActiveTests(message: any) {
    try {
      const tests = await this.telegramService.getUserActiveTests(
        message.from.id.toString(),
      );

      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(message.chat.id, tests, {
          parse_mode: 'HTML',
        });
      }
    } catch (error) {
      console.error('Error getting active tests:', error);
      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          'Aktiv testlarni yuklab olishda xatolik yuz berdi.',
        );
      }
    }
  }

  private async handleContact(message: any) {
    const contactMessage = `📞 <b>Aloqa Ma'lumotlari</b>\n\n🏢 <b>EduOne LMS</b>\n\n📧 Email: info@eduone-lms.uz\n📱 Telefon: +998 90 123 45 67\n🌐 Website: https://eduone-lms.uz\n\n👨‍🏫 <b>O'qituvchi bilan bog'lanish:</b>\nO'z guruhingiz o'qituvchisi bilan to'g'ridan-to'g'ri bog'lanish uchun /menu bo'limidan foydalaning.\n\n💬 <b>Texnik yordam:</b>\nBot bilan bog'liq muammolar uchun admin bilan bog'laning.`;

    if (this.telegramService['bot']) {
      await this.telegramService['bot'].sendMessage(
        message.chat.id,
        contactMessage,
        { parse_mode: 'HTML' },
      );
    }
  }

  private getRegistrationInstructions(): string {
    return `📋 <b>Next Steps:</b>\n\n1. Contact your teacher with this information:\n   • Your Telegram username: @${this.telegramService['username'] || 'your_username'}\n   • Your name from LMS\n\n2. Once linked, you'll receive channel invitations\n\n3. Join your class channels to receive tests\n\n❓ Questions? Send /help`;
  }

  private getHelpMessage(): string {
    return `🤖 <b>EduOne LMS Bot</b>\n\n📋 <b>Mavjud buyruqlar:</b>\n/start - Botni ishga tushirish\n/menu - Asosiy menyu\n/natijalarim - Test natijalarim\n/davomatim - Davomat ma'lumotlarim\n/hisobim - Hisob ma'lumotlarim\n/help - Yordam\n\n📚 <b>Testlarga javob berish:</b>\nFormat: #T123Q1 A\n• T123 = Test ID\n• Q1 = Savol raqami\n• A = Javobingiz\n\n🔗 <b>Hisobni ulash kerakmi?</b>\nO'qituvchingiz bilan bog'laning:\n• Telegram username\n• To'liq ismingiz\n\n📞 <b>Yordam:</b>\nO'qituvchi yoki admin bilan bog'laning.`;
  }
}
