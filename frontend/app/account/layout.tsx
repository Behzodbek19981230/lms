'use client';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { useAuth } from '@/contexts/AuthContext';
import PageLoader from '@/components/PageLoader';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import { hasCenterPermission } from '@/configs/permissions';
import { useToast } from '@/hooks/use-toast';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
	const { user, isLoading } = useAuth();
	const router = useRouter();
	const pathname = usePathname();
	const { toast } = useToast();
	useEffect(() => {
		if (!isLoading && !user) {
			router.replace('/login');
		}
	}, [isLoading, user, router]);

	// Route-level permission guard (UX). Backend also enforces.
	useEffect(() => {
		if (!user) return;
		if (user.role === 'superadmin') return;
		if (!pathname) return;

		const perms = user.center?.permissions;
		const p = pathname;

		const deny = () => {
			toast({
				title: "Ruxsat yo'q",
				description: 'Bu funksiyadan foydalanish uchun permission yoqilmagan',
				variant: 'destructive',
			});
			router.replace('/account/profile');
		};

		if (p.startsWith('/account/exams') && !hasCenterPermission(perms, 'exams')) return deny();
		if (
			(p.startsWith('/account/test-generator') || p.startsWith('/account/generated-tests')) &&
			!hasCenterPermission(perms, 'test_generation')
		)
			return deny();
		if (p.startsWith('/account/scanner') && !hasCenterPermission(perms, 'checking')) return deny();
		if (p.startsWith('/account/telegram') && !hasCenterPermission(perms, 'telegram_integration')) return deny();
		if (
			(p.startsWith('/account/payments') || p.startsWith('/account/student-payments')) &&
			!hasCenterPermission(perms, 'payments')
		)
			return deny();
		if (p.startsWith('/account/results') && !hasCenterPermission(perms, 'reports_tests')) return deny();
	}, [user, pathname, router, toast]);
	if (isLoading || !user) return <PageLoader title='Sessiya tekshirilmoqda...' />;
	return (
		<SidebarProvider>
			<div className='min-h-screen flex w-full bg-background'>
				<div className='hidden md:block border-r border-primary/10 bg-sidebar'>
					<DashboardSidebar />
				</div>

				<div className='flex-1 flex flex-col w-full'>
					<DashboardHeader />

					<main className='flex-1 p-3 sm:p-4 md:p-6 bg-gradient-to-br from-muted/20 via-background to-primary/5 overflow-x-auto'>
						<AnalyticsTracker />
						{children}
					</main>
				</div>
			</div>
		</SidebarProvider>
	);
}
