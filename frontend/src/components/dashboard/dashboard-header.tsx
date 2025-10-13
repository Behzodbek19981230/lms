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
import { useEffect, useState } from 'react';
import { request } from '@/configs/request';

export const DashboardHeader = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<any[]>([]);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const fetchNotifications = async () => {
        try {
            const { data } = await request.get('/notifications/me');
            setNotifications(data || []);
        } catch (e) { }
    };

    useEffect(() => {
        fetchNotifications();
        const t = setInterval(fetchNotifications, 30000);
        return () => clearInterval(t);
    }, []);

    const markRead = async (id: number) => {
        try {
            await request.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (e) { }
    };

    return (
        <header className='h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6'>
            <div className='flex items-center gap-4'>
                <SidebarTrigger />

                <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center'>
                        <BookOpen className='h-5 w-5 text-white' />
                    </div>
                    <span className='text-xl font-bold bg-primary  bg-clip-text text-transparent'>
                        {user.center?.name || 'EduOne'}
                    </span>
                </div>
            </div>

            <div className='flex items-center gap-4'>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='sm' className='relative'>
                            <Bell className='h-5 w-5' />
                            {unreadCount > 0 && (
                                <span className='absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-destructive text-white rounded-full text-[10px] flex items-center justify-center'>
                                    {unreadCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-80 max-h-96 overflow-auto'>
                        {notifications.length === 0 ? (
                            <div className='p-3 text-sm text-muted-foreground'>Hozircha bildirishnoma yo'q</div>
                        ) : (
                            notifications.map((n) => (
                                <DropdownMenuItem key={n.id} onClick={() => markRead(n.id)} className={!n.isRead ? 'bg-muted/50' : ''}>
                                    <div>
                                        <div className='text-sm font-medium'>{n.title}</div>
                                        {n.message && <div className='text-xs text-muted-foreground'>{n.message}</div>}
                                    </div>
                                </DropdownMenuItem>
                            ))
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

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
                        <DropdownMenuItem onClick={() => navigate('/account/profile')}>
                            <User className='mr-2 h-4 w-4' />
                            Profil
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
