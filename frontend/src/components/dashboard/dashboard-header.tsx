import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookOpen, Bell, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { request } from '@/configs/request';

export const DashboardHeader = () => {
	const { user, logout } = useAuth();
	const router = useRouter();
	const [notifications, setNotifications] = useState<any[]>([]);
	const unreadCount = notifications.filter((n) => !n.isRead).length;

	const handleLogout = () => {
		logout();
		router.push('/');
	};

	const fetchNotifications = async () => {
		try {
			const { data } = await request.get('/notifications/me');
			setNotifications(data || []);
		} catch (e) {}
	};

	useEffect(() => {
		fetchNotifications();
		const t = setInterval(fetchNotifications, 30000);
		return () => clearInterval(t);
	}, []);

	const markRead = async (id: number) => {
		try {
			await request.patch(`/notifications/${id}/read`);
			setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
		} catch (e) {}
	};

	return (
		<header className='h-14 sm:h-16 border-b border-primary/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-3 sm:px-4 md:px-6 shadow-sm shadow-primary/5'>
			<div className='flex items-center gap-2 sm:gap-4'>
				{/* Mobile Menu Trigger */}
				<div className='md:hidden'>
					<SidebarTrigger />
				</div>

				<div className='flex items-center gap-2 sm:gap-3'>
					<div className='w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-card hover:shadow-hover transition-all duration-300'>
						<BookOpen className='h-4 w-4 sm:h-5 sm:w-5 text-white' />
					</div>
					<div className='hidden sm:block'>
						<span className='text-base sm:text-xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent'>
							{user?.center?.name || 'EduOne'}
						</span>
						<p className='text-xs text-muted-foreground hidden md:block'>
							{user?.role === 'superadmin' && 'Super Admin Panel'}
							{user?.role === 'admin' && 'Markaz Admini'}
							{user?.role === 'teacher' && "O'qituvchi Panel"}
							{user?.role === 'student' && 'Talaba Panel'}
						</p>
					</div>
				</div>
			</div>

			<div className='flex items-center gap-2 sm:gap-3 md:gap-4'>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant='ghost'
							size='sm'
							className='relative hover:bg-primary/5 transition-all duration-300 h-8 w-8 sm:h-9 sm:w-9 p-0'
						>
							<Bell className='h-4 w-4 sm:h-5 sm:w-5 transition-transform hover:scale-110' />
							{unreadCount > 0 && (
								<span className='absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-3.5 min-w-3.5 sm:h-4 sm:min-w-4 px-0.5 sm:px-1 bg-gradient-to-br from-destructive to-destructive/80 text-white rounded-full text-[9px] sm:text-[10px] flex items-center justify-center shadow-md animate-pulse'>
									{unreadCount}
								</span>
							)}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='end' className='w-72 sm:w-80 max-h-80 sm:max-h-96 overflow-auto'>
						{notifications.length === 0 ? (
							<div className='p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground'>
								Hozircha bildirishnoma yo'q
							</div>
						) : (
							notifications.map((n) => (
								<DropdownMenuItem
									key={n.id}
									onClick={() => markRead(n.id)}
									className={`p-2 sm:p-3 ${!n.isRead ? 'bg-muted/50' : ''}`}
								>
									<div className='w-full'>
										<div className='text-xs sm:text-sm font-medium line-clamp-2'>{n.title}</div>
										{n.message && (
											<div className='text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2'>
												{n.message}
											</div>
										)}
									</div>
								</DropdownMenuItem>
							))
						)}
					</DropdownMenuContent>
				</DropdownMenu>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant='ghost'
							className='flex items-center gap-1.5 sm:gap-2 hover:bg-primary/5 transition-all duration-300 rounded-lg h-auto py-1.5 sm:py-2 px-1.5 sm:px-3'
						>
							<Avatar className='h-7 w-7 sm:h-8 sm:w-8 border-2 border-primary/20 transition-all duration-300 hover:border-primary/40'>
								<AvatarFallback className='bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white text-xs sm:text-sm shadow-sm hover:shadow-md transition-all duration-300'>
									{user?.firstName?.charAt(0).toUpperCase() || 'U'}
								</AvatarFallback>
							</Avatar>
							<div className='text-left hidden md:block'>
								<div className='text-sm font-medium text-foreground line-clamp-1 max-w-[120px]'>
									{user?.firstName} {user?.lastName}
								</div>
								<div className='text-xs text-muted-foreground capitalize'>{user?.role}</div>
							</div>
						</Button>
					</DropdownMenuTrigger>

					<DropdownMenuContent align='end' className='w-48 sm:w-56'>
						<DropdownMenuItem
							onClick={() => router.push('/account/profile')}
							className='py-2 sm:py-2.5 text-xs sm:text-sm'
						>
							<User className='mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4' />
							Profil
						</DropdownMenuItem>
						<DropdownMenuItem className='py-2 sm:py-2.5 text-xs sm:text-sm'>
							<Settings className='mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4' />
							Sozlamalar
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={handleLogout}
							className='text-destructive py-2 sm:py-2.5 text-xs sm:text-sm'
						>
							<LogOut className='mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4' />
							Chiqish
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	);
};
