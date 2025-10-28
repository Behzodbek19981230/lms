import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Telegram Login Widget types
interface TelegramUser {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
	photo_url?: string;
	auth_date: number;
	hash: string;
}

interface TelegramLoginWidgetProps {
	botName: string;
	onAuth: (user: TelegramUser) => void;
	requestAccess?: 'write';
	size?: 'large' | 'medium' | 'small';
	cornerRadius?: number;
	usePic?: boolean;
}

// Telegram Login Widget Component
const TelegramLoginWidget: React.FC<TelegramLoginWidgetProps> = ({
	botName,
	onAuth,
	size = 'large',
	requestAccess = 'write',
}) => {
	const widgetRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (!widgetRef.current || !window.TelegramLoginWidget) return;

		// Clear any existing content
		widgetRef.current.innerHTML = '';

		// Create the widget script element
		const script = document.createElement('script');
		script.async = true;
		script.src = 'https://telegram.org/js/telegram-widget.js?22';
		script.setAttribute('data-telegram-login', botName);
		script.setAttribute('data-size', size);
		script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
		if (requestAccess) {
			script.setAttribute('data-request-access', requestAccess);
		}

		widgetRef.current.appendChild(script);
	}, [botName, size, requestAccess]);

	return <div ref={widgetRef} className='telegram-widget-container' />;
};

declare global {
	interface Window {
		TelegramLoginWidget: {
			dataOnauth: (user: any) => void;
		};
	}
}

interface Props {
	onSuccess?: (token: string, user: any) => void;
	onError?: (error: string) => void;
}

