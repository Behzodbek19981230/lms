import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { Outlet } from "react-router-dom";

export const DashboardLayout = () => {
    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                {/* Sidebar */}
                <DashboardSidebar />

                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <DashboardHeader />

                    {/* Main content */}
                    <main className="flex-1 p-6 bg-muted/30">
                        <Outlet /> {/* Nested routes shu yerda ko‘rinadi */}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
};
