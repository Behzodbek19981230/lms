import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { CheckCircle, X, Clock, Users, Calendar, Save, Loader2 } from 'lucide-react';

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface Group {
  id: number;
  name: string;
  subject?: string;
  students: Student[];
}

interface AttendanceRecord {
  studentId: number;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  arrivedAt?: string;
  leftAt?: string;
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
      
      // Initialize attendance records with default 'absent' status
      const defaultRecords = studentsData.map((student: Student) => ({
        studentId: student.id,
        status: 'absent' as const,
        notes: '',
        arrivedAt: '',
        leftAt: ''
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

  const updateAttendanceRecord = (studentId: number, field: keyof AttendanceRecord, value: string) => {
    setAttendanceRecords(prev => 
      prev.map(record => 
        record.studentId === studentId 
          ? { ...record, [field]: value }
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
          status: record.status,
          notes: record.notes || undefined,
          arrivedAt: record.arrivedAt || undefined,
          leftAt: record.leftAt || undefined
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
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'excused':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'absent':
      default:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present':
        return 'Keldi';
      case 'late':
        return 'Kechikdi';
      case 'excused':
        return 'Uzrli';
      case 'absent':
      default:
        return 'Kelmadi';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'excused':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'absent':
      default:
        return <X className="h-4 w-4 text-red-600" />;
    }
  };

  const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
  const lateCount = attendanceRecords.filter(r => r.status === 'late').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
  const excusedCount = attendanceRecords.filter(r => r.status === 'excused').length;

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
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                      <span className="font-semibold text-green-600">{presentCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Keldi</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Clock className="h-4 w-4 text-yellow-600 mr-1" />
                      <span className="font-semibold text-yellow-600">{lateCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Kechikdi</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <X className="h-4 w-4 text-red-600 mr-1" />
                      <span className="font-semibold text-red-600">{absentCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Kelmadi</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <CheckCircle className="h-4 w-4 text-blue-600 mr-1" />
                      <span className="font-semibold text-blue-600">{excusedCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Uzrli</p>
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
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              {record && getStatusIcon(record.status)}
                              <div>
                                <h4 className="font-medium">
                                  {student.firstName} {student.lastName}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                            <Badge className={getStatusColor(record?.status || 'absent')}>
                              {getStatusText(record?.status || 'absent')}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-medium">Holat</label>
                              <Select
                                value={record?.status || 'absent'}
                                onValueChange={(value) => updateAttendanceRecord(student.id, 'status', value)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="present">Keldi</SelectItem>
                                  <SelectItem value="late">Kechikdi</SelectItem>
                                  <SelectItem value="absent">Kelmadi</SelectItem>
                                  <SelectItem value="excused">Uzrli</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium">Kelgan vaqt</label>
                              <input
                                type="time"
                                value={record?.arrivedAt || ''}
                                onChange={(e) => updateAttendanceRecord(student.id, 'arrivedAt', e.target.value)}
                                className="w-full px-2 py-1 border border-input rounded text-xs h-8"
                                disabled={record?.status === 'absent'}
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium">Ketgan vaqt</label>
                              <input
                                type="time"
                                value={record?.leftAt || ''}
                                onChange={(e) => updateAttendanceRecord(student.id, 'leftAt', e.target.value)}
                                className="w-full px-2 py-1 border border-input rounded text-xs h-8"
                                disabled={record?.status === 'absent'}
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium">Izoh</label>
                              <input
                                type="text"
                                value={record?.notes || ''}
                                onChange={(e) => updateAttendanceRecord(student.id, 'notes', e.target.value)}
                                placeholder="Izoh yozing..."
                                className="w-full px-2 py-1 border border-input rounded text-xs h-8"
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