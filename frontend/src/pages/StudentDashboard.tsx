import { useState, useEffect } from 'react';
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
  Download,
  Loader2
} from "lucide-react";
import { request } from '@/configs/request';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import moment from 'moment';

const StudentDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [examVariants, setExamVariants] = useState<any[]>([]);
  const [assignedTests, setAssignedTests] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [downloadingExams, setDownloadingExams] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [dashboardRes, examsRes, testsRes, gradesRes, notificationsRes, subjectsRes] = await Promise.all([
        request.get('/students/dashboard'),
        request.get('/students/exams'),
        request.get('/students/assigned-tests'),
        request.get('/students/grades'),
        request.get('/students/notifications'),
        request.get('/students/subjects'),
      ]);

      setDashboardData(dashboardRes.data);
      setExamVariants(examsRes.data || []);
      setAssignedTests(testsRes.data || []);
      setGrades(gradesRes.data || []);
      setNotifications(notificationsRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (error) {
      toast({
        title: 'Xatolik',
        description: 'Ma\'lumotlar yuklanmadi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadExamVariant = async (variantId: number) => {
    try {
      setDownloadingExams(prev => new Set(prev).add(variantId));
      const response = await request.get(`/students/exams/${variantId}/download`, { responseType: 'blob' });
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imtihon-variant-${variantId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Refresh exam data to get updated status
      await fetchDashboardData();
      
      toast({
        title: 'Muvaffaqiyat',
        description: 'Imtihon variantingiz muvaffaqiyatli yuklandi va boshlangan deb belgilandi',
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'PDF yuklab olishda xatolik';
      toast({
        title: 'Xatolik',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setDownloadingExams(prev => {
        const newSet = new Set(prev);
        newSet.delete(variantId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Ma'lumotlar yuklanmadi</p>
          <Button onClick={fetchDashboardData} className="mt-4">
            Qayta urinish
          </Button>
        </div>
      </div>
    );
  }

  const studentStats = dashboardData.stats;
  const studentInfo = dashboardData.student;

  // Process exam variants for upcoming lessons
  const upcomingLessons = examVariants
    .filter(exam => exam.status === 'generated' || exam.status === 'scheduled')
    .slice(0, 3)
    .map(exam => ({
      id: exam.id,
      subject: exam.subjects,
      time: moment(exam.examDate).format('HH:mm'),
      date: moment(exam.examDate).calendar(),
      teacher: exam.teacher,
      type: 'exam',
    }));

  // Process subjects as enrolled courses
  const enrolledCourses = subjects.slice(0, 3).map((subject, index) => {
    const subjectExams = examVariants.filter(exam => exam.subjects.includes(subject.name));
    const completedExams = subjectExams.filter(exam => exam.status === 'completed' || exam.status === 'submitted').length;
    const totalExams = subjectExams.length;
    const progress = totalExams > 0 ? Math.round((completedExams / totalExams) * 100) : 0;
    
    return {
      id: subject.id,
      name: subject.name,
      teacher: 'O\'qituvchi', // This could be enhanced
      progress,
      nextLesson: moment().add(index + 1, 'days').format('YYYY-MM-DD HH:mm'),
      totalLessons: totalExams,
      completedLessons: completedExams,
    };
  });

  // Process recent grades
  const recentGrades = grades.slice(0, 4).map(grade => ({
    id: grade.id,
    subject: grade.subject,
    type: grade.type === 'exam' ? 'Imtihon' : 'Test',
    score: grade.score,
    maxScore: grade.maxScore,
    date: moment(grade.date).format('YYYY-MM-DD'),
  }));

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card border-b border-border p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Student paneli</h1>
            <p className="text-muted-foreground">{studentInfo?.fullName || user?.fullName}</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Bildirishnomalar
              {notifications.length > 0 && (
                <Badge className="ml-2 bg-destructive">{notifications.length}</Badge>
              )}
            </Button>
            <Badge variant="outline" className="px-3 py-1">
              ID: {studentInfo?.id || user?.id}
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
              <div className="text-2xl font-bold text-foreground">{studentStats.enrolledCourses || 0}</div>
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
                {studentStats.completedExams || 0}/{studentStats.totalExams || 0}
              </div>
              <p className="text-xs text-accent">
                {studentStats.totalExams > 0 
                  ? Math.round(((studentStats.completedExams || 0) / studentStats.totalExams) * 100)
                  : 0}% tugallangan
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
              <div className="text-2xl font-bold text-foreground">{studentStats.averageScore || 0}%</div>
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
              <div className="text-2xl font-bold text-foreground">{studentStats.upcomingExams || 0}</div>
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
              <div className="text-2xl font-bold text-foreground">{assignedTests.filter(t => t.status === 'pending').length || 0}</div>
              <p className="text-xs text-destructive">Kutilmoqda</p>
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
              <div className="text-2xl font-bold text-foreground">{grades.filter(g => g.percentage >= 80).length || 0}</div>
              <p className="text-xs text-accent">Yuqori baho</p>
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

        {/* Available Exam Variants */}
        <Card className="mt-6 border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Mavjud imtihon variantlari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {examVariants.filter(variant => variant.status === 'generated' || variant.status === 'started').map((variant) => (
                <div key={variant.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground font-medium">Imtihon varianti #{variant.variantNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {variant.exam?.title || 'Imtihon'} • 
                        <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                          variant.status === 'generated' ? 'bg-blue-100 text-blue-700' : 
                          variant.status === 'started' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {variant.status === 'generated' ? 'Tayyor' : 
                           variant.status === 'started' ? 'Boshlangan' : variant.status}
                        </span>
                      </p>
                      {variant.startedAt && (
                        <p className="text-xs text-muted-foreground">
                          Boshlangan: {moment(variant.startedAt).format('DD.MM.YYYY HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant={variant.status === 'generated' ? 'default' : 'outline'}
                    onClick={() => downloadExamVariant(variant.id)}
                    disabled={downloadingExams.has(variant.id)}
                  >
                    {downloadingExams.has(variant.id) ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    {variant.status === 'generated' ? 'Yuklab olish' : 'Qayta yuklab olish'}
                  </Button>
                </div>
              ))}
              {examVariants.filter(variant => variant.status === 'generated' || variant.status === 'started').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Hozircha mavjud imtihon variantlari yo'q</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
                      {notification.type === "exam" && <FileText className="h-4 w-4 text-primary" />}
                      {notification.type === "test" && <FileText className="h-4 w-4 text-primary" />}
                      {notification.type === "payment" && <AlertCircle className="h-4 w-4 text-destructive" />}
                      {notification.type === "grade" && <CheckCircle className="h-4 w-4 text-accent" />}
                      {!['exam', 'test', 'payment', 'grade'].includes(notification.type) && <Bell className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="text-sm text-foreground">{notification.message || notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.time || moment(notification.createdAt).fromNow()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {notification.type === 'exam' && notification.examVariantId && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => downloadExamVariant(notification.examVariantId)}
                        disabled={downloadingExams.has(notification.examVariantId)}
                      >
                        {downloadingExams.has(notification.examVariantId) ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-1" />
                        )}
                        Yuklab olish
                      </Button>
                    )}
                    <Button size="sm" variant="ghost">
                      Ko'rish
                    </Button>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Hozircha bildirishnomalar yo'q</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;