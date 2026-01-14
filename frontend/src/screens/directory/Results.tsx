import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { request } from '@/configs/request';
import PageLoader from '@/components/PageLoader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, ListStartIcon } from 'lucide-react';
import moment from 'moment';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

interface ResultType {
	id: number;
	student_name?: string;
	center_name?: string;
	uniqueNumber: string;
	total: number;
	correctCount: number;
	wrongCount: number;
	blankCount: number;
	createdAt: string;
}

type ResultsMeta = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

type ResultsResponse =
	| ResultType[]
	| {
			data: ResultType[];
			meta: ResultsMeta;
	  };

const fetcher = async (url: string) => {
	const response = await request.get<ResultsResponse>(url);
	return response.data;
};

function toStartOfDay(dateStr: string) {
	return `${dateStr}T00:00:00.000`;
}

function toEndOfDay(dateStr: string) {
	return `${dateStr}T23:59:59.999`;
}

export default function Results() {
	const { toast } = useToast();
	const { user } = useAuth();
	const isTeacher = user?.role === 'teacher';
	const [sendingTelegram, setSendingTelegram] = useState(false);
	const [savingEdit, setSavingEdit] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editDraft, setEditDraft] = useState<{ correct: number; wrong: number } | null>(null);

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);

	// UI inputs (draft)
	const [nameDraft, setNameDraft] = useState('');
	const [variantDraft, setVariantDraft] = useState('');
	const [fromDraft, setFromDraft] = useState('');
	const [toDraft, setToDraft] = useState('');

	// Applied filters
	const [nameQ, setNameQ] = useState('');
	const [variantQ, setVariantQ] = useState('');
	const [fromQ, setFromQ] = useState('');
	const [toQ, setToQ] = useState('');

	const params = useMemo(() => {
		const p = new URLSearchParams();
		p.set('page', String(page));
		p.set('limit', String(limit));
		if (nameQ.trim()) p.set('q', nameQ.trim());
		if (variantQ.trim()) p.set('uniqueNumber', variantQ.trim());
		if (fromQ) p.set('from', toStartOfDay(fromQ));
		if (toQ) p.set('to', toEndOfDay(toQ));
		return p;
	}, [page, limit, nameQ, variantQ, fromQ, toQ]);

	const swrKey = useMemo(() => `/tests/results-list?${params.toString()}`, [params]);
	const { data, isLoading, mutate } = useSWR<ResultsResponse>(swrKey, fetcher);

	const { results, meta } = useMemo(() => {
		if (!data) {
			return {
				results: [] as ResultType[],
				meta: { page, limit, total: 0, totalPages: 1 } as ResultsMeta,
			};
		}
		if (Array.isArray(data)) {
			// Backward-compatible response (shouldn't happen when page/limit are set)
			return {
				results: data,
				meta: {
					page,
					limit,
					total: data.length,
					totalPages: 1,
				} as ResultsMeta,
			};
		}
		return {
			results: Array.isArray(data.data) ? data.data : [],
			meta: data.meta || ({ page, limit, total: 0, totalPages: 1 } as ResultsMeta),
		};
	}, [data, page, limit]);

	const safePage = Math.min(Math.max(1, meta.page || page), Math.max(1, meta.totalPages || 1));
	useEffect(() => {
		if (safePage !== page) setPage(safePage);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [safePage]);

	// Selection
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
	const effectiveResults = useMemo(() => {
		if (!editingId || !editDraft) return results;
		return results.map((r) =>
			r.id === editingId ? { ...r, correctCount: editDraft.correct, wrongCount: editDraft.wrong } : r
		);
	}, [results, editingId, editDraft]);

	const pageIds = useMemo(() => effectiveResults.map((r) => r.id), [effectiveResults]);
	const allOnPageSelected = useMemo(
		() => pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id)),
		[pageIds, selectedIds]
	);
	const someOnPageSelected = useMemo(
		() => pageIds.some((id) => selectedIds.has(id)) && !allOnPageSelected,
		[pageIds, selectedIds, allOnPageSelected]
	);
	const headerChecked = useMemo(() => {
		return someOnPageSelected ? ('indeterminate' as const) : allOnPageSelected;
	}, [someOnPageSelected, allOnPageSelected]);

	const toggleRow = (id: number, checked: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	};

	const toggleSelectAllOnPage = (checked: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			for (const id of pageIds) {
				if (checked) next.add(id);
				else next.delete(id);
			}
			return next;
		});
	};

	const applyFilters = () => {
		setPage(1);
		setNameQ(nameDraft);
		setVariantQ(variantDraft);
		setFromQ(fromDraft);
		setToQ(toDraft);
	};

	const sendSelectedToTelegram = async () => {
		if (selectedIds.size === 0) return;
		setSendingTelegram(true);
		try {
			const ids = Array.from(selectedIds);
			const resp = await request.post('/tests/results/send-telegram', { ids });
			toast({
				title: 'Telegramga yuborildi',
				description:
					resp?.data?.queuedMessages !== undefined
						? `${resp.data.queuedMessages} ta xabar navbatga qo‘yildi`
						: `${ids.length} ta natija yuborildi`,
			});
			setSelectedIds(new Set());
		} catch (e: any) {
			toast({
				variant: 'destructive',
				title: 'Xatolik',
				description: e?.response?.data?.message || e?.message || 'Telegramga yuborib bo‘lmadi',
			});
		} finally {
			setSendingTelegram(false);
		}
	};

	const resetFilters = () => {
		setPage(1);
		setNameDraft('');
		setVariantDraft('');
		setFromDraft('');
		setToDraft('');
		setNameQ('');
		setVariantQ('');
		setFromQ('');
		setToQ('');
	};

	const startEdit = (r: ResultType) => {
		setEditingId(r.id);
		setEditDraft({ correct: Number(r.correctCount) || 0, wrong: Number(r.wrongCount) || 0 });
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditDraft(null);
	};

	const clampNonNegInt = (v: unknown) => {
		const n = Number(v);
		if (!Number.isFinite(n)) return 0;
		return Math.max(0, Math.floor(n));
	};

	const applyCorrectChange = (r: ResultType, nextCorrectRaw: unknown) => {
		const total = Number(r.total) || 0;
		const blank = Number(r.blankCount) || 0;
		const max = Math.max(0, total - blank);
		let nextCorrect = clampNonNegInt(nextCorrectRaw);
		if (nextCorrect > max) nextCorrect = max;
		const nextWrong = Math.max(0, max - nextCorrect);
		setEditDraft({ correct: nextCorrect, wrong: nextWrong });
	};

	const applyWrongChange = (r: ResultType, nextWrongRaw: unknown) => {
		const total = Number(r.total) || 0;
		const blank = Number(r.blankCount) || 0;
		const max = Math.max(0, total - blank);
		let nextWrong = clampNonNegInt(nextWrongRaw);
		if (nextWrong > max) nextWrong = max;
		const nextCorrect = Math.max(0, max - nextWrong);
		setEditDraft({ correct: nextCorrect, wrong: nextWrong });
	};

	const saveEdit = async (id: number) => {
		if (!editDraft) return;
		setSavingEdit(true);
		try {
			await request.patch(`/tests/results/${id}`, {
				correctCount: editDraft.correct,
				wrongCount: editDraft.wrong,
			});
			toast({ title: 'Saqlab qo‘yildi' });
			cancelEdit();
			await mutate();
		} catch (e: any) {
			toast({
				variant: 'destructive',
				title: 'Xatolik',
				description: e?.response?.data?.message || e?.message || 'Natijani saqlab bo‘lmadi',
			});
		} finally {
			setSavingEdit(false);
		}
	};

	const reportSource = useMemo(() => {
		if (selectedIds.size === 0) return effectiveResults;
		return effectiveResults.filter((r) => selectedIds.has(r.id));
	}, [effectiveResults, selectedIds]);

	const report = useMemo(() => {
		const totalQuestions = reportSource.reduce((s, r) => s + (Number(r.total) || 0), 0);
		const correct = reportSource.reduce((s, r) => s + (Number(r.correctCount) || 0), 0);
		const wrong = reportSource.reduce((s, r) => s + (Number(r.wrongCount) || 0), 0);
		const blank = reportSource.reduce((s, r) => s + (Number(r.blankCount) || 0), 0);
		const percent = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;
		const correctPct = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;
		const wrongPct = totalQuestions > 0 ? (wrong / totalQuestions) * 100 : 0;
		const blankPct = totalQuestions > 0 ? (blank / totalQuestions) * 100 : 0;
		return {
			count: reportSource.length,
			totalQuestions,
			correct,
			wrong,
			blank,
			percent,
			correctPct,
			wrongPct,
			blankPct,
		};
	}, [reportSource]);

	const pieData = useMemo(
		() => [
			{ name: "To'g'ri", value: report.correct, color: '#22c55e' },
			{ name: "Noto'g'ri", value: report.wrong, color: '#ef4444' },
			{ name: "Bo'sh", value: report.blank, color: '#a1a1aa' },
		],
		[report.correct, report.wrong, report.blank]
	);

	const rowPercent = (r: ResultType) => {
		const total = Number(r.total) || 0;
		const correct = Number(r.correctCount) || 0;
		if (total <= 0) return 0;
		return (correct / total) * 100;
	};

	if (isLoading) {
		return <PageLoader title='Natijalar yuklanmoqda...' />;
	}

	return (
		<Card className='bg-gradient-card border-0'>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<div>
						<CardTitle className='flex items-center gap-2'>
							<ListStartIcon className='h-5 w-5' />
							Test natijalari
						</CardTitle>
						<CardDescription>Markazingizga tegishli barcha test natijalari ro‘yxati</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				{/* Report */}
				{effectiveResults.length > 0 ? (
					<div className='mb-4 rounded-lg border bg-card/50 backdrop-blur p-3'>
						<div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
							<div className='min-w-0'>
								<div className='text-sm text-muted-foreground'>
									Hisobot ({selectedIds.size > 0 ? 'tanlanganlar' : 'joriy sahifa'})
								</div>
								<div className='mt-1 flex items-baseline gap-2'>
									<div className='text-2xl font-semibold'>{report.percent.toFixed(1)}%</div>
									<div className='text-sm text-muted-foreground'>o‘rtacha</div>
								</div>
								<div className='mt-2'>
									<Progress value={Math.max(0, Math.min(100, report.percent))} className='h-2' />
								</div>
								<div className='mt-2 text-xs text-muted-foreground'>
									Soni: <span className='text-foreground font-medium'>{report.count}</span> |
									Savollar:
									<span className='text-foreground font-medium'> {report.totalQuestions}</span>
									{'  '}| ✅ {report.correct} ({report.correctPct.toFixed(1)}%) | ❌ {report.wrong} (
									{report.wrongPct.toFixed(1)}%) | ⬜ {report.blank} ({report.blankPct.toFixed(1)}%)
								</div>
							</div>

							<div className='w-full md:w-[260px] h-[180px]'>
								<ResponsiveContainer width='100%' height='100%'>
									<PieChart>
										<Tooltip formatter={(value: any, name: any) => [value, name]} />
										<Pie
											data={pieData}
											dataKey='value'
											nameKey='name'
											innerRadius={45}
											outerRadius={70}
											paddingAngle={3}
										>
											{pieData.map((entry) => (
												<Cell key={entry.name} fill={entry.color} />
											))}
										</Pie>
									</PieChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>
				) : null}

				{/* Filters */}
				<div className='mb-4 rounded-lg border bg-card/50 backdrop-blur p-3'>
					<div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
						<div>
							<Label>Ism / familiya</Label>
							<Input
								placeholder="O'quvchi qidirish..."
								value={nameDraft}
								onChange={(e) => setNameDraft(e.target.value)}
							/>
						</div>
						<div>
							<Label>Variant raqami</Label>
							<Input
								placeholder='Masalan: 12345'
								value={variantDraft}
								onChange={(e) => setVariantDraft(e.target.value)}
							/>
						</div>
						<div>
							<Label>Sanadan</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant='outline'
										className={cn(
											'w-full justify-start text-left font-normal',
											!fromDraft && 'text-muted-foreground'
										)}
									>
										<CalendarIcon className='mr-2 h-4 w-4' />
										{fromDraft ? fromDraft : <span>Sana tanlang</span>}
									</Button>
								</PopoverTrigger>
								<PopoverContent className='w-auto p-0' align='start'>
									<Calendar
										mode='single'
										selected={fromDraft ? parse(fromDraft, 'yyyy-MM-dd', new Date()) : undefined}
										onSelect={(date) => setFromDraft(date ? format(date, 'yyyy-MM-dd') : '')}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div>
							<Label>Sanagacha</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant='outline'
										className={cn(
											'w-full justify-start text-left font-normal',
											!toDraft && 'text-muted-foreground'
										)}
									>
										<CalendarIcon className='mr-2 h-4 w-4' />
										{toDraft ? toDraft : <span>Sana tanlang</span>}
									</Button>
								</PopoverTrigger>
								<PopoverContent className='w-auto p-0' align='start'>
									<Calendar
										mode='single'
										selected={toDraft ? parse(toDraft, 'yyyy-MM-dd', new Date()) : undefined}
										onSelect={(date) => setToDraft(date ? format(date, 'yyyy-MM-dd') : '')}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
					</div>
					<div className='mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
						<div className='text-sm text-muted-foreground'>
							Jami: <span className='font-medium text-foreground'>{meta.total}</span>
							{selectedIds.size > 0 ? (
								<>
									{' '}
									| Tanlangan: <span className='font-medium text-foreground'>{selectedIds.size}</span>
								</>
							) : null}
						</div>
						<div className='flex flex-col sm:flex-row sm:flex-wrap sm:justify-end gap-2 w-full sm:w-auto'>
							<Button
								className='w-full sm:w-auto'
								variant='secondary'
								onClick={sendSelectedToTelegram}
								disabled={selectedIds.size === 0 || sendingTelegram}
							>
								{sendingTelegram ? 'Yuborilmoqda...' : `Telegramga yuborish (${selectedIds.size})`}
							</Button>
							<div className='flex items-center gap-2 w-full sm:w-auto'>
								<Button className='flex-1 sm:flex-none' variant='outline' onClick={resetFilters}>
									Tozalash
								</Button>
								<Button className='flex-1 sm:flex-none' onClick={applyFilters}>
									Filterlash
								</Button>
							</div>
						</div>
					</div>
				</div>

				{/* Desktop table */}
				<div className='hidden md:block rounded-lg border bg-card/50 backdrop-blur overflow-x-auto'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className='text-center w-[48px]'>
									<Checkbox
										checked={headerChecked}
										onCheckedChange={(v) => toggleSelectAllOnPage(Boolean(v))}
										aria-label='Barchasini belgilash'
									/>
								</TableHead>
								<TableHead className='text-center'>ID</TableHead>
								<TableHead className='text-center'>O'quvchi</TableHead>
								<TableHead className='text-center'>Markaz</TableHead>
								<TableHead className='text-center'>Variant raqami</TableHead>
								<TableHead className='text-center'>Savollar</TableHead>
								<TableHead className='text-center'>To'g'ri</TableHead>
								<TableHead className='text-center'>Noto'g'ri</TableHead>
								<TableHead className='text-center'>Bo'sh</TableHead>
								<TableHead className='text-center'>%</TableHead>
								<TableHead className='text-center'>Yaratilgan</TableHead>
								{isTeacher ? <TableHead className='text-center'>Tahrirlash</TableHead> : null}
							</TableRow>
						</TableHeader>
						<TableBody>
							{effectiveResults.map((r) => (
								<TableRow key={r.id}>
									<TableCell align='center'>
										<Checkbox
											checked={selectedIds.has(r.id)}
											onCheckedChange={(v) => toggleRow(r.id, Boolean(v))}
											aria-label={`Natija ${r.id} ni belgilash`}
										/>
									</TableCell>
									<TableCell align='center'>{r.id}</TableCell>
									<TableCell align='center'>{r.student_name ?? '-'}</TableCell>
									<TableCell align='center'>{r.center_name ?? '-'}</TableCell>
									<TableCell align='center'>{r.uniqueNumber}</TableCell>
									<TableCell align='center'>{r.total}</TableCell>
									<TableCell align='center'>
										{isTeacher && editingId === r.id && editDraft ? (
											<Input
												type='number'
												min={0}
												value={editDraft.correct}
												onChange={(e) => applyCorrectChange(r, e.target.value)}
												className='h-8 w-[90px] text-center'
											/>
										) : (
											r.correctCount
										)}
									</TableCell>
									<TableCell align='center'>
										{isTeacher && editingId === r.id && editDraft ? (
											<Input
												type='number'
												min={0}
												value={editDraft.wrong}
												onChange={(e) => applyWrongChange(r, e.target.value)}
												className='h-8 w-[90px] text-center'
											/>
										) : (
											r.wrongCount
										)}
									</TableCell>
									<TableCell align='center'>{r.blankCount}</TableCell>
									<TableCell align='center'>
										<div className='flex flex-col items-center gap-1'>
											<span className='text-sm font-medium'>{rowPercent(r).toFixed(1)}%</span>
											<Progress
												value={Math.max(0, Math.min(100, rowPercent(r)))}
												className='h-1 w-[90px]'
											/>
										</div>
									</TableCell>
									<TableCell align='center'>
										{moment(r.createdAt).format('YYYY-MM-DD HH:mm:ss')}
									</TableCell>
									{isTeacher ? (
										<TableCell align='center'>
											{editingId === r.id && editDraft ? (
												<div className='flex items-center justify-center gap-2'>
													<Button
														size='sm'
														onClick={() => saveEdit(r.id)}
														disabled={savingEdit}
													>
														Saqlash
													</Button>
													<Button
														size='sm'
														variant='outline'
														onClick={cancelEdit}
														disabled={savingEdit}
													>
														Bekor
													</Button>
												</div>
											) : (
												<Button size='sm' variant='outline' onClick={() => startEdit(r)}>
													Tahrirlash
												</Button>
											)}
										</TableCell>
									) : null}
								</TableRow>
							))}
							{effectiveResults.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={isTeacher ? 12 : 11}
										className='text-center py-8 text-muted-foreground'
									>
										Natijalar topilmadi
									</TableCell>
								</TableRow>
							) : null}
						</TableBody>
					</Table>
				</div>

				{/* Mobile list */}
				<div className='md:hidden space-y-3'>
					{effectiveResults.length === 0 ? (
						<div className='rounded-lg border bg-card/50 backdrop-blur p-4 text-center text-sm text-muted-foreground'>
							Natijalar topilmadi
						</div>
					) : (
						effectiveResults.map((r) => (
							<div key={r.id} className='rounded-lg border bg-card/50 backdrop-blur p-3'>
								<div className='flex items-start justify-between gap-3'>
									<div className='pt-0.5'>
										<Checkbox
											checked={selectedIds.has(r.id)}
											onCheckedChange={(v) => toggleRow(r.id, Boolean(v))}
											aria-label={`Natija ${r.id} ni belgilash`}
										/>
									</div>
									<div className='min-w-0'>
										<div className='font-medium truncate'>{r.student_name ?? '-'}</div>
										<div className='text-xs text-muted-foreground mt-0.5 truncate'>
											Markaz: {r.center_name ?? '-'}
										</div>
									</div>
									<div className='text-xs text-muted-foreground whitespace-nowrap'>ID: {r.id}</div>
								</div>

								<div className='mt-3 grid grid-cols-1 gap-2 text-sm'>
									<div className='flex items-center justify-between'>
										<span className='text-muted-foreground'>Variant raqami</span>
										<span className='font-medium'>{r.uniqueNumber}</span>
									</div>
									<div className='flex items-center justify-between'>
										<span className='text-muted-foreground'>Savollar</span>
										<span className='font-medium'>{r.total}</span>
									</div>
									<div className='flex items-center justify-between'>
										<span className='text-muted-foreground'>To'g'ri</span>
										<span className='font-medium'>{r.correctCount}</span>
									</div>
									<div className='flex items-center justify-between'>
										<span className='text-muted-foreground'>Noto'g'ri</span>
										<span className='font-medium'>{r.wrongCount}</span>
									</div>
									<div className='flex items-center justify-between'>
										<span className='text-muted-foreground'>Bo'sh</span>
										<span className='font-medium'>{r.blankCount}</span>
									</div>
									<div className='flex items-center justify-between'>
										<span className='text-muted-foreground'>Natija</span>
										<span className='font-medium'>{rowPercent(r).toFixed(1)}%</span>
									</div>
									<div className='pt-1'>
										<Progress value={Math.max(0, Math.min(100, rowPercent(r)))} className='h-2' />
									</div>
									{isTeacher ? (
										<div className='pt-2'>
											{editingId === r.id && editDraft ? (
												<div className='grid grid-cols-2 gap-2'>
													<div className='col-span-1'>
														<Label>To\'g\'ri</Label>
														<Input
															type='number'
															min={0}
															value={editDraft.correct}
															onChange={(e) => applyCorrectChange(r, e.target.value)}
														/>
													</div>
													<div className='col-span-1'>
														<Label>Noto\'g\'ri</Label>
														<Input
															type='number'
															min={0}
															value={editDraft.wrong}
															onChange={(e) => applyWrongChange(r, e.target.value)}
														/>
													</div>
													<div className='col-span-2 flex gap-2'>
														<Button
															className='flex-1'
															onClick={() => saveEdit(r.id)}
															disabled={savingEdit}
														>
															Saqlash
														</Button>
														<Button
															className='flex-1'
															variant='outline'
															onClick={cancelEdit}
															disabled={savingEdit}
														>
															Bekor
														</Button>
													</div>
												</div>
											) : (
												<Button
													variant='outline'
													className='w-full'
													onClick={() => startEdit(r)}
												>
													Natijani tahrirlash
												</Button>
											)}
										</div>
									) : null}
									<div className='flex items-center justify-between'>
										<span className='text-muted-foreground'>Yaratilgan</span>
										<span className='font-medium'>
											{moment(r.createdAt).format('YYYY-MM-DD HH:mm')}
										</span>
									</div>
								</div>
							</div>
						))
					)}
				</div>

				{/* Pagination */}
				{meta.total > 0 ? (
					<div className='mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
						<div className='text-sm text-muted-foreground'>
							Sahifa <span className='font-medium text-foreground'>{safePage}</span> /{' '}
							<span className='font-medium text-foreground'>{meta.totalPages}</span>
						</div>
						<div className='flex items-center gap-2'>
							<div className='w-[110px]'>
								<Label>Sahifadagi son</Label>
								<Input
									type='number'
									min={1}
									max={200}
									value={limit}
									onChange={(e) => {
										const n = Number(e.target.value || 20);
										setPage(1);
										setLimit(Math.min(Math.max(1, n), 200));
									}}
								/>
							</div>
							<Button
								variant='outline'
								size='sm'
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={safePage <= 1}
							>
								Oldingi
							</Button>
							<Button
								variant='outline'
								size='sm'
								onClick={() => setPage((p) => Math.min(meta.totalPages || 1, p + 1))}
								disabled={safePage >= (meta.totalPages || 1)}
							>
								Keyingi
							</Button>
						</div>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
