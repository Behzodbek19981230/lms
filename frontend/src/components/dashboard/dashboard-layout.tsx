import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { Outlet } from "react-router-dom";

export const DashboardLayout = () => {
    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background/95 to-muted/20">
                {/* Sidebar */}
                <div className="border-r border-border/40">
                    <DashboardSidebar />
                </div>

                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <DashboardHeader />

                    {/* Main content */}
                    <main className="flex-1 p-6 bg-gradient-to-br from-background/80 to-muted/10 overflow-x-auto">
                        <Outlet /> {/* Nested routes shu yerda ko'rinadi */}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
};
