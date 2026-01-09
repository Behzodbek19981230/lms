import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { attendanceService, PresentStudentsResponse } from '@/services/attendance.service';
import { request } from '@/configs/request';
import { CheckCircle, Users, Calendar, Eye, Loader2 } from 'lucide-react';

interface Group {
  id: number;
  name: string;
  subject?: {
    id: number;
    name: string;
  };
}

export default function PresentStudentsCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [presentStudents, setPresentStudents] = useState<PresentStudentsResponse | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId && selectedDate) {
      loadPresentStudents();
    }
  }, [selectedGroupId, selectedDate]);

  const loadGroups = async () => {
    try {
      const response = await request.get('/groups/me');
      setGroups(response.data || []);
    } catch (error: any) {
      console.error('Error loading groups:', error);
      toast({
        title: 'Xato',
        description: 'Guruhlar ma\'lumotlarini yuklab olishda xatolik',
        variant: 'destructive'
      });
    }
  };

  const loadPresentStudents = async () => {
    if (!selectedGroupId) return;

    try {
      setLoading(true);
      const result = await attendanceService.getPresentStudents(selectedGroupId, selectedDate);
      
      if (result.success && result.data) {
        setPresentStudents(result.data);
      } else {
        throw new Error(result.error || "Kelgan talabalarni yuklab bo'lmadi");
      }
    } catch (error: any) {
      console.error('Error loading present students:', error);
      toast({
        title: 'Xato',
        description: 'Kelgan talabalar ro\'yxatini yuklab olishda xatolik',
        variant: 'destructive'
      });
      setPresentStudents(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayPresentStudents = async () => {
    if (!selectedGroupId) return;

    try {
      setLoading(true);
      const result = await attendanceService.getTodayPresentStudents(selectedGroupId);
      
      if (result.success && result.data) {
        setPresentStudents(result.data);
        setSelectedDate(new Date().toISOString().split('T')[0]);
      } else {
        throw new Error(result.error || "Bugungi kelgan talabalarni yuklab bo'lmadi");
      }
    } catch (error: any) {
      console.error('Error loading today present students:', error);
      toast({
        title: 'Xato',
        description: 'Bugungi kelgan talabalar ro\'yxatini yuklab olishda xatolik',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border shadow-card hover:shadow-hover transition-all duration-500 hover:-translate-y-1 bg-gradient-card backdrop-blur-sm animate-slide-up">
      <CardHeader className="pb-4">
        <CardTitle className="text-card-foreground flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-gradient-accent mr-3">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-hero bg-clip-text text-transparent font-bold">
              Kelgan talabalar
            </span>
          </div>
          {selectedGroupId && (
            <Button 
              size="sm" 
              variant="outline"
              className="hover:bg-gradient-primary hover:text-white transition-all duration-300"
              onClick={loadTodayPresentStudents}
              disabled={loading}
            >
              <Eye className="h-4 w-4 mr-1" />
              Bugun
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Group and Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Guruh</label>
              <Select 
                value={selectedGroupId?.toString() || ''} 
                onValueChange={(value) => setSelectedGroupId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Guruhni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name} {group.subject && `(${group.subject.name})`}
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
                className="w-full px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Present Students Display */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-muted-foreground">Yuklanmoqda...</span>
            </div>
          )}

          {!loading && presentStudents && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between p-4 bg-gradient-subtle border border-border/50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-foreground">{presentStudents.groupName}</h3>
                  <p className="text-sm text-muted-foreground">{presentStudents.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(presentStudents.date).toLocaleDateString('uz-UZ')}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {presentStudents.totalPresent} keldi
                  </Badge>
                </div>
              </div>

              {/* Present Students List */}
              {presentStudents.presentStudents.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Kelgan talabalar ro'yxati
                  </h4>
                  <div className="grid gap-2">
                    {presentStudents.presentStudents.map((student, index) => (
                      <div 
                        key={student.id} 
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 bg-green-500 rounded-full">
                            <CheckCircle className="h-3 w-3 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-green-800">{student.fullName}</p>
                            {student.arrivedAt && (
                              <p className="text-xs text-green-600 font-mono">
                                Keldi: {student.arrivedAt}
                              </p>
                            )}
                          </div>
                        </div>
                        {student.notes && (
                          <Badge variant="outline" className="text-xs">
                            {student.notes}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Bu kuni hech kim kelmagan</p>
                  <p className="text-xs text-muted-foreground">Yo'qlama olinmagan yoki hamma yo'q</p>
                </div>
              )}
            </div>
          )}

          {!loading && !presentStudents && selectedGroupId && selectedDate && (
            <div className="text-center py-6">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Bu kuni uchun ma'lumot topilmadi</p>
              <p className="text-xs text-muted-foreground">Guruh va sanani tekshiring</p>
            </div>
          )}

          {!selectedGroupId && (
            <div className="text-center py-6">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Guruhni tanlang</p>
              <p className="text-xs text-muted-foreground">Kelgan talabalar ro'yxatini ko'rish uchun</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
