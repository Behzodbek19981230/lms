'use client';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { useAuth } from '@/contexts/AuthContext';
import PageLoader from '@/components/PageLoader';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
	const { user, isLoading } = useAuth();
	const router = useRouter();
	useEffect(() => {
		if (!isLoading && !user) {
			router.replace('/login');
		}
	}, [isLoading, user, router]);
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
						{children}
					</main>
				</div>
			</div>
		</SidebarProvider>
	);
}
