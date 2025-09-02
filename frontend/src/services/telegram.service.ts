import { request } from '@/configs/request';
import {
  TelegramChat,
  CreateTelegramChatDto,
  SendTestPDFsDto,
  TelegramUserStatus,
  TestStatistics,
  PDFDistributionResult,
  BotChannelStatus,
  InviteLinkResult,
  AuthenticateUserDto,
  AuthenticationResult,
  TelegramAnswer,
} from '@/types/telegram.type';

class TelegramService {
  private baseURL = '/telegram';

  // ==================== Chat Management ====================

  async createOrUpdateChat(data: CreateTelegramChatDto): Promise<TelegramChat> {
    const response = await request.post(`${this.baseURL}/chats`, data);
    return response.data;
  }

  async getUserChats(): Promise<TelegramChat[]> {
    const response = await request.get(`${this.baseURL}/chats/user/me`);
    return response.data;
  }

  async getAllChats(): Promise<TelegramChat[]> {
    const response = await request.get(`${this.baseURL}/chats`);
    return response.data;
  }

  async linkUserToChat(chatId: string, userId: number): Promise<TelegramChat> {
    const response = await request.post(`${this.baseURL}/chats/${chatId}/link/${userId}`);
    return response.data;
  }

  // ==================== User Authentication ====================

  async getUserTelegramStatus(): Promise<TelegramUserStatus> {
    const response = await request.get(`${this.baseURL}/user-status`);
    return response.data;
  }

  async authenticateUser(data: AuthenticateUserDto): Promise<AuthenticationResult> {
    const response = await request.post(`${this.baseURL}/authenticate`, data);
    return response.data;
  }

  async linkTelegramUser(telegramUserId: string, lmsUserId: number): Promise<{ success: boolean; message: string }> {
    const response = await request.post(`${this.baseURL}/link/${telegramUserId}/${lmsUserId}`);
    return response.data;
  }

  async getUnlinkedUsers(): Promise<TelegramChat[]> {
    const response = await request.get(`${this.baseURL}/unlinked-users`);
    return response.data;
  }

  // ==================== Channel Management ====================

  async generateInviteLink(channelId: string): Promise<InviteLinkResult> {
    const response = await request.post(`${this.baseURL}/generate-invite/${channelId}`);
    return response.data;
  }

  async checkBotStatus(channelId: string): Promise<BotChannelStatus> {
    const response = await request.get(`${this.baseURL}/check-bot-status/${channelId}`);
    return response.data;
  }

  // ==================== Test Distribution ====================

  async sendTestPDFsToChannel(testId: number, channelId: string): Promise<PDFDistributionResult> {
    const response = await request.post(`${this.baseURL}/send-test-pdfs/${testId}/${channelId}`);
    return response.data;
  }

  async sendTestPDFsToStudents(testId: number, data: SendTestPDFsDto): Promise<PDFDistributionResult> {
    const response = await request.post(`${this.baseURL}/send-test-pdfs/${testId}`, data);
    return response.data;
  }

  // ==================== Results Management ====================

  async publishTestResults(testId: number, channelId: string): Promise<{ success: boolean; message: string }> {
    const response = await request.post(`${this.baseURL}/publish-results/${testId}/${channelId}`);
    return response.data;
  }

  // ==================== Exam Notifications ====================

  async notifyExamStart(examId: number, channelId: string): Promise<{ success: boolean; message: string; sentCount?: number; failedCount?: number }> {
    const response = await request.post(`${this.baseURL}/notify-exam-start`, {
      examId,
      channelId
    });
    return response.data;
  }

  async notifyExamEnd(examId: number, channelId: string): Promise<{ success: boolean; message: string }> {
    const response = await request.post(`${this.baseURL}/notify-exam-end`, {
      examId,
      channelId
    });
    return response.data;
  }

  // Send exam notification to specific channel
  async sendExamNotificationToChannel(examId: number, channelId: string, customMessage?: string): Promise<{ success: boolean; message: string }> {
    const response = await request.post(`${this.baseURL}/send-exam-notification`, {
      examId,
      channelId,
      customMessage
    });
    return response.data;
  }

  // ==================== Telegram Authentication ====================

  async initiateTelegramAuth(userId: number): Promise<{ authUrl: string; token: string }> {
    const response = await request.post(`${this.baseURL}/auth/initiate`, { userId });
    return response.data;
  }

  async completeTelegramAuth(authData: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
  }): Promise<{ success: boolean; message: string; user?: any }> {
    const response = await request.post(`${this.baseURL}/auth/complete`, authData);
    return response.data;
  }

  async checkTelegramLinkStatus(userId: number): Promise<{ linked: boolean; telegramUser?: any }> {
    const response = await request.get(`${this.baseURL}/auth/status/${userId}`);
    return response.data;
  }

  async getTestStatistics(testId: number): Promise<TestStatistics> {
    const response = await request.get(`${this.baseURL}/statistics/${testId}`);
    return response.data;
  }

  // ==================== Helper Methods ====================

  async testConnection(): Promise<boolean> {
    try {
      const response = await request.get(`${this.baseURL}/test-auth`);
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Format channel name for display
  formatChannelName(channel: TelegramChat): string {
    if (channel.title) return channel.title;
    if (channel.username) return `@${channel.username}`;
    return `Channel ${channel.chatId}`;
  }

  // Get channel type icon
  getChannelTypeIcon(type: string): string {
    switch (type) {
      case 'channel':
        return '📢';
      case 'group':
        return '👥';
      case 'private':
        return '👤';
      default:
        return '💬';
    }
  }

  // Format user display name
  formatUserName(user: { firstName: string; lastName?: string }): string {
    return user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
  }

  // Calculate test completion percentage
  calculateCompletionRate(stats: TestStatistics): number {
    if (stats.totalStudents === 0) return 0;
    return Math.round((stats.studentResults.length / stats.totalStudents) * 100);
  }

  // Format test statistics for display
  formatTestStats(stats: TestStatistics): {
    completion: string;
    accuracy: string;
    avgScore: string;
    topPerformer?: string;
  } {
    const completion = `${stats.studentResults.length}/${stats.totalStudents}`;
    const accuracy = `${stats.accuracy}%`;
    
    let avgScore = '0';
    let topPerformer: string | undefined;

    if (stats.studentResults.length > 0) {
      const totalPoints = stats.studentResults.reduce((sum, result) => sum + result.totalPoints, 0);
      avgScore = (totalPoints / stats.studentResults.length).toFixed(1);

      const best = stats.studentResults.reduce((max, result) => 
        result.totalPoints > max.totalPoints ? result : max
      );
      topPerformer = best.student;
    }

    return { completion, accuracy, avgScore, topPerformer };
  }
}

export const telegramService = new TelegramService();
