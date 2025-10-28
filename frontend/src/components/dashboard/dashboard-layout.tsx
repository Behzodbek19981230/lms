import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';

export const DashboardLayout = ({ children }: { children?: React.ReactNode }) => {
	return (
		<SidebarProvider>
			<div className='min-h-screen flex w-full bg-background'>
				{/* Sidebar */}
				<div className='hidden md:block border-r border-primary/10 bg-sidebar'>
					<DashboardSidebar />
				</div>

				<div className='flex-1 flex flex-col w-full'>
					{/* Header */}
					<DashboardHeader />

					{/* Main content */}
					<main className='flex-1 p-3 sm:p-4 md:p-6 bg-gradient-to-br from-muted/20 via-background to-primary/5 overflow-x-auto'>
						{children}
					</main>
				</div>
			</div>
		</SidebarProvider>
	);
};
