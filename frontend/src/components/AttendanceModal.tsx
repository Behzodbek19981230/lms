import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { CheckCircle, X, Users, Save, Loader2 } from 'lucide-react';

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
}

interface Group {
  id: number;
  name: string;
  subject?: string;
  students: Student[];
}

interface AttendanceRecord {
  studentId: number;
  status: 'present' | 'absent';
}

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groups: Group[];
}

export default function AttendanceModal({ isOpen, onClose, onSuccess, groups }: AttendanceModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupStudents();
    }
  }, [selectedGroupId]);

  const loadGroupStudents = async () => {
    try {
      setLoading(true);
      const response = await request.get(`/groups/${selectedGroupId}/students`);
      const studentsData = response.data || [];
      setStudents(studentsData);
      
      // Initialize attendance records with default 'present' status
      const defaultRecords = studentsData.map((student: Student) => ({
        studentId: student.id,
        status: 'present' as const
      }));
      setAttendanceRecords(defaultRecords);
    } catch (error: any) {
      console.error('Error loading students:', error);
      toast({
        title: 'Xato',
        description: 'Talabalar ro\'yxatini yuklab olishda xatolik',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendanceStatus = (studentId: number) => {
    setAttendanceRecords(prev => 
      prev.map(record => 
        record.studentId === studentId 
          ? { ...record, status: record.status === 'present' ? 'absent' : 'present' }
          : record
      )
    );
  };

  const handleSubmit = async () => {
    if (!selectedGroupId || !selectedDate) {
      toast({
        title: 'Xato',
        description: 'Guruh va sanani tanlang',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      const bulkData = {
        groupId: selectedGroupId,
        date: selectedDate,
        attendanceRecords: attendanceRecords.map(record => ({
          studentId: record.studentId,
          status: record.status
        }))
      };

      await request.post('/attendance/bulk', bulkData);
      
      toast({
        title: 'Muvaffaqiyat',
        description: 'Yo\'qlama muvaffaqiyatli saqlandi',
      });
      
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast({
        title: 'Xato',
        description: error.response?.data?.message || 'Yo\'qlama saqlashda xatolik',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedGroupId(null);
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setAttendanceRecords([]);
    setStudents([]);
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'absent':
      default:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present':
        return 'Keldi';
      case 'absent':
      default:
        return 'Kelmadi';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent':
      default:
        return <X className="h-4 w-4 text-red-600" />;
    }
  };

  const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Yo'qlama olish
          </DialogTitle>
          <DialogDescription>
            Guruh tanlang va talabalar davomatini belgilang
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group and Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Guruh</label>
              <Select value={selectedGroupId?.toString() || ''} onValueChange={(value) => setSelectedGroupId(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Guruhni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name} {group.subject && `(${group.subject})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sana</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md"
              />
            </div>
          </div>

          {/* Summary Statistics */}
          {attendanceRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Statistika</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                      <span className="font-semibold text-green-600">{presentCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Keldi</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <X className="h-4 w-4 text-red-600 mr-1" />
                      <span className="font-semibold text-red-600">{absentCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Kelmadi</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Students List */}
          {selectedGroupId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Talabalar ro'yxati
                  {selectedGroup && (
                    <Badge variant="outline" className="ml-2">
                      {selectedGroup.name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Yuklanmoqda...
                  </div>
                ) : students.length > 0 ? (
                  <div className="space-y-4">
                    {students.map((student) => {
                      const record = attendanceRecords.find(r => r.studentId === student.id);
                      return (
                        <div key={student.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {record && getStatusIcon(record.status)}
                              <div>
                                <h4 className="font-medium">
                                  {student.firstName} {student.lastName}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {student.username}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge className={getStatusColor(record?.status || 'present')}>
                                {getStatusText(record?.status || 'present')}
                              </Badge>
                              <Switch
                                checked={record?.status === 'present'}
                                onCheckedChange={() => toggleAttendanceStatus(student.id)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Bu guruhda talabalar topilmadi</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Bekor qilish
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !selectedGroupId || attendanceRecords.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saqlanmoqda...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Yo'qlamani saqlash
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}