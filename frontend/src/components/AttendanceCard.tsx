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
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Bugungi Davomat
            </div>
            <Button size="sm" variant="outline" onClick={handleTakeAttendance}>
              <Plus className="h-4 w-4 mr-1" />
              Yo'qlama olish
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.length > 0 ? (
            <div className="space-y-4">
              {stats.map((groupStats) => (
                <div key={groupStats.group.id} className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-foreground">{groupStats.group.name}</h4>
                      {groupStats.group.subject && (
                        <p className="text-sm text-muted-foreground">{groupStats.group.subject}</p>
                      )}
                    </div>
                    <Badge 
                      variant={getTodayAttendanceRate(groupStats) >= 80 ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {getTodayAttendanceRate(groupStats)}% keldi
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center">
                      <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                      <span>{groupStats.todayAttendance.present} keldi</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 text-yellow-500 mr-1" />
                      <span>{groupStats.todayAttendance.late} kechikdi</span>
                    </div>
                    <div className="flex items-center">
                      <X className="h-3 w-3 text-red-500 mr-1" />
                      <span>{groupStats.todayAttendance.absent} kelmadi</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-3 w-3 text-muted-foreground mr-1" />
                      <span>{groupStats.totalStudents} jami</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    Haftalik: {groupStats.weeklyPresentRate}% davomat
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
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            So'nggi davomatlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length > 0 ? (
            <div className="space-y-3">
              {attendance.slice(0, 5).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(record.status)}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {record.student.firstName} {record.student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.group.name} • {new Date(record.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={record.status === 'present' ? 'default' : record.status === 'late' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {getStatusText(record.status)}
                    </Badge>
                    {record.arrivedAt && (
                      <p className="text-xs text-muted-foreground mt-1">{record.arrivedAt}</p>
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
