import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Download, Users, FileText, Calendar, Clock, Settings, Loader2 } from 'lucide-react';
import PageLoader from '@/components/PageLoader';
import moment from 'moment';
import { request } from '@/configs/request';
import { useToast } from '@/components/ui/use-toast';

interface Exam {
	id: number;
	title: string;
	description: string;
	type: 'block' | 'single';
	status: 'draft' | 'scheduled' | 'in_progress' | 'completed';
	examDate: string;
	startTime: string;
	endTime: string;
	duration: number;
	shuffleQuestions: boolean;
	shuffleAnswers: boolean;
	variantsPerStudent: number;
	totalStudents: number;
	completedStudents: number;
	totalQuestions: number;
	totalPoints: number;
	groups: Array<{ id: number; name: string }>;
	subjects: Array<{ id: number; name: string }>;
	variants: Array<ExamVariant>;
	createdAt: string;
}

interface ExamVariant {
	id: number;
	variantNumber: string;
	status: 'pending' | 'in_progress' | 'completed' | 'submitted' | 'generated' | 'started';
	startedAt: string | null;
	completedAt: string | null;
	submittedAt: string | null;
	score: number | null;
	totalPoints: number;
	correctAnswers: number;
	totalQuestions: number;
	student: {
		id: number;
		firstName: string;
		lastName: string;
		fullName: string;
	};
}

