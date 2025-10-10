import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, Link, MessageCircle, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface TelegramConnectionStatus {
	isConnected: boolean;
	telegramUsername?: string;
	firstName?: string;
	lastName?: string;
	telegramId?: string;
}

const TelegramConnect = () => {
	const { user, login } = useAuth();
	const { toast } = useToast();
	const [status, setStatus] = useState<TelegramConnectionStatus | null>(null);
	const [telegramUsername, setTelegramUsername] = useState('');
	const [loading, setLoading] = useState(false);
	const [connecting, setConnecting] = useState(false);
	const [botUsername, setBotUsername] = useState('@EduOne_bot'); // This should come from config

	useEffect(() => {
		loadTelegramStatus();
	}, []);

	const loadTelegramStatus = async () => {
		try {
			setLoading(true);
			const response = await request.get('/users/me/telegram-status');
			setStatus(response.data);
		} catch (error) {
			console.error('Failed to load telegram status:', error);
			setStatus({ isConnected: false });
		} finally {
			setLoading(false);
		}
	};

	const handleConnectTelegram = async () => {
		if (!telegramUsername.trim()) {
			toast({
				title: 'Xato',
				description: 'Telegram username kiriting',
				variant: 'destructive',
			});
			return;
		}

		try {
			setConnecting(true);
			const response = await request.post('/users/me/connect-telegram', {
				telegramUsername: telegramUsername.replace('@', ''),
			});

			if (response.data.success) {
				toast({
					title: 'Muvaffaqiyat!',
					description: 'Telegram hisobingiz muvaffaqiyatli ulanmoqda. Iltimos, botdan kelgan xabarni tasdiqlang.',
				});
				loadTelegramStatus();
			}
		} catch (error: any) {
			toast({
				title: 'Xato',
				description: error.response?.data?.message || 'Telegram ulanishida xato yuz berdi',
				variant: 'destructive',
			});
		} finally {
			setConnecting(false);
		}
	};

	const copyBotUsername = () => {
		navigator.clipboard.writeText(botUsername);
		toast({
			title: 'Nusxalandi!',
			description: 'Bot username nusxalandi',
		});
	};

	const openTelegramBot = () => {
		const botUrl = `https://t.me/${botUsername.replace('@', '')}`;
		window.open(botUrl, '_blank');
	};

	const refreshStatus = () => {
		loadTelegramStatus();
	};

	if (loading) {
		return (
			<div className='min-h-screen bg-gradient-subtle flex items-center justify-center p-4'>
				<Card className='w-full max-w-md'>
					<CardContent className='flex items-center justify-center py-8'>
						<p>Telegram holat yuklanmoqda...</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gradient-subtle p-4'>
			<div className='max-w-2xl mx-auto space-y-6'>
				{/* Header */}
				<div className='text-center'>
					<h1 className='text-3xl font-bold text-foreground mb-2'>
						Telegram ulanish
					</h1>
					<p className='text-muted-foreground'>
						Test natijalari va xabarnomalari olish uchun Telegram hisobingizni ulang
					</p>
				</div>

				{/* Connection Status */}
				<Card>
					<CardHeader>
						<div className='flex items-center justify-between'>
							<CardTitle className='flex items-center space-x-2'>
								<MessageCircle className='h-5 w-5' />
								<span>Ulanish holati</span>
							</CardTitle>
							<Button variant='outline' size='sm' onClick={refreshStatus}>
								Yangilash
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{status?.isConnected ? (
							<div className='space-y-4'>
								<div className='flex items-center space-x-3 p-4 bg-green-50 rounded-lg'>
									<CheckCircle className='h-8 w-8 text-green-600' />
									<div>
										<p className='font-semibold text-green-800'>Muvaffaqiyatli ulandi!</p>
										<p className='text-green-700 text-sm'>
											{status.firstName} {status.lastName}
											{status.telegramUsername && ` (@${status.telegramUsername})`}
										</p>
									</div>
								</div>
								<div className='p-4 bg-blue-50 rounded-lg'>
									<h4 className='font-semibold text-blue-800 mb-2'>Endi nima qilish kerak?</h4>
									<ul className='text-sm text-blue-700 space-y-1'>
										<li>• Test natijalari avtomatik Telegramingizga yuboriladi</li>
										<li>• Bot orqali test PDF fayllari olasiz</li>
										<li>• Bot orqali test javoblarini yubora olasiz</li>
									</ul>
								</div>
							</div>
						) : (
							<div className='space-y-4'>
								<div className='flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg'>
									<AlertCircle className='h-8 w-8 text-yellow-600' />
									<div>
										<p className='font-semibold text-yellow-800'>Hali ulanmagan</p>
										<p className='text-yellow-700 text-sm'>
											Telegram hisobingizni ulab, test fayllari va natijalarni olishni boshlang
										</p>
									</div>
								</div>

								{/* Connection Form */}
								<div className='space-y-4 border-t pt-4'>
									<div className='space-y-2'>
										<Label htmlFor='telegram-username'>
											Telegram username'ingiz
										</Label>
										<Input
											id='telegram-username'
											placeholder='@username yoki username'
											value={telegramUsername}
											onChange={(e) => setTelegramUsername(e.target.value)}
											disabled={connecting}
										/>
										<p className='text-sm text-muted-foreground'>
											Telegram'dagi username'ingizni kiriting (masalan: @john_doe)
										</p>
									</div>

									<Button 
										onClick={handleConnectTelegram}
										disabled={connecting || !telegramUsername.trim()}
										className='w-full'
									>
										{connecting ? 'Ulanmoqda...' : 'Telegram hisobini ulash'}
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Instructions */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center space-x-2'>
							<Link className='h-5 w-5' />
							<span>Qanday ulash kerak?</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-4'>
							<div className='space-y-3'>
								<div className='flex items-start space-x-3'>
									<div className='flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold'>
										1
									</div>
									<div>
										<h4 className='font-semibold'>Telegram botni oching</h4>
										<p className='text-sm text-muted-foreground mb-2'>
											Quyidagi bot usernameini nusxalab, Telegram'da oching:
										</p>
										<div className='flex items-center space-x-2'>
											<code className='bg-gray-100 px-2 py-1 rounded text-sm'>
												{botUsername}
											</code>
											<Button size='sm' variant='outline' onClick={copyBotUsername}>
												<Copy className='h-4 w-4 mr-1' />
												Nusxalash
											</Button>
											<Button size='sm' onClick={openTelegramBot}>
												Botni ochish
											</Button>
										</div>
									</div>
								</div>

								<div className='flex items-start space-x-3'>
									<div className='flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold'>
										2
									</div>
									<div>
										<h4 className='font-semibold'>Botni ishga tushiring</h4>
										<p className='text-sm text-muted-foreground'>
											Botga <code className='bg-gray-100 px-1 rounded'>/start</code> commandasini yuboring
										</p>
									</div>
								</div>

								<div className='flex items-start space-x-3'>
									<div className='flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold'>
										3
									</div>
									<div>
										<h4 className='font-semibold'>Username kiriting</h4>
										<p className='text-sm text-muted-foreground'>
											Yuqoridagi formaga Telegram username'ingizni kiriting va "Ulash" tugmasini bosing
										</p>
									</div>
								</div>

								<div className='flex items-start space-x-3'>
									<div className='flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold'>
										4
									</div>
									<div>
										<h4 className='font-semibold'>Tasdiqlang</h4>
										<p className='text-sm text-muted-foreground'>
											Bot sizga tasdiqlash xabarini yuboradi, uni tasdiqlang
										</p>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Features */}
				<Card>
					<CardHeader>
						<CardTitle>Telegram orqali nima qila olasiz?</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='grid md:grid-cols-2 gap-4'>
							<div className='space-y-2'>
								<h4 className='font-semibold text-green-700'>📄 Test fayllari olish</h4>
								<p className='text-sm text-muted-foreground'>
									Botdan test PDF fayllari avtomatik keladi
								</p>
							</div>
							<div className='space-y-2'>
								<h4 className='font-semibold text-blue-700'>✍️ Javob yuborish</h4>
								<p className='text-sm text-muted-foreground'>
									Test javoblarini to'g'ridan-to'g'ri bot orqali yuboring
								</p>
							</div>
							<div className='space-y-2'>
								<h4 className='font-semibold text-purple-700'>📊 Natijalar olish</h4>
								<p className='text-sm text-muted-foreground'>
									Test natijalari avtomatik tarzda yuboriladi
								</p>
							</div>
							<div className='space-y-2'>
								<h4 className='font-semibold text-orange-700'>🔍 Javob tekshirish</h4>
								<p className='text-sm text-muted-foreground'>
									Yuborgan javoblaringiz avtomatik tekshiriladi
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default TelegramConnect;
