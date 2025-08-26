import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookOpen, Bell, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const DashboardHeader = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		navigate('/');
	};

	return (
		<header className='h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6'>
			<div className='flex items-center gap-4'>
				<SidebarTrigger />

				<div className='flex items-center gap-2'>
					<div className='w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center'>
						<BookOpen className='h-5 w-5 text-white' />
					</div>
					<span className='text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'>
						{user.center.name || 'EduNimbus'}
					</span>
				</div>
			</div>

			<div className='flex items-center gap-4'>
				<Button variant='ghost' size='sm' className='relative'>
					<Bell className='h-5 w-5' />
					<span className='absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-xs'></span>
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant='ghost' className='flex items-center gap-2 hover:bg-muted'>
							<Avatar className='h-8 w-8'>
								<AvatarFallback className='bg-gradient-to-br from-primary to-secondary text-white'>
									{user?.firstName?.charAt(0).toUpperCase() || 'U'}
								</AvatarFallback>
							</Avatar>
							<div className='text-left hidden sm:block'>
								<div className='text-sm font-medium'>
									{user?.firstName} {user?.lastName}
								</div>
								<div className='text-xs text-muted-foreground capitalize'>{user?.role}</div>
							</div>
						</Button>
					</DropdownMenuTrigger>

					<DropdownMenuContent align='end' className='w-56'>
						<DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
							<User className='mr-2 h-4 w-4' />
							Profile
						</DropdownMenuItem>
						<DropdownMenuItem>
							<Settings className='mr-2 h-4 w-4' />
							Settings
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleLogout} className='text-destructive'>
							<LogOut className='mr-2 h-4 w-4' />
							Sign Out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	);
};
