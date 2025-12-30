import { request } from '@/configs/request';
import useSWR from 'swr';
import { SubjectType, SubjectCategory, SubjectCategoryLabels } from '@/types/subject.type';
import DataTable, { Column } from '@/components/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Pencil, Trash2, FlaskConical, Eye, Users, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubjectModal } from '@/components/modal/SubjectModal';
import { DeleteSubjectDialog } from '@/components/modal/DeleteSubjectDialog';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import moment from 'moment';
import PageLoader from '@/components/PageLoader';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import 'moment/locale/uz';

moment.locale('uz');

type Teacher = { id: number; firstName: string; lastName: string };

export default function Subjects() {
	const { user } = useAuth();
	const { toast } = useToast();
	const [assignDialogOpen, setAssignDialogOpen] = useState(false);
	const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
	const [teachers, setTeachers] = useState<Teacher[]>([]);
	const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);
	const [assigning, setAssigning] = useState(false);
	const [subjectModalOpen, setSubjectModalOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [editingSubject, setEditingSubject] = useState<SubjectType | null>(null);
	const [deletingSubject, setDeletingSubject] = useState<{ id: number; name: string } | null>(null);
	const [viewTeachersDialogOpen, setViewTeachersDialogOpen] = useState(false);
	const [viewingSubject, setViewingSubject] = useState<SubjectType | null>(null);

	// Teacher uchun /subjects/me, Admin uchun /subjects
	const endpoint = user?.role === 'teacher' ? '/subjects/me' : '/subjects';
	const fetcher = async () => {
		if (!endpoint) return [];
		const res = await request.get(endpoint);
		return res.data;
	};
	const { data, isLoading, mutate } = useSWR(user ? endpoint : null, fetcher);

	const subjects = data || ([] as SubjectType[]);

	// Teacher'larni yuklash (admin uchun)
	useEffect(() => {
		if (user?.role === 'admin' || user?.role === 'superadmin') {
			request
				.get('/users', { params: { role: 'teacher', includeSubjects: true } })
				.then((res) => {
					setTeachers(res.data || []);
				})
				.catch(() => {});
		}
	}, [user]);

	const handleAssignTeachers = async () => {
		if (!selectedSubjectId) return;
		setAssigning(true);
		try {
			await request.post(`/subjects/${selectedSubjectId}/assign-teachers`, {
				teacherIds: selectedTeacherIds,
			});
			toast({
				title: 'Muvaffaqiyatli',
				description: "Teacher'lar biriktirildi",
			});
			setAssignDialogOpen(false);
			setSelectedSubjectId(null);
			setSelectedTeacherIds([]);
			mutate();
		} catch (error: any) {
			toast({
				title: 'Xatolik',
				description: error?.response?.data?.message || "Teacher'larni biriktirib bo'lmadi",
				variant: 'destructive',
			});
		} finally {
			setAssigning(false);
		}
	};

	const openAssignDialog = (subjectId: number) => {
		setSelectedSubjectId(subjectId);
		setAssignDialogOpen(true);
		// Subject'ga biriktirilgan teacher'larni topish
		const subject = subjects.find((s) => s.id === subjectId);
		if (subject?.teachers && subject.teachers.length > 0) {
			setSelectedTeacherIds(subject.teachers.map((t) => t.id));
		} else {
			setSelectedTeacherIds([]);
		}
	};

	const openViewTeachersDialog = (subject: SubjectType) => {
		setViewingSubject(subject);
		setViewTeachersDialogOpen(true);
	};

	const renderCategory = (category?: SubjectCategory | string) => {
		if (!category) return <Badge variant='outline'>Noma'lum</Badge>;
		const label = SubjectCategoryLabels[category as SubjectCategory] || String(category);
		const colorClass =
			category === SubjectCategory.exact_science
				? 'bg-blue-100 text-blue-800'
				: category === SubjectCategory.social_science
				? 'bg-amber-100 text-amber-800'
				: 'bg-gray-100 text-gray-800';
		const cfg = { label, className: colorClass };
		return <Badge className={cfg.className}>{cfg.label}</Badge>;
	};

	const columns: Column<SubjectType>[] = useMemo(() => {
		if (!user) return [];
		return [
			{
				key: 'name',
				header: () => 'Nomi',
				cell: (row) => row.name,
			},
			{
				key: 'description',
				header: () => 'Tavsif',
				cell: (row) => row.description || '-',
			},
			{
				key: 'category',
				header: () => 'Kategoriya',
				cell: (row) => renderCategory(row.category),
			},
			{
				key: 'hasFormulas',
				header: () => 'Formulalar',
				cell: (row) => (
					<div className='flex items-center gap-2'>
						{row.hasFormulas ? (
							<Badge variant='outline' className='border-green-600 text-green-700'>
								<FlaskConical className='h-3 w-3 mr-1' /> LaTeX
							</Badge>
						) : (
							<Badge variant='secondary' className='text-muted-foreground'>
								Yo'q
							</Badge>
						)}
					</div>
				),
			},
			{
				key: 'teachers',
				header: () => "O'qituvchilar",
				cell: (row) => (
					<div className='flex flex-wrap gap-1'>
						{row.teachers && row.teachers.length > 0 ? (
							<>
								{row.teachers.slice(0, 2).map((t) => (
									<Badge key={t.id} variant='secondary' className='text-xs'>
										{t.firstName} {t.lastName}
									</Badge>
								))}
								{row.teachers.length > 2 && (
									<Badge variant='outline' className='text-xs'>
										+{row.teachers.length - 2}
									</Badge>
								)}
							</>
						) : (
							<Badge variant='outline' className='text-xs text-muted-foreground'>
								Biriktirilmagan
							</Badge>
						)}
					</div>
				),
			},
			{
				key: 'createdAt',
				header: () => 'Yaratilgan sana',
				cell: (row) => (
					<div className='leading-tight'>
						<div className='font-medium'>{moment(row.createdAt).format('DD.MM.YYYY')}</div>
						<div className='text-xs text-muted-foreground'>{moment(row.createdAt).fromNow()}</div>
					</div>
				),
			},
			{
				key: 'actions',
				header: () => 'Amallar',
				cell: (row) => (
					<div className='flex items-center gap-2'>
						<Button asChild variant='default' size='sm' className='bg-green-600 hover:bg-green-700'>
							<Link href={`/account/subject/${row.id}/tests`}>
								<Eye className='h-4 w-4 mr-1' />
								Ko'rish
							</Link>
						</Button>

						{user && (user.role === 'admin' || user.role === 'superadmin') && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant='ghost' size='sm' className='h-8 px-2'>
										<MoreHorizontal className='h-4 w-4' />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='end' className='w-48'>
									<DropdownMenuItem onClick={() => openViewTeachersDialog(row)}>
										<Users className='mr-2 h-4 w-4' />
										O'qituvchilarni ko'rish
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => openAssignDialog(row.id)}>
										<Users className='mr-2 h-4 w-4' />
										O'qituvchi biriktirish
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() => {
											setEditingSubject(row);
											setSubjectModalOpen(true);
										}}
									>
										<Pencil className='mr-2 h-4 w-4' />
										Tahrirlash
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => {
											setDeletingSubject({ id: row.id, name: row.name });
											setDeleteDialogOpen(true);
										}}
										className='text-destructive focus:text-destructive'
									>
										<Trash2 className='mr-2 h-4 w-4' />
										O'chirish
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				),
			},
		];
	}, [user, openAssignDialog, mutate]);

	const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
	const isTeacher = user?.role === 'teacher';

	if (isLoading || !user) {
		return <PageLoader title='Fanlar yuklanmoqda...' />;
	}

	return (
		<>
			<Card className='bg-gradient-card border-0'>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div>
							<CardTitle className='flex items-center gap-2'>
								<BookOpen className='h-5 w-5' />
								{isTeacher ? 'Mening fanlarim' : 'Fanlar'}
							</CardTitle>
							<CardDescription>
								{isTeacher
									? "Sizga biriktirilgan fanlar ro'yxati"
									: "Markazingizga tegishli barcha fanlar ro'yxati"}
							</CardDescription>
						</div>
						{isAdmin && (
							<Button
								onClick={() => {
									setEditingSubject(null);
									setSubjectModalOpen(true);
								}}
								className='bg-gradient-to-r from-primary to-secondary'
							>
								Yangi fan qo'shish
							</Button>
						)}
					</div>
				</CardHeader>

				<CardContent>
					{subjects.length === 0 ? (
						<div className='text-center py-12'>
							<BookOpen className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
							<h3 className='text-lg font-semibold mb-2'>
								{isTeacher ? "Sizga hali fanlar biriktirilmagan" : 'Fanlar mavjud emas'}
							</h3>
							<p className='text-muted-foreground'>
								{isTeacher
									? 'Admin sizga fan biriktirguncha kuting'
									: 'Birinchi fanni yarating'}
							</p>
						</div>
					) : (
						<div className='rounded-lg border bg-card/50 backdrop-blur overflow-x-scroll'>
							<DataTable columns={columns} data={subjects} />
						</div>
					)}
				</CardContent>
			</Card>

			{/* Assign Teachers Dialog */}
			<Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>Teacher'larni biriktirish</DialogTitle>
						<DialogDescription>
							Fanga teacher'larni tanlang va biriktiring
						</DialogDescription>
					</DialogHeader>
					<div className='space-y-4 py-4'>
						<div className='max-h-64 overflow-auto border rounded-lg p-3 space-y-2'>
							{teachers.length === 0 ? (
								<p className='text-sm text-muted-foreground text-center py-4'>
									Teacher'lar topilmadi
								</p>
							) : (
								teachers.map((teacher) => (
									<label
										key={teacher.id}
										className='flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer'
									>
										<Checkbox
											checked={selectedTeacherIds.includes(teacher.id)}
											onCheckedChange={(checked) => {
												if (checked) {
													setSelectedTeacherIds([...selectedTeacherIds, teacher.id]);
												} else {
													setSelectedTeacherIds(
														selectedTeacherIds.filter((id) => id !== teacher.id),
													);
												}
											}}
										/>
										<span className='text-sm font-medium'>
											{teacher.firstName} {teacher.lastName}
										</span>
									</label>
								))
							)}
						</div>
					</div>
					<DialogFooter>
						<Button variant='outline' onClick={() => setAssignDialogOpen(false)}>
							Bekor qilish
						</Button>
						<Button onClick={handleAssignTeachers} disabled={assigning || selectedTeacherIds.length === 0}>
							{assigning ? 'Biriktirilmoqda...' : 'Biriktirish'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Subject Modal */}
			<SubjectModal
				open={subjectModalOpen}
				setOpen={setSubjectModalOpen}
				defaultValues={
					editingSubject
						? {
								id: editingSubject.id,
								name: editingSubject.name,
								description: editingSubject.description || '',
								category: editingSubject.category || '',
								hasFormulas: editingSubject.hasFormulas || false,
							}
						: undefined
				}
				onSuccess={() => {
					mutate();
					setSubjectModalOpen(false);
					setEditingSubject(null);
				}}
			/>

			{/* Delete Dialog */}
			<DeleteSubjectDialog
				open={deleteDialogOpen}
				setOpen={setDeleteDialogOpen}
				id={deletingSubject?.id}
				name={deletingSubject?.name}
				onSuccess={() => {
					mutate();
					setDeleteDialogOpen(false);
					setDeletingSubject(null);
				}}
			/>

			{/* View Teachers Dialog */}
			<Dialog open={viewTeachersDialogOpen} onOpenChange={setViewTeachersDialogOpen}>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>
							{viewingSubject?.name} - Biriktirilgan o'qituvchilar
						</DialogTitle>
						<DialogDescription>
							Bu fanga biriktirilgan o'qituvchilar ro'yxati
						</DialogDescription>
					</DialogHeader>
					<div className='space-y-4 py-4'>
						{viewingSubject?.teachers && viewingSubject.teachers.length > 0 ? (
							<div className='space-y-2'>
								{viewingSubject.teachers.map((teacher) => (
									<div
										key={teacher.id}
										className='flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors'
									>
										<div className='flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold'>
											{teacher.firstName.charAt(0)}
											{teacher.lastName.charAt(0)}
										</div>
										<div className='flex-1'>
											<p className='font-medium text-sm'>
												{teacher.firstName} {teacher.lastName}
											</p>
											<p className='text-xs text-muted-foreground'>@{teacher.username}</p>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className='text-center py-8'>
								<Users className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
								<p className='text-sm text-muted-foreground'>
									Bu fanga hali o'qituvchi biriktirilmagan
								</p>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant='outline' onClick={() => setViewTeachersDialogOpen(false)}>
							Yopish
						</Button>
						{user && (user.role === 'admin' || user.role === 'superadmin') && (
							<Button
								onClick={() => {
									setViewTeachersDialogOpen(false);
									if (viewingSubject) {
										openAssignDialog(viewingSubject.id);
									}
								}}
							>
								O'qituvchi biriktirish
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
