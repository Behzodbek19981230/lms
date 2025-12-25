import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  GraduationCap,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  MapPin,
  UserPlus,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Users,
  BookOpen,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { request } from '@/configs/request';
import { useToast } from '@/hooks/use-toast';

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  groups?: Array<{
    id: number;
    name: string;
    subject?: {
      name: string;
    };
  }>;
}

export default function CenterStudentsPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.username.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && student.isActive) ||
      (statusFilter === 'inactive' && !student.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const activeStudentsCount = students.filter(s => s.isActive).length;
  const inactiveStudentsCount = students.filter(s => !s.isActive).length;
  const recentStudentsCount = students.filter(s => {
    const createdDate = new Date(s.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createdDate >= weekAgo;
  }).length;

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await request.get('/users', {
        params: {
          role: 'student',
          includeGroups: true
        }
      });
      setStudents(response.data || []);
    } catch (error: any) {
      console.error('Error loading students:', error);
      toast({
        title: 'Xato',
        description: 'Studentlarni yuklab olishda xatolik',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (studentId: number, currentStatus: boolean) => {
    try {
      await request.patch(`/users/${studentId}`, {
        isActive: !currentStatus
      });
      
      setStudents(prev => 
        prev.map(student => 
          student.id === studentId 
            ? { ...student, isActive: !currentStatus }
            : student
        )
      );
      
      toast({
        title: 'Muvaffaqiyat',
        description: 'Student holati o\'zgartirildi'
      });
    } catch (error: any) {
      toast({
        title: 'Xato',
        description: 'Student holatini o\'zgartirishda xatolik',
        variant: 'destructive'
      });
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Ism', 'Familiya', 'username', 'Telefon', 'Holat', 'Ro\'yxatdan o\'tgan sana'],
      ...filteredStudents.map(student => [
        student.firstName,
        student.lastName,
        student.username,
        student.phone || '',
        student.isActive ? 'Faol' : 'Nofaol',
        new Date(student.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setShowDetails(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Studentlarim</h1>
          <p className="text-muted-foreground">
            Markazimdagi barcha studentlarni boshqarish
          </p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Yangi student qo'shish
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jami studentlar</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faol studentlar</CardTitle>
            <GraduationCap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeStudentsCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nofaol studentlar</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inactiveStudentsCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bu haftadagi yangi</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{recentStudentsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Studentlar ro'yxati</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Student qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Holatni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha studentlar</SelectItem>
                  <SelectItem value="active">Faol studentlar</SelectItem>
                  <SelectItem value="inactive">Nofaol studentlar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Students Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>username</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Guruhlar</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead>Oxirgi kirish</TableHead>
                  <TableHead className="w-[70px]">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Yuklanmoqda...
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Studentlar topilmadi
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="font-medium">
                          {student.firstName} {student.lastName}
                        </div>
                      </TableCell>
                      <TableCell>{student.username}</TableCell>
                      <TableCell>{student.phone || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {student.groups?.slice(0, 2).map((group) => (
                            <Badge key={group.id} variant="secondary" className="text-xs">
                              {group.name}
                            </Badge>
                          ))}
                          {student.groups && student.groups.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{student.groups.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={student.isActive ? "default" : "secondary"}
                          className={student.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                        >
                          {student.isActive ? 'Faol' : 'Nofaol'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {student.lastLoginAt 
                          ? new Date(student.lastLoginAt).toLocaleDateString()
                          : 'Hech qachon'
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(student)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ko'rish
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Tahrirlash
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusToggle(student.id, student.isActive)}
                            >
                              {student.isActive ? (
                                <>
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Faolsizlashtirish
                                </>
                              ) : (
                                <>
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Faollashtirish
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              O'chirish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Student Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student ma'lumotlari</DialogTitle>
            <DialogDescription>
              {selectedStudent && `${selectedStudent.firstName} ${selectedStudent.lastName}`} haqida batafsil ma'lumot
            </DialogDescription>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Ism</label>
                  <p className="text-sm text-muted-foreground">{selectedStudent.firstName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Familiya</label>
                  <p className="text-sm text-muted-foreground">{selectedStudent.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Username</label>
                  <p className="text-sm text-muted-foreground">{selectedStudent.username}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Telefon</label>
                  <p className="text-sm text-muted-foreground">{selectedStudent.phone || 'Ko\'rsatilmagan'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Holat</label>
                  <Badge 
                    variant={selectedStudent.isActive ? "default" : "secondary"}
                    className={selectedStudent.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                  >
                    {selectedStudent.isActive ? 'Faol' : 'Nofaol'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Ro'yxatdan o'tgan sana</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedStudent.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {selectedStudent.groups && selectedStudent.groups.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Guruhlar</label>
                  <div className="mt-2 space-y-2">
                    {selectedStudent.groups.map((group) => (
                      <div key={group.id} className="flex items-center justify-between p-2 border rounded">
                        <span className="font-medium">{group.name}</span>
                        {group.subject && (
                          <Badge variant="outline">{group.subject.name}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}