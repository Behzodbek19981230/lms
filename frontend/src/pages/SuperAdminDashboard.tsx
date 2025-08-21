import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  GraduationCap, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  BarChart3,
  Settings,
  Plus,
  Bell,
  Search,
  Filter
} from "lucide-react";

const SuperAdminDashboard = () => {
  const [timeRange, setTimeRange] = useState("30d");

  // Mock data - replace with API calls
  const stats = {
    totalCenters: 127,
    totalUsers: 15420,
    monthlyRevenue: 890500000, // so'm
    activeStudents: 12350
  };

  const recentCenters = [
    { id: 1, name: "Najot Ta'lim Toshkent", students: 450, status: "active", plan: "premium" },
    { id: 2, name: "IT Park Academy", students: 320, status: "active", plan: "standard" },
    { id: 3, name: "Cambridge Learning Center", students: 180, status: "pending", plan: "free" },
    { id: 4, name: "Future Coders", students: 95, status: "active", plan: "standard" }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card border-b border-border p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Super Admin Panel</h1>
            <p className="text-muted-foreground">EduNimbus platformasini boshqarish</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Bildirishnomalar
            </Button>
            <Button variant="hero">
              <Plus className="h-4 w-4 mr-2" />
              Yangi markaz
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Jami markazlar
              </CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalCenters}</div>
              <p className="text-xs text-accent">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                +12% o'tgan oyga nisbatan
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Jami foydalanuvchilar
              </CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-accent">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                +8% o'tgan oyga nisbatan
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Oylik daromad
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {(stats.monthlyRevenue / 1000000).toFixed(1)}M so'm
              </div>
              <p className="text-xs text-accent">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                +23% o'tgan oyga nisbatan
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Faol studentlar
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.activeStudents.toLocaleString()}</div>
              <p className="text-xs text-accent">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                +15% o'tgan oyga nisbatan
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Centers */}
          <Card className="lg:col-span-2 border-border">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-card-foreground">So'nggi markazlar</CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCenters.map((center) => (
                  <div key={center.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{center.name}</h3>
                        <p className="text-sm text-muted-foreground">{center.students} student</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={center.status === "active" ? "default" : "secondary"}
                        className={center.status === "active" ? "bg-accent" : ""}
                      >
                        {center.status === "active" ? "Faol" : "Kutilmoqda"}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {center.plan}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button variant="ghost" className="w-full">
                  Barcha markazlarni ko'rish
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">Tezkor amallar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="hero" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Yangi markaz qo'shish
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                Hisobotlarni ko'rish
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Tizim sozlamalari
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                To'lov jadvali
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Foydalanuvchilar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart Placeholder */}
        <Card className="mt-6 border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Daromad tahlili</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Chart komponenti qo'shiladi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;