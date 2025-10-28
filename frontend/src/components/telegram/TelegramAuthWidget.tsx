import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Users, MessageCircle } from 'lucide-react';
import { telegramService } from '@/services/telegram.service';
import { useAuth } from '@/contexts/AuthContext';

interface TelegramAuthWidgetProps {
	onSuccess?: (message: string) => void;
	onError?: (error: string) => void;
	showTitle?: boolean;
	compact?: boolean;
}

declare global {
	interface Window {
		TelegramLoginWidget: {
			dataOnauth: (user: any) => void;
		};
	}
}

const TelegramAuthWidget: React.FC<TelegramAuthWidgetProps> = ({
	onSuccess,
	onError,
	showTitle = true,
	compact = false,
}) => {
	const { user } = useAuth();
	const [autoConnected, setAutoConnected] = useState(false);
	const [telegramUser, setTelegramUser] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [authInProgress, setAuthInProgress] = useState(false);

	useEffect(() => {
		checkLinkStatus();
		loadTelegramWidget();
	}, [user]);

	const checkLinkStatus = async () => {
		if (!user?.id) return;

		try {
			setLoading(true);
			const status = await telegramService.checkTelegramLinkStatus(user.id);
			setAutoConnected(status.linked); // Map linked to autoConnected
			setTelegramUser(status.telegramUser);
		} catch (error) {
			console.error('Failed to check Telegram link status:', error);
		} finally {
			setLoading(false);
		}
	};

	const loadTelegramWidget = () => {
		// Load Telegram Login Widget script
		if (!document.getElementById('telegram-widget-script')) {
			const script = document.createElement('script');
			script.id = 'telegram-widget-script';
			script.src = 'https://telegram.org/js/telegram-widget.js?22';
			script.setAttribute('data-telegram-login', process.env.NEXT_PUBLIC_BOT_USERNAME || 'EduOnePlatformbot');
			script.setAttribute('data-size', 'large');
			script.setAttribute('data-onauth', 'onTelegramAuth(user)');
			script.setAttribute('data-request-access', 'write');
			document.head.appendChild(script);
		}

		// Set up global auth callback
		(window as any).onTelegramAuth = handleTelegramAuth;
	};

	const handleTelegramAuth = async (userData: any) => {
		if (!user?.id) {
			onError?.('LMS foydalanuvchisi aniqlanmadi');
			return;
		}

		try {
			setAuthInProgress(true);
			const result = await telegramService.completeTelegramAuth({
				id: userData.id,
				first_name: userData.first_name,
				last_name: userData.last_name,
				username: userData.username,
				photo_url: userData.photo_url,
				auth_date: userData.auth_date,
				hash: userData.hash,
			});

			if (result.success) {
				// Refresh the link status after successful authentication
				await checkLinkStatus();
				onSuccess?.(result.message || `Telegram hisobingiz muvaffaqiyatli bog'landi!`);
			} else {
				onError?.(result.message || "Bog'lashda xatolik yuz berdi");
			}
		} catch (error: any) {
			const errorMessage = error?.response?.data?.message || 'Telegram autentifikatsiyasida xatolik';
			onError?.(errorMessage);
		} finally {
			setAuthInProgress(false);
		}
	};

	const handleUnlink = async () => {
		if (!user?.id || !telegramUser?.id) return;

		try {
			setLoading(true);
			// API call to unlink would go here
			// await telegramService.unlinkTelegramUser(user.id);
			setAutoConnected(false);
			setTelegramUser(null);
			onSuccess?.('Telegram hisobi muvaffaqiyatli uzildi');
		} catch (error: any) {
			onError?.(error?.response?.data?.message || 'Hisobni uzishda xatolik');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<Card className={compact ? 'border-0 shadow-none' : ''}>
				<CardContent className={compact ? 'p-3' : 'p-6'}>
					<div className='flex items-center justify-center space-x-2'>
						<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500'></div>
						<span className='text-sm'>Telegram holati tekshirilmoqda...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (compact && autoConnected) {
		return (
			<div className='flex items-center space-x-2 text-sm'>
				<CheckCircle className='h-4 w-4 text-green-500' />
				<span className='text-green-700'>Telegram avtomatik ulangan</span>
				<Badge variant='outline' className='text-xs'>
					@{telegramUser?.username || telegramUser?.first_name}
				</Badge>
			</div>
		);
	}

	if (compact && !autoConnected) {
		return (
			<div className='flex items-center space-x-2 text-sm'>
				<XCircle className='h-4 w-4 text-red-500' />
				<span className='text-red-700'>Telegram avtomatik ulanmagan</span>
			</div>
		);
	}

	return (
		<Card>
			{showTitle && (
				<CardHeader>
					<CardTitle className='flex items-center space-x-2'>
						<MessageCircle className='h-5 w-5 text-blue-500' />
						<span>Telegram Integration</span>
					</CardTitle>
					<CardDescription>
						Telegram hisobingizni LMS ga bog'lang va xabarlarni avtomatik oling
					</CardDescription>
				</CardHeader>
			)}
			<CardContent className='space-y-4'>
				{autoConnected ? (
					<div className='space-y-4'>
						<Alert className='border-green-200 bg-green-50'>
							<CheckCircle className='h-4 w-4 text-green-600' />
							<AlertDescription className='text-green-800'>
								Telegram hisobingiz avtomatik ulangan!
							</AlertDescription>
						</Alert>

						<div className='flex items-center justify-between p-3 border rounded-lg bg-muted/50'>
							<div className='flex items-center space-x-3'>
								<div className='w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium'>
									{telegramUser?.first_name?.[0]?.toUpperCase() || 'T'}
								</div>
								<div>
									<p className='font-medium'>
										{telegramUser?.first_name} {telegramUser?.last_name || ''}
									</p>
									<p className='text-sm text-muted-foreground'>
										{telegramUser?.username ? `@${telegramUser.username}` : 'Username not set'}
									</p>
								</div>
							</div>
							<Badge variant='default' className='bg-green-500'>
								Avtomatik ulangan
							</Badge>
						</div>

						<div className='flex items-center space-x-2 text-sm text-muted-foreground'>
							<Users className='h-4 w-4' />
							<span>Endi siz Telegram orqali test xabarlarini avtomatik olasiz</span>
						</div>

						<Button variant='outline' size='sm' onClick={handleUnlink} className='w-full'>
							Telegram hisobini uzish
						</Button>
					</div>
				) : (
					<div className='space-y-4'>
						<Alert className='border-yellow-200 bg-yellow-50'>
							<AlertCircle className='h-4 w-4 text-yellow-600' />
							<AlertDescription className='text-yellow-800'>
								Telegram hisobingizni avtomatik ulash orqali test xabarlarini avtomatik ola olasiz
							</AlertDescription>
						</Alert>

						<div className='text-center space-y-4'>
							<div className='text-sm text-muted-foreground space-y-1'>
								<p>• Test boshlanganda avtomatik xabar olish</p>
								<p>• Test natijalari haqida bildirishnoma</p>
								<p>• Kanalda test tarqatish imkoniyati</p>
							</div>

							{authInProgress ? (
								<div className='flex items-center justify-center space-x-2 py-4'>
									<div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500'></div>
									<span>Telegram bilan bog'lanmoqda...</span>
								</div>
							) : (
								<div
									id='telegram-login-widget'
									className='flex justify-center'
									dangerouslySetInnerHTML={{
										__html: `
                      <script async src="https://telegram.org/js/telegram-widget.js?22" 
                       data-telegram-login="${process.env.NEXT_PUBLIC_BOT_USERNAME || 'EduOnePlatformbot'}"
                        data-size="large" 
                        data-onauth="onTelegramAuth(user)" 
                        data-request-access="write">
                      </script>
                    `,
									}}
								/>
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default TelegramAuthWidget;
