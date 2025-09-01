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
    email: string;
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
  chatId: string;
  type: ChatType;
  title?: string;
  username?: string;
  telegramUserId?: string;
  firstName?: string;
  lastName?: string;
  telegramUsername?: string;
  centerId?: number;
  subjectId?: number;
  userId?: number;
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