const TelegramRegister: React.FC<Props> = ({ onSuccess, onError }) => {
	const [isLoading, setIsLoading] = useState(false);
	const [scriptLoaded, setScriptLoaded] = useState(false);
	const { toast } = useToast();
	const { login } = useAuth();

	// Telegram bot username from environment
	const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'your_bot_username';

	useEffect(() => {
		// Set up global callback for Telegram auth first
		window.TelegramLoginWidget = {
			dataOnauth: handleTelegramAuth,
		};

		// Check if script already exists
		const existingScript = document.querySelector('script[src*="telegram-widget.js"]');
		if (existingScript) {
			setScriptLoaded(true);
			return;
		}

		// Load Telegram Login Widget script
		const script = document.createElement('script');
		script.src = 'https://telegram.org/js/telegram-widget.js?22';
		script.async = true;
		script.onload = () => {
			console.log('Telegram widget script loaded');
			setScriptLoaded(true);

			// Inject the widget after script loads
			setTimeout(() => {
				const container = document.getElementById('telegram-login-widget-container');
				if (container) {
					container.innerHTML = '';

					const widgetScript = document.createElement('script');
					widgetScript.async = true;
					widgetScript.src = 'https://telegram.org/js/telegram-widget.js?22';
					widgetScript.setAttribute('data-telegram-login', TELEGRAM_BOT_USERNAME);
					widgetScript.setAttribute('data-size', 'large');
					widgetScript.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
					widgetScript.setAttribute('data-request-access', 'write');

					container.appendChild(widgetScript);
				}
			}, 100);
		};
		script.onerror = () => {
			console.error('Failed to load Telegram widget script');
			toast({
				title: 'Xatolik',
				description: 'Telegram widget yuklanmadi. Internetga ulanishni tekshiring.',
				variant: 'destructive',
			});
		};
		document.head.appendChild(script);

		return () => {
			// Clean up global callback but keep script
			if (window && (window as any).TelegramLoginWidget) {
				delete (window as any).TelegramLoginWidget;
			}
		};
	}, []);

	const handleTelegramAuth = async (user: TelegramUser) => {
		if (!user.username) {
			toast({
				title: 'Xatolik',
				description: "Telegram foydalanuvchi nomingiz mavjud emas. Iltimos, Telegram'da username o'rnating.",
				variant: 'destructive',
			});
			onError?.('Telegram username not available');
			return;
		}

		setIsLoading(true);

		try {
			const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
			const response = await fetch(`${API_BASE_URL}/auth/telegram/register`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					telegramUserId: user.id.toString(),
					telegramUsername: user.username,
					firstName: user.first_name,
					lastName: user.last_name,
					photoUrl: user.photo_url,
					authDate: user.auth_date,
					hash: user.hash,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Ro'yxatdan o'tishda xatolik yuz berdi");
			}

			// Save token and user data
			localStorage.setItem('token', data.access_token);

			// Update auth context
			await login(data.access_token, data.user);

			toast({
				title: 'Muvaffaqiyatli!',
				description: `Salom ${data.user.firstName}! Telegram orqali muvaffaqiyatli ro'yxatdan o'tdingiz.`,
			});

			onSuccess?.(data.access_token, data.user);
		} catch (error: any) {
			console.error('Telegram registration failed:', error);
			toast({
				title: 'Xatolik',
				description: error.message || "Telegram orqali ro'yxatdan o'tishda xatolik yuz berdi",
				variant: 'destructive',
			});
			onError?.(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card className='w-full max-w-md'>
			<CardHeader className='text-center'>
				<div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100'>
					<MessageSquare className='h-6 w-6 text-blue-600' />
				</div>
				<CardTitle className='text-xl font-semibold'>Telegram orqali ro'yxatdan o'tish</CardTitle>
				<CardDescription>Telegram hisobingiz orqali tezda ro'yxatdan o'ting</CardDescription>
			</CardHeader>

			<CardContent className='space-y-4'>
				{/* Benefits */}
				<div className='space-y-3 rounded-lg bg-blue-50 p-4'>
					<div className='flex items-center space-x-2'>
						<CheckCircle className='h-4 w-4 text-green-600' />
						<span className='text-sm text-gray-700'>Telegram username avtomatik ishlatiladi</span>
					</div>
					<div className='flex items-center space-x-2'>
						<CheckCircle className='h-4 w-4 text-green-600' />
						<span className='text-sm text-gray-700'>Xavfsiz va tezkor ro'yxatdan o'tish</span>
					</div>
					<div className='flex items-center space-x-2'>
						<CheckCircle className='h-4 w-4 text-green-600' />
						<span className='text-sm text-gray-700'>Qo'shimcha parol kerak emas</span>
					</div>
				</div>

				{/* Requirements */}
				<div className='space-y-2 rounded-lg bg-yellow-50 p-4'>
					<div className='flex items-center space-x-2'>
						<AlertTriangle className='h-4 w-4 text-yellow-600' />
						<span className='text-sm font-medium text-yellow-800'>Talablar:</span>
					</div>
					<ul className='text-sm text-yellow-700 space-y-1 ml-6'>
						<li>• Telegram hisobingizda username bo'lishi kerak</li>
						<li>• Telegram hisobi boshqa foydalanuvchi bilan bog'lanmagan bo'lishi kerak</li>
						<li>• Bot bilan avval muloqot qilmagan bo'lishingiz kerak</li>
					</ul>
				</div>

				{/* Telegram Login Button */}
				<div className='flex justify-center flex-col items-center space-y-2'>
					<p className='text-xs text-gray-500 mb-2'>
						Bot username: <code className='bg-gray-100 px-1 rounded'>{TELEGRAM_BOT_USERNAME}</code>
					</p>
					<p className='text-xs text-gray-500 mb-2'>
						Script loaded: <code className='bg-gray-100 px-1 rounded'>{scriptLoaded ? 'Yes' : 'No'}</code>
					</p>

					{scriptLoaded ? (
						<div className='bg-blue-50 p-4 rounded border border-blue-200'>
							<div id='telegram-login-widget-container' className='text-center'>
								<p className='text-sm text-blue-600 mb-2'>Widget container ready</p>
								{/* Manual widget injection for debugging */}
								<script
									async
									src='https://telegram.org/js/telegram-widget.js?22'
									data-telegram-login={TELEGRAM_BOT_USERNAME}
									data-size='large'
									data-onauth='TelegramLoginWidget.dataOnauth(user)'
									data-request-access='write'
								></script>
							</div>
						</div>
					) : (
						<div className='text-center'>
							<Button disabled className='w-full mb-2'>
								<MessageSquare className='mr-2 h-4 w-4' />
								Telegram widget yuklanmoqda...
							</Button>
						</div>
					)}
				</div>

				{isLoading && (
					<div className='text-center'>
						<div className='inline-flex items-center space-x-2'>
							<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600'></div>
							<span className='text-sm text-gray-600'>Ro'yxatdan o'tmoqda...</span>
						</div>
					</div>
				)}

				{/* Instructions */}
				<div className='space-y-2 text-center'>
					<p className='text-xs text-gray-500'>
						"Login with Telegram" tugmasini bosish orqali siz{' '}
						<a href='#' className='text-blue-600 hover:underline'>
							Foydalanish shartlari
						</a>{' '}
						va{' '}
						<a href='#' className='text-blue-600 hover:underline'>
							Maxfiylik siyosati
						</a>{' '}
						bilan rozisiz.
					</p>
				</div>

				{/* User Status Indicators */}
				<div className='flex justify-center space-x-2'>
					<Badge variant='secondary' className='text-xs'>
						<User className='mr-1 h-3 w-3' />
						Student sifatida ro'yxatdan o'tadi
					</Badge>
				</div>

				{/* Alternative Login Link */}
				<div className='text-center'>
					<p className='text-sm text-gray-600'>
						Allaqachon hisobingiz bormi?{' '}
						<a href='/login' className='font-medium text-blue-600 hover:text-blue-500'>
							Tizimga kirish
						</a>
					</p>
				</div>
			</CardContent>
		</Card>
	);
};

export default TelegramRegister;
