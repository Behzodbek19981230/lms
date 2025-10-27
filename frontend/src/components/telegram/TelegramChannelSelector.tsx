import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';

import { telegramService } from '@/services/telegram.service';
import { TelegramChat, TelegramChannelSelectorProps } from '@/types/telegram.type';

const TelegramChannelSelector: React.FC<TelegramChannelSelectorProps> = ({
	selectedChannelId,
	onChannelSelect,
	filterByCenter = false,
}) => {
	const [channels, setChannels] = React.useState<TelegramChat[]>([]);
	const [loading, setLoading] = React.useState(true);

	React.useEffect(() => {
		loadChannels();
	}, []);

	const loadChannels = async () => {
		try {
			const allChats = await telegramService.getAllChats();
			const telegramChannels = allChats.filter((chat) => chat.type === 'channel');
			setChannels(telegramChannels);
		} catch (error) {
			console.error('Failed to load channels:', error);
		} finally {
			setLoading(false);
		}
	};

	const displayChannels = filterByCenter ? channels.filter((channel) => channel.center) : channels;

	return (
		<Select value={selectedChannelId} onValueChange={onChannelSelect} disabled={loading}>
			<SelectTrigger>
				<SelectValue placeholder={loading ? 'Loading channels...' : 'Select a channel'} />
			</SelectTrigger>
			<SelectContent>
				{displayChannels.map((channel) => (
					<SelectItem key={channel.id} value={channel.chatId}>
						<div className='flex items-center space-x-2 w-full'>
							<MessageCircle className='h-4 w-4 text-muted-foreground' />
							<span>{telegramService.formatChannelName(channel)}</span>
							{channel.center && (
								<Badge variant='outline' className='ml-auto'>
									{channel.center.name}
								</Badge>
							)}
						</div>
					</SelectItem>
				))}
				{displayChannels.length === 0 && !loading && (
					<SelectItem value='' disabled>
						No channels available
					</SelectItem>
				)}
			</SelectContent>
		</Select>
	);
};

export default TelegramChannelSelector;
