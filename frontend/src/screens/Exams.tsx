import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Plus,
	Edit,
	Trash2,
	FileText,
	Clock,
	Users,
	Eye,
	Download,
	Play,
	Pause,
	CheckCircle,
	AlertCircle,
	Archive,
	Calendar,
	BookOpen,
	Settings,
	FileSpreadsheet,
	MessageCircle,
} from 'lucide-react';
import { request } from '@/configs/request';
import { useAuth } from '@/contexts/AuthContext';
import { telegramService } from '@/services/telegram.service';
import { useToast } from '@/components/ui/use-toast';
import moment from 'moment';
import PageLoader from '@/components/PageLoader';

interface Exam {
	id: number;
	title: string;
	description?: string;
	type: 'single_subject' | 'block';
	status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
	examDate: string;
	startTime?: string;
	endTime?: string;
	duration: number;
	shuffleQuestions: boolean;
	shuffleAnswers: boolean;
	variantsPerStudent: number;
	settings?: {
		allowCalculator?: boolean;
		allowNotes?: boolean;
		showTimer?: boolean;
		autoSubmit?: boolean;
	};
	groups: Group[];
	subjects: Subject[];
	variants: ExamVariant[];
	totalStudents: number;
	completedStudents: number;
	totalQuestions: number;
	totalPoints: number;
	createdAt: string;
	updatedAt: string;
}

interface Group {
	id: number;
	name: string;
	description?: string;
	students: User[];
}

interface Subject {
	id: number;
	name: string;
	category: string;
	hasFormulas: boolean;
}

interface User {
	id: number;
	firstName: string;
	lastName: string;
	username: string;
	role: string;
}

interface ExamVariant {
	id: number;
	variantNumber: string;
	status: 'generated' | 'started' | 'in_progress' | 'completed' | 'submitted' | 'graded';
	startedAt?: string;
	completedAt?: string;
	submittedAt?: string;
	score: number;
	totalPoints: number;
	correctAnswers: number;
	totalQuestions: number;
	student: User;
	questionPdfPath?: string;
	answerPdfPath?: string;
	resultPdfPath?: string;
}

