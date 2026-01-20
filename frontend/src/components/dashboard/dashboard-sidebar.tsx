import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
	SidebarFooter,
	useSidebar,
} from '@/components/ui/sidebar';
import {
	Award,
	FolderOpen,
	LayoutDashboard,
	MessageSquare,
	Settings,
	Users,
	Send,
	Book,
	AlertCircle,
	Users2,
	GraduationCap,
	UserCheck,
	DollarSign,
	FileText,
	Scan,
	Wand2,
	ClipboardList,
	ChevronsLeft,
	ChevronsRight,
	HelpCircle,
	Smartphone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { hasCenterPermission } from '@/configs/permissions';

const adminItems = [
	{ title: 'Foydalanuvchilar', url: '/dashboard/users', icon: Users },
	{ title: 'Sertifikatlar', url: '/dashboard/certificates', icon: Award },
	{ title: 'Xabarlar', url: '/dashboard/messages', icon: MessageSquare },
	{ title: 'Sozlamalar', url: '/dashboard/settings', icon: Settings },
];
const superAdminMenuItems = [
	{ title: 'Bosh sahifa', url: '/account/superadmin', icon: LayoutDashboard },
	{ title: 'Mobil ilovalar', url: '/account/superadmin/mobile-releases', icon: Smartphone },
	{ title: 'Yaratilgan testlar', url: '/account/superadmin/generated-tests', icon: FileText },
	{ title: 'Mening fanlarim', url: '/account/subjects', icon: Book },
	{ title: 'Markazlar va foydalanuvchilar', url: '/account/center-users', icon: Users },
	{ title: 'Telegram boshqaruvi', url: '/account/telegram', icon: Send },
	{ title: 'Tahlillar', url: '/account/analytics', icon: FolderOpen },
	{ title: 'Loglar', url: '/account/logs', icon: FileText },
];
const centerAdminMenuItems = [
	{ title: 'Bosh sahifa', url: '/account/admin', icon: LayoutDashboard },
	{ title: "O'quvchilarim", url: '/account/students', icon: GraduationCap },
	{ title: "O'qituvchilarim", url: '/account/teachers', icon: UserCheck },
	{ title: 'Guruhlar', url: '/account/groups', icon: Users2 },
	{ title: "To'lovlar", url: '/account/payments', icon: DollarSign },
	{ title: 'Mening fanlarim', url: '/account/subjects', icon: Book },
	{ title: 'Telegram boshqaruvi', url: '/account/telegram', icon: Send },
	{ title: "Foydalanish qo'llanmasi", url: '/account/guide', icon: HelpCircle },
];
// Add Results menu item for admin
centerAdminMenuItems.splice(4, 0, { title: 'Natijalar', url: '/account/results', icon: FileText });
const teacherMenuItems = [
	{ title: 'Bosh sahifa', url: '/account/teacher', icon: LayoutDashboard },
	{ title: 'Imtihonlar', url: '/account/exams', icon: AlertCircle },
	{ title: 'Mening guruhlarim', url: '/account/groups', icon: Users2 },
	{ title: 'Vazifalar', url: '/account/tasks', icon: ClipboardList },
	// { title: 'Vazifalar tarixi', url: '/account/tasks/history', icon: ClipboardList },
	{ title: "To'lovlar", url: '/account/payments', icon: DollarSign },
	{ title: 'Mening fanlarim', url: '/account/subjects', icon: Book },
	{ title: 'Haftalik test yaratish', url: '/account/weekly-tests', icon: ClipboardList },
	{ title: 'Test generatsiya', url: '/account/test-generator', icon: Wand2 },
	{ title: 'Yaratilgan testlar', url: '/account/generated-tests', icon: FileText },
	{ title: 'Skaner', url: '/account/scanner', icon: Scan },
	{ title: 'Telegram boshqaruvi', url: '/account/telegram', icon: Send },
];
// Add Results menu item for teacher
teacherMenuItems.splice(4, 0, { title: 'Natijalar', url: '/account/results', icon: FileText });
const studentMenuItems = [
	{ title: 'Bosh sahifa', url: '/account/student', icon: LayoutDashboard },
	{ title: "Mening to'lovlarim", url: '/account/student-payments', icon: DollarSign },
	{ title: 'Mening guruhlarim', url: '/account/student-groups', icon: Users2 },
	{ title: 'Mening davomatim', url: '/account/student-attendance', icon: UserCheck },
	{ title: 'Mening natijalarim', url: '/account/student-results', icon: FileText },
	{ title: 'Telegram menyulari', url: '/account/telegram-user', icon: Send },
];

export function DashboardSidebar() {
	const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
	const pathname = usePathname();
	const { user } = useAuth();
	const currentPath = pathname || '/';

	const closeMobileSidebar = () => {
		if (isMobile) setOpenMobile(false);
	};

	const isActive = (path: string) => {
		if (!path) return false;
		if (path === '/account') return currentPath === '/account';
		return currentPath.startsWith(path);
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

	// Permission-based menu filtering (per center)
	const centerPerms = user?.center?.permissions || undefined;
	const filteredItems = mainItems.filter((item) => {
		// superadmin should always see everything
		if (isSuperAdmin) return true;

		const url = item.url || '';
		if (url.startsWith('/account/exams')) return hasCenterPermission(centerPerms, 'exams');
		if (
			url.startsWith('/account/test-generator') ||
			url.startsWith('/account/generated-tests') ||
			url.startsWith('/account/weekly-tests')
		)
			return url.startsWith('/account/weekly-tests')
				? hasCenterPermission(centerPerms, 'tests')
				: hasCenterPermission(centerPerms, 'test_generation');
		if (url.startsWith('/account/scanner')) return hasCenterPermission(centerPerms, 'checking');
		if (url.startsWith('/account/telegram')) return hasCenterPermission(centerPerms, 'telegram_integration');
		if (url.startsWith('/account/tasks')) return hasCenterPermission(centerPerms, 'tasks');
		if (url.startsWith('/account/payments') || url.startsWith('/account/student-payments'))
			return hasCenterPermission(centerPerms, 'payments');
		if (url.startsWith('/account/results')) return hasCenterPermission(centerPerms, 'reports_tests');

		return true;
	});

	const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

	const toggleMenu = (title: string) => {
		setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
	};

	return (
		<Sidebar collapsible='icon'>
			<SidebarContent className='pt-4 pb-2'>
				<SidebarGroup>
					<SidebarGroupLabel className='text-xs uppercase tracking-wider text-foreground/50 font-semibold px-4 mb-2'>
						Asosiy menyu
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{filteredItems.map((item) => {
								const isOpen = openMenus[item.title] || false;
								const hasChildren =
									Array.isArray((item as any).children) && (item as any).children.length > 0;

								const itemActive = isActive(item.url);
								return (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton
											onClick={() => hasChildren && toggleMenu(item.title)}
											asChild={!hasChildren}
											isActive={itemActive}
											className='group relative'
										>
											{hasChildren ? (
												<Link
													href={item.url || '#'}
													className={`
                                                        flex items-center gap-3 w-full px-4 py-2.5 rounded-md transition-all duration-200
                                                        ${
															itemActive
																? 'text-primary font-semibold'
																: 'text-foreground/70 hover:text-primary hover:bg-muted/50'
														}
                                                    `}
												>
													<item.icon
														className={`h-5 w-5 transition-all duration-200 ${
															itemActive ? 'text-primary' : 'text-foreground/60'
														} ${isOpen ? 'rotate-90' : ''}`}
													/>
													{!isCollapsed && <span className='flex-1'>{item.title}</span>}
													{!isCollapsed && (
														<span className='transition-transform duration-200 text-xs opacity-60'>
															{isOpen ? '▾' : '▸'}
														</span>
													)}
												</Link>
											) : (
												<Link
													href={item.url}
													onClick={closeMobileSidebar}
													className={`
                                                        flex items-center gap-3 w-full px-4 py-2.5 rounded-md transition-all duration-200
                                                        ${
															itemActive
																? 'text-primary font-semibold'
																: 'text-foreground/70 hover:text-primary hover:bg-muted/50'
														}
                                                    `}
												>
													<item.icon
														className={`h-5 w-5 transition-all duration-200 ${
															itemActive ? 'text-primary' : 'text-foreground/60'
														}`}
													/>
													{!isCollapsed && <span className='flex-1'>{item.title}</span>}
												</Link>
											)}
										</SidebarMenuButton>

										{/* Child menu */}
										{hasChildren && isOpen && (
											<SidebarMenuSub>
												{(item as any).children.map((child: any) => (
													<SidebarMenuSubItem key={child.title}>
														<SidebarMenuSubButton asChild>
															<Link
																href={child.url}
																onClick={closeMobileSidebar}
																className={`
                                                                    flex items-center px-4 py-2 rounded-md transition-all duration-200 text-sm
                                                                    ${
																		itemActive
																			? 'text-primary font-semibold'
																			: 'text-foreground/60 hover:text-primary hover:bg-muted/50'
																	}
                                                                `}
															>
																{child.title}
															</Link>
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

			{/* Sidebar Toggle Footer */}
			<SidebarFooter className='p-2 border-t border-primary/10'>
				<Button
					variant='ghost'
					onClick={toggleSidebar}
					className='w-full justify-center group hover:bg-primary/5 transition-all duration-200 relative overflow-hidden'
					title={isCollapsed ? 'Kengaytirish' : "Yig'ish"}
				>
					<div className='flex items-center gap-3 px-4 py-2.5'>
						{isCollapsed ? (
							<ChevronsRight className='h-5 w-5 text-primary animate-pulse hover:animate-none transition-all duration-300' />
						) : (
							<>
								<ChevronsLeft className='h-5 w-5 text-primary transition-all duration-300 group-hover:scale-110' />
								<span className='text-sm font-medium text-foreground/70 group-hover:text-primary transition-colors'>
									Yig'ish
								</span>
							</>
						)}
					</div>
				</Button>
			</SidebarFooter>
		</Sidebar>
	);
}
