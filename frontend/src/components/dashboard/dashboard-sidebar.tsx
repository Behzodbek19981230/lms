import {NavLink, useLocation} from "react-router-dom";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import {Award, LayoutDashboard, MessageSquare, Settings, Users} from "lucide-react";
import {useAuth} from "@/contexts/AuthContext";


// const mainItems = [
//     { title: "Dashboard", url: "/account/superadmin", icon: LayoutDashboard },
//     { title: "Courses", url: "/dashboard/courses", icon: BookOpen },
//     { title: "Students", url: "/dashboard/students", icon: Users },
//     { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
//     { title: "Reports", url: "/dashboard/reports", icon: FileText },
// ];

const adminItems = [
    {title: "User Management", url: "/dashboard/users", icon: Users},
    {title: "Certificates", url: "/dashboard/certificates", icon: Award},
    {title: "Messages", url: "/dashboard/messages", icon: MessageSquare},
    {title: "Settings", url: "/dashboard/settings", icon: Settings},
];
const superAdminMenuItems = [
    {title: "Dashboard", url: "/account/superadmin", icon: LayoutDashboard},
];
const centerAdminMenuItems = [
    {title: "Dashboard", url: "/account/admin", icon: LayoutDashboard},
];
const teacherMenuItems = [
    {title: "Dashboard", url: "/account/teacher", icon: LayoutDashboard},
];
const studentMenuItems = [
    {title: "Dashboard", url: "/account/student", icon: LayoutDashboard},
];

export function DashboardSidebar() {
    const {state} = useSidebar();
    const location = useLocation();
    const {user} = useAuth();
    const currentPath = location.pathname;

    const isActive = (path: string) => {
        if (path === "/account") {
            return currentPath === "/account";
        }
        return currentPath.startsWith(path);
    };

    const getNavClass = (path: string) => {
        return isActive(path)
            ? "bg-primary text-primary-foreground font-medium"
            : "hover:bg-muted/50 hover:text-foreground";
    };

    const isCollapsed = state === "collapsed";
    const isSuperAdmin = user?.role === 'superadmin';
    const isCenterAdmin = user?.role === 'admin';
    const isTeacher = user?.role === 'teacher';
    const isStudent = user?.role === 'student';
    const mainItems = isSuperAdmin ? superAdminMenuItems :
        isCenterAdmin ? centerAdminMenuItems :
            isTeacher ? teacherMenuItems :
                isStudent ? studentMenuItems : [];

    return (
        <Sidebar collapsible="icon">
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <NavLink
                                            to={item.url}
                                            className={getNavClass(item.url)}
                                        >
                                            <item.icon className="mr-2 h-4 w-4"/>
                                            {!isCollapsed && <span>{item.title}</span>}
                                        </NavLink>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {user?.role === 'superadmin' && (
                    <SidebarGroup>
                        <SidebarGroupLabel>Administration</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {adminItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild>
                                            <NavLink
                                                to={item.url}
                                                className={getNavClass(item.url)}
                                            >
                                                <item.icon className="mr-2 h-4 w-4"/>
                                                {!isCollapsed && <span>{item.title}</span>}
                                            </NavLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
        </Sidebar>
    );
}