const ExamDetail: React.FC = () => {
	const { examId } = useParams<{ examId: string }>();
	const navigate = useNavigate();
	const { user } = useAuth();
	const { toast } = useToast();
	const [exam, setExam] = useState<Exam | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
	const [downloadingPdfs, setDownloadingPdfs] = useState<Set<number>>(new Set());
	const [generateForm, setGenerateForm] = useState({
		questionsPerSubject: 10,
		shuffleQuestions: true,
		shuffleAnswers: true,
	});

	useEffect(() => {
		if (examId) {
			fetchExam();
		}
	}, [examId]);

	const fetchExam = async () => {
		try {
			setLoading(true);
			const { data } = await request.get(`/exams/${examId}`);
			setExam(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const generateVariants = async () => {
		try {
			setIsGenerating(true);
			await request.post(`/exams/${examId}/generate-variants`, generateForm);
			await fetchExam(); // Refresh exam data
			setGenerateDialogOpen(false);
			toast({
				title: 'Muvaffaqiyat',
				description: 'Variantlar muvaffaqiyatli yaratildi',
			});
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Variantlar yaratishda xatolik';
			setError(errorMsg);
			toast({
				title: 'Xatolik',
				description: errorMsg,
				variant: 'destructive'
			});
		} finally {
			setIsGenerating(false);
		}
	};

	const updateExamStatus = async (status: string) => {
		try {
			setIsUpdatingStatus(true);
			await request.put(`/exams/${examId}/status`, { status });
			await fetchExam();
			toast({
				title: 'Muvaffaqiyat',
				description: 'Imtihon holati yangilandi',
			});
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Holatni yangilashda xatolik';
			setError(errorMsg);
			toast({
				title: 'Xatolik',
				description: errorMsg,
				variant: 'destructive'
			});
		} finally {
			setIsUpdatingStatus(false);
		}
	};

	const downloadVariantPDF = async (variantId: number) => {
		try {
			setDownloadingPdfs(prev => new Set(prev).add(variantId));
			const response = await request.get(`/exams/variants/${variantId}/pdf`);
			const { url } = response.data as { url: string };
            window.open(`${import.meta.env.VITE_FILE_BASE_URL}${url}`, '_blank');

			toast({
				title: 'Muvaffaqiyat',
				description: 'Savollar varianiti muvaffaqiyatli yuklandi',
			});
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'PDF yuklab olishda xatolik';
			setError(errorMsg);
			toast({
				title: 'Xatolik',
				description: errorMsg,
				variant: 'destructive'
			});
		} finally {
			setDownloadingPdfs(prev => {
				const newSet = new Set(prev);
				newSet.delete(variantId);
				return newSet;
			});
		}
	};

	const downloadAnswerKeyPDF = async (variantId: number) => {
		try {
			setDownloadingPdfs(prev => new Set(prev).add(-variantId)); // Use negative to distinguish from variant PDF
			const response = await request.get(`/exams/variants/${variantId}/answer-key`);
			const { url } = response.data as { url: string };

			// Build absolute URL using API origin (VITE_API_BASE_URL may include /api path)
			const base = (request.defaults as any).baseURL as string | undefined;
			const api = base ? new URL(base, window.location.origin) : new URL(window.location.origin);
			const origin = `${api.protocol}//${api.host}`;
			const fullUrl = `${origin}${url}`;
			window.open(fullUrl, '_blank');
			toast({
				title: 'Muvaffaqiyat',
				description: 'Javoblar kaliti muvaffaqiyatli yuklandi',
			});
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Javoblar kalitini yuklab olishda xatolik';
			setError(errorMsg);
			toast({
				title: 'Xatolik',
				description: errorMsg,
				variant: 'destructive'
			});
		} finally {
			setDownloadingPdfs(prev => {
				const newSet = new Set(prev);
				newSet.delete(-variantId);
				return newSet;
			});
		}
	};

	if (loading) {
		return <PageLoader title="Imtihon ma'lumotlari yuklanmoqda..." />;
	}

	if (error) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='text-red-500'>Xatolik: {error}</div>
			</div>
		);
	}

	if (!exam) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='text-lg'>Imtihon topilmadi</div>
			</div>
		);
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'generated':
				return 'bg-blue-500';
			case 'started':
				return 'bg-orange-500';
			case 'draft':
				return 'bg-gray-500';
			case 'scheduled':
				return 'bg-blue-500';
			case 'in_progress':
				return 'bg-yellow-500';
			case 'completed':
				return 'bg-green-500';
			case 'submitted':
				return 'bg-green-600';
			default:
				return 'bg-gray-500';
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case 'generated':
				return 'Yaratilgan';
			case 'started':
				return 'Boshlangan';
			case 'draft':
				return 'Loyiha';
			case 'scheduled':
				return 'Rejalashtirilgan';
			case 'in_progress':
				return 'Jarayonda';
			case 'completed':
				return 'Tugallangan';
			case 'pending':
				return 'Kutilmoqda';
			case 'submitted':
				return 'Topshirilgan';
			default:
				return status;
		}
	};

	return (
		<div className='container mx-auto p-6 space-y-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div className='flex items-center space-x-4'>
					<Button variant='outline' size='sm' onClick={() => navigate('/account/exams')}>
						<ArrowLeft className='h-4 w-4 mr-2' />
						Imtihonlarga qaytish
					</Button>
					<div>
						<h1 className='text-3xl font-bold'>{exam.title}</h1>
						<p className='text-gray-600'>{exam.description}</p>
					</div>
				</div>
				<Badge className={getStatusColor(exam.status)}>{getStatusText(exam.status)}</Badge>
			</div>

			{/* Imtihon statistikasi */}
			<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
				<Card>
					<CardContent className='p-4'>
						<div className='flex items-center space-x-2'>
							<Users className='h-5 w-5 text-blue-500' />
							<div>
								<p className='text-sm text-gray-600'>Jami o'quvchilar</p>
								<p className='text-2xl font-bold'>{exam.totalStudents}</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className='p-4'>
						<div className='flex items-center space-x-2'>
							<FileText className='h-5 w-5 text-green-500' />
							<div>
								<p className='text-sm text-gray-600'>Tugallangan</p>
								<p className='text-2xl font-bold'>{exam.completedStudents}</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className='p-4'>
						<div className='flex items-center space-x-2'>
							<FileText className='h-5 w-5 text-purple-500' />
							<div>
								<p className='text-sm text-gray-600'>Jami savollar</p>
								<p className='text-2xl font-bold'>{exam.totalQuestions}</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className='p-4'>
						<div className='flex items-center space-x-2'>
							<Settings className='h-5 w-5 text-orange-500' />
							<div>
								<p className='text-sm text-gray-600'>Jami ballar</p>
								<p className='text-2xl font-bold'>{exam.totalPoints}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Imtihon tafsilotlari */}
			<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
				<Card>
					<CardHeader>
						<CardTitle>Imtihon ma'lumotlari</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='flex items-center space-x-2'>
							<Calendar className='h-4 w-4 text-gray-500' />
							<span className='text-sm text-gray-600'>Sana:</span>
							<span>{moment(exam.examDate).format('DD MMMM, YYYY')}</span>
						</div>
						<div className='flex items-center space-x-2'>
							<Clock className='h-4 w-4 text-gray-500' />
							<span className='text-sm text-gray-600'>Vaqt:</span>
							<span>
								{exam.startTime} - {exam.endTime}
							</span>
						</div>
						<div className='flex items-center space-x-2'>
							<Clock className='h-4 w-4 text-gray-500' />
							<span className='text-sm text-gray-600'>Davomiyligi:</span>
							<span>{exam.duration} daqiqa</span>
						</div>
						<div className='flex items-center space-x-2'>
							<span className='text-sm text-gray-600'>Turi:</span>
							<Badge variant={exam.type === 'block' ? 'default' : 'secondary'}>
								{exam.type === 'block' ? 'Blok test' : 'Bitta fan'}
							</Badge>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Guruhlar va fanlar</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div>
							<h4 className='font-medium mb-2'>Guruhlar ({exam.groups?.length ?? 0})</h4>
							<div className='flex flex-wrap gap-2'>
								{(exam.groups ?? []).map((group) => (
									<Badge key={group.id} variant='outline'>
										{group.name}
									</Badge>
								))}
							</div>
						</div>
						<div>
							<h4 className='font-medium mb-2'>Fanlar ({exam.subjects?.length ?? 0})</h4>
							<div className='flex flex-wrap gap-2'>
								{(exam.subjects ?? []).map((subject) => (
									<Badge key={subject.id} variant='outline'>
										{subject.name}
									</Badge>
								))}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Actions */}
			<Card>
				<CardHeader>
					<CardTitle>Actions</CardTitle>
				</CardHeader>
				<CardContent className='flex flex-wrap gap-2'>
					{exam.status === 'draft' && (
						<>
							<Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
								<DialogTrigger asChild>
									<Button>Variantlar yaratish</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Imtihon variantlarini yaratish</DialogTitle>
									</DialogHeader>
									<div className='space-y-4'>
										<div>
											<label className='text-sm font-medium'>Har bir fandagi savollar soni</label>
											<input
												type='number'
												value={generateForm.questionsPerSubject}
												onChange={(e) =>
													setGenerateForm({
														...generateForm,
														questionsPerSubject: parseInt(e.target.value),
													})
												}
												className='w-full mt-1 p-2 border rounded'
												min='1'
												max='50'
											/>
										</div>
										<div className='flex items-center space-x-2'>
											<input
												type='checkbox'
												id='shuffleQuestions'
												checked={generateForm.shuffleQuestions}
												onChange={(e) =>
													setGenerateForm({
														...generateForm,
														shuffleQuestions: e.target.checked,
													})
												}
											/>
											<label htmlFor='shuffleQuestions'>Savollarni aralashtirish</label>
										</div>
										<div className='flex items-center space-x-2'>
											<input
												type='checkbox'
												id='shuffleAnswers'
												checked={generateForm.shuffleAnswers}
												onChange={(e) =>
													setGenerateForm({
														...generateForm,
														shuffleAnswers: e.target.checked,
													})
												}
											/>
											<label htmlFor='shuffleAnswers'>Javoblarni aralashtirish</label>
										</div>
										<Button onClick={generateVariants} className='w-full' disabled={isGenerating}>
											{isGenerating ? (
												<>
													<Loader2 className='h-4 w-4 mr-2 animate-spin' />
													Variantlar yaratilmoqda...
												</>
											) : (
												'Variantlar yaratish'
											)}
										</Button>
									</div>
								</DialogContent>
							</Dialog>
							<Button variant='outline' onClick={() => updateExamStatus('scheduled')} disabled={isUpdatingStatus}>
								{isUpdatingStatus ? (
									<>
										<Loader2 className='h-4 w-4 mr-2 animate-spin' />
										Rejalashtirilmoqda...
									</>
								) : (
									'Imtihonni rejalashtirish'
								)}
							</Button>
						</>
					)}
					{exam.status === 'scheduled' && (
						<Button onClick={() => updateExamStatus('in_progress')} disabled={isUpdatingStatus}>
							{isUpdatingStatus ? (
								<>
									<Loader2 className='h-4 w-4 mr-2 animate-spin' />
									Boshlanmoqda...
								</>
							) : (
								'Imtihonni boshlash'
							)}
						</Button>
					)}
					{exam.status === 'in_progress' && (
						<Button onClick={() => updateExamStatus('completed')} disabled={isUpdatingStatus}>
							{isUpdatingStatus ? (
								<>
									<Loader2 className='h-4 w-4 mr-2 animate-spin' />
									Tugallanmoqda...
								</>
							) : (
								'Imtihonni tugatish'
							)}
						</Button>
					)}
				</CardContent>
			</Card>

			{/* Variantlar */}
			<Card>
				<CardHeader>
					<CardTitle>Imtihon variantlari ({exam.variants?.length ?? 0})</CardTitle>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue='all' className='w-full'>
						<TabsList>
							<TabsTrigger value='all'>Barchasi ({exam.variants?.length ?? 0})</TabsTrigger>
							<TabsTrigger value='generated'>
								Yaratilgan ({(exam.variants ?? []).filter((v) => v.status === 'generated').length})
							</TabsTrigger>
							<TabsTrigger value='started'>
								Boshlangan ({(exam.variants ?? []).filter((v) => v.status === 'started').length})
							</TabsTrigger>
							<TabsTrigger value='pending'>
								Kutilmoqda ({(exam.variants ?? []).filter((v) => v.status === 'pending').length})
							</TabsTrigger>
							<TabsTrigger value='in_progress'>
								Jarayonda ({(exam.variants ?? []).filter((v) => v.status === 'in_progress').length})
							</TabsTrigger>
							<TabsTrigger value='completed'>
								Tugallangan ({(exam.variants ?? []).filter((v) => v.status === 'completed').length})
							</TabsTrigger>
						</TabsList>

						{['all', 'generated', 'started', 'pending', 'in_progress', 'completed'].map((tab) => (
							<TabsContent key={tab} value={tab}>
								<div className='space-y-2'>
									{(exam.variants ?? [])
										.filter((variant) => tab === 'all' || variant.status === tab)
										.map((variant) => (
											<div
												key={variant.id}
												className='flex items-center justify-between p-4 border rounded-lg'
											>
												<div className='flex items-center space-x-4'>
													<div>
														<p className='font-medium'>
															{variant.student.fullName || `${variant.student.firstName} ${variant.student.lastName}`}
														</p>
														<p className='text-sm text-gray-600'>
															Variant {variant.variantNumber}
														</p>
													</div>
												</div>
												<div className='flex items-center space-x-2'>
													<Badge className={getStatusColor(variant.status)}>
														{getStatusText(variant.status)}
													</Badge>
													{variant.score !== null && (
														<span className='text-sm'>
															Ball: {variant.score}/{variant.totalPoints}
														</span>
													)}
													<Button
														size='sm'
														variant='outline'
														onClick={() => downloadVariantPDF(variant.id)}
														disabled={downloadingPdfs.has(variant.id)}
													>
														{downloadingPdfs.has(variant.id) ? (
															<Loader2 className='h-4 w-4 mr-1 animate-spin' />
														) : (
															<Download className='h-4 w-4 mr-1' />
														)}
														Test
													</Button>
													<Button
														size='sm'
														variant='outline'
														onClick={() => downloadAnswerKeyPDF(variant.id)}
														disabled={downloadingPdfs.has(-variant.id)}
													>
														{downloadingPdfs.has(-variant.id) ? (
															<Loader2 className='h-4 w-4 mr-1 animate-spin' />
														) : (
															<Download className='h-4 w-4 mr-1' />
														)}
														Javoblar
													</Button>
												</div>
											</div>
										))}
								</div>
							</TabsContent>
						))}
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
};

export default ExamDetail;
