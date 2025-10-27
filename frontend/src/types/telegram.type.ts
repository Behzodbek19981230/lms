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
	groupId?: number; // ✅ NEW: Direct group mapping
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
	group?: {
		// ✅ NEW
		id: number;
		name: string;
	};
	createdAt: Date;
	updatedAt: Date;
	centerName?: string;
	subjectName?: string;
	groupName?: string; // ✅ NEW
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
	groupId?: number; // ✅ NEW: Agar chat/kanal guruhga bog'liq bo'lsa, guruh ID-si (ixtiyoriy, lekin tavsiya etiladi)
	userId?: number; // LMS foydalanuvchi ID-si (ixtiyoriy)
}

export interface SendTestPDFsDto {
	studentIds: number[];
	channelId?: string;
}

export interface TelegramUserStatus {
	autoConnected?: boolean;
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

// ✅ NEW: Message Queue Types
export enum MessageType {
	EXAM_START = 'exam_start',
	ATTENDANCE = 'attendance',
	RESULTS = 'results',
	PAYMENT = 'payment',
	ANNOUNCEMENT = 'announcement',
	TEST_DISTRIBUTION = 'test_distribution',
}

export enum MessageStatus {
	PENDING = 'pending',
	SENT = 'sent',
	FAILED = 'failed',
	RETRYING = 'retrying',
}

export interface TelegramMessageLog {
	id: number;
	chatId: string;
	messageType: MessageType;
	content: string;
	status: MessageStatus;
	priority: 'high' | 'normal' | 'low';
	telegramMessageId?: string;
	retryCount: number;
	error?: string;
	metadata?: Record<string, any>;
	createdAt: Date;
	updatedAt: Date;
	sentAt?: Date;
	nextRetryAt?: Date;
}

export interface MessageQueueStats {
	total: number;
	sent: number;
	failed: number;
	pending: number;
	retrying: number;
	successRate: number;
	byType: Record<MessageType, number>;
}
