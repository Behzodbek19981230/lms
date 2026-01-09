import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
	Users,
	UserPlus,
	Link,
	Search,
	RefreshCw,
	AlertCircle,
	CheckCircle,
	XCircle,
	User,
	MessageCircle,
} from 'lucide-react';

import { telegramService } from '@/services/telegram.service';
import { TelegramChat, TelegramUserStatus } from '@/types/telegram.type';

interface TelegramUserManagementProps {
	onSuccess: (message: string) => void;
	onError: (error: string) => void;
}

const TelegramUserManagement: React.FC<TelegramUserManagementProps> = ({ onSuccess, onError }) => {
	const [loading, setLoading] = useState(true);
	const [unlinkedUsers, setUnlinkedUsers] = useState<TelegramChat[]>([]);
	const [userStatus, setUserStatus] = useState<TelegramUserStatus | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedUserId, setSelectedUserId] = useState('');
	const [selectedTelegramUserId, setSelectedTelegramUserId] = useState('');
	const [linkingInProgress, setLinkingInProgress] = useState(false);

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		try {
			setLoading(true);

			// Load unlinked users
			const unlinked = await telegramService.getUnlinkedUsers();
			setUnlinkedUsers(unlinked);

			// Load current user's Telegram status
			try {
				const status = await telegramService.getUserTelegramStatus();
				setUserStatus(status);
			} catch (error) {
				// User status might not be available, that's okay
				console.warn('User Telegram status not available');
			}
		} catch (error: any) {
			const errorMessage = error?.response?.data?.message || "Foydalanuvchi ma'lumotlarini yuklab bo'lmadi";
			onError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const handleLinkUsers = async () => {
		if (!selectedTelegramUserId || !selectedUserId) {
			onError('Iltimos, Telegram foydalanuvchi va LMS foydalanuvchini tanlang');
			return;
		}

		try {
			setLinkingInProgress(true);

			const result = await telegramService.linkTelegramUser(selectedTelegramUserId, parseInt(selectedUserId));

			if (result.success) {
				onSuccess(result.message);
				setSelectedTelegramUserId('');
				setSelectedUserId('');
				loadData(); // Refresh data
			} else {
				onError(result.message);
			}
		} catch (error: any) {
			const errorMessage = error?.response?.data?.message || "Foydalanuvchilarni bog'lab bo'lmadi";
			onError(errorMessage);
		} finally {
			setLinkingInProgress(false);
		}
	};

	const handleRefresh = () => {
		loadData();
	};

	const filteredUnlinkedUsers = unlinkedUsers.filter(
		(user) =>
			user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.telegramUsername?.toLowerCase().includes(searchTerm.toLowerCase())
	);

	if (loading) {
		return (
			<Card className='w-full'>
				<CardContent className='p-6'>
					<div className='flex items-center justify-center space-x-2'>
						<RefreshCw className='h-4 w-4 animate-spin' />
						<span>Foydalanuvchilar ma'lumotlari yuklanmoqda...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className='space-y-6'>
			{/* Header */}
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div>
							<CardTitle className='flex items-center space-x-2'>
								<Users className='h-5 w-5' />
								<span>Foydalanuvchilar</span>
							</CardTitle>
							<CardDescription>Telegram foydalanuvchilarini bog'lash va hisob ulash</CardDescription>
						</div>
						<Button variant='outline' size='sm' onClick={handleRefresh} disabled={loading}>
							<RefreshCw className='h-4 w-4 mr-2' />
							Yangilash
						</Button>
					</div>
				</CardHeader>
			</Card>

			{/* Current User Status */}
			{userStatus && (
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center space-x-2'>
							<User className='h-5 w-5' />
							<span>Telegram holatingiz</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='flex items-center justify-between p-4 border rounded-lg'>
							<div className='flex items-center space-x-3'>
								<div className='flex items-center space-x-2'>
									{userStatus.autoConnected ? (
										<CheckCircle className='h-5 w-5 text-green-500' />
									) : (
										<XCircle className='h-5 w-5 text-red-500' />
									)}
									<span className='font-medium'>
										{userStatus.autoConnected ? 'Avtomatik ulangan' : 'Avtomatik ulanmagan'}
									</span>
								</div>
								{userStatus.telegramUsername && (
									<Badge variant='outline'>@{userStatus.telegramUsername}</Badge>
								)}
							</div>
							<div className='text-sm text-muted-foreground'>
								{userStatus.firstName} {userStatus.lastName}
							</div>
						</div>

						{userStatus.availableChannels.length > 0 && (
							<div className='mt-4'>
								<Label className='text-sm font-medium'>Available Channels:</Label>
								<div className='mt-2 space-y-2'>
									{userStatus.availableChannels.map((channel) => (
										<div
											key={channel.id}
											className='flex items-center justify-between p-2 border rounded'
										>
											<div className='flex items-center space-x-2'>
												<MessageCircle className='h-4 w-4 text-muted-foreground' />
												<span className='text-sm'>
													{telegramService.formatChannelName(channel)}
												</span>
											</div>
											<Badge variant={channel.status === 'active' ? 'default' : 'secondary'}>
												{channel.status}
											</Badge>
										</div>
									))}
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* User Linking Section */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center space-x-2'>
						<Link className='h-5 w-5' />
						<span>Foydalanuvchini bog'lash</span>
					</CardTitle>
					<CardDescription>Telegram foydalanuvchilarini LMS hisoblariga bog'lash</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					{unlinkedUsers.length === 0 ? (
						<Alert>
							<CheckCircle className='h-4 w-4' />
							<AlertTitle>Barcha foydalanuvchilar bog'langan!</AlertTitle>
							<AlertDescription>
								Barcha Telegram foydalanuvchilari LMS hisoblariga muvaffaqiyatli bog'langan.
							</AlertDescription>
						</Alert>
					) : (
						<>
							<Alert>
								<AlertCircle className='h-4 w-4' />
								<AlertTitle>Ulanmagan foydalanuvchilar topildi</AlertTitle>
								<AlertDescription>
									{unlinkedUsers.length} ta Telegram foydalanuvchisini LMS hisobiga bog'lash kerak.
								</AlertDescription>
							</Alert>

							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<div className='space-y-2'>
									<Label htmlFor='telegram-user'>Telegram foydalanuvchini tanlang</Label>
									<Select value={selectedTelegramUserId} onValueChange={setSelectedTelegramUserId}>
										<SelectTrigger>
											<SelectValue placeholder='Telegram foydalanuvchini tanlang' />
										</SelectTrigger>
										<SelectContent>
											{filteredUnlinkedUsers.map((user) => (
												<SelectItem key={user.id} value={user.telegramUserId || ''}>
													<div className='flex items-center space-x-2'>
														<User className='h-4 w-4' />
														<span>
															{user.firstName} {user.lastName}
															{user.telegramUsername && ` (@${user.telegramUsername})`}
														</span>
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className='space-y-2'>
									<Label htmlFor='lms-user'>LMS User ID</Label>
									<Input
										id='lms-user'
										type='number'
										placeholder='LMS user ID kiriting'
										value={selectedUserId}
										onChange={(e) => setSelectedUserId(e.target.value)}
									/>
								</div>
							</div>

							<Button
								onClick={handleLinkUsers}
								disabled={linkingInProgress || !selectedTelegramUserId || !selectedUserId}
								className='w-full'
							>
								{linkingInProgress ? (
									<RefreshCw className='h-4 w-4 mr-2 animate-spin' />
								) : (
									<Link className='h-4 w-4 mr-2' />
								)}
								Bog'lash
							</Button>
						</>
					)}
				</CardContent>
			</Card>

			{/* Unlinked Users List */}
			{unlinkedUsers.length > 0 && (
				<Card>
					<CardHeader>
						<div className='flex items-center justify-between'>
							<div>
								<CardTitle className='flex items-center space-x-2'>
									<UserPlus className='h-5 w-5' />
									<span>Ulanmagan Telegram foydalanuvchilari</span>
								</CardTitle>
								<CardDescription>Telegram foydalanuvchilari LMS ga bog'lanishini kutmoqda</CardDescription>
							</div>
							<div className='flex items-center space-x-2'>
								<Search className='h-4 w-4 text-muted-foreground' />
								<Input
									placeholder="Foydalanuvchini qidirish..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className='w-48'
								/>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className='space-y-3'>
							{filteredUnlinkedUsers.map((user) => (
								<div key={user.id} className='flex items-center justify-between p-3 border rounded-lg'>
									<div className='flex items-center space-x-3'>
										<User className='h-5 w-5 text-muted-foreground' />
										<div>
											<p className='font-medium'>
												{user.firstName} {user.lastName}
											</p>
											<div className='flex items-center space-x-2 text-sm text-muted-foreground'>
												{user.telegramUsername && (
													<Badge variant='outline'>@{user.telegramUsername}</Badge>
												)}
												<span>ID: {user.telegramUserId}</span>
											</div>
										</div>
									</div>
									<div className='flex items-center space-x-2'>
										<Badge variant='secondary'>Ulanmagan</Badge>
										<Button
											variant='outline'
											size='sm'
											onClick={() => {
												setSelectedTelegramUserId(user.telegramUserId || '');
											}}
										>
											Tanlash
										</Button>
									</div>
								</div>
							))}

							{filteredUnlinkedUsers.length === 0 && searchTerm && (
								<div className='text-center py-8'>
									<Search className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
										<p className='text-lg font-medium'>Foydalanuvchi topilmadi</p>
										<p className='text-muted-foreground'>Qidiruv shartlarini o'zgartirib ko'ring</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Usage Instructions */}
			<Card>
				<CardHeader>
					<CardTitle>Foydalanuvchini qanday bog'lash</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='space-y-3 text-sm text-muted-foreground'>
						<div className='flex items-start space-x-2'>
							<span className='flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold'>
								1
							</span>
							<p>Avval foydalanuvchi Telegram botga /start buyrug'ini yuborishi kerak</p>
						</div>
						<div className='flex items-start space-x-2'>
							<span className='flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold'>
								2
							</span>
							<p>Yuqoridagi ro'yxatdan ulanmagan Telegram foydalanuvchini toping</p>
						</div>
						<div className='flex items-start space-x-2'>
							<span className='flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold'>
								3
							</span>
							<p>Mos LMS foydalanuvchi ID sini kiriting va "Bog'lash" tugmasini bosing</p>
						</div>
						<div className='flex items-start space-x-2'>
							<span className='flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold'>
								4
							</span>
							<p>Foydalanuvchi kanal takliflarini avtomatik qabul qiladi</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default TelegramUserManagement;
