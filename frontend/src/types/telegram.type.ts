// Telegram Chat Types
export enum ChatType {
  PRIVATE = 'private',
  GROUP = 'group',
  CHANNEL = 'channel',
}

export enum ChatStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}

export interface TelegramChat {
  id: number;
  chatId: string;
  type: ChatType;
  status: ChatStatus;
  title?: string;
  username?: string;
  telegramUserId?: string;
  firstName?: string;
  lastName?: string;
  telegramUsername?: string;
  isBot?: boolean;
  metadata?: Record<string, any>;
  inviteLink?: string;
  lastActivity: Date;
  userId?: number;
  centerId?: number;
  subjectId?: number;
  user?: {
    id: number;
    firstName: string;
    lastName?: string;
    username: string;
    role: string;
  };
  center?: {
    id: number;
    name: string;
  };
  subject?: {
    id: number;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Telegram Answer Types
export enum AnswerStatus {
  PENDING = 'pending',
  CHECKED = 'checked',
  INVALID = 'invalid',
}

export interface TelegramAnswer {
  id: number;
  messageId: string;
  testId: number;
  questionNumber: number;
  answerText: string;
  isCorrect?: boolean;
  correctAnswer?: string;
  points?: number;
  status: AnswerStatus;
  checkedAt?: Date;
  student: {
    id: number;
    firstName: string;
    lastName?: string;
  };
  createdAt: Date;
}

// API Request/Response Types
export interface CreateTelegramChatDto {
  chatId: string; // Telegram chat yoki kanalning unikal identifikatori (majburiy)
  type: ChatType; // Chat turi: 'private', 'group', 'channel' (majburiy)
  title?: string; // Kanal yoki guruh nomi (ixtiyoriy)
  username?: string; // Kanal yoki guruhning Telegram username (ixtiyoriy)
  telegramUserId?: string; // Agar bu shaxsiy chat bo'lsa, Telegram foydalanuvchi ID-si (ixtiyoriy)
  firstName?: string; // Foydalanuvchi ismi (ixtiyoriy)
  lastName?: string; // Foydalanuvchi familiyasi (ixtiyoriy)
  telegramUsername?: string; // Foydalanuvchi Telegram username (ixtiyoriy)
  centerId?: number; // Ushbu chat/kanal qaysi markazga tegishli (ixtiyoriy, lekin ko'pincha kerak)
  subjectId?: number; // Agar chat/kanal fanga bog'liq bo'lsa, fan ID-si (ixtiyoriy)
  userId?: number; // LMS foydalanuvchi ID-si (ixtiyoriy)
}

export interface SendTestPDFsDto {
  studentIds: number[];
  channelId?: string;
}

export interface TelegramUserStatus {
  isLinked: boolean;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
  availableChannels: TelegramChat[];
}

export interface TestStatistics {
  testId: number;
  totalStudents: number;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  studentResults: {
    student: string;
    totalQuestions: number;
    correctAnswers: number;
    totalPoints: number;
  }[];
}

export interface PDFDistributionResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  details?: string[];
  message: string;
}

export interface BotChannelStatus {
  success: boolean;
  botStatus?: string;
  botUsername?: string;
  permissions?: any;
  message: string;
}

export interface InviteLinkResult {
  success: boolean;
  inviteLink?: string;
  message: string;
  errorDetails?: any;
}

// User Authentication Types
export interface AuthenticateUserDto {
  telegramUserId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthenticationResult {
  success: boolean;
  message: string;
  userId?: number;
  autoConnected?: boolean;
}

// Components Props
export interface TelegramManagementProps {
  testId?: number;
  channelId?: string;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export interface TelegramChannelSelectorProps {
  selectedChannelId?: string;
  onChannelSelect: (channelId: string) => void;
  filterByCenter?: boolean;
}

export interface TelegramStatsProps {
  testId: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
