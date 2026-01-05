import React, { useEffect, useMemo, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { CheckCircle, ClipboardList, Loader2, Save, X } from 'lucide-react';

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
}

interface TasksModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	groups: Group[];
}

export default function TasksModal({ isOpen, onClose, onSuccess, groups }: TasksModalProps) {
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);
	const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
	const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
	const [students, setStudents] = useState<Student[]>([]);
	const [notDoneIds, setNotDoneIds] = useState<Set<number>>(new Set());

	const selectedGroup = useMemo(
		() => groups.find((g) => g.id === selectedGroupId),
		[groups, selectedGroupId]
	);

	useEffect(() => {
		if (!selectedGroupId) return;
		void loadGroupData(selectedGroupId, selectedDate);
	}, [selectedGroupId]);

	useEffect(() => {
		if (!selectedGroupId) return;
		void loadNotDoneForDate(selectedGroupId, selectedDate);
	}, [selectedDate]);

	const loadGroupData = async (groupId: number, date: string) => {
		try {
			setLoading(true);
			const [studentsRes] = await Promise.all([
				request.get(`/groups/${groupId}/students`),
			]);
			const studentsData = studentsRes.data || [];
			setStudents(studentsData);
			await loadNotDoneForDate(groupId, date);
		} catch (error: any) {
			console.error('Error loading tasks modal data:', error);
			toast({
				title: 'Xato',
				description: "Ma'lumotlarni yuklab olishda xatolik",
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	const loadNotDoneForDate = async (groupId: number, date: string) => {
		try {
			setLoading(true);
			const res = await request.get(`/tasks/not-done/${groupId}`, {
				params: { date },
			});
			const ids: number[] = Array.isArray(res.data) ? res.data : [];
			setNotDoneIds(new Set(ids.map((id) => Number(id)).filter((id) => !Number.isNaN(id))));
		} catch (error: any) {
			// If endpoint fails, default to empty (everyone did the task)
			setNotDoneIds(new Set());
		} finally {
			setLoading(false);
		}
	};

	const toggleNotDone = (studentId: number) => {
		setNotDoneIds((prev) => {
			const next = new Set(prev);
			if (next.has(studentId)) next.delete(studentId);
			else next.add(studentId);
			return next;
		});
	};

	const handleSubmit = async () => {
		if (!selectedGroupId || !selectedDate) {
			toast({
				title: 'Xato',
				description: 'Guruh va sanani tanlang',
				variant: 'destructive',
			});
			return;
		}

		try {
			setLoading(true);
			await request.post('/tasks/bulk', {
				groupId: selectedGroupId,
				date: selectedDate,
				notDoneStudentIds: Array.from(notDoneIds),
			});

			toast({
				title: 'Muvaffaqiyat',
				description: 'Vazifa holati saqlandi (Telegramga yuborildi)',
			});

			onSuccess();
			handleClose();
		} catch (error: any) {
			console.error('Error saving tasks:', error);
			toast({
				title: 'Xato',
				description: error.response?.data?.message || 'Saqlashda xatolik',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		setSelectedGroupId(null);
		setSelectedDate(new Date().toISOString().split('T')[0]);
		setStudents([]);
		setNotDoneIds(new Set());
		onClose();
	};

	const notDoneCount = students.filter((s) => notDoneIds.has(s.id)).length;
	const doneCount = students.length - notDoneCount;

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center">
						<ClipboardList className="h-5 w-5 mr-2" />
						Vazifa
					</DialogTitle>
					<DialogDescription>
						Guruh tanlang va bajarmaganlarni belgilang (saqlanganda Telegram kanalga yuboriladi)
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
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

					{selectedGroupId && students.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Statistika</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-2 gap-4">
									<div className="text-center">
										<div className="flex items-center justify-center mb-1">
											<CheckCircle className="h-4 w-4 text-green-600 mr-1" />
											<span className="font-semibold text-green-600">{doneCount}</span>
										</div>
										<p className="text-xs text-muted-foreground">Bajardi</p>
									</div>
									<div className="text-center">
										<div className="flex items-center justify-center mb-1">
											<X className="h-4 w-4 text-red-600 mr-1" />
											<span className="font-semibold text-red-600">{notDoneCount}</span>
										</div>
										<p className="text-xs text-muted-foreground">Bajarmadi</p>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{selectedGroupId && (
						<Card>
							<CardHeader>
								<CardTitle className="text-lg flex items-center">
									<ClipboardList className="h-4 w-4 mr-2" />
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
										<span className="text-sm text-muted-foreground">Yuklanmoqda...</span>
									</div>
								) : students.length === 0 ? (
									<div className="text-sm text-muted-foreground">Talabalar topilmadi</div>
								) : (
									<div className="space-y-3">
										{students.map((student) => {
											const isNotDone = notDoneIds.has(student.id);
											return (
												<div
													key={student.id}
													className="flex items-center justify-between p-3 border border-border rounded-lg"
												>
													<div className="flex-1">
														<p className="font-medium">
															{student.firstName} {student.lastName}
														</p>
														<p className="text-sm text-muted-foreground">@{student.username}</p>
													</div>
													<div className="flex items-center gap-3">
														<Badge
															variant="outline"
															className={
																isNotDone
																	? 'bg-red-100 text-red-800 border-red-200'
																	: 'bg-green-100 text-green-800 border-green-200'
															}
														>
															{isNotDone ? 'Bajarmadi' : 'Bajardi'}
														</Badge>
														<Switch checked={isNotDone} onCheckedChange={() => toggleNotDone(student.id)} />
													</div>
												</div>
											);
										})}
									</div>
								)}
							</CardContent>
						</Card>
					)}

					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={handleClose} disabled={loading}>
							Bekor qilish
						</Button>
						<Button onClick={handleSubmit} disabled={loading || !selectedGroupId}>
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
							) : (
								<Save className="h-4 w-4 mr-2" />
							)}
							Saqlash
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
