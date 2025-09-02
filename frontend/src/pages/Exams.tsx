import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
	Shuffle,
	Settings,
	FileSpreadsheet,
	MessageCircle,
} from 'lucide-react';
import { request } from '@/configs/request';
import { useAuth } from '@/contexts/AuthContext';
import { telegramService } from '@/services/telegram.service';
import { useToast } from '@/components/ui/use-toast';
import moment from 'moment';

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
	email: string;
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
	const navigate = useNavigate();
	const { user } = useAuth();
	const { toast } = useToast();

	const [exams, setExams] = useState<Exam[]>([]);
	const [groups, setGroups] = useState<Group[]>([]);
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState('');

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

	// Generate variants state
	const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
	const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
	const [generateForm, setGenerateForm] = useState({
		questionsPerSubject: 10,
		randomizeQuestions: true,
		randomizeAnswers: true,
	});

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

	const handleGenerateVariants = async () => {
		if (!selectedExam) return;

		try {
			const response = await request.post(`/exams/${selectedExam.id}/generate-variants`, generateForm);
			// Exam statistikalarini yangilash
			const updatedExam = await request.get(`/exams/${selectedExam.id}`);
			setExams(exams.map((exam) => (exam.id === selectedExam.id ? updatedExam.data : exam)));
			setIsGenerateDialogOpen(false);
			setSelectedExam(null);
		} catch (e: any) {
			setErrorMessage(e?.response?.data?.message || "Variantlarni generatsiya qilib bo'lmadi");
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
		} catch (e: any) {
			setErrorMessage(e?.response?.data?.message || "Imtihonni o'chirib bo'lmadi");
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
		return (
			<div className='min-h-screen bg-gradient-subtle flex items-center justify-center'>
				<div className='text-center'>
					<div className='text-lg text-muted-foreground'>Yuklanmoqda...</div>
				</div>
			</div>
		);
	}

	if (errorMessage) {
		return (
			<div className='min-h-screen bg-gradient-subtle flex items-center justify-center'>
				<div className='text-center'>
					<div className='text-lg text-destructive'>{errorMessage}</div>
					<Button onClick={() => navigate(-1)} className='mt-4'>
						Orqaga qaytish
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gradient-subtle'>
			{/* Header */}
			<header className='bg-card border-b border-border p-6'>
				<div className='flex items-center justify-between'>
					<div>
						<h1 className='text-3xl font-bold text-foreground'>Imtihonlar</h1>
						<p className='text-muted-foreground'>
							Imtihonlarni boshqarish va variantlar generatsiya qilish
						</p>
					</div>
					<div className='flex items-center space-x-4'>
						<Button variant='outline' onClick={() => navigate('/account/test-generator')}>
							<FileText className='h-4 w-4 mr-2' />
							Test generatsiya
						</Button>
						<Button variant='hero' onClick={() => setIsCreateDialogOpen(true)}>
							<Plus className='h-4 w-4 mr-2' />
							Yangi imtihon
						</Button>
					</div>
				</div>
			</header>

			<div className='p-6'>
				{/* Stats */}
				<div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-6'>
					<Card className='border-border'>
						<CardContent className='p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-sm text-muted-foreground'>Jami imtihonlar</p>
									<p className='text-2xl font-bold'>{exams.length}</p>
								</div>
								<BookOpen className='h-8 w-8 text-blue-500' />
							</div>
						</CardContent>
					</Card>

					<Card className='border-border'>
						<CardContent className='p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-sm text-muted-foreground'>Faol imtihonlar</p>
									<p className='text-2xl font-bold'>
										{exams.filter((e) => e.status === 'in_progress').length}
									</p>
								</div>
								<Play className='h-8 w-8 text-green-500' />
							</div>
						</CardContent>
					</Card>

					<Card className='border-border'>
						<CardContent className='p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-sm text-muted-foreground'>Tugallangan</p>
									<p className='text-2xl font-bold'>
										{exams.filter((e) => e.status === 'completed').length}
									</p>
								</div>
								<CheckCircle className='h-8 w-8 text-green-600' />
							</div>
						</CardContent>
					</Card>

					<Card className='border-border'>
						<CardContent className='p-6'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-sm text-muted-foreground'>Jami o'quvchilar</p>
									<p className='text-2xl font-bold'>
										{exams.reduce((sum, exam) => sum + exam.totalStudents, 0)}
									</p>
								</div>
								<Users className='h-8 w-8 text-purple-500' />
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
														onClick={() => {
															setSelectedExam(exam);
															setIsGenerateDialogOpen(true);
														}}
														title='Variantlar generatsiya qilish'
													>
														<Shuffle className='h-4 w-4' />
													</Button>
												)}
												<Button
													variant='ghost'
													size='sm'
													onClick={() => handleDeleteExam(exam.id)}
													className='text-destructive hover:text-destructive'
													title="O'chirish"
												>
													<Trash2 className='h-4 w-4' />
												</Button>
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
												{exam.shuffleQuestions && <Shuffle className='h-3 w-3' />}
												{exam.shuffleAnswers && <Settings className='h-3 w-3' />}
											</div>
										</div>

										<div className='flex space-x-2'>
											<Button
												variant='outline'
												size='sm'
												className='flex-1'
												onClick={() => navigate(`/account/exams/${exam.id}`)}
											>
												<Eye className='h-4 w-4 mr-2' />
												Ko'rish
											</Button>
										</div>

										{/* Status Actions */}
										{exam.status === 'draft' && (
											<div className='mt-2'>
												<Button
													size='sm'
													className='w-full'
													onClick={() => handleUpdateExamStatus(exam.id, 'scheduled')}
												>
													<Calendar className='h-4 w-4 mr-2' />
													Rejalashtirish
												</Button>
											</div>
										)}

										{exam.status === 'scheduled' && (
											<div className='mt-2 space-y-2'>
												<Button
													size='sm'
													className='w-full'
													onClick={() => handleUpdateExamStatus(exam.id, 'in_progress')}
												>
													<Play className='h-4 w-4 mr-2' />
													Boshlash
												</Button>
												{exam.groups.length > 0 && (
													<div className='flex items-center justify-center text-xs text-muted-foreground'>
														<MessageCircle className='h-3 w-3 mr-1' />
														Telegram orqali xabar yuboriladi
													</div>
												)}
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

						<div className='grid grid-cols-2 gap-4'>
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

						<div className='grid grid-cols-2 gap-4'>
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

			{/* Generate Variants Dialog */}
			<Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>Variantlar generatsiya qilish</DialogTitle>
					</DialogHeader>

					<div className='space-y-4'>
						<div>
							<Label htmlFor='questionsPerSubject'>Har fandagi savollar soni</Label>
							<Input
								id='questionsPerSubject'
								type='number'
								value={generateForm.questionsPerSubject}
								onChange={(e) =>
									setGenerateForm({ ...generateForm, questionsPerSubject: parseInt(e.target.value) })
								}
								min='1'
								max='50'
							/>
						</div>

						<div className='space-y-2'>
							<div className='flex items-center space-x-2'>
								<Checkbox
									id='randomizeQuestions'
									checked={generateForm.randomizeQuestions}
									onCheckedChange={(checked) =>
										setGenerateForm({ ...generateForm, randomizeQuestions: !!checked })
									}
								/>
								<Label htmlFor='randomizeQuestions'>Savollarni aralashtirish</Label>
							</div>

							<div className='flex items-center space-x-2'>
								<Checkbox
									id='randomizeAnswers'
									checked={generateForm.randomizeAnswers}
									onCheckedChange={(checked) =>
										setGenerateForm({ ...generateForm, randomizeAnswers: !!checked })
									}
								/>
								<Label htmlFor='randomizeAnswers'>Javoblarni aralashtirish</Label>
							</div>
						</div>

						{selectedExam && (
							<div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
								<p className='text-sm text-blue-800'>
									<strong>Imtihon:</strong> {selectedExam.title}
								</p>
								<p className='text-sm text-blue-700'>
									<strong>O'quvchilar:</strong> {selectedExam.totalStudents} ta
								</p>
								<p className='text-sm text-blue-700'>
									<strong>Variantlar:</strong>{' '}
									{selectedExam.totalStudents * selectedExam.variantsPerStudent} ta
								</p>
							</div>
						)}
					</div>

					<div className='flex space-x-2 pt-4'>
						<Button variant='outline' onClick={() => setIsGenerateDialogOpen(false)} className='flex-1'>
							Bekor qilish
						</Button>
						<Button onClick={handleGenerateVariants} className='flex-1'>
							Generatsiya qilish
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
