import  { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    UserCheck,
    Search,
    Download,

    UserPlus,
    Eye,
    Edit,
    Trash2,
    MoreHorizontal,
    BookOpen,
    TrendingUp,
    Users2,
    GraduationCap
} from 'lucide-react';
import { request } from '@/configs/request';
import { useToast } from '@/hooks/use-toast';

interface Teacher {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    phone?: string;
    isActive: boolean;
    createdAt: string;
    lastLoginAt?: string;
    subjects?: Array<{
        id: number;
        name: string;
    }>;
    groups?: Array<{
        id: number;
        name: string;
        studentsCount: number;
    }>;
}

export default function CenterTeachersPage() {
    const { toast } = useToast();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [createForm, setCreateForm] = useState({
        firstName: '',
        lastName: '',
        username: '',
        password: '',
        phone: '',
    });
    const [creating, setCreating] = useState(false);

    const filteredTeachers = teachers.filter(teacher => {
        const matchesSearch =
            teacher.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacher.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacher.username.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && teacher.isActive) ||
            (statusFilter === 'inactive' && !teacher.isActive);

        return matchesSearch && matchesStatus;
    });

    const activeTeachersCount = teachers.filter(t => t.isActive).length;
    const inactiveTeachersCount = teachers.filter(t => !t.isActive).length;
    const recentTeachersCount = teachers.filter(t => {
        const createdDate = new Date(t.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdDate >= weekAgo;
    }).length;
    const totalStudents = teachers.reduce((sum, teacher) => {
        return sum + (teacher.groups?.reduce((groupSum, group) => groupSum + group.studentsCount, 0) || 0);
    }, 0);

    useEffect(() => {
        loadTeachers();
    }, []);

    const loadTeachers = async () => {
        try {
            setLoading(true);
            const response = await request.get('/users', {
                params: {
                    role: 'teacher',
                    includeSubjects: true,
                    includeGroups: true
                }
            });
            setTeachers(response.data || []);
        } catch (error: any) {
            console.error('Error loading teachers:', error);
            toast({
                title: 'Xato',
                description: 'O\'qituvchilarni yuklab olishda xatolik',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusToggle = async (teacherId: number, currentStatus: boolean) => {
        try {
            await request.patch(`/users/${teacherId}`, {
                isActive: !currentStatus
            });

            setTeachers(prev =>
                prev.map(teacher =>
                    teacher.id === teacherId
                        ? { ...teacher, isActive: !currentStatus }
                        : teacher
                )
            );

            toast({
                title: 'Muvaffaqiyat',
                description: 'O\'qituvchi holati o\'zgartirildi'
            });
        } catch (error: any) {
            toast({
                title: 'Xato',
                description: 'O\'qituvchi holatini o\'zgartirishda xatolik',
                variant: 'destructive'
            });
        }
    };

    const handleExport = () => {
        const csvContent = [
            ['Ism', 'Familiya', 'username', 'Telefon', 'Holat', 'Fanlar', 'Guruhlar soni', 'Ro\'yxatdan o\'tgan sana'],
            ...filteredTeachers.map(teacher => [
                teacher.firstName,
                teacher.lastName,
                teacher.username,
                teacher.phone || '',
                teacher.isActive ? 'Faol' : 'Nofaol',
                teacher.subjects?.map(s => s.name).join('; ') || '',
                teacher.groups?.length || 0,
                new Date(teacher.createdAt).toLocaleDateString()
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'teachers.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCreateTeacher = async () => {
        if (!createForm.firstName || !createForm.lastName || !createForm.username || !createForm.password) {
            toast({
                title: 'Xato',
                description: 'Barcha majburiy maydonlarni to\'ldiring',
                variant: 'destructive'
            });
            return;
        }

        setCreating(true);
        try {
            const response = await request.post('/users', {
                firstName: createForm.firstName,
                lastName: createForm.lastName,
                username: createForm.username,
                password: createForm.password,
                phone: createForm.phone,
                role: 'teacher',
            });

            setTeachers(prev => [response.data, ...prev]);
            setShowCreateDialog(false);
            setCreateForm({
                firstName: '',
                lastName: '',
                username: '',
                password: '',
                phone: '',
            });

            toast({
                title: 'Muvaffaqiyat',
                description: 'O\'qituvchi muvaffaqiyatli qo\'shildi'
            });
        } catch (error: any) {
            toast({
                title: 'Xato',
                description: error.response?.data?.message || 'O\'qituvchi qo\'shishda xatolik',
                variant: 'destructive'
            });
        } finally {
            setCreating(false);
        }
    };

    const handleViewDetails = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setShowDetails(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">O'qituvchilarim</h1>
                    <p className="text-muted-foreground">
                        Markazimdagi barcha o'qituvchilarni boshqarish
                    </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Yangi o'qituvchi qo'shish
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Jami o'qituvchilar</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{teachers.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Faol o'qituvchilar</CardTitle>
                        <UserCheck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{activeTeachersCount}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Jami o‘quvchilar</CardTitle>
                        <GraduationCap className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{totalStudents}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bu haftadagi yangi</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{recentTeachersCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Search */}
            <Card>
                <CardHeader>
                    <CardTitle>O'qituvchilar ro'yxati</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="O'qituvchi qidirish..."
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
                                    <SelectItem value="all">Barcha o'qituvchilar</SelectItem>
                                    <SelectItem value="active">Faol o'qituvchilar</SelectItem>
                                    <SelectItem value="inactive">Nofaol o'qituvchilar</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button variant="outline" onClick={handleExport}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>

                    {/* Teachers Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>O'qituvchi</TableHead>
                                    <TableHead>username</TableHead>
                                    <TableHead>Telefon</TableHead>
                                    <TableHead>Fanlar</TableHead>
                                    <TableHead>Guruhlar</TableHead>
                                    <TableHead>Holat</TableHead>
                                    <TableHead>Oxirgi kirish</TableHead>
                                    <TableHead className="w-[70px]">Amallar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-4">
                                            Yuklanmoqda...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTeachers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-4">
                                            O'qituvchilar topilmadi
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTeachers.map((teacher) => (
                                        <TableRow key={teacher.id}>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {teacher.firstName} {teacher.lastName}
                                                </div>
                                            </TableCell>
                                            <TableCell>{teacher.username}</TableCell>
                                            <TableCell>{teacher.phone || '—'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {teacher.subjects?.slice(0, 2).map((subject) => (
                                                        <Badge key={subject.id} variant="secondary" className="text-xs">
                                                            {subject.name}
                                                        </Badge>
                                                    ))}
                                                    {teacher.subjects && teacher.subjects.length > 2 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{teacher.subjects.length - 2}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-1">
                                                    <Users2 className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">
                                                        {teacher.groups?.length || 0}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({teacher.groups?.reduce((sum, group) => sum + group.studentsCount, 0) || 0} student)
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={teacher.isActive ? "default" : "secondary"}
                                                    className={teacher.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                                                >
                                                    {teacher.isActive ? 'Faol' : 'Nofaol'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {teacher.lastLoginAt
                                                    ? new Date(teacher.lastLoginAt).toLocaleDateString()
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
                                                        <DropdownMenuItem onClick={() => handleViewDetails(teacher)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Ko'rish
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Tahrirlash
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleStatusToggle(teacher.id, teacher.isActive)}
                                                        >
                                                            {teacher.isActive ? (
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

            {/* Teacher Details Dialog */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>O'qituvchi ma'lumotlari</DialogTitle>
                        <DialogDescription>
                            {selectedTeacher && `${selectedTeacher.firstName} ${selectedTeacher.lastName}`} haqida batafsil ma'lumot
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTeacher && (
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Ism</label>
                                    <p className="text-sm text-muted-foreground">{selectedTeacher.firstName}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Familiya</label>
                                    <p className="text-sm text-muted-foreground">{selectedTeacher.lastName}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">username</label>
                                    <p className="text-sm text-muted-foreground">{selectedTeacher.username}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Telefon</label>
                                    <p className="text-sm text-muted-foreground">{selectedTeacher.phone || 'Ko\'rsatilmagan'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Holat</label>
                                    <Badge
                                        variant={selectedTeacher.isActive ? "default" : "secondary"}
                                        className={selectedTeacher.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                                    >
                                        {selectedTeacher.isActive ? 'Faol' : 'Nofaol'}
                                    </Badge>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Ro'yxatdan o'tgan sana</label>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(selectedTeacher.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            {/* Subjects */}
                            {selectedTeacher.subjects && selectedTeacher.subjects.length > 0 && (
                                <div>
                                    <label className="text-sm font-medium">O'qitadigan fanlar</label>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {selectedTeacher.subjects.map((subject) => (
                                            <Badge key={subject.id} variant="outline" className="flex items-center space-x-1">
                                                <BookOpen className="h-3 w-3" />
                                                <span>{subject.name}</span>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Groups */}
                            {selectedTeacher.groups && selectedTeacher.groups.length > 0 && (
                                <div>
                                    <label className="text-sm font-medium">Guruhlar</label>
                                    <div className="mt-2 space-y-2">
                                        {selectedTeacher.groups.map((group) => (
                                            <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div className="flex items-center space-x-2">
                                                    <Users2 className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{group.name}</span>
                                                </div>
                                                <Badge variant="secondary">
                                                    {group.studentsCount} student
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Teacher Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Yangi o'qituvchi qo'shish</DialogTitle>
                        <DialogDescription>
                            O'qituvchi uchun barcha ma'lumotlarni kiriting.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="firstName" className="text-right text-sm font-medium">
                                Ism *
                            </Label>
                            <Input
                                id="firstName"
                                value={createForm.firstName}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, firstName: e.target.value }))}
                                className="col-span-3"
                                placeholder="Ism"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lastName" className="text-right text-sm font-medium">
                                Familiya *
                            </Label>
                            <Input
                                id="lastName"
                                value={createForm.lastName}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, lastName: e.target.value }))}
                                className="col-span-3"
                                placeholder="Familiya"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="username" className="text-right text-sm font-medium">
                                Username *
                            </Label>
                            <Input
                                id="username"
                                value={createForm.username}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
                                className="col-span-3"
                                placeholder="Username"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right text-sm font-medium">
                                Parol *
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={createForm.password}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                                className="col-span-3"
                                placeholder="Parol"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right text-sm font-medium">
                                Telefon
                            </Label>
                            <Input
                                id="phone"
                                value={createForm.phone}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="col-span-3"
                                placeholder="Telefon raqam"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Bekor qilish
                        </Button>
                        <Button onClick={handleCreateTeacher} disabled={creating}>
                            {creating ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}