import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { request } from '@/configs/request';
import { Test, TestStatus, TestTypeEnum, UpdateTestType } from '@/types/test.type';
import PageLoader from '@/components/PageLoader';
import { ArrowLeft, Save } from 'lucide-react';

export default function TestEditPage() {
	const params = useParams();
	const testId = params?.testId as string | undefined;
	const router = useRouter();

	const [isLoading, setIsLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [test, setTest] = useState<Test | null>(null);

	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [type, setType] = useState<TestTypeEnum>(TestTypeEnum.OPEN);
	const [duration, setDuration] = useState(60);
	const [shuffleQuestions, setShuffleQuestions] = useState(true);
	const [showResults, setShowResults] = useState(true);

	useEffect(() => {
		if (!testId) return;
		(async () => {
			try {
				setIsLoading(true);
				const [{ data: t }] = await Promise.all([request.get(`/tests/${testId}`)]);
				setTest(t);
				setTitle(t.title || '');
				setDescription(t.description || '');
				setType(t.type || TestTypeEnum.OPEN);
				setDuration(t.duration || 60);
				setShuffleQuestions(Boolean(t.shuffleQuestions));
				setShowResults(Boolean(t.showResults));
			} finally {
				setIsLoading(false);
			}
		})();
	}, [testId]);

	const save = async () => {
		if (!testId) return;
		setSaving(true);
		try {
			const payload: UpdateTestType = {
				title,
				description: description || undefined,
				type,
				duration,
				shuffleQuestions,
				showResults,
			};
			await request.patch(`/tests/${testId}`, payload);
			router.push(`/account/test/${testId}/questions`);
		} finally {
			setSaving(false);
		}
	};

	if (isLoading) return <PageLoader title='Test ma’lumotlari yuklanmoqda...' />;
	if (!test) {
		return (
			<div className='min-h-screen bg-gradient-subtle flex items-center justify-center'>
				<div className='text-center'>
					<div className='text-lg text-destructive'>Test topilmadi</div>
					<Button onClick={() => router.back()} className='mt-4'>
						<ArrowLeft className='h-4 w-4 mr-2' /> Orqaga
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
						<div>
							<h1 className='text-2xl md:text-3xl font-bold text-foreground'>Testni tahrirlash</h1>
							<p className='text-sm text-muted-foreground mt-1'>
								{test.subject?.name} · ID: {test.id}
							</p>
						</div>
						<div className='flex flex-wrap items-center gap-2'>
							<Button variant='outline' size='sm' onClick={() => router.back()}>
								<ArrowLeft className='h-4 w-4 mr-2' />
								Orqaga
							</Button>
							<Button onClick={save} disabled={saving} size='sm'>
								<Save className='h-4 w-4 mr-2' />
								{saving ? 'Saqlanmoqda...' : 'Saqlash'}
							</Button>
						</div>
					</div>
				</div>
			</header>

			<div className='max-w-7xl mx-auto p-4 md:p-6 space-y-6'>
				<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
					{/* Left: settings */}
					<Card className='lg:col-span-1 border-border h-fit'>
						<CardHeader className='pb-3'>
							<CardTitle className='text-lg'>Asosiy ma'lumotlar</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='space-y-2'>
								<Label htmlFor='title' className='text-sm font-medium'>
									Test nomi
								</Label>
								<Input id='title' value={title} onChange={(e) => setTitle(e.target.value)} />
							</div>

							<div className='space-y-2'>
								<Label htmlFor='description' className='text-sm font-medium'>
									Tavsif (ixtiyoriy)
								</Label>
								<Textarea
									id='description'
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									rows={3}
									className='resize-none'
								/>
							</div>

							<div className='space-y-2'>
								<Label className='text-sm font-medium block'>Savollarni aralashtirish</Label>
								<div className='flex items-center gap-2'>
									<input
										id='shuffle'
										type='checkbox'
										checked={shuffleQuestions}
										onChange={(e) => setShuffleQuestions(e.target.checked)}
										className='w-4 h-4 rounded'
									/>
									<Label htmlFor='shuffle' className='text-sm text-muted-foreground cursor-pointer'>
										Ha, aralashtirilsin
									</Label>
								</div>
							</div>

							<div className='space-y-2'>
								<Label className='text-sm font-medium block'>Natijalarni ko'rsatish</Label>
								<div className='flex items-center gap-2'>
									<input
										id='show'
										type='checkbox'
										checked={showResults}
										onChange={(e) => setShowResults(e.target.checked)}
										className='w-4 h-4 rounded'
									/>
									<Label htmlFor='show' className='text-sm text-muted-foreground cursor-pointer'>
										Ha, ko'rsatilsin
									</Label>
								</div>
							</div>

							<div className='pt-4 border-t text-sm text-muted-foreground'>
								<div className='space-y-1'>
									<p>
										<span className='font-medium'>Yaratuvchi:</span> {test.teacher?.fullName}
									</p>
									<p>
										<span className='font-medium'>Holat:</span>{' '}
										<Badge variant='outline' className='text-xs'>
											{test.status}
										</Badge>
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Right: quick stats */}
					<Card className='lg:col-span-2 border-border'>
						<CardHeader className='pb-3'>
							<CardTitle className='text-lg'>Joriy holat</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
								<div>
									<Label className='text-xs text-muted-foreground'>Savollar soni</Label>
									<div className='text-2xl font-bold text-primary'>{test.totalQuestions || 0}</div>
								</div>
								<div>
									<Label className='text-xs text-muted-foreground'>Jami ball</Label>
									<div className='text-2xl font-bold text-primary'>{test.totalPoints || 0}</div>
								</div>
								<div>
									<Label className='text-xs text-muted-foreground'>Fan</Label>
									<div className='text-sm font-medium mt-1'>{test.subject?.name}</div>
								</div>
								<div>
									<Label className='text-xs text-muted-foreground'>Holat</Label>
									<div className='mt-1'>
										<Badge variant='secondary' className='text-xs'>
											{test.status}
										</Badge>
									</div>
								</div>
							</div>

							<div className='flex gap-2'>
								<Button
									variant='hero'
									onClick={() => router.push(`/account/test/${test.id}/questions`)}
								>
									Savollarni boshqarish
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