export default function ExamsPage() {
	const router = useRouter();
	const { user } = useAuth();
	const { toast } = useToast();

	const [exams, setExams] = useState<Exam[]>([]);
	const [groups, setGroups] = useState<Group[]>([]);
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState('');
	const [startingExamIds, setStartingExamIds] = useState<Set<number>>(new Set());

	// Create exam state
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState({
		title: '',
		description: '',
		type: 'single_subject' as 'single_subject' | 'block',
		examDate: '',
		startTime: '',
		endTime: '',
		duration: 120,
		shuffleQuestions: true,
		shuffleAnswers: true,
		variantsPerStudent: 1,
		settings: {
			allowCalculator: false,
			allowNotes: false,
			showTimer: true,
			autoSubmit: false,
		},
		groupIds: [] as number[],
		subjectIds: [] as number[],
	});

	// No separate generate flow; starting will generate automatically

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		try {
			setIsLoading(true);
			setErrorMessage('');

			const [examsRes, groupsRes, subjectsRes] = await Promise.all([
				request.get('/exams'),
				request.get('/groups/me'),
				request.get('/subjects'),
			]);

			setExams(examsRes.data || []);
			setGroups(groupsRes.data || []);
			setSubjects(subjectsRes.data || []);
		} catch (e: any) {
			setErrorMessage(e?.response?.data?.message || "Ma'lumotlarni yuklab bo'lmadi");
		} finally {
			setIsLoading(false);
		}
	};

	const handleCreateExam = async () => {
		try {
			const examData = {
				...createForm,
				examDate: new Date(createForm.examDate).toISOString(),
				startTime: createForm.startTime ? new Date(createForm.startTime).toISOString() : undefined,
				endTime: createForm.endTime ? new Date(createForm.endTime).toISOString() : undefined,
			};

			const response = await request.post('/exams', examData);
			setExams([response.data, ...exams]);
			setIsCreateDialogOpen(false);
			resetCreateForm();
		} catch (e: any) {
			setErrorMessage(e?.response?.data?.message || "Imtihonni yaratib bo'lmadi");
		}
	};

	const handleStartExam = async (exam: Exam) => {
		if (!exam.groups || exam.groups.length === 0) {
			toast({
				title: 'Guruhlar topilmadi',
				description: 'Imtihonni boshlash uchun kamida bitta guruh kerak',
				variant: 'destructive',
			});
			return;
		}

		setStartingExamIds((prev) => new Set(prev).add(exam.id));
		try {
			// 1) Generate tests for all students in linked groups (also handles Telegram distribution)
			const groupIds = exam.groups.map((g) => g.id);
			await request.post(`/exams/${exam.id}/generate-for-groups`, { groupIds });

			// 2) Move exam to in_progress
			await handleUpdateExamStatus(exam.id, 'in_progress');
		} catch (e: any) {
			const msg =
				e?.response?.data?.message || 'Boshlashda xatolik: test yaratish yoki holatni yangilash amalga oshmadi';
			setErrorMessage(msg);
			toast({ title: 'Xatolik', description: msg, variant: 'destructive' });
		} finally {
			setStartingExamIds((prev) => {
				const n = new Set(prev);
				n.delete(exam.id);
				return n;
			});
		}
	};

	const handleUpdateExamStatus = async (examId: number, status: string) => {
		try {
			// Find the exam to get group information
			const exam = exams.find((e) => e.id === examId);

			// Update the exam status first
			const response = await request.put(`/exams/${examId}/status`, { status });
			setExams(exams.map((exam) => (exam.id === examId ? response.data : exam)));

			// Send Telegram notifications when exam starts
			if (status === 'in_progress' && exam && exam.groups.length > 0) {
				try {
					const groupIds = exam.groups.map((group) => group.id);
					const notificationResult = await telegramService.notifyExamStart(examId, groupIds);

					if (notificationResult.success) {
						toast({
							title: 'Imtihon boshlandi!',
							description: `Telegram orqali ${
								notificationResult.sentCount || 0
							} ta o'quvchiga xabar yuborildi.`,
							variant: 'default',
						});
					} else {
						toast({
							title: 'Imtihon boshlandi',
							description: `Telegram xabari yuborishda muammo: ${notificationResult.message}`,
							variant: 'default',
						});
					}
				} catch (notificationError: any) {
					// Don't fail the exam start if notification fails
					console.error('Telegram notification failed:', notificationError);
					toast({
						title: 'Imtihon boshlandi',
						description: 'Telegram xabari yuborishda xatolik yuz berdi, ammo imtihon boshlandi.',
						variant: 'default',
					});
				}
			} else if (status === 'completed' && exam && exam.groups.length > 0) {
				// Optionally notify when exam ends
				try {
					const groupIds = exam.groups.map((group) => group.id);
					await telegramService.notifyExamEnd(examId, groupIds);
					toast({
						title: 'Imtihon tugallandi',
						description: "O'quvchilarga Telegram orqali xabar yuborildi.",
						variant: 'default',
					});
				} catch (notificationError) {
					console.error('End notification failed:', notificationError);
					toast({
						title: 'Imtihon tugallandi',
						description: 'Imtihon tugallandi.',
						variant: 'default',
					});
				}
			} else {
				// Regular status update without notifications
				toast({
					title: 'Imtihon holati yangilandi',
					description: `Imtihon holati "${getStatusText(status)}" ga o'zgartirildi.`,
					variant: 'default',
				});
			}
		} catch (e: any) {
			setErrorMessage(e?.response?.data?.message || "Imtihon holatini yangilab bo'lmadi");
			toast({
				title: 'Xatolik',
				description: e?.response?.data?.message || "Imtihon holatini yangilab bo'lmadi",
				variant: 'destructive',
			});
		}
	};

	const handleDeleteExam = async (examId: number) => {
		if (!confirm("Bu imtihonni o'chirishni xohlaysizmi?")) return;

		try {
			await request.delete(`/exams/${examId}`);
			setExams(exams.filter((exam) => exam.id !== examId));
			toast({ title: "O'chirildi", description: "Imtihon muvaffaqiyatli o'chirildi." });
		} catch (e: any) {
			const msg = e?.response?.data?.message || "Imtihonni o'chirib bo'lmadi";
			setErrorMessage(msg);
			toast({ title: 'Xatolik', description: msg, variant: 'destructive' });
		}
	};

	const handleGenerateExamForGroups = async (exam: Exam) => {
		if (!exam.groups || exam.groups.length === 0) {
			toast({
				title: 'Guruhlar topilmadi',
				description: 'Bu imtihonda guruhlar mavjud emas',
				variant: 'destructive',
			});
			return;
		}

		if (
			!confirm(
				`"${
					exam.title
				}" imtihoni uchun barcha o'quvchilarga testlar yaratilsin va Telegram orqali yuborilsinmi?\n\nGuruhlar: ${exam.groups
					.map((g) => g.name)
					.join(', ')}\nO'quvchilar soni: ${exam.totalStudents}`
			)
		) {
			return;
		}

		try {
			toast({
				title: 'Testlar yaratilmoqda...',
				description: 'Iltimos kuting, bu biroz vaqt olishi mumkin.',
			});

			const groupIds = exam.groups.map((g) => g.id);
			const response = await request.post(`/exams/${exam.id}/generate-for-groups`, {
				groupIds,
			});

			const result = response.data;

			if (result.success) {
				toast({
					title: 'Testlar yaratildi! ✅',
					description: `${result.testsGenerated} ta test yaratildi, ${result.telegramSent} ta Telegram orqali yuborildi.`,
					variant: 'default',
				});

				// Reload data to show updated variants
				await loadData();
			} else {
				toast({
					title: 'Xatolik yuz berdi',
					description: result.message || 'Testlarni yaratishda xatolik',
					variant: 'destructive',
				});
			}
		} catch (e: any) {
			const msg = e?.response?.data?.message || 'Testlarni yaratishda xatolik yuz berdi';
			toast({
				title: 'Xatolik',
				description: msg,
				variant: 'destructive',
			});
		}
	};

	const resetCreateForm = () => {
		setCreateForm({
			title: '',
			description: '',
			type: 'single_subject' as 'single_subject' | 'block',
			examDate: '',
			startTime: '',
			endTime: '',
			duration: 120,
			shuffleQuestions: true,
			shuffleAnswers: true,
			variantsPerStudent: 1,
			settings: {
				allowCalculator: false,
				allowNotes: false,
				showTimer: true,
				autoSubmit: false,
			},
			groupIds: [],
			subjectIds: [],
		});
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'draft':
				return <AlertCircle className='h-4 w-4 text-yellow-500' />;
			case 'scheduled':
				return <Calendar className='h-4 w-4 text-blue-500' />;
			case 'in_progress':
				return <Play className='h-4 w-4 text-green-500' />;
			case 'completed':
				return <CheckCircle className='h-4 w-4 text-green-600' />;
			case 'cancelled':
				return <Archive className='h-4 w-4 text-gray-500' />;
			default:
				return <AlertCircle className='h-4 w-4' />;
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case 'draft':
				return 'Qoralama';
			case 'scheduled':
				return 'Rejalashtirilgan';
			case 'in_progress':
				return 'Jarayonda';
			case 'completed':
				return 'Tugallangan';
			case 'cancelled':
				return 'Bekor qilingan';
			default:
				return status;
		}
	};

	const getTypeText = (type: string) => {
		switch (type) {
			case 'single_subject':
				return 'Bitta fan';
			case 'block':
				return 'Blok test';
			default:
				return type;
		}
	};

	if (isLoading) {
		return <PageLoader title='Imtihonlar yuklanmoqda...' />;
	}

	if (errorMessage) {
		return (
			<div className='min-h-screen bg-gradient-subtle flex items-center justify-center'>
				<div className='text-center'>
					<div className='text-lg text-destructive'>{errorMessage}</div>
					<Button onClick={() => router.back()} className='mt-4'>
						Orqaga qaytish
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gradient-subtle'>
			{/* Header */}
			<header className='bg-card border-b border-border p-3 sm:p-4 md:p-6'>
				<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4'>
					<div>
						<h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-foreground'>Imtihonlar</h1>
						<p className='text-xs sm:text-sm text-muted-foreground'>
							Imtihonlarni boshqarish va variantlar generatsiya qilish
						</p>
					</div>
					<div className='flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto'>
						<Button
							variant='outline'
							size='sm'
							onClick={() => router.push('/account/test-generator')}
							className='flex-1 sm:flex-initial'
						>
							<FileText className='h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2' />
							<span className='text-xs sm:text-sm'>Test generatsiya</span>
						</Button>
						<Button
							variant='hero'
							size='sm'
							onClick={() => setIsCreateDialogOpen(true)}
							className='flex-1 sm:flex-initial'
						>
							<Plus className='h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2' />
							<span className='text-xs sm:text-sm'>Yangi imtihon</span>
						</Button>
					</div>
				</div>
			</header>

			<div className='p-3 sm:p-4 md:p-6'>
				{/* Stats */}
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6'>
					<Card className='border-border'>
						<CardContent className='p-4 sm:p-5 md:p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-xs sm:text-sm text-muted-foreground'>Jami imtihonlar</p>
									<p className='text-xl sm:text-2xl font-bold'>{exams.length}</p>
								</div>
								<BookOpen className='h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-500' />
							</div>
						</CardContent>
					</Card>

					<Card className='border-border'>
						<CardContent className='p-4 sm:p-5 md:p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-xs sm:text-sm text-muted-foreground'>Faol imtihonlar</p>
									<p className='text-xl sm:text-2xl font-bold'>
										{exams.filter((e) => e.status === 'in_progress').length}
									</p>
								</div>
								<Play className='h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-500' />
							</div>
						</CardContent>
					</Card>

					<Card className='border-border'>
						<CardContent className='p-4 sm:p-5 md:p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-xs sm:text-sm text-muted-foreground'>Tugallangan</p>
									<p className='text-xl sm:text-2xl font-bold'>
										{exams.filter((e) => e.status === 'completed').length}
									</p>
								</div>
								<CheckCircle className='h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-600' />
							</div>
						</CardContent>
					</Card>

					<Card className='border-border'>
						<CardContent className='p-4 sm:p-5 md:p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-xs sm:text-sm text-muted-foreground'>Jami o'quvchilar</p>
									<p className='text-xl sm:text-2xl font-bold'>
										{exams.reduce((sum, exam) => sum + exam.totalStudents, 0)}
									</p>
								</div>
								<Users className='h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-purple-500' />
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Exams List */}
				<div className='space-y-4'>
					<div className='flex items-center justify-between'>
						<h2 className='text-2xl font-bold text-foreground'>Imtihonlar ro'yxati</h2>
						<Badge variant='outline'>{exams.length} imtihon</Badge>
					</div>

					{exams.length === 0 ? (
						<Card className='border-border'>
							<CardContent className='flex flex-col items-center justify-center py-12'>
								<BookOpen className='h-12 w-12 text-muted-foreground mb-4' />
								<h3 className='text-lg font-medium text-foreground mb-2'>Imtihonlar mavjud emas</h3>
								<p className='text-muted-foreground mb-4'>Hali imtihon yaratilmagan</p>
								<Button onClick={() => setIsCreateDialogOpen(true)}>
									<Plus className='h-4 w-4 mr-2' />
									Birinchi imtihonni yarating
								</Button>
							</CardContent>
						</Card>
					) : (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
							{exams.map((exam) => (
								<Card key={exam.id} className='border-border hover:shadow-md transition-shadow'>
									<CardHeader>
										<div className='flex items-start justify-between'>
											<div className='flex items-center space-x-2'>
												{getStatusIcon(exam.status)}
												<Badge variant='outline' className='text-xs'>
													{getStatusText(exam.status)}
												</Badge>
											</div>
											<div className='flex items-center space-x-2'>
												{exam.status === 'draft' && (
													<Button
														variant='ghost'
														size='sm'
														onClick={() => handleDeleteExam(exam.id)}
														className='text-destructive hover:text-destructive'
														title="O'chirish"
													>
														<Trash2 className='h-4 w-4' />
													</Button>
												)}
											</div>
										</div>
										<CardTitle className='text-lg text-card-foreground line-clamp-2'>
											{exam.title}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className='text-sm text-muted-foreground mb-4 line-clamp-2'>
											{exam.description || 'Tavsif mavjud emas'}
										</p>

										<div className='space-y-2 mb-4'>
											<div className='flex items-center justify-between text-sm'>
												<span className='text-muted-foreground'>Turi:</span>
												<Badge variant='secondary'>{getTypeText(exam.type)}</Badge>
											</div>
											<div className='flex items-center justify-between text-sm'>
												<span className='text-muted-foreground'>Sana:</span>
												<span>{moment(exam.examDate).format('DD.MM.YYYY')}</span>
											</div>
											<div className='flex items-center justify-between text-sm'>
												<span className='text-muted-foreground'>Davomiyligi:</span>
												<span className='flex items-center'>
													<Clock className='h-3 w-3 mr-1' />
													{exam.duration} daqiqa
												</span>
											</div>
											<div className='flex items-center justify-between text-sm'>
												<span className='text-muted-foreground'>O'quvchilar:</span>
												<span className='flex items-center'>
													<Users className='h-3 w-3 mr-1' />
													{exam.totalStudents}
												</span>
											</div>
											<div className='flex items-center justify-between text-sm'>
												<span className='text-muted-foreground'>Fanlar:</span>
												<span>{exam.subjects?.length ?? 0}</span>
											</div>
											<div className='flex items-center justify-between text-sm'>
												<span className='text-muted-foreground'>Guruhlar:</span>
												<span>{exam.groups?.length ?? 0}</span>
											</div>
										</div>

										<div className='flex items-center justify-between text-xs text-muted-foreground mb-4'>
											<span>Yaratilgan: {moment(exam.createdAt).format('DD.MM.YYYY')}</span>
											<div className='flex items-center space-x-2'>
												{exam.shuffleAnswers && <Settings className='h-3 w-3' />}
											</div>
										</div>

										<div className='flex space-x-2'>
											<Button
												variant='outline'
												size='sm'
												className='flex-1'
												onClick={() => router.push(`/account/exams/${exam.id}`)}
											>
												<Eye className='h-4 w-4 mr-2' />
												Ko'rish
											</Button>
										</div>

										{/* Status Actions */}
										{(exam.status === 'draft' || exam.status === 'scheduled') && (
											<div className='mt-2'>
												<Button
													size='sm'
													className='w-full'
													onClick={() => handleStartExam(exam)}
													disabled={startingExamIds.has(exam.id)}
												>
													<Play className='h-4 w-4 mr-2' />
													{startingExamIds.has(exam.id) ? 'Boshlanmoqda...' : 'Boshlash'}
												</Button>
											</div>
										)}

										{exam.status === 'in_progress' && (
											<div className='mt-2'>
												<Button
													size='sm'
													className='w-full'
													onClick={() => handleUpdateExamStatus(exam.id, 'completed')}
												>
													<CheckCircle className='h-4 w-4 mr-2' />
													Tugatish
												</Button>
											</div>
										)}
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Create Exam Dialog */}
			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>Yangi imtihon yaratish</DialogTitle>
					</DialogHeader>

					<div className='space-y-4'>
						<div>
							<Label htmlFor='title'>Imtihon nomi</Label>
							<Input
								id='title'
								value={createForm.title}
								onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
								placeholder='Imtihon nomini kiriting'
							/>
						</div>

						<div>
							<Label htmlFor='description'>Tavsif</Label>
							<Textarea
								id='description'
								value={createForm.description}
								onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
								placeholder='Imtihon tavsifini kiriting'
								rows={3}
							/>
						</div>

						<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
							<div>
								<Label htmlFor='type'>Imtihon turi</Label>
								<Select
									value={createForm.type}
									onValueChange={(value) =>
										setCreateForm({ ...createForm, type: value as 'single_subject' | 'block' })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='single_subject'>Bitta fan</SelectItem>
										<SelectItem value='block'>Blok test</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label htmlFor='duration'>Davomiyligi (daqiqa)</Label>
								<Input
									id='duration'
									type='number'
									value={createForm.duration}
									onChange={(e) =>
										setCreateForm({ ...createForm, duration: parseInt(e.target.value) })
									}
									min='30'
									max='300'
								/>
							</div>
						</div>

						<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
							<div>
								<Label htmlFor='examDate'>Imtihon sanasi</Label>
								<Input
									id='examDate'
									type='date'
									value={createForm.examDate}
									onChange={(e) => setCreateForm({ ...createForm, examDate: e.target.value })}
								/>
							</div>

							<div>
								<Label htmlFor='variantsPerStudent'>Har o'quvchi uchun variantlar</Label>
								<Input
									id='variantsPerStudent'
									type='number'
									value={createForm.variantsPerStudent}
									onChange={(e) =>
										setCreateForm({ ...createForm, variantsPerStudent: parseInt(e.target.value) })
									}
									min='1'
									max='5'
								/>
							</div>
						</div>

						<div>
							<Label>Guruhlar</Label>
							<div className='space-y-2 max-h-32 overflow-y-auto border rounded-lg p-2'>
								{groups.map((group) => (
									<div key={group.id} className='flex items-center space-x-2'>
										<Checkbox
											id={`group-${group.id}`}
											checked={createForm.groupIds.includes(group.id)}
											onCheckedChange={(checked) => {
												if (checked) {
													setCreateForm({
														...createForm,
														groupIds: [...createForm.groupIds, group.id],
													});
												} else {
													setCreateForm({
														...createForm,
														groupIds: createForm.groupIds.filter((id) => id !== group.id),
													});
												}
											}}
										/>
										<Label htmlFor={`group-${group.id}`} className='text-sm'>
											{group.name} ({group.students?.length || 0} o'quvchi)
										</Label>
									</div>
								))}
							</div>
						</div>

						<div>
							<Label>Fanlar</Label>
							<div className='space-y-2 max-h-32 overflow-y-auto border rounded-lg p-2'>
								{subjects.map((subject) => (
									<div key={subject.id} className='flex items-center space-x-2'>
										<Checkbox
											id={`subject-${subject.id}`}
											checked={createForm.subjectIds.includes(subject.id)}
											onCheckedChange={(checked) => {
												if (checked) {
													setCreateForm({
														...createForm,
														subjectIds: [...createForm.subjectIds, subject.id],
													});
												} else {
													setCreateForm({
														...createForm,
														subjectIds: createForm.subjectIds.filter(
															(id) => id !== subject.id
														),
													});
												}
											}}
										/>
										<Label htmlFor={`subject-${subject.id}`} className='text-sm'>
											{subject.name}
										</Label>
									</div>
								))}
							</div>
						</div>

						<div className='space-y-2'>
							<div className='flex items-center space-x-2'>
								<Checkbox
									id='shuffleQuestions'
									checked={createForm.shuffleQuestions}
									onCheckedChange={(checked) =>
										setCreateForm({ ...createForm, shuffleQuestions: !!checked })
									}
								/>
								<Label htmlFor='shuffleQuestions'>Savollarni aralashtirish</Label>
							</div>

							<div className='flex items-center space-x-2'>
								<Checkbox
									id='shuffleAnswers'
									checked={createForm.shuffleAnswers}
									onCheckedChange={(checked) =>
										setCreateForm({ ...createForm, shuffleAnswers: !!checked })
									}
								/>
								<Label htmlFor='shuffleAnswers'>Javoblarni aralashtirish</Label>
							</div>
						</div>
					</div>

					<div className='flex space-x-2 pt-4'>
						<Button variant='outline' onClick={() => setIsCreateDialogOpen(false)} className='flex-1'>
							Bekor qilish
						</Button>
						<Button onClick={handleCreateExam} className='flex-1'>
							Yaratish
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* No separate generate dialog; starting will generate automatically */}
		</div>
	);
}
