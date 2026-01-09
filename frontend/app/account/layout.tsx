'use client';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { useAuth } from '@/contexts/AuthContext';
import AccountLoader from '@/components/AccountLoader';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';
import { hasCenterPermission } from '@/configs/permissions';
import { useToast } from '@/hooks/use-toast';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
	const { user, isLoading } = useAuth();
	const router = useRouter();
	const pathname = usePathname();
	const { toast } = useToast();
	const activeLoading = isLoading || !user;
	const [showLoader, setShowLoader] = useState(true);

	const estimatedMs = useMemo(() => {
		if (typeof window === 'undefined') return 1200;
		const raw = window.sessionStorage.getItem('accountLoaderAvgMs');
		const n = raw ? Number(raw) : NaN;
		if (!Number.isFinite(n)) return 1200;
		return Math.max(600, Math.min(4000, Math.round(n)));
	}, []);

	useEffect(() => {
		if (activeLoading) setShowLoader(true);
	}, [activeLoading]);
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
		if (p.startsWith('/account/tasks') && !hasCenterPermission(perms, 'tasks')) return deny();
		if (
			(p.startsWith('/account/payments') || p.startsWith('/account/student-payments')) &&
			!hasCenterPermission(perms, 'payments')
		)
			return deny();
		if (p.startsWith('/account/results') && !hasCenterPermission(perms, 'reports_tests')) return deny();
		// Student uchun subjects sahifasiga ruxsat yo'q
		if (p.startsWith('/account/subjects') && user.role === 'student') {
			toast({
				title: "Ruxsat yo'q",
				description: 'Bu sahifa studentlar uchun mavjud emas',
				variant: 'destructive',
			});
			router.replace('/account/profile');
			return;
		}
	}, [user, pathname, router, toast]);
	if (showLoader) {
		return (
			<AccountLoader
				active={activeLoading}
				estimatedMs={estimatedMs}
				onComplete={(durationMs) => {
					// Update moving average for next time
					try {
						const prevRaw = window.sessionStorage.getItem('accountLoaderAvgMs');
						const prev = prevRaw ? Number(prevRaw) : NaN;
						const base = Number.isFinite(prev) ? prev : estimatedMs;
						const next = Math.max(600, Math.min(4000, Math.round(base * 0.7 + durationMs * 0.3)));
						window.sessionStorage.setItem('accountLoaderAvgMs', String(next));
					} catch {
						// ignore storage errors
					}
					setShowLoader(false);
				}}
			/>
		);
	}
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
