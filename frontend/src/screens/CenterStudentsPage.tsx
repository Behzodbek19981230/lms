import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
	TrendingUp,
} from 'lucide-react';
import { request } from '@/configs/request';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/utils/api-error';

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
	const [page, setPage] = useState(1);
	const pageSize = 20;
	const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
	const [showDetails, setShowDetails] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [creating, setCreating] = useState(false);

	const [editOpen, setEditOpen] = useState(false);
	const [editing, setEditing] = useState(false);
	const [editStudent, setEditStudent] = useState<Student | null>(null);
	const [editForm, setEditForm] = useState({
		firstName: '',
		lastName: '',
		username: '',
		phone: '',
	});

	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
	const [createForm, setCreateForm] = useState({
		firstName: '',
		lastName: '',
		username: '',
		phone: '',
		password: 'lms1234',
	});

	const filteredStudents = students.filter((student) => {
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

	useEffect(() => {
		setPage(1);
	}, [searchTerm, statusFilter, students.length]);

	const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
	const safePage = Math.min(page, totalPages);
	const pageStart = (safePage - 1) * pageSize;
	const pageEnd = Math.min(pageStart + pageSize, filteredStudents.length);
	const paginatedStudents = filteredStudents.slice(pageStart, pageEnd);

	const activeStudentsCount = students.filter((s) => s.isActive).length;
	const inactiveStudentsCount = students.filter((s) => !s.isActive).length;
	const recentStudentsCount = students.filter((s) => {
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
					includeGroups: true,
				},
			});
			setStudents(response.data || []);
		} catch (error: any) {
			console.error('Error loading students:', error);
			toast({
				title: 'Xato',
				description: 'Studentlarni yuklab olishda xatolik',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	const handleStatusToggle = async (studentId: number, currentStatus: boolean) => {
		try {
			await request.patch(`/users/${studentId}`, {
				isActive: !currentStatus,
			});

			setStudents((prev) =>
				prev.map((student) => (student.id === studentId ? { ...student, isActive: !currentStatus } : student))
			);

			toast({
				title: 'Muvaffaqiyat',
				description: "O‘quvchi holati o'zgartirildi",
			});
		} catch (error: any) {
			toast({
				title: 'Xato',
				description: "O‘quvchi holatini o'zgartirishda xatolik",
				variant: 'destructive',
			});
		}
	};

	const handleExport = async () => {
		try {
			const XLSX = await import('xlsx');

			const rows = students.map((student) => ({
				Ism: student.firstName,
				Familiya: student.lastName,
				Username: student.username,
				Telefon: student.phone || '',
				Holat: student.isActive ? 'Faol' : 'Nofaol',
				"Ro'yxatdan o'tgan sana": new Date(student.createdAt).toLocaleDateString(),
			}));

			const ws = XLSX.utils.json_to_sheet(rows);
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, 'Students');

			const ts = new Date();
			const pad = (n: number) => String(n).padStart(2, '0');
			const fileName = `students-${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}.xlsx`;

			XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
		} catch (e: any) {
			const msg = getApiErrorMessage(e) || 'Excel export qilishda xatolik';
			toast({ title: 'Xato', description: msg, variant: 'destructive' });
		}
	};

	const handleViewDetails = (student: Student) => {
		setSelectedStudent(student);
		setShowDetails(true);
	};

	const openEdit = (student: Student) => {
		setEditStudent(student);
		setEditForm({
			firstName: student.firstName ?? '',
			lastName: student.lastName ?? '',
			username: student.username ?? '',
			phone: student.phone ?? '',
		});
		setEditOpen(true);
	};

	const handleUpdateStudent = async () => {
		if (!editStudent) return;

		try {
			setEditing(true);

			const payload = {
				firstName: editForm.firstName.trim(),
				lastName: editForm.lastName.trim(),
				username: editForm.username.trim(),
				phone: editForm.phone.trim() || undefined,
			};

			const res = await request.patch(`/users/${editStudent.id}`, payload);
			const updated = res.data as Student;

			setStudents((prev) => prev.map((s) => (s.id === editStudent.id ? { ...s, ...updated } : s)));
			setEditOpen(false);
			setEditStudent(null);

			toast({
				title: 'Muvaffaqiyat',
				description: "O‘quvchi ma'lumotlari yangilandi",
			});
		} catch (e: any) {
			const msg = getApiErrorMessage(e) || 'O‘quvchini tahrirlashda xatolik';
			toast({ title: 'Xato', description: msg, variant: 'destructive' });
		} finally {
			setEditing(false);
		}
	};

	const openDelete = (student: Student) => {
		setDeleteStudent(student);
		setDeleteOpen(true);
	};

	const handleDeleteStudent = async () => {
		if (!deleteStudent) return;

		try {
			setDeleting(true);
			await request.delete(`/users/${deleteStudent.id}`);
			setStudents((prev) => prev.filter((s) => s.id !== deleteStudent.id));
			setDeleteOpen(false);
			setDeleteStudent(null);

			toast({
				title: 'Muvaffaqiyat',
				description: 'O‘quvchi o‘chirildi',
			});
		} catch (e: any) {
			const msg = getApiErrorMessage(e) || 'O‘quvchini o‘chirishda xatolik';
			toast({ title: 'Xato', description: msg, variant: 'destructive' });
		} finally {
			setDeleting(false);
		}
	};

	const handleCreateStudent = async () => {
		try {
			setCreating(true);
			const payload = {
				username: createForm.username.trim(),
				password: createForm.password,
				firstName: createForm.firstName.trim(),
				lastName: createForm.lastName.trim(),
				phone: createForm.phone.trim() || undefined,
				role: 'student',
			};
			await request.post('/users/students', payload);
			toast({
				title: 'Muvaffaqiyat',
				description: 'Yangi o‘quvchi qo‘shildi',
			});
			setCreateOpen(false);
			setCreateForm({
				firstName: '',
				lastName: '',
				username: '',
				phone: '',
				password: 'lms1234',
			});
			await loadStudents();
		} catch (e: any) {
			const msg = getApiErrorMessage(e) || 'O‘quvchi qo‘shishda xatolik';
			toast({ title: 'Xato', description: msg, variant: 'destructive' });
		} finally {
			setCreating(false);
		}
	};

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>O‘quvchilarim</h1>
					<p className='text-muted-foreground'>Markazimdagi barcha o‘quvchilarni boshqarish</p>
				</div>
				<Dialog open={createOpen} onOpenChange={setCreateOpen}>
					<DialogTrigger asChild>
						<Button>
							<UserPlus className='h-4 w-4 mr-2' />
							Yangi o‘quvchi qo‘shish
						</Button>
					</DialogTrigger>
					<DialogContent className='max-w-xl'>
						<DialogHeader>
							<DialogTitle>Yangi o‘quvchi qo‘shish</DialogTitle>
							<DialogDescription>
								O‘quvchi login (username) va parolini kiriting. Keyin u tizimga kira oladi.
							</DialogDescription>
						</DialogHeader>
						<div className='grid grid-cols-1 gap-4'>
							<div className='grid grid-cols-2 gap-3'>
								<div>
									<Label>Ism</Label>
									<Input
										value={createForm.firstName}
										onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
									/>
								</div>
								<div>
									<Label>Familiya</Label>
									<Input
										value={createForm.lastName}
										onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))}
									/>
								</div>
							</div>
							<div>
								<Label>Username</Label>
								<Input
									value={createForm.username}
									onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
								/>
							</div>
							<div>
								<Label>Telefon (ixtiyoriy)</Label>
								<Input
									value={createForm.phone}
									onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
								/>
							</div>
							<div>
								<Label>Parol</Label>
								<Input
									type='text'
									value={createForm.password}
									onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
								/>
								<p className='text-xs text-muted-foreground mt-1'>
									Standart: <code className='px-1 rounded bg-muted'>lms1234</code>
								</p>
							</div>
						</div>
						<div className='flex justify-end gap-2 pt-2'>
							<Button variant='outline' onClick={() => setCreateOpen(false)} disabled={creating}>
								Bekor
							</Button>
							<Button onClick={handleCreateStudent} disabled={creating}>
								{creating ? 'Saqlanmoqda...' : 'Saqlash'}
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			{/* Stats Cards */}
			<div className='grid gap-4 md:grid-cols-4'>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>Jami o‘quvchilar</CardTitle>
						<Users className='h-4 w-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>{students.length}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>Faol o‘quvchilar</CardTitle>
						<GraduationCap className='h-4 w-4 text-green-600' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-green-600'>{activeStudentsCount}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>Nofaol o‘quvchilar</CardTitle>
						<Users className='h-4 w-4 text-red-600' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-red-600'>{inactiveStudentsCount}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<CardTitle className='text-sm font-medium'>Bu haftadagi yangi</CardTitle>
						<TrendingUp className='h-4 w-4 text-blue-600' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold text-blue-600'>{recentStudentsCount}</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters and Search */}
			<Card>
				<CardHeader>
					<CardTitle>O‘quvchilar ro'yxati</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='flex items-center justify-between mb-4'>
						<div className='flex items-center space-x-2'>
							<div className='relative'>
								<Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
								<Input
									placeholder='O‘quvchi qidirish...'
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className='pl-8 w-[300px]'
								/>
							</div>

							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger className='w-[180px]'>
									<SelectValue placeholder='Holatni tanlang' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>Barcha o‘quvchilar</SelectItem>
									<SelectItem value='active'>Faol o‘quvchilar</SelectItem>
									<SelectItem value='inactive'>Nofaol o‘quvchilar</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<Button variant='outline' onClick={handleExport}>
							<Download className='h-4 w-4 mr-2' />
							Export
						</Button>
					</div>

					{/* Students Table */}
					<div className='rounded-md border'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>O‘quvchi</TableHead>
									<TableHead>username</TableHead>
									<TableHead>Telefon</TableHead>
									<TableHead>Guruhlar</TableHead>
									<TableHead>Holat</TableHead>
									<TableHead>Oxirgi kirish</TableHead>
									<TableHead className='w-[70px]'>Amallar</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{loading ? (
									<TableRow>
										<TableCell colSpan={7} className='text-center py-4'>
											Yuklanmoqda...
										</TableCell>
									</TableRow>
								) : filteredStudents.length === 0 ? (
									<TableRow>
										<TableCell colSpan={7} className='text-center py-4'>
											O‘quvchilar topilmadi
										</TableCell>
									</TableRow>
								) : (
									paginatedStudents.map((student) => (
										<TableRow key={student.id}>
											<TableCell>
												<div className='font-medium'>
													{student.firstName} {student.lastName}
												</div>
											</TableCell>
											<TableCell>{student.username}</TableCell>
											<TableCell>{student.phone || '—'}</TableCell>
											<TableCell>
												<div className='flex flex-wrap gap-1'>
													{student.groups?.slice(0, 2).map((group) => (
														<Badge key={group.id} variant='secondary' className='text-xs'>
															{group.name}
														</Badge>
													))}
													{student.groups && student.groups.length > 2 && (
														<Badge variant='outline' className='text-xs'>
															+{student.groups.length - 2}
														</Badge>
													)}
												</div>
											</TableCell>
											<TableCell>
												<Badge
													variant={student.isActive ? 'default' : 'secondary'}
													className={
														student.isActive
															? 'bg-green-100 text-green-800'
															: 'bg-gray-100 text-gray-800'
													}
												>
													{student.isActive ? 'Faol' : 'Nofaol'}
												</Badge>
											</TableCell>
											<TableCell>
												{student.lastLoginAt
													? new Date(student.lastLoginAt).toLocaleDateString()
													: 'Hech qachon'}
											</TableCell>
											<TableCell>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant='ghost' className='h-8 w-8 p-0'>
															<MoreHorizontal className='h-4 w-4' />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align='end'>
														<DropdownMenuItem onClick={() => handleViewDetails(student)}>
															<Eye className='mr-2 h-4 w-4' />
															Ko'rish
														</DropdownMenuItem>
														<DropdownMenuItem onClick={() => openEdit(student)}>
															<Edit className='mr-2 h-4 w-4' />
															Tahrirlash
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() =>
																handleStatusToggle(student.id, student.isActive)
															}
														>
															{student.isActive ? (
																<>
																	<UserPlus className='mr-2 h-4 w-4' />
																	Faolsizlashtirish
																</>
															) : (
																<>
																	<UserPlus className='mr-2 h-4 w-4' />
																	Faollashtirish
																</>
															)}
														</DropdownMenuItem>
														<DropdownMenuItem
															className='text-red-600'
															onClick={() => openDelete(student)}
														>
															<Trash2 className='mr-2 h-4 w-4' />
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

					{!loading && filteredStudents.length > 0 ? (
						<div className='flex items-center justify-between mt-3'>
							<div className='text-sm text-muted-foreground'>
								{pageStart + 1}-{pageEnd} / {filteredStudents.length}
							</div>
							<div className='flex items-center gap-2'>
								<Button
									variant='outline'
									size='sm'
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={safePage <= 1}
								>
									Oldingi
								</Button>
								<div className='text-sm text-muted-foreground'>
									Sahifa {safePage} / {totalPages}
								</div>
								<Button
									variant='outline'
									size='sm'
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={safePage >= totalPages}
								>
									Keyingi
								</Button>
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>

			{/* Student Details Dialog */}
			<Dialog open={showDetails} onOpenChange={setShowDetails}>
				<DialogContent className='max-w-2xl'>
					<DialogHeader>
						<DialogTitle>O‘quvchi ma'lumotlari</DialogTitle>
						<DialogDescription>
							{selectedStudent && `${selectedStudent.firstName} ${selectedStudent.lastName}`} haqida
							batafsil ma'lumot
						</DialogDescription>
					</DialogHeader>

					{selectedStudent && (
						<div className='space-y-4'>
							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label className='text-sm font-medium'>Ism</label>
									<p className='text-sm text-muted-foreground'>{selectedStudent.firstName}</p>
								</div>
								<div>
									<label className='text-sm font-medium'>Familiya</label>
									<p className='text-sm text-muted-foreground'>{selectedStudent.lastName}</p>
								</div>
								<div>
									<label className='text-sm font-medium'>Username</label>
									<p className='text-sm text-muted-foreground'>{selectedStudent.username}</p>
								</div>
								<div>
									<label className='text-sm font-medium'>Telefon</label>
									<p className='text-sm text-muted-foreground'>
										{selectedStudent.phone || "Ko'rsatilmagan"}
									</p>
								</div>
								<div>
									<label className='text-sm font-medium'>Holat</label>
									<Badge
										variant={selectedStudent.isActive ? 'default' : 'secondary'}
										className={
											selectedStudent.isActive
												? 'bg-green-100 text-green-800'
												: 'bg-gray-100 text-gray-800'
										}
									>
										{selectedStudent.isActive ? 'Faol' : 'Nofaol'}
									</Badge>
								</div>
								<div>
									<label className='text-sm font-medium'>Ro'yxatdan o'tgan sana</label>
									<p className='text-sm text-muted-foreground'>
										{new Date(selectedStudent.createdAt).toLocaleDateString()}
									</p>
								</div>
							</div>

							{selectedStudent.groups && selectedStudent.groups.length > 0 && (
								<div>
									<label className='text-sm font-medium'>Guruhlar</label>
									<div className='mt-2 space-y-2'>
										{selectedStudent.groups.map((group) => (
											<div
												key={group.id}
												className='flex items-center justify-between p-2 border rounded'
											>
												<span className='font-medium'>{group.name}</span>
												{group.subject && <Badge variant='outline'>{group.subject.name}</Badge>}
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Edit Student Dialog */}
			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className='max-w-xl'>
					<DialogHeader>
						<DialogTitle>O‘quvchini tahrirlash</DialogTitle>
						<DialogDescription>
							{editStudent
								? `${editStudent.firstName} ${editStudent.lastName} ma'lumotlarini yangilang`
								: "O‘quvchi ma'lumotlarini yangilang"}
						</DialogDescription>
					</DialogHeader>
					<div className='grid grid-cols-1 gap-4'>
						<div className='grid grid-cols-2 gap-3'>
							<div>
								<Label>Ism</Label>
								<Input
									value={editForm.firstName}
									onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
								/>
							</div>
							<div>
								<Label>Familiya</Label>
								<Input
									value={editForm.lastName}
									onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
								/>
							</div>
						</div>
						<div>
							<Label>Username</Label>
							<Input
								value={editForm.username}
								onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
							/>
						</div>
						<div>
							<Label>Telefon (ixtiyoriy)</Label>
							<Input
								value={editForm.phone}
								onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
							/>
						</div>
					</div>
					<div className='flex justify-end gap-2 pt-2'>
						<Button variant='outline' onClick={() => setEditOpen(false)} disabled={editing}>
							Bekor
						</Button>
						<Button onClick={handleUpdateStudent} disabled={editing || !editStudent}>
							{editing ? 'Saqlanmoqda...' : 'Saqlash'}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>O‘quvchini o‘chirish</DialogTitle>
						<DialogDescription>
							{deleteStudent
								? `${deleteStudent.firstName} ${deleteStudent.lastName} o‘quvchini o‘chirmoqchimisiz? Bu amal qaytarilmaydi.`
								: 'O‘quvchini o‘chirmoqchimisiz?'}
						</DialogDescription>
					</DialogHeader>
					<div className='flex justify-end gap-2 pt-2'>
						<Button variant='outline' onClick={() => setDeleteOpen(false)} disabled={deleting}>
							Bekor
						</Button>
						<Button
							variant='destructive'
							onClick={handleDeleteStudent}
							disabled={deleting || !deleteStudent}
						>
							{deleting ? "O'chirilmoqda..." : "O'chirish"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
