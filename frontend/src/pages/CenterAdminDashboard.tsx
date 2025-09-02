import { useEffect, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { request } from "@/configs/request";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from "react-router-dom";
const TeacherStudentCreate = ({ label = "Yangi foydalanuvchi", defaultRole = "teacher", variant = "hero" as "hero" | "outline" }) => {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ role: defaultRole, firstName: "", lastName: "", email: "", phone: "", password: "" });
    const { toast } = useToast();

    const submit = async () => {
        try {
            await request.post(`/users/members`, { ...form, role: form.role });
            setOpen(false);
            setForm({ role: "teacher", firstName: "", lastName: "", email: "", phone: "", password: "" });
            toast({ title: 'Foydalanuvchi yaratildi' });
        } catch (e: any) {
            toast({ title: 'Xatolik', description: e?.response?.data?.message || 'Yaratib bo\'lmadi', variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={variant}>
                    <Plus className="h-4 w-4 mr-2" />
                    {label}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>O'qituvchi yoki o'quvchi qo'shish</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <Label>Rol</Label>
                        <Select value={form.role} onValueChange={(v) => setForm(p => ({ ...p, role: v }))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Rol tanlang" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="teacher">O'qituvchi</SelectItem>
                                <SelectItem value="student">O'quvchi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Ism</Label>
                            <Input value={form.firstName} onChange={(e) => setForm(p => ({ ...p, firstName: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Familiya</Label>
                            <Input value={form.lastName} onChange={(e) => setForm(p => ({ ...p, lastName: e.target.value }))} />
                        </div>
                    </div>
                    <div>
                        <Label>Email</Label>
                        <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div>
                        <Label>Telefon</Label>
                        <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div>
                        <Label>Parol</Label>
                        <Input type="password" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} />
                    </div>
                    <Button onClick={submit}>Saqlash</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
const CenterAdminDashboard = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [subjectModalOpen, setSubjectModalOpen] = useState(false);
    const [newSubject, setNewSubject] = useState({ name: "", description: "" });
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                const { data } = await request.get('/users');
                setUsers(data || []);
            } catch (e) { }
            try {
                const { data } = await request.get('/notifications/me');
                setNotifications(data || []);
            } catch (e) { }
            try {
                const { data } = await request.get('/subjects');
                setSubjects(data || []);
            } catch (e) { }
        })();
    }, []);

    const centerStats = {
        totalStudents: users.filter((u: any) => u.role === 'student').length,
        totalTeachers: users.filter((u: any) => u.role === 'teacher').length,
        totalGroups: 12,
        monthlyRevenue: 125000000, // so'm
        activeClasses: 8,
    };

    const recentActivities = [
        { id: 2, type: "attendance", message: "Ingliz tili guruhida yo'qlama olindi", time: "1 soat oldin" },
        { id: 3, type: "test", message: "Matematika fanidan yangi test yaratildi", time: "2 soat oldin" },
        { id: 4, type: "enrollment", message: "Yangi student qo'shildi", time: "3 soat oldin" }
    ];

    const upcomingClasses = subjects.slice(0, 5).map((s: any, idx: number) => ({
        id: s.id,
        subject: s.name,
        teacher: s.teachers?.[0]?.fullName || '—',
        time: `${14 + idx}:00`,
        students: s.testsCount || 0,
        room: `A-${101 + idx}`,
    }));

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/5">
            {/* Header */}
            <header className="bg-gradient-to-r from-card/90 via-card to-card/90 backdrop-blur-md border-b border-border/60 p-6 animate-fade-in">
                <div className="flex justify-between items-center">
                    <div className="animate-slide-up">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent">
                            Markaz boshqaruvi
                        </h1>
                        <p className="text-muted-foreground animate-fade-in" style={{animationDelay: '0.2s'}}>Najot Ta'lim Toshkent</p>
                    </div>
                    <div className="flex items-center space-x-4 animate-slide-up" style={{animationDelay: '0.3s'}}>
                        <Button variant="outline" size="sm">
                            <Bell className="h-4 w-4 mr-2" />
                            Bildirishnomalar
                            <Badge className="ml-2 bg-destructive">3</Badge>
                        </Button>
                        <TeacherStudentCreate label="Yangi student qo'shish" defaultRole="student" variant="hero" />
                        <TeacherStudentCreate label="O'qituvchi qo'shish" defaultRole="teacher" variant="outline" />
                    </div>
                </div>
            </header>

            <div className="p-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
                    <Card className="group hover:shadow-glow transition-all duration-500 hover:-translate-y-2 bg-gradient-card border-border/50 backdrop-blur-sm animate-slide-up relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-shimmer opacity-20"></div>
                        
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground/80 transition-colors">
                                Studentlar
                            </CardTitle>
                            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary-glow/20 group-hover:scale-110 transition-transform duration-300">
                                <GraduationCap className="h-4 w-4 text-primary group-hover:scale-110 transition-transform duration-300" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">{centerStats.totalStudents}</div>
                            <p className="text-xs text-accent flex items-center mt-2">
                                <TrendingUp className="h-3 w-3 mr-1 animate-pulse-glow" />
                                +5 yangi
                            </p>
                            <div className="mt-3">
                                <div className="w-full h-1 bg-border/30 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000 group-hover:w-full w-0 bg-gradient-primary"></div>
                                </div>
                            </div>
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

                    {/* Recent Activities (Notifications) */}
                    <Card className="border-border">
                        <CardHeader>
                            <CardTitle className="text-card-foreground flex items-center">
                                <Bell className="h-5 w-5 mr-2" />
                                Bildirishnomalar
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {notifications.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">Hozircha bildirishnoma yo'q</div>
                                ) : (
                                    notifications.slice(0, 6).map((n) => (
                                        <div key={n.id} className={`flex items-start space-x-3 p-3 rounded-lg ${!n.isRead ? 'bg-muted/60' : 'bg-muted/20'}`}>
                                            <div className="p-1.5 bg-background rounded-full">
                                                <Bell className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm text-foreground">{n.title}</p>
                                                {n.message && (
                                                    <p className="text-xs text-muted-foreground">{n.message}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="border-border">
                        <CardHeader>
                            <CardTitle className="text-card-foreground">Tezkor amallar</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <TeacherStudentCreate label="Yangi student qo'shish" defaultRole="student" variant="hero" />
                            <TeacherStudentCreate label="O'qituvchi qo'shish" defaultRole="teacher" variant="outline" />
                            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/account/subjects')}>
                                <BookOpen className="h-4 w-4 mr-2" />
                                Fanlarimni boshqarish
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Davomat hisoboti
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
