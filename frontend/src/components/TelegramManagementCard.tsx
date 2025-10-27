import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { Send, Settings, Users, MessageSquare, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TelegramStats {
	totalChats: number;
	activeChannels: number;
	linkedUsers: number;
	unlinkedUsers: number;
	recentTests: number;
}

const TelegramManagementCard: React.FC = () => {
	const { toast } = useToast();
	const navigate = useNavigate();
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
		navigate('/account/telegram');
	};

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-base sm:text-lg'>
						<Send className='h-4 w-4 sm:h-5 sm:w-5' />
						Telegram Management
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className='text-xs sm:text-sm text-gray-500'>Loading...</p>
				</CardContent>
			</Card>
		);
	}

	if (!stats) {
		return null;
	}

	return (
		<Card className='shadow-card hover:shadow-hover transition-all duration-300'>
			<CardHeader className='pb-3 sm:pb-4'>
				<CardTitle className='flex items-center gap-2 text-base sm:text-lg'>
					<Send className='h-4 w-4 sm:h-5 sm:w-5 text-primary' />
					Telegram Management
				</CardTitle>
			</CardHeader>
			<CardContent className='space-y-3 sm:space-y-4'>
				<div className='grid grid-cols-2 gap-2 sm:gap-3'>
					<div className='text-center p-2 sm:p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors'>
						<div className='text-base sm:text-lg font-bold text-blue-700'>{stats.activeChannels}</div>
						<div className='text-[10px] sm:text-xs text-blue-600'>Active Channels</div>
					</div>
					<div className='text-center p-2 sm:p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors'>
						<div className='text-base sm:text-lg font-bold text-green-700'>{stats.linkedUsers}</div>
						<div className='text-[10px] sm:text-xs text-green-600'>Linked Users</div>
					</div>
				</div>

				{stats.unlinkedUsers > 0 && (
					<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 bg-orange-50 rounded-lg gap-2 sm:gap-0'>
						<div className='flex items-center gap-2'>
							<Users className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600' />
							<span className='text-xs sm:text-sm text-orange-700'>
								{stats.unlinkedUsers} users need linking
							</span>
						</div>
						<Badge className='bg-orange-100 text-orange-800 text-[10px] sm:text-xs'>Action Required</Badge>
					</div>
				)}

				<div className='space-y-2'>
					<Button onClick={handleManage} className='w-full' size='sm'>
						<Settings className='h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2' />
						<span className='text-xs sm:text-sm'>Manage Telegram</span>
					</Button>

					<div className='grid grid-cols-2 gap-2'>
						<Button onClick={() => navigate('/account/telegram')} variant='outline' size='sm'>
							<MessageSquare className='h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1' />
							<span className='text-xs sm:text-sm'>Channels</span>
						</Button>
						<Button onClick={() => navigate('/account/telegram')} variant='outline' size='sm'>
							<Users className='h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1' />
							<span className='text-xs sm:text-sm'>Users</span>
						</Button>
					</div>
				</div>

				<div className='pt-2 border-t border-border'>
					<p className='text-[10px] sm:text-xs text-muted-foreground leading-relaxed'>
						Quick access to Telegram bot management, channel registration, and user linking.
					</p>
				</div>
			</CardContent>
		</Card>
	);
};

export default TelegramManagementCard;
