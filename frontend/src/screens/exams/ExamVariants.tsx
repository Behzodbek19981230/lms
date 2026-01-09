import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Download, Search, Filter, FileText, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import moment from 'moment';
import { request } from '@/configs/request';
import { toast } from '@/components/ui/use-toast';

interface ExamVariant {
	id: number;
	variantNumber: string;
	status: 'pending' | 'in_progress' | 'completed' | 'submitted';
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
		group: {
			id: number;
			name: string;
		};
	};
	questions: Array<{
		id: number;
		questionText: string;
		type: 'multiple_choice' | 'single_choice' | 'text' | 'number';
		points: number;
		order: number;
		subjectName: string;
		answers: Array<{
			text: string;
			isCorrect: boolean;
		}>;
		studentAnswer: any;
	}>;
}

interface Exam {
	id: number;
	title: string;
	type: 'block' | 'single';
	status: 'draft' | 'scheduled' | 'in_progress' | 'completed';
	examDate: string;
	totalStudents: number;
	completedStudents: number;
	totalQuestions: number;
	totalPoints: number;
}

const ExamVariants: React.FC = () => {
	const params = useParams();
	const examId = (params as any)?.examId as string | undefined;
	const router = useRouter();
	const { user } = useAuth();
	const [exam, setExam] = useState<Exam | null>(null);
	const [variants, setVariants] = useState<ExamVariant[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [groupFilter, setGroupFilter] = useState<string>('all');

	useEffect(() => {
		if (examId) {
			fetchExamAndVariants();
		}
	}, [examId]);

	const fetchExamAndVariants = async () => {
		try {
			setLoading(true);

			// Fetch exam details and variants using request
			const [examResponse, variantsResponse] = await Promise.all([
				request.get(`/exams/${examId}`),
				request.get(`/exams/${examId}/variants`),
			]);

			setExam(examResponse.data);
			setVariants(variantsResponse.data);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const downloadVariantPDF = async (variantId: number) => {
		try {
			const response = await request.get(`/exams/variants/${variantId}/pdf`);
			const { url } = response.data as { url: string };

			// Build absolute URL using API origin (VITE_API_BASE_URL may include /api path)
			const base = (request.defaults as any).baseURL as string | undefined;
			const api = base ? new URL(base, window.location.origin) : new URL(window.location.origin);
			const origin = `${api.protocol}//${api.host}`;
			const fullUrl = `${origin}${url}`;
			window.open(fullUrl, '_blank');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'PDF yuklab olishda xatolik');
		}
	};

	const openPrintableHtml = async (variantId: number) => {
		try {
			// Ask backend to generate a printable HTML file and return relative URL like /print/xxx.html
			const resp = await request.post(`/exams/variants/${variantId}/printable`);
			const { url } = resp.data as { url: string };

			// Build absolute URL using API origin (VITE_API_BASE_URL may include /api path)
			const base = (request.defaults as any).baseURL as string | undefined;
			const api = base ? new URL(base, window.location.origin) : new URL(window.location.origin);
			const origin = `${api.protocol}//${api.host}`;
			const fullUrl = `${origin}${url}`;
			window.open(fullUrl, '_blank');
		} catch (err: any) {
			const msg = err?.response?.data?.message || 'HTML faylni yaratishda xatolik yuz berdi';
			setError(typeof msg === 'string' ? msg : 'Xatolik');
			if (toast) toast({ title: 'Xatolik', description: msg, variant: 'destructive' });
		}
	};

	const downloadAnswerKeyPDF = async (variantId: number) => {
		try {
			const response = await request.get(`/exams/variants/${variantId}/answer-key`);
			const { url } = response.data as { url: string };

			// Build absolute URL using API origin (VITE_API_BASE_URL may include /api path)
			const base = (request.defaults as any).baseURL as string | undefined;
			const api = base ? new URL(base, window.location.origin) : new URL(window.location.origin);
			const origin = `${api.protocol}//${api.host}`;
			const fullUrl = `${origin}${url}`;
			window.open(fullUrl, '_blank');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Javoblar kalitini yuklab olishda xatolik');
		}
	};

	const downloadAllVariantsPDF = async () => {
		try {
			const response = await request.get(`/exams/${examId}/variants/pdf`, { responseType: 'blob' });
			const blob = response.data as Blob;
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `all-variants-${examId}.pdf`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Barcha variantlarni yuklab olishda xatolik');
		}
	};

	const downloadAllAnswerKeysPDF = async () => {
		try {
			const response = await request.get(`/exams/${examId}/variants/answer-keys`, { responseType: 'blob' });
			const blob = response.data as Blob;
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `all-answer-keys-${examId}.pdf`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Barcha javoblar kalitini yuklab olishda xatolik');
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'pending':
				return 'bg-gray-500';
			case 'in_progress':
				return 'bg-yellow-500';
			case 'completed':
				return 'bg-green-500';
			case 'submitted':
				return 'bg-blue-500';
			default:
				return 'bg-gray-500';
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case 'pending':
				return 'Kutilmoqda';
			case 'in_progress':
				return 'Jarayonda';
			case 'completed':
				return 'Tugallangan';
			case 'submitted':
				return 'Yuborilgan';
			default:
				return status;
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'pending':
				return <Clock className='h-4 w-4' />;
			case 'in_progress':
				return <AlertCircle className='h-4 w-4' />;
			case 'completed':
				return <CheckCircle className='h-4 w-4' />;
			case 'submitted':
				return <FileText className='h-4 w-4' />;
			default:
				return <Clock className='h-4 w-4' />;
		}
	};

	// Filter variants based on search and filters
	const filteredVariants = variants.filter((variant) => {
		const matchesSearch =
			searchTerm === '' ||
			variant.student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			variant.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			variant.variantNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
			variant.student.group.name.toLowerCase().includes(searchTerm.toLowerCase());

		const matchesStatus = statusFilter === 'all' || variant.status === statusFilter;
		const matchesGroup = groupFilter === 'all' || variant.student.group.id.toString() === groupFilter;

		return matchesSearch && matchesStatus && matchesGroup;
	});

	// Get unique groups for filter
	const uniqueGroups = Array.from(new Set(variants.map((v) => v.student.group.id))).map((groupId) => {
		const variant = variants.find((v) => v.student.group.id === groupId);
		return {
			id: groupId,
			name: variant?.student.group.name || '',
		};
	});

	if (loading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='text-lg'>Imtihon variantlari yuklanmoqda...</div>
			</div>
		);
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

	return (
		<div className='container mx-auto p-6 space-y-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div className='flex items-center space-x-4'>
					<Button variant='outline' size='sm' onClick={() => router.push(`/account/exams/${examId}`)}>
						<ArrowLeft className='h-4 w-4 mr-2' />
						Imtihonga qaytish
					</Button>
					<div>
						<h1 className='text-3xl font-bold'>Imtihon variantlari</h1>
						<p className='text-gray-600'>{exam.title}</p>
					</div>
				</div>
				<div className='flex space-x-2'>
					<Button variant='outline' onClick={downloadAllVariantsPDF}>
						<Download className='h-4 w-4 mr-2' />
						Barcha testlarni yuklab olish
					</Button>
					<Button variant='outline' onClick={downloadAllAnswerKeysPDF}>
						<Download className='h-4 w-4 mr-2' />
						Barcha javoblarni yuklab olish
					</Button>
				</div>
			</div>

			{/* Statistics */}
			<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
				<Card>
					<CardContent className='p-4'>
						<div className='flex items-center space-x-2'>
							<Users className='h-5 w-5 text-blue-500' />
							<div>
								<p className='text-sm text-gray-600'>Jami variantlar</p>
								<p className='text-2xl font-bold'>{variants.length}</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className='p-4'>
						<div className='flex items-center space-x-2'>
							<CheckCircle className='h-5 w-5 text-green-500' />
							<div>
								<p className='text-sm text-gray-600'>Yakunlangan</p>
								<p className='text-2xl font-bold'>
									{
										variants.filter((v) => v.status === 'completed' || v.status === 'submitted')
											.length
									}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className='p-4'>
						<div className='flex items-center space-x-2'>
							<Clock className='h-5 w-5 text-yellow-500' />
							<div>
								<p className='text-sm text-gray-600'>Jarayonda</p>
								<p className='text-2xl font-bold'>
									{variants.filter((v) => v.status === 'in_progress').length}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className='p-4'>
						<div className='flex items-center space-x-2'>
							<AlertCircle className='h-5 w-5 text-gray-500' />
							<div>
								<p className='text-sm text-gray-600'>Kutilmoqda</p>
								<p className='text-2xl font-bold'>
									{variants.filter((v) => v.status === 'pending').length}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center space-x-2'>
						<Filter className='h-5 w-5' />
						<span>Filtrlar</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
						<div className='relative'>
							<Search className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
							<Input
								placeholder="Ism, variant raqami yoki guruh bo'yicha qidirish..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className='pl-10'
							/>
						</div>
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger>
								<SelectValue placeholder="Holat bo'yicha filter" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>Barcha holatlar</SelectItem>
								<SelectItem value='pending'>Kutilmoqda</SelectItem>
								<SelectItem value='in_progress'>Jarayonda</SelectItem>
								<SelectItem value='completed'>Tugallangan</SelectItem>
								<SelectItem value='submitted'>Yuborilgan</SelectItem>
							</SelectContent>
						</Select>
						<Select value={groupFilter} onValueChange={setGroupFilter}>
							<SelectTrigger>
								<SelectValue placeholder="Guruh bo'yicha filter" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>Barcha guruhlar</SelectItem>
								{uniqueGroups.map((group) => (
									<SelectItem key={group.id} value={group.id.toString()}>
										{group.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Variants List */}
			<Card>
				<CardHeader>
					<CardTitle>
						Variantlar ({filteredVariants.length} / {variants.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='space-y-4'>
						{filteredVariants.length === 0 ? (
							<div className='text-center py-8 text-gray-500'>
								Filterlarga mos variant topilmadi.
							</div>
						) : (
							filteredVariants.map((variant) => (
								<div
									key={variant.id}
									className='border rounded-lg p-6 hover:shadow-md transition-shadow'
								>
									<div className='flex items-center justify-between mb-4'>
										<div className='flex items-center space-x-4'>
											<div className='flex items-center space-x-2'>
												{getStatusIcon(variant.status)}
												<Badge className={getStatusColor(variant.status)}>
													{getStatusText(variant.status)}
												</Badge>
											</div>
											<div>
												<h3 className='font-semibold text-lg'>
													{variant.student.firstName} {variant.student.lastName}
												</h3>
												<p className='text-sm text-gray-600'>
													{variant.student.group.name} • Variant {variant.variantNumber}
												</p>
											</div>
										</div>
										<div className='flex items-center space-x-2'>
											{variant.score !== null && (
												<div className='text-right'>
													<p className='text-sm text-gray-600'>Ball</p>
													<p className='font-semibold'>
														{variant.score}/{variant.totalPoints}
													</p>
												</div>
											)}
											<Button
												size='sm'
												variant='outline'
												onClick={() => downloadVariantPDF(variant.id)}
											>
												<Download className='h-4 w-4 mr-1' />
												Test
											</Button>
											<Button
												size='sm'
												variant='outline'
												onClick={() => openPrintableHtml(variant.id)}
											>
												<FileText className='h-4 w-4 mr-1' />
												HTML
											</Button>
											<Button
												size='sm'
												variant='outline'
												onClick={() => downloadAnswerKeyPDF(variant.id)}
											>
												<Download className='h-4 w-4 mr-1' />
												Javoblar
											</Button>
										</div>
									</div>

									{/* Variant Details */}
									<div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm'>
										<div>
											<span className='text-gray-600'>Savollar:</span>
											<span className='ml-2 font-medium'>{variant.totalQuestions}</span>
										</div>
										<div>
											<span className='text-gray-600'>To'g'ri javoblar:</span>
											<span className='ml-2 font-medium'>{variant.correctAnswers}</span>
										</div>
										<div>
											<span className='text-gray-600'>Boshlangan:</span>
											<span className='ml-2 font-medium'>
												{variant.startedAt
													? moment(variant.startedAt).format('MMM DD, HH:mm')
													: 'Boshlanmagan'}
											</span>
										</div>
										{variant.completedAt && (
											<div>
												<span className='text-gray-600'>Tugallangan:</span>
												<span className='ml-2 font-medium'>
													{moment(variant.completedAt).format('MMM DD, HH:mm')}
												</span>
											</div>
										)}
										{variant.submittedAt && (
											<div>
												<span className='text-gray-600'>Yuborilgan:</span>
												<span className='ml-2 font-medium'>
													{moment(variant.submittedAt).format('MMM DD, HH:mm')}
												</span>
											</div>
										)}
									</div>

									{/* Questions Summary */}
									{variant.questions && variant.questions.length > 0 && (
										<div className='mt-4 pt-4 border-t'>
											<h4 className='font-medium mb-2'>Fan bo'yicha savollar:</h4>
											<div className='flex flex-wrap gap-2'>
												{Object.entries(
													variant.questions.reduce((acc, q) => {
														acc[q.subjectName] = (acc[q.subjectName] || 0) + 1;
														return acc;
													}, {} as Record<string, number>)
												).map(([subject, count]) => (
													<Badge key={subject} variant='outline'>
														{subject}: {count}
													</Badge>
												))}
											</div>
										</div>
									)}
								</div>
							))
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default ExamVariants;
