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
import { BookOpen, Bell, Settings, LogOut, User, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { request } from '@/configs/request';

type PublicMobileRelease = {
	id: number;
	platform: 'android' | 'ios';
	version: string;
	originalFileName: string;
	archiveUrl: string;
	archiveSizeBytes: number;
	createdAt: string;
} | null;

export const DashboardHeader = () => {
	const { user, logout } = useAuth();
	const router = useRouter();
	const [notifications, setNotifications] = useState<any[]>([]);
	const [androidRelease, setAndroidRelease] = useState<PublicMobileRelease>(null);
	const [iosRelease, setIosRelease] = useState<PublicMobileRelease>(null);
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

	const fetchMobileReleases = async () => {
		try {
			const [androidRes, iosRes] = await Promise.all([
				request.get('/mobile-releases/public/latest', { params: { platform: 'android' } }),
				request.get('/mobile-releases/public/latest', { params: { platform: 'ios' } }),
			]);
			setAndroidRelease(androidRes.data || null);
			setIosRelease(iosRes.data || null);
		} catch (e) {
			setAndroidRelease(null);
			setIosRelease(null);
		}
	};

	useEffect(() => {
		fetchMobileReleases();
	}, []);

	const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) || '';
	const downloadOrigin = apiBaseUrl.replace(/\/?api\/?$/, '');
	const androidHref = androidRelease?.archiveUrl ? `${downloadOrigin}${androidRelease.archiveUrl}` : undefined;
	const iosHref = iosRelease?.archiveUrl ? `${downloadOrigin}${iosRelease.archiveUrl}` : undefined;

	const isMobileReleaseNotif = (n: any): boolean => {
		return Boolean(n?.metadata && n?.metadata?.kind === 'mobile_release' && n?.metadata?.archiveUrl);
	};

	const markRead = async (id: number) => {
		try {
			await request.patch(`/notifications/${id}/read`);
			setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
		} catch (e) {}
	};

	const markReadAndRemove = async (id: number) => {
		try {
			await request.patch(`/notifications/${id}/read`);
		} catch (e) {
			// ignore
		}
		setNotifications((prev) => prev.filter((n) => n.id !== id));
	};

	const downloadFromNotification = async (n: any) => {
		const archiveUrl = n?.metadata?.archiveUrl as string | undefined;
		if (!archiveUrl) {
			return markRead(n.id);
		}
		const href = `${downloadOrigin}${archiveUrl}`;
		if (typeof window !== 'undefined') {
			window.open(href, '_blank', 'noreferrer');
		}
		// Requirement: after download, notification disappears
		return markReadAndRemove(n.id);
	};

	const downloadLatest = async (platform: 'android' | 'ios') => {
		const href = platform === 'android' ? androidHref : iosHref;
		const version = platform === 'android' ? androidRelease?.version : iosRelease?.version;
		if (!href || !version) return;
		if (typeof window !== 'undefined') {
			window.open(href, '_blank', 'noreferrer');
		}

		// If there is an unread mobile-release notification for this platform/version, mark it read and remove it
		const matches = notifications.filter(
			(n) =>
				!n?.isRead &&
				isMobileReleaseNotif(n) &&
				n?.metadata?.platform === platform &&
				n?.metadata?.version === version,
		);
		await Promise.all(matches.map((n) => markReadAndRemove(n.id)));
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
							aria-label='Mobil ilovani yuklab olish'
						>
							<Smartphone className='h-4 w-4 sm:h-5 sm:w-5 transition-transform hover:scale-110' />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='end' className='w-64'>
						{androidHref ? (
							<DropdownMenuItem onClick={() => void downloadLatest('android')} className='py-2 text-xs sm:text-sm'>
								Android (v{androidRelease?.version})
							</DropdownMenuItem>
						) : (
							<DropdownMenuItem disabled className='py-2 text-xs sm:text-sm'>
								Android release topilmadi
							</DropdownMenuItem>
						)}
						{iosHref ? (
							<DropdownMenuItem onClick={() => void downloadLatest('ios')} className='py-2 text-xs sm:text-sm'>
								iOS (v{iosRelease?.version})
							</DropdownMenuItem>
						) : (
							<DropdownMenuItem disabled className='py-2 text-xs sm:text-sm'>
								iOS release topilmadi
							</DropdownMenuItem>
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem disabled className='text-[11px] text-muted-foreground'>
							Arxiv paroli: lms1234
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

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
									onClick={() => (isMobileReleaseNotif(n) ? void downloadFromNotification(n) : void markRead(n.id))}
									className={`p-2 sm:p-3 ${!n.isRead ? 'bg-muted/50' : ''}`}
								>
									<div className='w-full'>
										<div className='text-xs sm:text-sm font-medium line-clamp-2'>{n.title}</div>
										{n.message && (
											<div className='text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2'>
												{n.message}
											</div>
										)}
										{isMobileReleaseNotif(n) && !n.isRead && (
											<div className='text-[10px] sm:text-xs text-primary mt-1'>Yuklab olish</div>
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
