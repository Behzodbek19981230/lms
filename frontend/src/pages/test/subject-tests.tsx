import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
	ArrowLeft,
	Plus,
	Edit,
	Trash2,
	FileText,
	Clock,
	Users,
	Eye,
	EyeOff,
	Shuffle,
	CheckCircle,
	AlertCircle,
	Archive,
} from 'lucide-react';
import { request } from '@/configs/request';
import { Test, TestStatus, TestTypeEnum } from '@/types/test.type';
import { SubjectCategoryLabels, type SubjectType } from '@/types/subject.type';
import { useAuth } from '@/contexts/AuthContext';
import moment from 'moment';
import PageLoader from '@/components/PageLoader';

export default function SubjectTests() {
	const params = useParams();
	const subjectId = params?.subjectId as string | undefined;
	const router = useRouter();
	const { user } = useAuth();

	const [subject, setSubject] = useState<SubjectType | null>(null);
	const [tests, setTests] = useState<Test[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState('');

	// Test editing state
	const [editingTest, setEditingTest] = useState<Test | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editForm, setEditForm] = useState({
		title: '',
		description: '',
		type: TestTypeEnum.OPEN,
		duration: 30,
		shuffleQuestions: false,
		showResults: true,
	});

	useEffect(() => {
		if (!subjectId) return;
		const isNumeric = /^\d+$/.test(String(subjectId));
		if (!isNumeric) {
			setIsLoading(false);
			setErrorMessage("Noto'g'ri fan ID");
			return;
		}
		loadSubjectAndTests();
	}, [subjectId]);

	const loadSubjectAndTests = async () => {
		try {
			setIsLoading(true);
			setErrorMessage('');

			const [subjectRes, testsRes] = await Promise.all([
				request.get(`/subjects/${Number(subjectId)}`),
				request.get(`/tests?subjectid=${Number(subjectId)}`),
			]);

			setSubject(subjectRes.data);
			setTests(testsRes.data || []);
		} catch (e: any) {
			setErrorMessage(e?.response?.data?.message || "Ma'lumotlarni yuklab bo'lmadi");
		} finally {
			setIsLoading(false);
		}
	};

	const handleEditTest = (test: Test) => {
		setEditingTest(test);
		setEditForm({
			title: test.title,
			description: test.description,
			type: test.type,
			duration: test.duration,
			shuffleQuestions: test.shuffleQuestions,
			showResults: test.showResults,
		});
		setIsEditDialogOpen(true);
	};

	const handleUpdateTest = async () => {
		if (!editingTest) return;

		try {
			const response = await request.patch(`/tests/${editingTest.id}`, editForm);
			setTests(tests.map((test) => (test.id === editingTest.id ? response.data : test)));
			setIsEditDialogOpen(false);
			setEditingTest(null);
		} catch (e: any) {
			setErrorMessage(e?.response?.data?.message || "Testni yangilab bo'lmadi");
		}
	};

	const handleDeleteTest = async (testId: number) => {
		if (!confirm("Bu testni o'chirishni xohlaysizmi?")) return;

		try {
			await request.delete(`/tests/${testId}`);
			setTests(tests.filter((test) => test.id !== testId));
		} catch (e: any) {
			setErrorMessage(e?.response?.data?.message || "Testni o'chirib bo'lmadi");
		}
	};

	const getStatusIcon = (status: TestStatus) => {
		switch (status) {
			case TestStatus.DRAFT:
				return <AlertCircle className='h-4 w-4 text-yellow-500' />;
			case TestStatus.PUBLISHED:
				return <CheckCircle className='h-4 w-4 text-green-500' />;
			case TestStatus.ARCHIVED:
				return <Archive className='h-4 w-4 text-gray-500' />;
			default:
				return <AlertCircle className='h-4 w-4' />;
		}
	};

	const getStatusText = (status: TestStatus) => {
		switch (status) {
			case TestStatus.DRAFT:
				return 'Qoralama';
			case TestStatus.PUBLISHED:
				return 'Nashr etilgan';
			case TestStatus.ARCHIVED:
				return 'Arxivlangan';
			default:
				return status;
		}
	};

	const getTypeText = (type: TestTypeEnum) => {
		switch (type) {
			case TestTypeEnum.OPEN:
				return 'Ochiq';
			case TestTypeEnum.CLOSED:
				return 'Yopiq';
			case TestTypeEnum.MIXED:
				return 'Aralash';
			default:
				return type;
		}
	};

	if (isLoading) {
		return <PageLoader title='Fan va testlar yuklanmoqda...' />;
	}

	if (errorMessage) {
		return (
			<div className='min-h-screen bg-gradient-subtle flex items-center justify-center'>
				<div className='text-center'>
					<div className='text-lg text-destructive'>{errorMessage}</div>
					<Button onClick={() => router.back()} className='mt-4'>
						<ArrowLeft className='h-4 w-4 mr-2' />
						Orqaga qaytish
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gradient-subtle'>
			{/* Header */}
			<header className='bg-card border-b border-border p-4 md:p-6 sticky top-0 z-10 shadow-sm'>
				<div className='max-w-7xl mx-auto'>
					<div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
						<div className='flex items-center gap-3 md:gap-4'>
							<Button variant='outline' size='sm' onClick={() => router.back()}>
								<ArrowLeft className='h-4 w-4 mr-2' />
								Orqaga
							</Button>
							<div>
								<h1 className='text-2xl md:text-3xl font-bold text-foreground'>{subject?.name}</h1>
								<p className='text-sm text-muted-foreground'>Fan testlari boshqaruvi</p>
							</div>
						</div>
						<div>
							<Button variant='hero' size='sm' onClick={() => router.push('/account/test/create')}>
								<Plus className='h-4 w-4 mr-2' />
								Yangi test
							</Button>
						</div>
					</div>
				</div>
			</header>

			<div className='max-w-7xl mx-auto p-4 md:p-6 space-y-6'>
				{/* Subject Info */}
				<Card className='border-border'>
					<CardHeader className='pb-3'>
						<CardTitle className='text-lg text-card-foreground'>Fan ma'lumotlari</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
							<div>
								<Label className='text-xs text-muted-foreground'>Fan nomi</Label>
								<p className='font-medium text-sm mt-1'>{subject?.name}</p>
							</div>
							<div>
								<Label className='text-xs text-muted-foreground'>Kategoriya</Label>
								<p className='font-medium text-sm mt-1'>
									{subject?.category !== undefined && subject?.category in SubjectCategoryLabels
										? SubjectCategoryLabels[subject.category]
										: 'Nomaʼlum'}
								</p>
							</div>
							<div>
								<Label className='text-xs text-muted-foreground'>Testlar soni</Label>
								<p className='font-semibold text-lg text-primary mt-1'>{tests.length}</p>
							</div>
							<div>
								<Label className='text-xs text-muted-foreground'>Formula qo'llab-quvvatlash</Label>
								<Badge variant='secondary' className='text-xs mt-1'>
									{subject?.hasFormulas ? 'Ha' : "Yo'q"}
								</Badge>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Tests List */}
				<div className='space-y-4'>
					<div className='flex items-center justify-between'>
						<h2 className='text-xl md:text-2xl font-bold text-foreground'>Testlar ro'yxati</h2>
						<Badge variant='secondary' className='text-xs font-semibold'>
							{tests.length} ta test
						</Badge>
					</div>

					{tests.length === 0 ? (
						<Card className='border-border'>
							<CardContent className='flex flex-col items-center justify-center py-12 px-4'>
								<FileText className='h-16 w-16 text-muted-foreground mb-4 opacity-50' />
								<h3 className='text-lg font-medium text-foreground mb-2'>Testlar mavjud emas</h3>
								<p className='text-sm text-muted-foreground mb-4 text-center'>
									Bu fanga hali test yaratilmagan
								</p>
								<Button onClick={() => router.push('/account/test/create')}>
									<Plus className='h-4 w-4 mr-2' />
									Birinchi testni yarating
								</Button>
							</CardContent>
						</Card>
					) : (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
							{tests.map((test) => (
								<Card
									key={test.id}
									className='border-border hover:shadow-md transition-shadow cursor-pointer group'
								>
									<CardHeader className='pb-3'>
										<div className='flex items-start justify-between gap-2 mb-2'>
											<div className='flex items-center gap-2 flex-wrap'>
												{getStatusIcon(test.status)}
												<Badge variant='outline' className='text-xs'>
													{getStatusText(test.status)}
												</Badge>
												<Badge variant='secondary' className='text-xs'>
													{getTypeText(test.type)}
												</Badge>
											</div>
											<div className='flex items-center gap-1 flex-shrink-0'>
												<Button
													variant='ghost'
													size='sm'
													onClick={(e) => {
														e.stopPropagation();
														handleEditTest(test);
													}}
												>
													<Edit className='h-4 w-4' />
												</Button>
												<Button
													variant='ghost'
													size='sm'
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteTest(test.id);
													}}
													className='text-destructive hover:text-destructive hover:bg-destructive/10'
												>
													<Trash2 className='h-4 w-4' />
												</Button>
											</div>
										</div>
										<CardTitle
											className='text-base font-semibold text-card-foreground line-clamp-2 cursor-pointer'
											onClick={() => router.push(`/account/test/${test.id}/questions`)}
										>
											{test.title}
										</CardTitle>
									</CardHeader>
									<CardContent className='pt-0'>
										{test.description && (
											<p className='text-sm text-muted-foreground mb-3 line-clamp-2'>
												{test.description}
											</p>
										)}

										<div className='grid grid-cols-2 gap-2 mb-3 p-3 bg-muted/30 rounded-md'>
											<div className='text-center'>
												<div className='text-xs text-muted-foreground mb-1'>Savollar</div>
												<div className='text-lg font-bold text-primary'>
													{test.totalQuestions || 0}
												</div>
											</div>
											<div className='text-center'>
												<div className='text-xs text-muted-foreground mb-1'>Ball</div>
												<div className='text-lg font-bold text-primary'>
													{test.totalPoints || 0}
												</div>
											</div>
										</div>

										<div className='space-y-1.5 text-xs text-muted-foreground mb-3'>
											<div className='flex items-center gap-2'>
												<Clock className='h-3.5 w-3.5' />
												<span>{test.duration} daqiqa</span>
											</div>
											<div className='flex items-center gap-2'>
												{test.shuffleQuestions && (
													<>
														<Shuffle className='h-3.5 w-3.5' />
														<span>Aralashtiriladi</span>
													</>
												)}
												{test.showResults ? (
													<>
														<Eye className='h-3.5 w-3.5' />
														<span>Natijalar ko'rsatiladi</span>
													</>
												) : (
													<>
														<EyeOff className='h-3.5 w-3.5' />
														<span>Natijalar yashirin</span>
													</>
												)}
											</div>
										</div>

										<div className='text-xs text-muted-foreground mb-3 pb-3 border-t pt-3'>
											{moment(test.createdAt).format('DD.MM.YYYY, HH:mm')}
										</div>

										<div className='flex gap-2'>
											<Button
												variant='outline'
												size='sm'
												className='flex-1'
												onClick={() => router.push(`/account/test/edit/${test.id}`)}
											>
												<Edit className='h-4 w-4 mr-1' />
												Tahrirlash
											</Button>
											<Button
												variant='hero'
												size='sm'
												className='flex-1'
												onClick={() => router.push(`/account/test/${test.id}/questions`)}
											>
												<FileText className='h-4 w-4 mr-1' />
												Savollar
											</Button>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Edit Test Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>Testni tahrirlash</DialogTitle>
					</DialogHeader>

					<div className='space-y-4'>
						<div>
							<Label htmlFor='title'>Test nomi</Label>
							<Input
								id='title'
								value={editForm.title}
								onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
								placeholder='Test nomini kiriting'
							/>
						</div>

						<div>
							<Label htmlFor='description'>Tavsif</Label>
							<Textarea
								id='description'
								value={editForm.description}
								onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
								placeholder='Test tavsifini kiriting'
								rows={3}
							/>
						</div>

						<div>
							<Label htmlFor='type'>Test turi</Label>
							<Select
								value={editForm.type}
								onValueChange={(value: TestTypeEnum) => setEditForm({ ...editForm, type: value })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={TestTypeEnum.OPEN}>Ochiq</SelectItem>
									<SelectItem value={TestTypeEnum.CLOSED}>Yopiq</SelectItem>
									<SelectItem value={TestTypeEnum.MIXED}>Aralash</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor='duration'>Davomiyligi (daqiqa)</Label>
							<Input
								id='duration'
								type='number'
								value={editForm.duration}
								onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) })}
								min='1'
								max='300'
							/>
						</div>

						<div className='flex items-center space-x-2'>
							<input
								type='checkbox'
								id='shuffleQuestions'
								checked={editForm.shuffleQuestions}
								onChange={(e) => setEditForm({ ...editForm, shuffleQuestions: e.target.checked })}
								className='rounded'
							/>
							<Label htmlFor='shuffleQuestions'>Savollarni aralashtirish</Label>
						</div>

						<div className='flex items-center space-x-2'>
							<input
								type='checkbox'
								id='showResults'
								checked={editForm.showResults}
								onChange={(e) => setEditForm({ ...editForm, showResults: e.target.checked })}
								className='rounded'
							/>
							<Label htmlFor='showResults'>Natijalarni ko'rsatish</Label>
						</div>
					</div>

					<div className='flex space-x-2 pt-4'>
						<Button variant='outline' onClick={() => setIsEditDialogOpen(false)} className='flex-1'>
							Bekor qilish
						</Button>
						<Button onClick={handleUpdateTest} className='flex-1'>
							Saqlash
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
