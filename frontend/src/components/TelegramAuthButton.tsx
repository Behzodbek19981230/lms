import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { Send, CheckCircle, Loader2, Bot } from 'lucide-react';
import { LoginButton } from '@telegram-auth/react';

interface TelegramUser {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
	photo_url?: string;
	auth_date: number;
	hash: string;
}

interface TelegramAuthButtonProps {
	botUsername?: string;
	onSuccess?: (user: TelegramUser) => void;
	onError?: (error: string) => void;
	className?: string;
	variant?: 'default' | 'outline' | 'ghost';
	size?: 'sm' | 'default' | 'lg';
}

export default function TelegramAuthButton({
	botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'universal_lms_bot',
	onSuccess,
	onError,
	className,
	variant = 'default',
	size = 'default',
}: TelegramAuthButtonProps) {
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);
	const [connected, setConnected] = useState(false);
	const [currentBotUsername] = useState(botUsername);

	const openTelegramBot = () => {
		const botUrl = `https://t.me/${currentBotUsername}`;
		console.log(`🚀 Opening Telegram bot: ${botUrl}`);

		const newWindow = window.open(botUrl, '_blank');

		if (newWindow) {
			toast({
				title: '🚀 Telegram bot ochildi!',
				description: `Bot yangi tabda ochildi. /start buyrug'ini yuboring.`,
				duration: 5000,
			});
		} else {
			navigator.clipboard
				.writeText(botUrl)
				.then(() => {
					toast({
						title: '📋 Havola nusxalandi',
						description: `Bot havolasi nusxalandi: ${botUrl}`,
						duration: 5000,
					});
				})
				.catch(() => {
					toast({
						title: '🔗 Bot havolasi',
						description: `Qo'lda oching: ${botUrl}`,
						duration: 7000,
					});
				});
		}
	};

	const handleTelegramAuth = async (telegramUser: TelegramUser) => {
		try {
			setLoading(true);

			const userData = localStorage.getItem('EduOne_user');
			const user = userData ? JSON.parse(userData) : null;

			if (!user) {
				toast({
					title: 'Xato',
					description: "Foydalanuvchi ma'lumotlari topilmadi. Qayta kiring.",
					variant: 'destructive',
				});
				return;
			}

			const authResponse = await request.post('/telegram/authenticate', {
				telegramUserId: telegramUser.id.toString(),
				username: telegramUser.username,
				firstName: telegramUser.first_name,
				lastName: telegramUser.last_name,
			});

			if (authResponse.data.success) {
				setConnected(true);
				toast({
					title: 'Muvaffaqiyat!',
					description: 'Telegram hisobingiz muvaffaqiyatli ulandi!',
				});
				onSuccess?.(telegramUser);
			} else {
				toast({
					title: 'Xato',
					description: authResponse.data.message || 'Telegram ulanishida xatolik',
					variant: 'destructive',
				});
				onError?.(authResponse.data.message);
			}
		} catch (error: any) {
			console.error('Telegram auth error:', error);
			const errorMessage = error.response?.data?.message || 'Ulanishda xatolik yuz berdi';
			toast({
				title: 'Xato',
				description: errorMessage,
				variant: 'destructive',
			});
			onError?.(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	if (connected) {
		return (
			<div className={`flex flex-col items-center space-y-3 ${className}`}>
				<div className='flex items-center justify-center w-12 h-12 rounded-full bg-green-100'>
					<CheckCircle className='h-6 w-6 text-green-600' />
				</div>
				<div className='text-center'>
					<p className='text-sm font-medium text-green-700'>Telegram ulangan</p>
					<p className='text-xs text-green-600'>Hisobingiz muvaffaqiyatli bog'landi</p>
				</div>
			</div>
		);
	}

	return (
		<div className={`space-y-4 ${className}`}>
			<div className='space-y-3'>
				<div className='flex items-center justify-between'>
					<h3 className='text-lg font-semibold text-foreground flex items-center gap-2'>
						<Bot className='h-5 w-5 text-blue-500' />
						Telegram orqali ulanish
					</h3>
					{loading && <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />}
				</div>

				<div className='p-4 border border-border rounded-lg bg-card shadow-sm'>
					<div className='space-y-4'>
						<div className='min-h-[40px] flex items-center justify-center'>
							<LoginButton
								botUsername={currentBotUsername}
								buttonSize={size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'medium'}
								cornerRadius={8}
								showAvatar={true}
								lang='en'
								onAuthCallback={(user) => {
									console.log('✅ Telegram auth successful:', user);
									toast({
										title: '🎉 Muvaffaqiyatli!',
										description: `Telegram hisobingiz ulanmoqda...`,
									});
									handleTelegramAuth(user as TelegramUser);
								}}
							/>
						</div>

						<div className='relative flex items-center py-2'>
							<div className='flex-grow border-t border-border'></div>
							<span className='flex-shrink mx-4 text-xs text-muted-foreground uppercase'>yoki</span>
							<div className='flex-grow border-t border-border'></div>
						</div>

						<div className='space-y-3'>
							<p className='text-sm text-muted-foreground text-center'>
								Yoki to'g'ridan-to'g'ri botga ulanish:
							</p>
							<Button
								onClick={openTelegramBot}
								variant='default'
								size={size}
								className='w-full bg-blue-600 hover:bg-blue-700 text-white'
							>
								<Send className='h-4 w-4 mr-2' />
								<span>Botga ulanish</span>
							</Button>
							<p className='text-xs text-muted-foreground text-center'>
								Botni ochib <code className='bg-muted px-1 rounded'>/start</code> buyrug'ini yuboring
							</p>
						</div>
					</div>
				</div>

				<div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
					<div className='flex items-start gap-2'>
						<span className='text-blue-600 mt-0.5'>ℹ️</span>
						<div className='text-xs text-blue-800'>
							<p className='font-medium mb-1'>Telegram orqali ulanish afzalliklari:</p>
							<ul className='list-disc list-inside space-y-1'>
								<li>Test natijalari avtomatik yetib boradi</li>
								<li>Davomatni kuzatish imkoniyati</li>
								<li>Tezkor bildirishnomalar</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
