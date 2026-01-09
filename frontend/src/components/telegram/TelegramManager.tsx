import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
	MessageCircle,
	Send,
	FileText,
	BarChart3,
	Users,
	Settings,
	RefreshCw,
	ExternalLink,
	CheckCircle,
	XCircle,
	AlertCircle,
	Bot,
} from 'lucide-react';

import { telegramService } from '@/services/telegram.service';
import { TelegramChat, TestStatistics, ChatType } from '@/types/telegram.type';
import TelegramChannelSelector from './TelegramChannelSelector';
import TelegramTestDistribution from './TelegramTestDistribution';
import TelegramStats from './TelegramStats';
import TelegramUserManagement from './TelegramUserManagement';

interface TelegramManagerProps {
	testId?: number;
	shareUrl?: string;
	onSuccess?: (message: string) => void;
	onError?: (error: string) => void;
}

const TelegramManager: React.FC<TelegramManagerProps> = ({ testId, shareUrl, onSuccess, onError }) => {
	const { toast } = useToast();
	const [activeTab, setActiveTab] = useState('overview');
	const [channels, setChannels] = useState<TelegramChat[]>([]);
	const [selectedChannelId, setSelectedChannelId] = useState<string>('');
	const [loading, setLoading] = useState(true);
	const [botConnected, setBotConnected] = useState(false);
	const [stats, setStats] = useState<TestStatistics | null>(null);

	useEffect(() => {
		loadInitialData();
	}, []);

	const loadInitialData = async () => {
		try {
			setLoading(true);

			// Check bot connection
			const connected = await telegramService.testConnection();
			setBotConnected(connected);

			// Load channels
			const channelsData = await telegramService.getAllChats();
			const telegramChannels = channelsData.filter((chat) => chat.type === ChatType.CHANNEL);
			setChannels(telegramChannels);

			// Select first channel by default
			if (telegramChannels.length > 0 && !selectedChannelId) {
				setSelectedChannelId(telegramChannels[0].chatId);
			}

			// Load test stats if testId provided
			if (testId) {
				try {
					const testStats = await telegramService.getTestStatistics(testId);
					setStats(testStats);
				} catch (error) {
					// Test stats might not exist yet, that's okay
					console.warn('Test statistics not available yet');
				}
			}
		} catch (error: any) {
			const errorMessage = error?.response?.data?.message || 'Telegram ma’lumotlarini yuklab bo‘lmadi';
			toast({
				title: 'Xatolik',
				description: errorMessage,
				variant: 'destructive',
			});
			onError?.(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const handleRefresh = () => {
		loadInitialData();
	};

	const handleSuccess = (message: string) => {
		toast({
			title: 'Muvaffaqiyatli',
			description: message,
			variant: 'default',
		});
		onSuccess?.(message);
		// Refresh data after successful operation
		loadInitialData();
	};

	const handleError = (error: string) => {
		toast({
			title: 'Xatolik',
			description: error,
			variant: 'destructive',
		});
		onError?.(error);
	};

	const getBotStatusIcon = () => {
		return botConnected ? (
			<CheckCircle className='h-4 w-4 text-green-500' />
		) : (
			<XCircle className='h-4 w-4 text-red-500' />
		);
	};

	const getBotStatusText = () => {
		return botConnected ? 'Ulangan' : 'Ulanmagan';
	};

	if (loading) {
		return (
			<Card className='w-full'>
				<CardContent className='p-6'>
					<div className='flex items-center justify-center space-x-2'>
						<RefreshCw className='h-4 w-4 animate-spin' />
						<span>Telegram ma'lumotlari yuklanmoqda...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className='w-full space-y-6'>
			{/* Header */}
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div className='flex items-center space-x-3'>
							<MessageCircle className='h-6 w-6 text-blue-500' />
							<div>
								<CardTitle>Telegram bot boshqaruvi</CardTitle>
								<CardDescription>
									Telegram orqali test yuborish va natijalarni kuzatish
								</CardDescription>
							</div>
						</div>
						<div className='flex items-center space-x-4'>
							<div className='flex items-center space-x-2'>
								<Bot className='h-4 w-4' />
								<span className='text-sm text-muted-foreground'>Bot holati:</span>
								{getBotStatusIcon()}
								<Badge variant={botConnected ? 'default' : 'destructive'}>{getBotStatusText()}</Badge>
							</div>
							<Button variant='outline' size='sm' onClick={handleRefresh} disabled={loading}>
								<RefreshCw className='h-4 w-4 mr-2' />
								Yangilash
							</Button>
						</div>
					</div>
				</CardHeader>
			</Card>

			{/* Bot Status Alert */}
			{!botConnected && (
				<Card className='border-yellow-200 bg-yellow-50'>
					<CardContent className='p-4'>
						<div className='flex items-center space-x-2'>
							<AlertCircle className='h-4 w-4 text-yellow-600' />
							<p className='text-sm text-yellow-800'>
								Telegram bot ulanmagan. Ba'zi funksiyalar ishlamasligi mumkin. Bot sozlamalarini
								tekshiring.
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Main Content Tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className='grid w-full grid-cols-4'>
					<TabsTrigger value='overview' className='flex items-center space-x-2'>
						<BarChart3 className='h-4 w-4' />
						<span>Umumiy</span>
					</TabsTrigger>
					<TabsTrigger value='distribution' className='flex items-center space-x-2'>
						<Send className='h-4 w-4' />
						<span>Tarqatish</span>
					</TabsTrigger>
					<TabsTrigger value='statistics' className='flex items-center space-x-2'>
						<FileText className='h-4 w-4' />
						<span>Statistika</span>
					</TabsTrigger>
					<TabsTrigger value='users' className='flex items-center space-x-2'>
						<Users className='h-4 w-4' />
						<span>Foydalanuvchilar</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent value='overview' className='space-y-6'>
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
						{/* Channels Summary */}
						<Card>
							<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
								<CardTitle className='text-sm font-medium'>Faol kanallar</CardTitle>
								<MessageCircle className='h-4 w-4 text-muted-foreground' />
							</CardHeader>
							<CardContent>
								<div className='text-2xl font-bold'>{channels.length}</div>
								<p className='text-xs text-muted-foreground'>Ulangan Telegram kanallari</p>
							</CardContent>
						</Card>

						{/* Test Stats Summary */}
						{stats && (
							<>
								<Card>
									<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
										<CardTitle className='text-sm font-medium'>Test yakunlanishi</CardTitle>
										<FileText className='h-4 w-4 text-muted-foreground' />
									</CardHeader>
									<CardContent>
										<div className='text-2xl font-bold'>
											{telegramService.calculateCompletionRate(stats)}%
										</div>
										<p className='text-xs text-muted-foreground'>
											{stats.studentResults.length} / {stats.totalStudents} o'quvchi
										</p>
									</CardContent>
								</Card>

								<Card>
									<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
										<CardTitle className='text-sm font-medium'>Aniqlik darajasi</CardTitle>
										<BarChart3 className='h-4 w-4 text-muted-foreground' />
									</CardHeader>
									<CardContent>
										<div className='text-2xl font-bold'>{stats.accuracy}%</div>
										<p className='text-xs text-muted-foreground'>
											{stats.correctAnswers} / {stats.totalAnswers} to'g'ri
										</p>
									</CardContent>
								</Card>
							</>
						)}
					</div>

					{/* Channel List */}
					<Card>
						<CardHeader>
							<CardTitle className='text-lg'>Ulangan kanallar</CardTitle>
							<CardDescription>Test tarqatish uchun mavjud Telegram kanallari</CardDescription>
						</CardHeader>
						<CardContent>
							{channels.length > 0 ? (
								<div className='space-y-3'>
									{channels.map((channel) => (
										<div
											key={channel.id}
											className='flex items-center justify-between p-3 border rounded-lg'
										>
											<div className='flex items-center space-x-3'>
												<span className='text-lg'>
													{telegramService.getChannelTypeIcon(channel.type)}
												</span>
												<div>
													<p className='font-medium'>
														{telegramService.formatChannelName(channel)}
													</p>
													<p className='text-sm text-muted-foreground'>
														{channel.center?.name || 'Markaz biriktirilmagan'}
													</p>
												</div>
											</div>
											<div className='flex items-center space-x-2'>
												<Badge variant={channel.status === 'active' ? 'default' : 'secondary'}>
													{channel.status}
												</Badge>
												{channel.inviteLink && (
													<Button variant='ghost' size='sm' asChild>
														<a
															href={channel.inviteLink}
															target='_blank'
															rel='noopener noreferrer'
														>
															<ExternalLink className='h-4 w-4' />
														</a>
													</Button>
												)}
											</div>
										</div>
									))}
								</div>
							) : (
								<div className='text-center py-8'>
									<MessageCircle className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
									<p className='text-lg font-medium'>Kanallar ulanmagan</p>
									<p className='text-muted-foreground'>Test tarqatish uchun Telegram kanallarini ulang</p>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value='distribution'>
					<TelegramTestDistribution
						testId={testId}
						shareUrl={shareUrl}
						channels={channels}
						selectedChannelId={selectedChannelId}
						onChannelSelect={setSelectedChannelId}
						onSuccess={handleSuccess}
						onError={handleError}
					/>
				</TabsContent>

				<TabsContent value='statistics'>
					{testId ? (
						<TelegramStats testId={testId} autoRefresh={true} refreshInterval={30000} />
					) : (
						<Card>
							<CardContent className='p-8 text-center'>
								<FileText className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
								<p className='text-lg font-medium'>Test tanlanmagan</p>
								<p className='text-muted-foreground'>Statistikani ko'rish uchun test tanlang</p>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				<TabsContent value='users'>
					<TelegramUserManagement onSuccess={handleSuccess} onError={handleError} />
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default TelegramManager;
