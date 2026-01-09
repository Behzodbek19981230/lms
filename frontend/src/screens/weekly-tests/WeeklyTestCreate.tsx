'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import { CalendarDays, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { request } from '@/configs/request';

type SubjectLite = {
	id: number;
	name: string;
	nameUz?: string;
	category?: string;
	hasFormulas?: boolean;
};

export default function WeeklyTestCreate() {
	const router = useRouter();
	const { toast } = useToast();
	const [subjects, setSubjects] = useState<SubjectLite[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
	const [range, setRange] = useState<DateRange | undefined>();

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const { data } = await request.get('/subjects/me');
				setSubjects(Array.isArray(data) ? data : []);
			} catch (e: any) {
				setSubjects([]);
				toast({
					title: 'Xatolik',
					description: e?.response?.data?.message || "Fanlarni yuklab bo'lmadi",
					variant: 'destructive',
				});
			} finally {
				setLoading(false);
			}
		};
		void load();
	}, [toast]);

	const selectedSubject = useMemo(
		() => (selectedSubjectId ? subjects.find((s) => s.id === selectedSubjectId) || null : null),
		[subjects, selectedSubjectId]
	);

	const weeklyTitle = useMemo(() => {
		if (!range?.from || !range?.to) return '';
		const fromStr = format(range.from, 'dd.MM.yyyy', { locale: uz });
		const toStr = format(range.to, 'dd.MM.yyyy', { locale: uz });
		return `${fromStr} dan ${toStr} gacha`;
	}, [range]);

	const canContinue = Boolean(selectedSubjectId && range?.from && range?.to);

	const continueToQuestionBuilder = () => {
		if (!selectedSubjectId) {
			toast({ title: 'Fan tanlanmagan', description: 'Iltimos, avval fanni tanlang', variant: 'destructive' });
			return;
		}
		if (!range?.from || !range?.to) {
			toast({ title: 'Sana tanlanmagan', description: 'Iltimos, hafta intervalini tanlang', variant: 'destructive' });
			return;
		}

		const fromIso = format(range.from, 'yyyy-MM-dd');
		const toIso = format(range.to, 'yyyy-MM-dd');
		router.push(
			`/account/test/create?subject=${selectedSubjectId}&title=${encodeURIComponent(weeklyTitle)}&weeklyFrom=${fromIso}&weeklyTo=${toIso}&fixedTitle=1&weekly=1`
		);
	};

	return (
		<div className='min-h-screen bg-gradient-subtle'>
			<header className='bg-card border-b border-border p-3 sm:p-6'>
				<div className='flex flex-col gap-2'>
					<div className='flex items-center gap-2'>
						<CalendarDays className='h-5 w-5 text-primary' />
						<h1 className='text-xl sm:text-2xl md:text-3xl font-bold'>Haftalik test yaratish</h1>
					</div>
					<p className='text-muted-foreground'>Avval fanni tanlang, hafta oralig'ini belgilang, so'ng savollarni kiriting</p>
				</div>
			</header>

			<main className='p-3 sm:p-4 md:p-6 space-y-6'>
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center justify-between gap-3'>
							<span>Fan tanlash</span>
							{selectedSubject ? (
								<Badge variant='secondary' className='flex items-center gap-2'>
									<CheckCircle2 className='h-4 w-4' />
									Tanlandi
								</Badge>
							) : null}
						</CardTitle>
						<CardDescription>Haftalik test qaysi fan bo'yicha bo'lishini tanlang</CardDescription>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div className='text-sm text-muted-foreground'>Yuklanmoqda...</div>
						) : subjects.length === 0 ? (
							<div className='text-sm text-muted-foreground'>Sizga biriktirilgan fanlar topilmadi</div>
						) : (
							<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
								{subjects.map((s) => {
									const active = selectedSubjectId === s.id;
									return (
										<button
											key={s.id}
											type='button'
											onClick={() => setSelectedSubjectId(s.id)}
											className={
												'w-full text-left rounded-xl border p-4 bg-card hover:bg-muted/50 transition-colors ' +
												(active ? 'border-primary ring-1 ring-primary/30' : 'border-border')
											}
										>
											<div className='font-semibold truncate'>{s.nameUz || s.name}</div>
											<div className='mt-2 flex flex-wrap gap-2'>
												{s.category ? <Badge variant='outline'>{s.category}</Badge> : null}
												{s.hasFormulas ? (
													<Badge variant='outline' className='text-green-600 border-green-600'>
														LaTeX
													</Badge>
												) : null}
											</div>
										</button>
									);
								})}
							</div>
						)}
					</CardContent>
				</Card>

				{selectedSubjectId ? (
					<div className='space-y-4'>
						<Card>
							<CardHeader>
								<CardTitle>Test tuzish</CardTitle>
								<CardDescription>
									Tanlangan fan:{' '}
									<span className='font-medium'>{selectedSubject?.nameUz || selectedSubject?.name}</span>
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div className='grid gap-4 md:grid-cols-2'>
									<div className='space-y-2'>
										<Label>Hafta oralig'i</Label>
										<Popover>
											<PopoverTrigger asChild>
												<Button
													variant='outline'
													className={cn(
														'w-full justify-start text-left font-normal',
														(!range?.from || !range?.to) && 'text-muted-foreground'
													)}
												>
													<CalendarIcon className='mr-2 h-4 w-4' />
													{range?.from && range?.to ? (
														`${format(range.from, 'dd.MM.yyyy', { locale: uz })} — ${format(range.to, 'dd.MM.yyyy', { locale: uz })}`
													) : (
														<span>Sana oralig'ini tanlang</span>
													)}
												</Button>
										</PopoverTrigger>
										<PopoverContent className='w-auto p-0' align='start'>
											<Calendar mode='range' selected={range} onSelect={setRange} initialFocus numberOfMonths={2} />
										</PopoverContent>
									</Popover>
									<p className='text-xs text-muted-foreground'>Boshlanish va tugash sanani tanlang</p>
								</div>
								<div className='space-y-2'>
									<Label>Test nomi</Label>
									<Input value={weeklyTitle} readOnly placeholder="Sana oralig'ini tanlang" />
									<p className='text-xs text-muted-foreground'>Test nomi avtomatik sana oralig'idan olinadi</p>
								</div>
							</div>

							<div className='flex flex-col sm:flex-row gap-2 justify-end'>
								<Button onClick={continueToQuestionBuilder} disabled={!canContinue} className='w-full sm:w-auto'>
									Savol qo'shish (test tuzish)
								</Button>
							</div>
						</CardContent>
					</Card>

						<div className='flex justify-end'>
							<Button variant='outline' onClick={() => setSelectedSubjectId(null)}>
								Boshqa fanni tanlash
							</Button>
						</div>
					</div>
				) : null}
			</main>
		</div>
	);
}
