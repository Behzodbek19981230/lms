import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { Send, CheckCircle, AlertCircle, ExternalLink, Users, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import TelegramAuthButton from './TelegramAuthButton';

interface TelegramStatus {
	autoConnected: boolean;
	telegramUsername?: string;
	firstName?: string;
	lastName?: string;
	telegramUserId?: string; // ✅ NEW
	availableChannels: Array<{
		id: number;
		chatId: string;
		title?: string;
		username?: string;
		inviteLink?: string;
		type?: string;
		groupName?: string; // ✅ NEW
		subjectName?: string; // ✅ NEW
		centerName?: string; // ✅ NEW
	}>;
}

const TelegramConnectCard: React.FC = () => {
	const { toast } = useToast();
	const router = useRouter();
	const [status, setStatus] = useState<TelegramStatus | null>(null);
	const [loading, setLoading] = useState(false);
	const [connecting, setConnecting] = useState(false);

	const fetchStatus = async () => {
		try {
			setLoading(true);
			const response = await request.get('/telegram/user-status');
			setStatus({
				...response.data,
				autoConnected: response.data.isLinked, // Map isLinked to autoConnected
			});
		} catch (error) {
			console.error('Failed to fetch Telegram status:', error);
			setStatus({
				autoConnected: false,
				availableChannels: [],
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchStatus();
	}, []);

	const handleConnect = () => {
		router.push('/account/telegram-user');
	};

	const handleAuthSuccess = () => {
		toast({
			title: 'Muvaffaqiyat!',
			description: 'Telegram hisobingiz muvaffaqiyatli ulandi!',
		});
		fetchStatus(); // Refresh status
	};

	const handleAuthError = (error: string) => {
		toast({
			title: 'Xato',
			description: error,
			variant: 'destructive',
		});
	};

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-base sm:text-lg'>
						<Send className='h-4 w-4 sm:h-5 sm:w-5' />
						Telegram Integration
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className='text-xs sm:text-sm text-gray-500'>Loading...</p>
				</CardContent>
			</Card>
		);
	}

	if (!status) {
		return null;
	}

	return (
		<Card className='shadow-card hover:shadow-hover transition-all duration-500 hover:-translate-y-1 bg-gradient-card backdrop-blur-sm animate-slide-up border-border/50'>
			<CardHeader className='pb-3 sm:pb-4'>
				<CardTitle className='flex items-center gap-2 sm:gap-3 text-base sm:text-lg'>
					<div className='p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600'>
						<Send className='h-4 w-4 sm:h-5 sm:w-5 text-white' />
					</div>
					<span className='bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold text-sm sm:text-base'>
						Telegram Integration
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className='space-y-3 sm:space-y-4'>
				{status.autoConnected ? (
					<div className='space-y-3 sm:space-y-4 animate-fade-in'>
						<div className='flex items-center justify-between p-2 sm:p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200'>
							<div className='flex items-center gap-2 sm:gap-3'>
								<div className='p-1.5 sm:p-2 bg-green-500 rounded-full'>
									<CheckCircle className='h-3 w-3 sm:h-4 sm:w-4 text-white' />
								</div>
								<div>
									<Badge className='bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm font-semibold text-[10px] sm:text-xs'>
										Avtomatik ulangan
									</Badge>
									<div className='w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse mt-1'></div>
								</div>
							</div>
						</div>

						<div className='p-3 bg-gradient-subtle rounded-lg border border-border/50'>
							<div className='flex items-center gap-2 mb-2'>
								<div className='w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center'>
									<span className='text-white font-bold text-sm'>{status.firstName?.charAt(0)}</span>
								</div>
								<div>
									<p className='text-sm font-semibold text-foreground'>
										{status.firstName} {status.lastName}
									</p>
									{status.telegramUsername && (
										<p className='text-xs text-muted-foreground font-mono'>
											@{status.telegramUsername}
										</p>
									)}
								</div>
							</div>
						</div>

						{/* ✅ IMPROVED: Show available channels with group info */}
						{status.availableChannels.length > 0 && (
							<div className='space-y-3'>
								<div className='flex items-center gap-2'>
									<div className='w-1 h-4 bg-gradient-primary rounded-full'></div>
									<p className='text-sm font-semibold text-foreground'>
										Sizning kanallaringiz ({status.availableChannels.length}):
									</p>
								</div>
								<div className='space-y-2 max-h-64 overflow-y-auto'>
									{status.availableChannels.map((channel, index) => (
										<div
											key={channel.id}
											className='flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-300 animate-fade-in'
											style={{ animationDelay: `${index * 50}ms` }}
										>
											<div className='flex-1 space-y-1'>
												<div className='flex items-center gap-2'>
													<div className='w-2 h-2 bg-blue-500 rounded-full animate-pulse'></div>
													<span className='text-sm font-semibold text-blue-900 truncate'>
														{channel.title || channel.username || `Kanal ${channel.id}`}
													</span>
												</div>
												{/* ✅ Show group/subject/center info */}
												<div className='flex flex-wrap gap-1.5 ml-4'>
													{channel.groupName && (
														<Badge
															variant='outline'
															className='text-[10px] bg-purple-50 border-purple-200 text-purple-700'
														>
															👥 {channel.groupName}
														</Badge>
													)}
													{channel.subjectName && (
														<Badge
															variant='outline'
															className='text-[10px] bg-blue-50 border-blue-200 text-blue-700'
														>
															📚 {channel.subjectName}
														</Badge>
													)}
													{channel.centerName && (
														<Badge
															variant='outline'
															className='text-[10px] bg-gray-50 border-gray-200 text-gray-700'
														>
															🏢 {channel.centerName}
														</Badge>
													)}
												</div>
											</div>
											<div className='flex gap-1.5'>
												{channel.inviteLink && (
													<Button
														size='sm'
														variant='default'
														className='h-7 px-2 text-xs bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-sm'
														onClick={() => window.open(channel.inviteLink, '_blank')}
														title="Kanalga qo'shilish"
													>
														<ExternalLink className='h-3 w-3' />
													</Button>
												)}
												{channel.username && !channel.inviteLink && (
													<Button
														size='sm'
														variant='outline'
														className='h-7 px-2 text-xs'
														onClick={() =>
															window.open(
																`https://t.me/${channel.username!.replace('@', '')}`,
																'_blank'
															)
														}
														title="Kanalga qo'shilish"
													>
														<ExternalLink className='h-3 w-3' />
													</Button>
												)}
											</div>
										</div>
									))}
								</div>
								<div className='p-2 bg-green-50 border border-green-200 rounded-lg'>
									<p className='text-xs text-green-700 text-center'>
										💡 Barcha kanallaringizga qo'shiling - test xabarnomalarini shu yerdan olasiz
									</p>
								</div>
							</div>
						)}

						<Button
							onClick={handleConnect}
							className='w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]'
							size='sm'
						>
							<Users className='h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2' />
							<span className='text-xs sm:text-sm'>Telegram boshqaruvi</span>
						</Button>
					</div>
				) : (
					<div className='space-y-3 sm:space-y-4 animate-fade-in'>
						<div className='flex items-center justify-between p-2 sm:p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200'>
							<div className='flex items-center gap-2 sm:gap-3'>
								<div className='p-1.5 sm:p-2 bg-orange-500 rounded-full'>
									<AlertCircle className='h-3 w-3 sm:h-4 sm:w-4 text-white' />
								</div>
								<div>
									<Badge className='bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-sm font-semibold text-[10px] sm:text-xs'>
										Avtomatik ulanmagan
									</Badge>
									<div className='w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-400 rounded-full animate-pulse mt-1'></div>
								</div>
							</div>
						</div>

						<div className='p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200'>
							<div className='flex items-start gap-3'>
								<div className='w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0'>
									<Send className='h-5 w-5 text-white' />
								</div>
								<div>
									<p className='text-sm font-semibold text-foreground mb-1'>
										Telegram integratsiyasi
									</p>
									<p className='text-xs text-muted-foreground leading-relaxed'>
										Telegram hisobingizni ulang va test xabarnomalarini to'g'ridan-to'g'ri Telegram
										orqali oling.
									</p>
								</div>
							</div>
						</div>

						{/* Enhanced connection with auto-auth */}
						<div className='space-y-3'>
							<div className='p-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg'>
								<TelegramAuthButton
									onSuccess={handleAuthSuccess}
									onError={handleAuthError}
									className='w-full bg-white hover:bg-gray-50 text-gray-800 border-0 shadow-none hover:shadow-sm transition-all duration-300'
									size='sm'
								/>
							</div>

							<div className='flex items-center gap-3'>
								<div className='flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent'></div>
								<span className='text-xs text-muted-foreground px-3 bg-background rounded-full border border-border'>
									yoki
								</span>
								<div className='flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent'></div>
							</div>

							<Button
								onClick={handleConnect}
								className='w-full bg-gradient-subtle border border-border hover:shadow-card transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5'
								size='sm'
							>
								<Users className='h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2' />
								<span className='text-xs sm:text-sm'>Telegram boshqaruvi</span>
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default TelegramConnectCard;
