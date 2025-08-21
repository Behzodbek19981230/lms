import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {
    BarChart3,
    Bell,
    BookOpen,
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    Plus,
    Upload,
    Users,
    Video
} from "lucide-react";
import {useNavigate} from "react-router-dom";

const TeacherDashboard = () => {

    const navigate = useNavigate();
    // Mock data - replace with API calls
    const teacherStats = {
        totalStudents: 85,
        activeGroups: 4,
        todayLessons: 3,
        pendingTests: 2,
        gradingQueue: 12
    };

    const todaySchedule = [
        {
            id: 1,
            time: "09:00",
            subject: "Ingliz tili",
            group: "Beginner A1",
            students: 15,
            room: "A-101",
            type: "offline"
        },
        {
            id: 2,
            time: "14:00",
            subject: "Ingliz tili",
            group: "Intermediate B1",
            students: 18,
            room: "A-102",
            type: "online"
        },
        {id: 3, time: "16:30", subject: "IELTS", group: "Advanced C1", students: 12, room: "A-103", type: "offline"}
    ];

    const myGroups = [
        {id: 1, name: "Beginner A1", students: 15, nextLesson: "2024-01-15 09:00", attendance: 85},
        {id: 2, name: "Intermediate B1", students: 18, nextLesson: "2024-01-15 14:00", attendance: 92},
        {id: 3, name: "Advanced C1", students: 12, nextLesson: "2024-01-15 16:30", attendance: 88},
        {id: 4, name: "IELTS Preparation", students: 20, nextLesson: "2024-01-16 10:00", attendance: 90}
    ];

    const recentActivities = [
        {id: 1, action: "Yangi test yaratildi", group: "Intermediate B1", time: "30 daqiqa oldin"},
        {id: 2, action: "Yo'qlama olindi", group: "Beginner A1", time: "2 soat oldin"},
        {id: 3, action: "Vazifa baholandi", group: "Advanced C1", time: "4 soat oldin"},
        {id: 4, action: "Video dars yuklandi", group: "IELTS Preparation", time: "Kecha"}
    ];

    return (
        <div className="min-h-screen bg-gradient-subtle">
            {/* Header */}
            <header className="bg-card border-b border-border p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">O'qituvchi paneli</h1>
                        <p className="text-muted-foreground">Karimova Gulnora - Ingliz tili</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Button variant="outline" size="sm">
                            <Bell className="h-4 w-4 mr-2"/>
                            Bildirishnomalar
                        </Button>
                        <Button variant="hero">
                            <Plus className="h-4 w-4 mr-2"/>
                            Yangi dars
                        </Button>
                    </div>
                </div>
            </header>

            <div className="p-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                    <Card className="border-border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Mening studentlarim
                            </CardTitle>
                            <Users className="h-4 w-4 text-primary"/>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{teacherStats.totalStudents}</div>
                            <p className="text-xs text-muted-foreground">4 ta guruhda</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Faol guruhlar
                            </CardTitle>
                            <BookOpen className="h-4 w-4 text-accent"/>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{teacherStats.activeGroups}</div>
                            <p className="text-xs text-accent">Barcha faol</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Bugungi darslar
                            </CardTitle>
                            <Calendar className="h-4 w-4 text-primary"/>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{teacherStats.todayLessons}</div>
                            <p className="text-xs text-muted-foreground">Rejalashtirilgan</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Kutilayotgan testlar
                            </CardTitle>
                            <FileText className="h-4 w-4 text-accent"/>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{teacherStats.pendingTests}</div>
                            <p className="text-xs text-destructive">Yaratish kerak</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Baholash navbati
                            </CardTitle>
                            <CheckCircle className="h-4 w-4 text-primary"/>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{teacherStats.gradingQueue}</div>
                            <p className="text-xs text-destructive">Baholash kerak</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Today's Schedule */}
                    <Card className="border-border">
                        <CardHeader>
                            <CardTitle className="text-card-foreground flex items-center">
                                <Calendar className="h-5 w-5 mr-2"/>
                                Bugungi jadval
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {todaySchedule.map((lesson) => (
                                    <div key={lesson.id}
                                         className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="text-center">
                                                <div className="text-sm font-medium text-foreground">{lesson.time}</div>
                                                <Badge variant={lesson.type === "online" ? "default" : "secondary"}
                                                       className="text-xs">
                                                    {lesson.type === "online" ? "Online" : "Offline"}
                                                </Badge>
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-foreground">{lesson.subject}</h4>
                                                <p className="text-sm text-muted-foreground">{lesson.group}</p>
                                                <p className="text-xs text-muted-foreground">{lesson.students} student
                                                    • {lesson.room}</p>
                                            </div>
                                        </div>
                                        {lesson.type === "online" && (
                                            <Button size="sm" variant="outline">
                                                <Video className="h-4 w-4 mr-1"/>
                                                Qo'shilish
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* My Groups */}
                    <Card className="border-border">
                        <CardHeader>
                            <CardTitle className="text-card-foreground flex items-center">
                                <BookOpen className="h-5 w-5 mr-2"/>
                                Mening guruhlarim
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {myGroups.map((group) => (
                                    <div key={group.id} className="p-3 bg-muted rounded-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium text-foreground">{group.name}</h4>
                                            <Badge variant="outline" className="text-xs">
                                                {group.attendance}% yo'qlama
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-1">{group.students} student</p>
                                        <div className="flex items-center text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3 mr-1"/>
                                            Keyingi dars: {new Date(group.nextLesson).toLocaleDateString("uz-UZ")}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button variant="ghost" className="w-full mt-4">
                                Batafsil ko'rish
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Quick Actions & Recent Activity */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-card-foreground">Tezkor amallar</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button variant="hero" className="w-full justify-start" onClick={() => {
                                    navigate('/account/test/create');
                                }}>
                                    <Plus className="h-4 w-4 mr-2"/>
                                    Yangi test yaratish
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <Upload className="h-4 w-4 mr-2"/>
                                    Video dars yuklash
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <CheckCircle className="h-4 w-4 mr-2"/>
                                    Yo'qlama olish
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <FileText className="h-4 w-4 mr-2"/>
                                    Vazifa berish
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <BarChart3 className="h-4 w-4 mr-2"/>
                                    Progress ko'rish
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Recent Activities */}
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-card-foreground text-sm">So'nggi faoliyat</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {recentActivities.map((activity) => (
                                        <div key={activity.id} className="text-sm">
                                            <p className="text-foreground font-medium">{activity.action}</p>
                                            <p className="text-muted-foreground text-xs">{activity.group} • {activity.time}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;