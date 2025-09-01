import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { CheckCircle, X, Clock, Users, Calendar, Plus } from 'lucide-react';
import AttendanceModal from '@/components/AttendanceModal';

interface AttendanceRecord {
  id: number;
  student: {
    id: number;
    firstName: string;
    lastName: string;
  };
  group: {
    id: number;
    name: string;
  };
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  arrivedAt?: string;
  leftAt?: string;
}

interface AttendanceStats {
  totalStudents: number;
  todayAttendance: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
  weeklyPresentRate: number;
  group: {
    id: number;
    name: string;
    subject?: string;
  };
}

export default function AttendanceCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  useEffect(() => {
    loadGroupsAndAttendance();
  }, []);

  const loadGroupsAndAttendance = async () => {
    try {
      setLoading(true);
      
      // Load teacher's groups
      const groupsRes = await request.get('/groups/me');
      const groupsData = groupsRes.data || [];
      setGroups(groupsData);
      
      // Load attendance stats for each group
      const statsPromises = groupsData.map((group: any) => 
        request.get(`/attendance/stats/${group.id}`).catch(() => null)
      );
      
      const statsResults = await Promise.all(statsPromises);
      const validStats = statsResults.filter(Boolean).map(res => res.data);
      setStats(validStats);
      
      // Load recent attendance records
      const attendanceRes = await request.get('/attendance', {
        params: { period: 'week' }
      });
      setAttendance(attendanceRes.data || []);
      
    } catch (error: any) {
      console.error('Error loading attendance data:', error);
      toast({
        title: 'Xato',
        description: 'Davomat ma\'lumotlarini yuklab olishda xatolik',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceSuccess = () => {
    loadGroupsAndAttendance();
  };

  const handleTakeAttendance = () => {
    if (groups.length === 0) {
      toast({
        title: 'Xato',
        description: 'Avval guruhlarni yarating',
        variant: 'destructive'
      });
      return;
    }
    setShowAttendanceModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'absent':
        return <X className="h-4 w-4 text-red-500" />;
      case 'excused':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <X className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present':
        return 'Keldi';
      case 'late':
        return 'Kechikdi';
      case 'absent':
        return 'Kelmadi';
      case 'excused':
        return 'Uzrli';
      default:
        return status;
    }
  };

  const getTodayAttendanceRate = (groupStats: AttendanceStats) => {
    if (groupStats.todayAttendance.total === 0) return 0;
    return Math.round(
      ((groupStats.todayAttendance.present + groupStats.todayAttendance.late) / 
       groupStats.todayAttendance.total) * 100
    );
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Davomat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Yuklanmoqda...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Attendance Overview */}
      <Card className="border-border shadow-card hover:shadow-hover transition-all duration-500 hover:-translate-y-1 bg-gradient-card backdrop-blur-sm animate-slide-up">
        <CardHeader className="pb-4">
          <CardTitle className="text-card-foreground flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-gradient-primary mr-3">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-hero bg-clip-text text-transparent font-bold">
                Bugungi Davomat
              </span>
            </div>
            <Button 
              size="sm" 
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300 hover:scale-105" 
              onClick={handleTakeAttendance}
            >
              <Plus className="h-4 w-4 mr-1" />
              Yo'qlama olish
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.length > 0 ? (
            <div className="space-y-4">
              {stats.map((groupStats, index) => (
                <div 
                  key={groupStats.group.id} 
                  className="group p-4 bg-gradient-subtle border border-border/50 rounded-xl hover:shadow-hover transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{groupStats.group.name}</h4>
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow"></div>
                      </div>
                      {groupStats.group.subject && (
                        <p className="text-sm text-muted-foreground font-medium">{groupStats.group.subject}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={getTodayAttendanceRate(groupStats) >= 80 ? 'default' : 'secondary'}
                        className={`text-xs font-semibold px-3 py-1 ${
                          getTodayAttendanceRate(groupStats) >= 80 
                            ? 'bg-gradient-accent text-white shadow-glow' 
                            : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                        }`}
                      >
                        {getTodayAttendanceRate(groupStats)}% keldi
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <div className="flex items-center p-2 bg-green-50 rounded-lg transition-all hover:bg-green-100">
                      <div className="p-1 bg-green-500 rounded-full mr-2">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-green-700">{groupStats.todayAttendance.present}</span>
                        <p className="text-xs text-green-600">keldi</p>
                      </div>
                    </div>
                    <div className="flex items-center p-2 bg-yellow-50 rounded-lg transition-all hover:bg-yellow-100">
                      <div className="p-1 bg-yellow-500 rounded-full mr-2">
                        <Clock className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-yellow-700">{groupStats.todayAttendance.late}</span>
                        <p className="text-xs text-yellow-600">kechikdi</p>
                      </div>
                    </div>
                    <div className="flex items-center p-2 bg-red-50 rounded-lg transition-all hover:bg-red-100">
                      <div className="p-1 bg-red-500 rounded-full mr-2">
                        <X className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-red-700">{groupStats.todayAttendance.absent}</span>
                        <p className="text-xs text-red-600">kelmadi</p>
                      </div>
                    </div>
                    <div className="flex items-center p-2 bg-blue-50 rounded-lg transition-all hover:bg-blue-100">
                      <div className="p-1 bg-blue-500 rounded-full mr-2">
                        <Users className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-blue-700">{groupStats.totalStudents}</span>
                        <p className="text-xs text-blue-600">jami</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-border/30">
                    <div className="text-xs text-muted-foreground flex items-center">
                      <div className="w-2 h-2 rounded-full bg-accent mr-2 animate-pulse"></div>
                      Haftalik: <span className="font-semibold ml-1">{groupStats.weeklyPresentRate}%</span> davomat
                    </div>
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-accent rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${groupStats.weeklyPresentRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Guruhlar topilmadi</p>
              <p className="text-xs text-muted-foreground">Avval guruhlarni yarating</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Attendance Records */}
      <Card className="border-border shadow-card hover:shadow-hover transition-all duration-500 hover:-translate-y-1 bg-gradient-card animate-slide-up" style={{ animationDelay: '200ms' }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-card-foreground flex items-center">
            <div className="p-2 rounded-lg bg-gradient-accent mr-3">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-hero bg-clip-text text-transparent font-bold">
              So'nggi davomatlar
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length > 0 ? (
            <div className="space-y-3">
              {attendance.slice(0, 5).map((record, index) => (
                <div 
                  key={record.id} 
                  className="flex items-center justify-between p-4 bg-gradient-subtle border border-border/50 rounded-lg hover:shadow-card transition-all duration-300 hover:-translate-y-0.5 animate-fade-in group"
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                      {getStatusIcon(record.status)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {record.student.firstName} {record.student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {record.group.name} • {new Date(record.date).toLocaleDateString('uz-UZ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      className={`text-xs font-semibold px-3 py-1 transition-all duration-300 ${
                        record.status === 'present' 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm hover:shadow-lg' 
                          : record.status === 'late' 
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-sm hover:shadow-lg' 
                          : 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-sm hover:shadow-lg'
                      }`}
                    >
                      {getStatusText(record.status)}
                    </Badge>
                    {record.arrivedAt && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{record.arrivedAt}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Hozircha davomat yozuvlari yo'q</p>
              <p className="text-xs text-muted-foreground">Yo'qlama olgansizdan keyin bu yerda ko'rinadi</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Modal */}
      <AttendanceModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        onSuccess={handleAttendanceSuccess}
        groups={groups}
      />
    </div>
  );
}
