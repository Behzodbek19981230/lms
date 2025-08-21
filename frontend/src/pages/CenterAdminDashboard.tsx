import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  DollarSign, 
  Calendar,
  Plus,
  Settings,
  Bell,
  TrendingUp,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const CenterAdminDashboard = () => {
  // Mock data - replace with API calls
  const centerStats = {
    totalStudents: 245,
    totalTeachers: 18,
    totalGroups: 12,
    monthlyRevenue: 125000000, // so'm
    pendingPayments: 15,
    activeClasses: 8
  };

  const recentActivities = [
    { id: 1, type: "payment", message: "Ahmadjonov Ali to'lov qildi", time: "10 daqiqa oldin", amount: "350,000 so'm" },
    { id: 2, type: "attendance", message: "Ingliz tili guruhida yo'qlama olindi", time: "1 soat oldin" },
    { id: 3, type: "test", message: "Matematika fanidan yangi test yaratildi", time: "2 soat oldin" },
    { id: 4, type: "enrollment", message: "Yangi student qo'shildi", time: "3 soat oldin" }
  ];

  const upcomingClasses = [
    { id: 1, subject: "Ingliz tili", teacher: "Karimova Gulnora", time: "14:00", students: 15, room: "A-101" },
    { id: 2, subject: "Matematika", teacher: "Usmonov Bobur", time: "16:00", students: 12, room: "B-205" },
    { id: 3, subject: "Fizika", teacher: "Rahimov Jamshid", time: "18:00", students: 18, room: "C-304" }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card border-b border-border p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Markaz boshqaruvi</h1>
            <p className="text-muted-foreground">Najot Ta'lim Toshkent</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Bildirishnomalar
              <Badge className="ml-2 bg-destructive">3</Badge>
            </Button>
            <Button variant="hero">
              <Plus className="h-4 w-4 mr-2" />
              Yangi guruh
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Studentlar
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{centerStats.totalStudents}</div>
              <p className="text-xs text-accent">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                +5 yangi
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                O'qituvchilar
              </CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{centerStats.totalTeachers}</div>
              <p className="text-xs text-muted-foreground">Faol</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Guruhlar
              </CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{centerStats.totalGroups}</div>
              <p className="text-xs text-accent">{centerStats.activeClasses} faol dars</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Oylik daromad
              </CardTitle>
              <DollarSign className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {(centerStats.monthlyRevenue / 1000000).toFixed(1)}M
              </div>
              <p className="text-xs text-accent">so'm</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Kutilayotgan to'lovlar
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{centerStats.pendingPayments}</div>
              <p className="text-xs text-destructive">Muddati o'tgan</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bugungi darslar
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{upcomingClasses.length}</div>
              <p className="text-xs text-muted-foreground">Rejalashtirilgan</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Classes */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Bugungi darslar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingClasses.map((lesson) => (
                  <div key={lesson.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <h4 className="font-medium text-foreground">{lesson.subject}</h4>
                      <p className="text-sm text-muted-foreground">{lesson.teacher}</p>
                      <p className="text-xs text-muted-foreground">{lesson.students} student • {lesson.room}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {lesson.time}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4">
                Barcha darslarni ko'rish
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                So'nggi faoliyat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const getIcon = (type: string) => {
                    switch (type) {
                      case "payment": return <DollarSign className="h-4 w-4 text-accent" />;
                      case "attendance": return <CheckCircle className="h-4 w-4 text-primary" />;
                      case "test": return <BookOpen className="h-4 w-4 text-primary" />;
                      case "enrollment": return <Users className="h-4 w-4 text-accent" />;
                      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
                    }
                  };

                  return (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                      <div className="p-1.5 bg-background rounded-full">
                        {getIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                        {activity.amount && (
                          <p className="text-xs font-medium text-accent">{activity.amount}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">Tezkor amallar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="hero" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Yangi student qo'shish
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                O'qituvchi qo'shish
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="h-4 w-4 mr-2" />
                Yangi guruh yaratish
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="h-4 w-4 mr-2" />
                To'lovlarni ko'rish
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Telegram bot
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Sozlamalar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart Placeholder */}
        <Card className="mt-6 border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Moliyaviy hisobot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Moliyaviy grafik komponenti qo'shiladi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CenterAdminDashboard;