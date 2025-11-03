import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { Send, Settings, Users, MessageSquare, ExternalLink, BarChart3, Bot, Link } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TelegramStats {
	totalChats: number;
	activeChannels: number;
	linkedUsers: number;
	unlinkedUsers: number;
	recentTests: number;
}

const TelegramManagementCard: React.FC = () => {
	const { toast } = useToast();
	const router = useRouter();
	const [stats, setStats] = useState<TelegramStats | null>(null);
	const [loading, setLoading] = useState(false);

	const fetchStats = async () => {
		try {
			setLoading(true);
			// You could create a specific endpoint for stats, for now we'll simulate
			const [chatsRes, unlinkedRes] = await Promise.all([
				request.get('/telegram/chats/user/me').catch(() => ({ data: [] })),
				request.get('/telegram/unlinked-users').catch(() => ({ data: [] })),
			]);

			const chats = chatsRes.data || [];
			const unlinkedUsers = unlinkedRes.data || [];

			setStats({
				totalChats: chats.length,
				activeChannels: chats.filter((chat: any) => chat.type === 'channel' && chat.status === 'active').length,
				linkedUsers: chats.filter((chat: any) => chat.user).length,
				unlinkedUsers: unlinkedUsers.length,
				recentTests: 0, // This could be enhanced with actual data
			});
		} catch (error) {
			console.error('Failed to fetch Telegram stats:', error);
			setStats({
				totalChats: 0,
				activeChannels: 0,
				linkedUsers: 0,
				unlinkedUsers: 0,
				recentTests: 0,
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchStats();
	}, []);

	const handleManage = () => {
		router.push('/account/telegram');
	};

	if (loading) {
		return (
			<Card className='shadow-card hover:shadow-hover transition-all duration-300'>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-base sm:text-lg'>
						<Send className='h-4 w-4 sm:h-5 sm:w-5' />
						Telegram boshqaruv
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className='text-xs sm:text-sm text-gray-500'>Yuklanmoqda...</p>
				</CardContent>
			</Card>
		);
	}

	if (!stats) {
		return null;
	}

	return (
		<Card className='shadow-card hover:shadow-hover transition-all duration-300 border-border'>
			<CardHeader className='pb-3 sm:pb-4'>
				<CardTitle className='flex items-center gap-2 text-base sm:text-lg'>
					<div className='p-2 bg-blue-100 rounded-lg'>
						<Send className='h-4 w-4 sm:h-5 sm:w-5 text-blue-600' />
					</div>
					<span className='bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold'>
						Telegram boshqaruv
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='grid grid-cols-2 gap-3'>
					<div className='text-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors'>
						<div className='text-lg font-bold text-blue-700'>{stats.activeChannels}</div>
						<div className='text-xs text-blue-600'>Faol kanallar</div>
					</div>
					<div className='text-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors'>
						<div className='text-lg font-bold text-green-700'>{stats.linkedUsers}</div>
						<div className='text-xs text-green-600'>Ulangan foydalanuvchilar</div>
					</div>
					<div className='text-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors'>
						<div className='text-lg font-bold text-purple-700'>{stats.totalChats}</div>
						<div className='text-xs text-purple-600'>Jami chatlar</div>
					</div>
					<div className='text-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors'>
						<div className='text-lg font-bold text-orange-700'>{stats.unlinkedUsers}</div>
						<div className='text-xs text-orange-600'>Bog'lanmagan foydalanuvchilar</div>
					</div>
				</div>

				{stats.unlinkedUsers > 0 && (
					<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-orange-50 rounded-lg gap-2 sm:gap-0 border border-orange-200'>
						<div className='flex items-center gap-2'>
							<Users className='h-4 w-4 sm:h-5 sm:w-5 text-orange-600' />
							<span className='text-sm text-orange-700'>
								{stats.unlinkedUsers} foydalanuvchini bog'lash kerak
							</span>
						</div>
						<Badge className='bg-orange-100 text-orange-800 text-xs'>Harakat talab qilinadi</Badge>
					</div>
				)}

				<div className='space-y-3'>
					<Button
						onClick={handleManage}
						className='w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
					>
						<Settings className='h-4 w-4 mr-2' />
						<span className='text-sm'>Telegramni boshqarish</span>
					</Button>

					<div className='grid grid-cols-2 gap-2'>
						<Button
							onClick={() => router.push('/account/telegram')}
							variant='outline'
							size='sm'
							className='border-border'
						>
							<MessageSquare className='h-4 w-4 mr-1' />
							<span className='text-xs'>Kanallar</span>
						</Button>
						<Button
							onClick={() => router.push('/account/telegram')}
							variant='outline'
							size='sm'
							className='border-border'
						>
							<Users className='h-4 w-4 mr-1' />
							<span className='text-xs'>Foydalanuvchilar</span>
						</Button>
					</div>
				</div>

				<div className='pt-3 border-t border-border'>
					<div className='flex items-center gap-2 mb-2'>
						<Bot className='h-4 w-4 text-blue-500' />
						<h4 className='text-sm font-semibold text-foreground'>Telegram integratsiyasi</h4>
					</div>
					<p className='text-xs text-muted-foreground leading-relaxed'>
						Telegram bot orqali testlarni tarqatish, javoblarni to'plash va natijalarni e'lon qilish.
					</p>
					<div className='mt-2 flex flex-wrap gap-1'>
						<Badge variant='secondary' className='text-[10px]'>
							Test tarqatish
						</Badge>
						<Badge variant='secondary' className='text-[10px]'>
							Javob to'plash
						</Badge>
						<Badge variant='secondary' className='text-[10px]'>
							Natijalar
						</Badge>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default TelegramManagementCard;
