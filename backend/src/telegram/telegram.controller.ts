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
import { TestPDFGeneratorService } from './test-pdf-generator.service';
import { AnswerProcessorService } from './answer-processor.service';
import { TestsService } from '../tests/tests.service';
// Import DTOs
import {
  CreateTelegramChatDto,
  SendTestToChannelDto,
  SubmitAnswerDto,
  AuthenticateUserDto,
} from './dto/telegram.dto';

@ApiTags('Telegram')
@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly pdfGeneratorService: TestPDFGeneratorService,
    private readonly answerProcessorService: AnswerProcessorService,
    private readonly testsService: TestsService,
  ) {}

  // ==================== Webhook Endpoint ====================

  @Post('webhook')
  @ApiOperation({ summary: 'Telegram webhook endpoint for receiving messages' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Body() update: any) {
    this.logger.log(
      'Received Telegram webhook:',
      JSON.stringify(update, null, 2),
    );

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
  @ApiOperation({ summary: 'Authenticate user via Telegram widget' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  async authenticate(@Body() dto: AuthenticateUserDto) {
    return this.telegramService.authenticateUser(dto);
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
    this.logger.log(
      `Getting unlinked users. User: ${JSON.stringify(req.user)}`,
    );

    if (!req.user) {
      this.logger.error('No user found in request');
      throw new BadRequestException('User not authenticated');
    }

    this.logger.log(`User role: ${req.user.role}, User ID: ${req.user.id}`);
    return this.telegramService.getUnlinkedTelegramUsers();
  }

  // ==================== Test Debug Endpoints ====================

  @Get('test-auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  testAuth(@Request() req) {
    this.logger.log(
      `Test auth endpoint hit. User: ${JSON.stringify(req.user)}`,
    );
    return {
      message: 'Authentication successful',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      user: req.user,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('test-roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  testRoles(@Request() req) {
    this.logger.log(
      `Test roles endpoint hit. User: ${JSON.stringify(req.user)}`,
    );
    return {
      message: 'Role authorization successful',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      user: req.user,
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== Channel Management ====================

  @Post('generate-invite/:channelId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate invite link for a channel' })
  @ApiResponse({ status: 200, description: 'Invite link generated' })
  async generateInviteLink(@Param('channelId') channelId: string) {
    return this.telegramService.generateChannelInviteLink(channelId);
  }

  @Get('check-bot-status/:channelId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check bot status in a channel' })
  @ApiResponse({ status: 200, description: 'Bot status checked' })
  async checkBotStatus(@Param('channelId') channelId: string) {
    return this.telegramService.checkBotChannelStatus(channelId);
  }

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

  @Post('notify-exam-start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Notify exam start to Telegram channels' })
  @ApiResponse({
    status: 200,
    description: 'Exam start notification sent successfully',
  })
  async notifyExamStart(@Body() dto: { examId: number; groupIds: number[] }) {
    const result = await this.telegramService.notifyExamStart(
      dto.examId,
      dto.groupIds,
    );
    return result;
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

  // ==================== PDF Generation ====================

  @Post('send-test-pdf/:testId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate and send test PDF to users' })
  @ApiResponse({ status: 200, description: 'Test PDF sent successfully' })
  async sendTestPDF(
    @Param('testId') testId: string,
    @Body() body: { userIds: number[] },
  ) {
    const pdfBuffer = await this.pdfGeneratorService.generateTestPDF(
      +testId,
      0, // userId not needed for generation
    );

    const results = await this.telegramService.sendPDFToMultipleUsers(
      body.userIds,
      pdfBuffer,
      `Test_${testId}.pdf`,
      `📄 Test #${testId} PDF fayli`,
    );

    return {
      success: results.success,
      sentCount: results.sentCount,
      failedCount: results.failedCount,
      message: `PDF yuborish jarayoni tugallandi. Muvaffaqiyatli: ${results.sentCount}, Xato: ${results.failedCount}`,
    };
  }

  // Add this new method to send all tests as PDFs
  @Post('send-all-tests-pdfs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate and send all tests PDFs to users' })
  @ApiResponse({ status: 200, description: 'All tests PDFs sent successfully' })
  async sendAllTestsPDFs(
    @Body() body: { userIds: number[] },
  ) {
    // Get all tests
    const tests = await this.testsService.findAll();
    
    let totalSent = 0;
    let totalFailed = 0;
    const details: string[] = [];

    // Generate and send PDF for each test
    for (const test of tests) {
      try {
        const pdfBuffer = await this.pdfGeneratorService.generateTestPDF(
          test.id,
          0, // userId not needed for generation
        );

        const results = await this.telegramService.sendPDFToMultipleUsers(
          body.userIds,
          pdfBuffer,
          `Test_${test.id}_${test.title.replace(/\s+/g, '_')}.pdf`,
          `📄 Test "${test.title}" (#${test.id}) PDF fayli`,
        );

        totalSent += results.sentCount;
        totalFailed += results.failedCount;
        details.push(`Test #${test.id} "${test.title}": ${results.sentCount} sent, ${results.failedCount} failed`);
      } catch (error) {
        totalFailed += body.userIds.length;
        details.push(`Test #${test.id} "${test.title}": Failed to generate/send - ${error.message}`);
      }

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      success: totalFailed === 0,
      totalSent,
      totalFailed,
      details,
      message: `Barcha testlar PDF ko'rinishida yuborildi. Muvaffaqiyatli: ${totalSent}, Xato: ${totalFailed}`,
    };
  }

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
    this.logger.log(
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

    this.logger.log(`Unhandled message: ${message.text}`);
  }

  private async processChannelPost(channelPost: any) {
    this.logger.log(
      'Processing channel post:',
      channelPost.text?.substring(0, 100),
    );
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
      this.logger.log(
        `Answer processed for test ${testId}, question ${questionNumber}`,
      );
    } catch (error) {
      this.logger.error('Error processing answer submission:', error);
    }
  }

  private async handleRegistration(message: any) {
    const telegramUserId = message.from.id.toString();
    const username = message.from.username;
    const firstName = message.from.first_name;
    const lastName = message.from.last_name;

    try {
      // Set bot commands menu for this user
      await this.telegramService.setBotCommands(message.chat.id);

      // Use new authentication method that auto-connects users
      const result = await this.telegramService.authenticateAndConnectUser(
        telegramUserId,
        username,
        firstName,
        lastName,
      );

      let welcomeMessage = `🎓 <b>Assalomu alaykum, Universal LMS botiga xush kelibsiz!</b>\n\n`;

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

      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          welcomeMessage,
          { parse_mode: 'HTML' },
        );
      }

      this.logger.log(
        `Registration handled for ${username}: ${result.success}, auto-connected: ${result.autoConnected}`,
      );
    } catch (error) {
      this.logger.error('Error handling registration:', error);

      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
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

    this.logger.log(`Help request from ${message.from.username}`);
  }

  private async handleMainMenu(message: any) {
    const menuMessage = `🎓 <b>Universal LMS - Asosiy Menu</b>\n\nQuyidagi bo'limlardan birini tanlang:\n\n📊 /natijalarim - Test natijalarim\n📅 /davomatim - Davomat hisobotim\n👤 /hisobim - Shaxsiy ma'lumotlar\n\n---\n📚 <b>Ta'lim jarayoni:</b>\n✅ /yoklama - Yo'qlama olish (o'qituvchilar)\n📢 /elon - E'lonlar va xabarlar\n📝 /testlar - Aktiv testlar\n\n---\n📞 <b>Yordam:</b>\n❓ /help - To'liq yordam\n📞 /aloqa - Aloqa ma'lumotlari`;

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
      this.logger.error('Error getting user results:', error);
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
      this.logger.error('Error getting user attendance:', error);
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
      this.logger.error('Error getting user account info:', error);
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
      this.logger.error('Error getting teacher groups:', error);
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
      this.logger.error('Error getting group students:', error);
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
      this.logger.error('Error marking attendance:', error);
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
      this.logger.error('Error getting announcements:', error);
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
      this.logger.error('Error getting active tests:', error);
      if (this.telegramService['bot']) {
        await this.telegramService['bot'].sendMessage(
          message.chat.id,
          'Aktiv testlarni yuklab olishda xatolik yuz berdi.',
        );
      }
    }
  }

  private async handleContact(message: any) {
    const contactMessage = `📞 <b>Aloqa Ma'lumotlari</b>\n\n🏢 <b>Universal LMS</b>\n\n📧 Email: info@universal-lms.uz\n📱 Telefon: +998 90 123 45 67\n🌐 Website: https://universal-lms.uz\n\n👨‍🏫 <b>O'qituvchi bilan bog'lanish:</b>\nO'z guruhingiz o'qituvchisi bilan to'g'ridan-to'g'ri bog'lanish uchun /menu bo'limidan foydalaning.\n\n💬 <b>Texnik yordam:</b>\nBot bilan bog'liq muammolar uchun admin bilan bog'laning.`;

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
    return `🤖 <b>Universal LMS Bot</b>\n\n📋 <b>Mavjud buyruqlar:</b>\n/start - Botni ishga tushirish\n/menu - Asosiy menyu\n/natijalarim - Test natijalarim\n/davomatim - Davomat ma'lumotlarim\n/hisobim - Hisob ma'lumotlarim\n/help - Yordam\n\n📚 <b>Testlarga javob berish:</b>\nFormat: #T123Q1 A\n• T123 = Test ID\n• Q1 = Savol raqami\n• A = Javobingiz\n\n🔗 <b>Hisobni ulash kerakmi?</b>\nO'qituvchingiz bilan bog'laning:\n• Telegram username\n• To'liq ismingiz\n\n📞 <b>Yordam:</b>\nO'qituvchi yoki admin bilan bog'laning.`;
  }
}
