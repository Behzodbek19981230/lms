import { NavLink, useLocation } from 'react-router-dom';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { Award, FolderOpen, LayoutDashboard, MessageSquare, Settings, Users, Send, Book, AlertCircle, Users2, GraduationCap, UserCheck, DollarSign, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

const adminItems = [
    { title: 'User Management', url: '/dashboard/users', icon: Users },
    { title: 'Certificates', url: '/dashboard/certificates', icon: Award },
    { title: 'Messages', url: '/dashboard/messages', icon: MessageSquare },
    { title: 'Settings', url: '/dashboard/settings', icon: Settings },
];
const superAdminMenuItems = [
    { title: 'Dashboard', url: '/account/superadmin', icon: LayoutDashboard },
    { title: 'Mening fanlarim', url: '/account/subjects', icon: Book
     },
    { title: 'Markazlar va foydalanuvchilar', url: '/account/center-users', icon: Users },
    { title: 'Telegram Management', url: '/account/telegram', icon: Send },
    { title: 'Logs', url: '/account/logs', icon: FileText },
];
const centerAdminMenuItems = [
    { title: 'Dashboard', url: '/account/admin', icon: LayoutDashboard },
    { title: 'Studentlarim', url: '/account/students', icon: GraduationCap },
    { title: 'O\'qituvchilarim', url: '/account/teachers', icon: UserCheck },
    { title: 'Mening fanlarim', url: '/account/subjects', icon: Book
     },
    { title: 'Telegram Management', url: '/account/telegram', icon: Send },
];
const teacherMenuItems = [
    { title: 'Dashboard', url: '/account/teacher', icon: LayoutDashboard },
    { title: 'Imtihonlar', url: '/account/exams', icon: AlertCircle },
    { title: 'Mening guruhlarim', url: '/account/groups', icon: Users2 },
    { title: 'To\'lovlar', url: '/account/teacher-payments', icon: DollarSign },
    { title: 'Mening fanlarim', url: '/account/subjects', icon: Book
     },
    { title: 'Telegram Management', url: '/account/telegram', icon: Send },
];
const studentMenuItems = [
    { title: 'Dashboard', url: '/account/student', icon: LayoutDashboard },
    { title: 'Mening to\'lovlarim', url: '/account/student-payments', icon: DollarSign },
    { title: 'Mening fanlarim', url: '/account/subjects', icon: Book
     },
    { title: 'Telegram', url: '/account/telegram-user', icon: Send },
];

export function DashboardSidebar() {
    const { state } = useSidebar();
    const location = useLocation();
    const { user } = useAuth();
    const currentPath = location.pathname;

    const isActive = (path: string) => {
        if (!path) return false;
        if (path === '/account') return currentPath === '/account';
        return currentPath.startsWith(path);
    };

    const getNavClass = (path: string) => {
        return isActive(path)
            ? 'bg-primary text-primary-foreground font-medium'
            : 'hover:bg-muted/50 hover:text-foreground';
    };

    const isCollapsed = state === 'collapsed';
    const isSuperAdmin = user?.role === 'superadmin';
    const isCenterAdmin = user?.role === 'admin';
    const isTeacher = user?.role === 'teacher';
    const isStudent = user?.role === 'student';

    const mainItems = isSuperAdmin
        ? superAdminMenuItems
        : isCenterAdmin
            ? centerAdminMenuItems
            : isTeacher
                ? teacherMenuItems
                : isStudent
                    ? studentMenuItems
                    : [];

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

    const toggleMenu = (title: string) => {
        setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <Sidebar collapsible='icon'>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainItems.map((item) => {
                                const isOpen = openMenus[item.title] || false;
                                const hasChildren = Array.isArray((item as any).children) && (item as any).children.length > 0;

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            onClick={() => hasChildren && toggleMenu(item.title)}
                                            asChild={!hasChildren}
                                        >
                                            {hasChildren ? (
                                                <NavLink
                                                    to={item.url || '#'}
                                                    className={`flex items-center w-full ${getNavClass(
                                                        item.url || ''
                                                    )}`}
                                                >
                                                    <item.icon className='mr-2 h-4 w-4' />
                                                    {!isCollapsed && <span>{item.title}</span>}
                                                    {!isCollapsed && (
                                                        <span className='ml-auto'>{isOpen ? '▾' : '▸'}</span>
                                                    )}
                                                </NavLink>
                                            ) : (
                                                <NavLink
                                                    to={item.url}
                                                    className={`flex items-center w-full ${getNavClass(
                                                        item.url || ''
                                                    )}`}
                                                >
                                                    <item.icon className='mr-2 h-4 w-4' />
                                                    {!isCollapsed && <span>{item.title}</span>}
                                                </NavLink>
                                            )}
                                        </SidebarMenuButton>

                                        {/* Child menu */}
                                        {hasChildren && isOpen && (
                                            <SidebarMenuSub>
                                                {(item as any).children.map((child: any) => (
                                                    <SidebarMenuSubItem key={child.title}>
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            className={getNavClass(child.url)}
                                                        >
                                                            <NavLink to={child.url}>{child.title}</NavLink>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        )}
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}
