import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, BarChart3 } from 'lucide-react';
import { telegramService } from '@/services/telegram.service';
import { MessageQueueStats, TelegramMessageLog, MessageStatus, MessageType } from '@/types/telegram.type';
import { Progress } from '@/components/ui/progress';

const TelegramMessageMonitor: React.FC = () => {
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);
	const [stats, setStats] = useState<MessageQueueStats | null>(null);
	const [recentLogs, setRecentLogs] = useState<TelegramMessageLog[]>([]);
	const [pendingCount, setPendingCount] = useState(0);
	const [failedCount, setFailedCount] = useState(0);
	const [autoRefresh, setAutoRefresh] = useState(true);

	useEffect(() => {
		loadData();

		// Auto-refresh every 30 seconds
		const interval = autoRefresh
			? setInterval(() => {
					loadData(true);
			  }, 30000)
			: null;

		return () => {
			if (interval) clearInterval(interval);
		};
	}, [autoRefresh]);

	const loadData = async (silent: boolean = false) => {
		try {
			if (!silent) setLoading(true);

			const [statsData, logsData, pending, failed] = await Promise.all([
				telegramService.getMessageQueueStats(),
				telegramService.getRecentMessageLogs(20),
				telegramService.getPendingMessageCount(),
				telegramService.getFailedMessageCount(),
			]);

			setStats(statsData);
			setRecentLogs(logsData);
			setPendingCount(pending);
			setFailedCount(failed);
		} catch (error: any) {
			if (!silent) {
				toast({
					title: 'Xato',
					description: "Ma'lumotlarni yuklashda xatolik",
					variant: 'destructive',
				});
			}
		} finally {
			setLoading(false);
		}
	};

	const handleRetryFailed = async () => {
		try {
			setLoading(true);
			const result = await telegramService.retryFailedMessages();

			toast({
				title: 'Muvaffaqiyat',
				description: result.message || `${result.retried} ta xabar qayta yuborish navbatiga qo'shildi`,
			});

			await loadData();
		} catch (error: any) {
			toast({
				title: 'Xato',
				description: error.response?.data?.message || 'Qayta urinishda xatolik',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	const getStatusBadge = (status: MessageStatus) => {
		switch (status) {
			case 'sent':
				return (
					<Badge variant='default' className='bg-green-500'>
						<CheckCircle className='w-3 h-3 mr-1' /> Yuborildi
					</Badge>
				);
			case 'pending':
				return (
					<Badge variant='secondary'>
						<Clock className='w-3 h-3 mr-1' /> Navbatda
					</Badge>
				);
			case 'failed':
				return (
					<Badge variant='destructive'>
						<XCircle className='w-3 h-3 mr-1' /> Xato
					</Badge>
				);
			case 'retrying':
				return (
					<Badge variant='outline' className='border-orange-500 text-orange-500'>
						<AlertTriangle className='w-3 h-3 mr-1' /> Qayta urinish
					</Badge>
				);
		}
	};

	const getMessageTypeLabel = (type: MessageType): string => {
		const labels: Record<MessageType, string> = {
			[MessageType.EXAM_START]: '🎓 Imtihon boshlanishi',
			[MessageType.ATTENDANCE]: '📋 Davomat',
			[MessageType.RESULTS]: '📊 Natijalar',
			[MessageType.PAYMENT]: "💰 To'lov eslatmasi",
			[MessageType.ANNOUNCEMENT]: "📢 E'lon",
			[MessageType.TEST_DISTRIBUTION]: '📝 Test tarqatish',
		};
		return labels[type] || type;
	};

	const formatDate = (date: Date | string): string => {
		const d = new Date(date);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return 'Hozir';
		if (diffMins < 60) return `${diffMins} daqiqa oldin`;
		if (diffMins < 1440) return `${Math.floor(diffMins / 60)} soat oldin`;
		return d.toLocaleDateString('uz-UZ', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	return (
		<div className='space-y-6'>
			{/* Statistics Cards */}
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
				<Card>
					<CardHeader className='pb-2'>
						<CardTitle className='text-sm font-medium text-muted-foreground'>Jami xabarlar</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>{stats?.total || 0}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='pb-2'>
						<CardTitle className='text-sm font-medium text-green-600'>Yuborildi</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-green-600'>{stats?.sent || 0}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='pb-2'>
						<CardTitle className='text-sm font-medium text-yellow-600'>Navbatda</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-yellow-600'>{pendingCount}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='pb-2'>
						<CardTitle className='text-sm font-medium text-red-600'>Xato</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-red-600'>{failedCount}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='pb-2'>
						<CardTitle className='text-sm font-medium text-muted-foreground'>Muvaffaqiyat</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>{stats?.successRate.toFixed(1)}%</div>
						<Progress value={stats?.successRate || 0} className='mt-2' />
					</CardContent>
				</Card>
			</div>

			{/* Actions and Controls */}
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div>
							<CardTitle>Xabarlar Kuzatuvi</CardTitle>
							<CardDescription>So'nggi 20 ta xabarning holati</CardDescription>
						</div>
						<div className='flex gap-2'>
							<Button variant='outline' size='sm' onClick={() => setAutoRefresh(!autoRefresh)}>
								{autoRefresh ? "Avtomatik yangilashni to'xtatish" : 'Avtomatik yangilash'}
							</Button>
							<Button variant='outline' size='sm' onClick={() => loadData()} disabled={loading}>
								<RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
								Yangilash
							</Button>
							{failedCount > 0 && (
								<Button variant='destructive' size='sm' onClick={handleRetryFailed} disabled={loading}>
									Xato bo'lganlarni qayta yuborish ({failedCount})
								</Button>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className='space-y-3'>
						{recentLogs.length === 0 ? (
							<div className='text-center py-8 text-muted-foreground'>
								<BarChart3 className='w-12 h-12 mx-auto mb-2 opacity-50' />
								<p>Xabarlar topilmadi</p>
							</div>
						) : (
							recentLogs.map((log) => (
								<div
									key={log.id}
									className='flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors'
								>
									<div className='flex-1'>
										<div className='flex items-center gap-2 mb-1'>
											<span className='font-medium'>{getMessageTypeLabel(log.messageType)}</span>
											{getStatusBadge(log.status)}
											{log.retryCount > 0 && (
												<Badge variant='outline' className='text-xs'>
													Qayta urinish: {log.retryCount}/3
												</Badge>
											)}
										</div>
										<div className='text-sm text-muted-foreground'>
											<span>Chat ID: {log.chatId}</span>
											{log.metadata?.groupName && (
												<span className='ml-2'>• Guruh: {log.metadata.groupName}</span>
											)}
											{log.metadata?.groupId && (
												<span className='ml-2'>• ID: {log.metadata.groupId}</span>
											)}
										</div>
										{log.error && (
											<div className='text-xs text-red-500 mt-1'>Xato: {log.error}</div>
										)}
									</div>
									<div className='text-sm text-muted-foreground text-right'>
										{log.sentAt ? formatDate(log.sentAt) : formatDate(log.createdAt)}
									</div>
								</div>
							))
						)}
					</div>
				</CardContent>
			</Card>

			{/* Statistics by Type */}
			{stats && stats.byType && (
				<Card>
					<CardHeader>
						<CardTitle>Xabar turlari bo'yicha statistika</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'>
							{Object.entries(stats.byType).map(([type, count]) => (
								<div key={type} className='text-center p-3 border rounded-lg'>
									<div className='text-sm text-muted-foreground mb-1'>
										{getMessageTypeLabel(type as MessageType)}
									</div>
									<div className='text-2xl font-bold'>{count}</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

export default TelegramMessageMonitor;
