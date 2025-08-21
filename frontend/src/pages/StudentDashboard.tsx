import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  Calendar, 
  Clock,
  FileText,
  Play,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Award,
  Bell,
  Download
} from "lucide-react";

const StudentDashboard = () => {
  // Mock data - replace with API calls
  const studentStats = {
    enrolledCourses: 3,
    completedLessons: 45,
    totalLessons: 60,
    averageScore: 87,
    upcomingTests: 2,
    pendingPayments: 1
  };

  const enrolledCourses = [
    { 
      id: 1, 
      name: "Ingliz tili - Intermediate B1", 
      teacher: "Karimova Gulnora", 
      progress: 75, 
      nextLesson: "2024-01-15 14:00",
      totalLessons: 24,
      completedLessons: 18
    },
    { 
      id: 2, 
      name: "Matematika - Algebra", 
      teacher: "Usmonov Bobur", 
      progress: 60, 
      nextLesson: "2024-01-16 16:00",
      totalLessons: 20,
      completedLessons: 12
    },
    { 
      id: 3, 
      name: "Fizika - Mexanika", 
      teacher: "Rahimov Jamshid", 
      progress: 40, 
      nextLesson: "2024-01-17 10:00",
      totalLessons: 16,
      completedLessons: 6
    }
  ];

  const upcomingLessons = [
    { id: 1, subject: "Ingliz tili", time: "14:00", date: "Bugun", teacher: "Karimova G.", type: "online" },
    { id: 2, subject: "Matematika", time: "16:00", date: "Ertaga", teacher: "Usmonov B.", type: "offline" },
    { id: 3, subject: "Fizika", time: "10:00", date: "Ertaga", teacher: "Rahimov J.", type: "offline" }
  ];

  const recentGrades = [
    { id: 1, subject: "Ingliz tili", type: "Test", score: 92, maxScore: 100, date: "2024-01-10" },
    { id: 2, subject: "Matematika", type: "Vazifa", score: 85, maxScore: 100, date: "2024-01-08" },
    { id: 3, subject: "Fizika", type: "Test", score: 78, maxScore: 100, date: "2024-01-05" },
    { id: 4, subject: "Ingliz tili", type: "Vazifa", score: 95, maxScore: 100, date: "2024-01-03" }
  ];

  const notifications = [
    { id: 1, type: "test", message: "Matematika fanidan yangi test mavjud", time: "2 soat oldin" },
    { id: 2, type: "payment", message: "Oylik to'lov muddati tugaydi", time: "Kecha" },
    { id: 3, type: "grade", message: "Ingliz tili vazifasi baholandi", time: "2 kun oldin" }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card border-b border-border p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Student paneli</h1>
            <p className="text-muted-foreground">Ahmadjonov Ali Valijon o'g'li</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Bildirishnomalar
              <Badge className="ml-2 bg-destructive">3</Badge>
            </Button>
            <Badge variant="outline" className="px-3 py-1">
              ID: STU-2024-001
            </Badge>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Kurslarim
              </CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{studentStats.enrolledCourses}</div>
              <p className="text-xs text-accent">Faol</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Darslar
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {studentStats.completedLessons}/{studentStats.totalLessons}
              </div>
              <p className="text-xs text-accent">
                {Math.round((studentStats.completedLessons / studentStats.totalLessons) * 100)}% tugallangan
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                O'rtacha ball
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{studentStats.averageScore}%</div>
              <p className="text-xs text-accent">Zo'r natija!</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Kelayotgan testlar
              </CardTitle>
              <FileText className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{studentStats.upcomingTests}</div>
              <p className="text-xs text-muted-foreground">Bu hafta</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                To'lovlar
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{studentStats.pendingPayments}</div>
              <p className="text-xs text-destructive">To'lanmagan</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mukofotlar
              </CardTitle>
              <Award className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">5</div>
              <p className="text-xs text-accent">Sertifikat</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enrolled Courses */}
          <Card className="lg:col-span-2 border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Mening kurslarim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {enrolledCourses.map((course) => (
                  <div key={course.id} className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-foreground">{course.name}</h4>
                        <p className="text-sm text-muted-foreground">O'qituvchi: {course.teacher}</p>
                      </div>
                      <Badge variant="outline">
                        {course.progress}%
                      </Badge>
                    </div>
                    
                    <Progress value={course.progress} className="mb-3" />
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        {course.completedLessons}/{course.totalLessons} dars tugallangan
                      </span>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        Keyingi: {new Date(course.nextLesson).toLocaleDateString("uz-UZ")}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-3">
                      <Button size="sm" variant="hero">
                        Davom etish
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-3 w-3 mr-1" />
                        Resurslar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Lessons & Quick Actions */}
          <div className="space-y-6">
            {/* Upcoming Lessons */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Kelayotgan darslar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingLessons.map((lesson) => (
                    <div key={lesson.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <h4 className="font-medium text-foreground text-sm">{lesson.subject}</h4>
                        <p className="text-xs text-muted-foreground">{lesson.teacher}</p>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {lesson.date} {lesson.time}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge variant={lesson.type === "online" ? "default" : "secondary"} className="text-xs">
                          {lesson.type === "online" ? "Online" : "Offline"}
                        </Badge>
                        {lesson.type === "online" && (
                          <Button size="sm" variant="outline" className="text-xs">
                            <Play className="h-3 w-3 mr-1" />
                            Qo'shilish
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Grades */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  So'nggi baholar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentGrades.map((grade) => (
                    <div key={grade.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium text-foreground text-sm">{grade.subject}</p>
                        <p className="text-xs text-muted-foreground">{grade.type} • {grade.date}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-foreground">
                          {grade.score}/{grade.maxScore}
                        </div>
                        <div className="text-xs text-accent">
                          {Math.round((grade.score / grade.maxScore) * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Notifications */}
        <Card className="mt-6 border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Bildirishnomalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      {notification.type === "test" && <FileText className="h-4 w-4 text-primary" />}
                      {notification.type === "payment" && <AlertCircle className="h-4 w-4 text-destructive" />}
                      {notification.type === "grade" && <CheckCircle className="h-4 w-4 text-accent" />}
                    </div>
                    <div>
                      <p className="text-sm text-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">{notification.time}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    Ko'rish
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;