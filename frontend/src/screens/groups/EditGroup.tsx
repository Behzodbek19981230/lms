'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { request } from '@/configs/request';
import type { SubjectType } from '@/types/subject.type';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Calendar, Clock, BookOpen, Save, Search, X } from 'lucide-react';
import PageLoader from '@/components/PageLoader';
import { Badge } from '@/components/ui/badge';

type UserLite = { id: number; firstName: string; lastName: string; role: string };

const days = [
	{ value: 'monday', label: 'Dushanba' },
	{ value: 'tuesday', label: 'Seshanba' },
	{ value: 'wednesday', label: 'Chorshanba' },
	{ value: 'thursday', label: 'Payshanba' },
	{ value: 'friday', label: 'Juma' },
	{ value: 'saturday', label: 'Shanba' },
	{ value: 'sunday', label: 'Yakshanba' },
];

export default function EditGroupPage() {
	const router = useRouter();
	const params = useParams();
	const { toast } = useToast();
	const groupId = params.id as string;
	const [loading, setLoading] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [subjects, setSubjects] = useState<SubjectType[]>([]);
	const [teachers, setTeachers] = useState<UserLite[]>([]);
	const [students, setStudents] = useState<UserLite[]>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [form, setForm] = useState({
		name: '',
		description: '',
		subjectId: '' as string | '',
		teacherId: '' as string | '',
		studentIds: [] as number[],
		daysOfWeek: [] as string[],
		startTime: '09:00',
		endTime: '10:30',
	});

	useEffect(() => {
		const loadData = async () => {
			try {
				setIsLoading(true);
			const [{ data: groupsRes }, { data: subjectsRes }, { data: teachersRes }, { data: studentsRes }] = await Promise.all([
				request.get('/groups/me'),
				request.get('/subjects'),
				request.get('/users', { params: { role: 'teacher' } }),
				request.get('/users', { params: { role: 'student' } }),
			]);

			const group = (groupsRes || []).find((g: any) => g.id === Number(groupId));
			if (!group) {
				toast({
					title: 'Xatolik',
					description: 'Guruh topilmadi',
					variant: 'destructive',
				});
				router.push('/account/groups');
				return;
			}

			setForm({
				name: group.name || '',
				description: group.description || '',
				subjectId: group.subjectId ? String(group.subjectId) : '',
				teacherId: group.teacherId ? String(group.teacherId) : '',
				studentIds: group.studentIds || [],
				daysOfWeek: group.daysOfWeek || [],
				startTime: group.startTime || '09:00',
				endTime: group.endTime || '10:30',
			});

			setSubjects(subjectsRes || []);
			setTeachers((teachersRes || []).filter((u: any) => u.role === 'teacher'));
			setStudents((studentsRes || []).filter((u: any) => u.role === 'student'));
			} catch (error: any) {
				toast({
					title: 'Xatolik',
					description: error?.response?.data?.message || "Ma'lumotlarni yuklab bo'lmadi",
					variant: 'destructive',
				});
			} finally {
				setIsLoading(false);
			}
		};
		if (groupId) {
			loadData();
		}
	}, [groupId, router, toast]);

	const selectedCount = form.studentIds.length;
	const canSubmit = form.name && form.subjectId && form.teacherId && form.daysOfWeek.length > 0 && form.startTime && form.endTime;

	// Filter students based on search term
	const filteredStudents = students.filter((student) => {
		const searchLower = searchTerm.toLowerCase();
		return (
			student.firstName.toLowerCase().includes(searchLower) ||
			student.lastName.toLowerCase().includes(searchLower) ||
			`${student.firstName} ${student.lastName}`.toLowerCase().includes(searchLower)
		);
	});

	const handleSubmit = async () => {
		if (!canSubmit) return;
		setLoading(true);
		try {
			await request.patch(`/groups/${groupId}`, {
				name: form.name,
				description: form.description || undefined,
				subjectId: Number(form.subjectId),
				teacherId: Number(form.teacherId),
				studentIds: form.studentIds,
				daysOfWeek: form.daysOfWeek,
				startTime: form.startTime,
				endTime: form.endTime,
			});

			toast({
				title: 'Muvaffaqiyatli',
				description: 'Guruh ma\'lumotlari yangilandi.',
			});
			router.push('/account/groups');
		} catch (error: any) {
			toast({
				title: 'Xatolik',
				description: error?.response?.data?.message || "Guruhni yangilab bo'lmadi",
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	if (isLoading) {
		return <PageLoader title="Ma'lumotlar yuklanmoqda..." fullscreen={false} className="rounded-lg" />;
	}

	return (
		<div className="max-w-5xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" onClick={() => router.back()}>
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<div>
					<h1 className="text-3xl font-bold">Guruhni tahrirlash</h1>
					<p className="text-muted-foreground mt-1">Guruh ma'lumotlarini yangilang</p>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Form */}
				<div className="lg:col-span-2 space-y-6">
					{/* Basic Information */}
					<Card className="border-border">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<BookOpen className="h-5 w-5" />
								Asosiy ma'lumotlar
							</CardTitle>
							<CardDescription>Guruhning asosiy ma'lumotlarini kiriting</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="name">Guruh nomi *</Label>
								<Input
									id="name"
									value={form.name}
									onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
									placeholder="Masalan: Matematika 1-guruh"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="description">Tavsif</Label>
								<Textarea
									id="description"
									value={form.description}
									onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
									placeholder="Guruh haqida qo'shimcha ma'lumot..."
									rows={3}
									className="resize-none"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="subject">Fan *</Label>
								<Select
									value={form.subjectId}
									onValueChange={(v) => setForm((p) => ({ ...p, subjectId: v }))}
								>
									<SelectTrigger id="subject">
										<SelectValue placeholder="Fan tanlang" />
									</SelectTrigger>
									<SelectContent>
										{subjects.map((s) => (
											<SelectItem key={s.id} value={String(s.id)}>
												{s.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="teacher">O'qituvchi *</Label>
								<Select
									value={form.teacherId}
									onValueChange={(v) => setForm((p) => ({ ...p, teacherId: v }))}
								>
									<SelectTrigger id="teacher">
										<SelectValue placeholder="O'qituvchi tanlang" />
									</SelectTrigger>
									<SelectContent>
										{teachers.map((t) => (
											<SelectItem key={t.id} value={String(t.id)}>
												{t.firstName} {t.lastName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>

					{/* Schedule */}
					<Card className="border-border">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Calendar className="h-5 w-5" />
								Dars jadvali
							</CardTitle>
							<CardDescription>Dars kunlari va vaqtini belgilang</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label>Kunlar *</Label>
								<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
									{days.map((d) => (
										<label
											key={d.value}
											className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
										>
											<Checkbox
												checked={form.daysOfWeek.includes(d.value)}
												onCheckedChange={(v) => {
													setForm((p) => ({
														...p,
														daysOfWeek: v
															? [...p.daysOfWeek, d.value]
															: p.daysOfWeek.filter((x) => x !== d.value),
													}));
												}}
											/>
											<span className="text-sm font-medium">{d.label}</span>
										</label>
									))}
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="startTime" className="flex items-center gap-2">
										<Clock className="h-4 w-4" />
										Boshlanish vaqti *
									</Label>
									<Input
										id="startTime"
										type="time"
										value={form.startTime}
										onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="endTime" className="flex items-center gap-2">
										<Clock className="h-4 w-4" />
										Tugash vaqti *
									</Label>
									<Input
										id="endTime"
										type="time"
										value={form.endTime}
										onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
									/>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Students */}
					<Card className="border-border">
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="flex items-center gap-2">
										<Users className="h-5 w-5" />
										O'quvchilar
									</CardTitle>
									<CardDescription className="mt-1">
										Guruhga o'quvchilarni qo'shing
									</CardDescription>
								</div>
								{selectedCount > 0 && (
									<Badge variant="default" className="text-sm px-3 py-1">
										{selectedCount} tanlandi
									</Badge>
								)}
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Search */}
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="O'quvchi qidirish..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-9 pr-9"
								/>
								{searchTerm && (
									<button
										onClick={() => setSearchTerm('')}
										className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
									>
										<X className="h-4 w-4" />
									</button>
								)}
							</div>

							{/* Selected Count Info */}
							{selectedCount > 0 && (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<span>Tanlangan:</span>
									<Badge variant="secondary">{selectedCount}</Badge>
									<span>Jami:</span>
									<Badge variant="outline">{students.length}</Badge>
								</div>
							)}

							{/* Students List */}
							<div className="max-h-[400px] overflow-auto border rounded-lg p-3 space-y-1">
								{filteredStudents.length === 0 ? (
									<p className="text-sm text-muted-foreground text-center py-8">
										{searchTerm ? 'Qidiruv bo\'yicha o\'quvchi topilmadi' : 'O\'quvchilar topilmadi'}
									</p>
								) : (
									filteredStudents.map((st) => {
										const isSelected = form.studentIds.includes(st.id);
										return (
											<label
												key={st.id}
												className={`flex items-center gap-3 p-2.5 rounded-md transition-colors cursor-pointer ${
													isSelected
														? 'bg-primary/10 border border-primary/20'
														: 'hover:bg-muted/50 border border-transparent'
												}`}
											>
												<Checkbox
													checked={isSelected}
													onCheckedChange={(v) =>
														setForm((p) => ({
															...p,
															studentIds: v
																? [...p.studentIds, st.id]
																: p.studentIds.filter((id) => id !== st.id),
														}))
													}
												/>
												<span className="text-sm font-medium flex-1">
													{st.firstName} {st.lastName}
												</span>
												{isSelected && (
													<Badge variant="default" className="text-xs">
														Tanlangan
													</Badge>
												)}
											</label>
										);
									})
								)}
							</div>

							{/* Quick Actions */}
							{students.length > 0 && (
								<div className="flex items-center gap-2 pt-2 border-t">
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											if (form.studentIds.length === filteredStudents.length) {
												// Deselect all filtered
												setForm((p) => ({
													...p,
													studentIds: p.studentIds.filter(
														(id) => !filteredStudents.some((s) => s.id === id),
													),
												}));
											} else {
												// Select all filtered
												const newIds = [
													...form.studentIds,
													...filteredStudents
														.filter((s) => !form.studentIds.includes(s.id))
														.map((s) => s.id),
												];
												setForm((p) => ({ ...p, studentIds: newIds }));
											}
										}}
										className="text-xs"
									>
										{form.studentIds.length === filteredStudents.length &&
										filteredStudents.length > 0
											? 'Barchasini bekor qilish'
											: 'Barchasini tanlash'}
									</Button>
									{selectedCount > 0 && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setForm((p) => ({ ...p, studentIds: [] }))}
											className="text-xs text-destructive hover:text-destructive"
										>
											Barchasini tozalash
										</Button>
									)}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Sidebar - Actions */}
				<div className="lg:col-span-1">
					<Card className="border-border sticky top-6">
						<CardHeader>
							<CardTitle>Amallar</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<Button
								className="w-full"
								variant="hero"
								disabled={!canSubmit || loading}
								onClick={handleSubmit}
							>
								<Save className="h-4 w-4 mr-2" />
								{loading ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash'}
							</Button>
							<Button
								className="w-full"
								variant="outline"
								onClick={() => router.back()}
								disabled={loading}
							>
								Bekor qilish
							</Button>
							<div className="pt-4 border-t space-y-2">
								<p className="text-xs text-muted-foreground">
									* Belgilangan maydonlar to'ldirilishi shart
								</p>
								{!canSubmit && (
									<p className="text-xs text-destructive">
										Iltimos, barcha majburiy maydonlarni to'ldiring
									</p>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
