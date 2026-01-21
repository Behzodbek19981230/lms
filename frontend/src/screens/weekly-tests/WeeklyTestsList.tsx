import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import { request } from '@/configs/request';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Plus, ListChecks, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { Test } from '@/types/test.type';
import { isWeeklyDescription } from './constants';
import { useAuth } from '@/contexts/AuthContext';

type CenterLite = { id: number; name: string };
type TeacherWithCenter = Test['teacher'] & { center?: CenterLite | null };
type WeeklyTestDto = Omit<Test, 'teacher'> & { teacher: TeacherWithCenter };

export default function WeeklyTestsList() {
	const { toast } = useToast();
	const { user } = useAuth();
	const isSuperadmin = user?.role === 'superadmin';
	const [tests, setTests] = useState<WeeklyTestDto[]>([]);
	const [loading, setLoading] = useState(false);
	const warmedRef = useRef<Set<number>>(new Set());

	const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
	const inferred = apiBase.replace(/\/?api\/?$/, '');
	const fileBase = (process.env.NEXT_PUBLIC_FILE_BASE_URL || inferred).replace(/\/$/, '');
	const buildPublicUrl = (p: string) => (fileBase ? `${fileBase}${p}` : p);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const { data } = await request.get('/tests/weekly');
				setTests(Array.isArray(data) ? data : []);
			} catch (e: any) {
				toast({
					title: 'Xatolik',
					description: e?.response?.data?.message || 'Haftalik testlar yuklanmadi',
					variant: 'destructive',
				});
			} finally {
				setLoading(false);
			}
		};
		void load();
	}, [toast]);

	const weeklyTests = useMemo(() => {
		return tests
			.filter((t) => isWeeklyDescription(t.description))
			.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	}, [tests]);

	useEffect(() => {
		if (weeklyTests.length === 0) return;
		const toWarm = weeklyTests.filter((t) => !warmedRef.current.has(Number(t.id)));
		if (toWarm.length === 0) return;
		toWarm.forEach((t) => warmedRef.current.add(Number(t.id)));

		void Promise.allSettled(
			toWarm.map((t) =>
				request.post(`/tests/${Number(t.id)}/printable-html`, {
					shuffleQuestions: true,
					shuffleAnswers: true,
					ensureExists: true,
				}),
			),
		);
	}, [weeklyTests]);

	const deleteTest = async (id: number) => {
		const ok = window.confirm("Haqiqatan ham bu haftalik testni o'chirmoqchimisiz?");
		if (!ok) return;
		try {
			await request.delete(`/tests/${id}`);
			setTests((prev) => prev.filter((t) => Number(t.id) !== Number(id)));
			toast({ title: "O'chirildi", description: 'Test muvaffaqiyatli o‘chirildi' });
		} catch (e: any) {
			toast({
				title: 'Xatolik',
				description: e?.response?.data?.message || "Testni o'chirib bo'lmadi",
				variant: 'destructive',
			});
		}
	};

	return (
		<div className='space-y-4'>
			<Card>
				<CardHeader>
					<CardTitle className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
						<span className='flex items-center gap-2'>
							<CalendarDays className='h-5 w-5 text-primary' /> Haftalik testlar
						</span>
						<div className='flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto'>
							{!isSuperadmin ? (
								<Link href='/account/weekly-tests/create' className='w-full sm:w-auto'>
									<Button className='w-full sm:w-auto gap-2'>
										<Plus className='h-4 w-4' /> Yangi haftalik test
									</Button>
								</Link>
							) : null}
							<Badge variant='secondary' className='w-fit'>
								{weeklyTests.length} ta
							</Badge>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{/* Mobile list/cards */}
					<div className='md:hidden space-y-3'>
						{loading ? (
							<Card className='p-4'>Yuklanmoqda...</Card>
						) : weeklyTests.length === 0 ? (
							<Card className='p-4'>Hozircha haftalik testlar yo'q</Card>
						) : (
							weeklyTests.map((t) => {
								const testUrl = buildPublicUrl(`/uploads/weekly-tests/weekly-test-${t.id}.html`);
								const answersUrl = buildPublicUrl(
									`/uploads/weekly-tests/weekly-test-${t.id}-answers.html`,
								);
								return (
									<Card key={t.id} className='p-4'>
										<div className='flex items-start justify-between gap-3'>
											<div className='min-w-0'>
												<div className='text-sm text-muted-foreground truncate'>
													{t.subject?.name || '-'}
												</div>
												<div className='font-medium truncate'>{t.title}</div>
												{isSuperadmin ? (
													<div className='text-xs text-muted-foreground mt-1 truncate'>
														{t.teacher?.fullName || '-'}
														{t.teacher?.center?.name ? ` • ${t.teacher.center.name}` : ''}
													</div>
												) : null}
												<div className='text-xs text-muted-foreground mt-1'>
													{t.totalQuestions} savol • {t.duration} daqiqa
												</div>
											</div>
											<div className='shrink-0'>
												<Badge variant='outline'>{t.totalQuestions}</Badge>
											</div>
										</div>

										<div className='mt-3 flex gap-2'>
											<Link href={`/account/test/${t.id}/questions`} className='w-full'>
												<Button size='sm' variant='outline' className='w-full gap-2'>
													<ListChecks className='h-4 w-4' /> Savollar
												</Button>
											</Link>
											<Button
												size='sm'
												variant='destructive'
												className='gap-2'
												onClick={() => deleteTest(Number(t.id))}
											>
												<Trash2 className='h-4 w-4' /> O‘chirish
											</Button>
										</div>

										<div className='mt-2 grid grid-cols-1 gap-2 text-sm'>
											<a
												href={testUrl}
												target='_blank'
												rel='noreferrer'
												className='text-primary underline'
											>
												Test linki
											</a>
											<a
												href={answersUrl}
												target='_blank'
												rel='noreferrer'
												className='text-primary underline'
											>
												Javoblar linki
											</a>
										</div>
									</Card>
								);
							})
						)}
					</div>

					{/* Desktop table */}
					<div className='hidden md:block overflow-x-auto'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Fan</TableHead>
									{isSuperadmin ? <TableHead>O'qituvchi</TableHead> : null}
									{isSuperadmin ? <TableHead>Markaz</TableHead> : null}
									<TableHead>Hafta oralig'i</TableHead>
									<TableHead>Savollar</TableHead>
									<TableHead>Davomiyligi</TableHead>
									<TableHead>Yaratilgan</TableHead>
									<TableHead>Amallar</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{loading ? (
									<TableRow>
										<TableCell colSpan={isSuperadmin ? 8 : 6}>Yuklanmoqda...</TableCell>
									</TableRow>
								) : weeklyTests.length === 0 ? (
									<TableRow>
										<TableCell colSpan={isSuperadmin ? 8 : 6}>
											Hozircha haftalik testlar yo'q
										</TableCell>
									</TableRow>
								) : (
									weeklyTests.map((t) => {
										const testUrl = buildPublicUrl(
											`/uploads/weekly-tests/weekly-test-${t.id}.html`,
										);
										const answersUrl = buildPublicUrl(
											`/uploads/weekly-tests/weekly-test-${t.id}-answers.html`,
										);
										return (
											<TableRow key={t.id}>
												<TableCell>{t.subject?.name || '-'}</TableCell>
												{isSuperadmin ? (
													<TableCell>{t.teacher?.fullName || '-'}</TableCell>
												) : null}
												{isSuperadmin ? (
													<TableCell>{t.teacher?.center?.name || '-'}</TableCell>
												) : null}
												<TableCell>
													<div className='font-medium'>{t.title}</div>
												</TableCell>
												<TableCell>
													<Badge variant='outline'>{t.totalQuestions}</Badge>
												</TableCell>
												<TableCell>{t.duration} daqiqa</TableCell>
												<TableCell>{new Date(t.createdAt).toLocaleString('uz-UZ')}</TableCell>
												<TableCell>
													<div className='flex items-center gap-2'>
														<Link href={`/account/test/${t.id}/questions`}>
															<Button size='sm' variant='outline' className='gap-2'>
																<ListChecks className='h-4 w-4' /> Savollar
															</Button>
														</Link>
														<Button
															size='sm'
															variant='destructive'
															className='gap-2'
															onClick={() => deleteTest(Number(t.id))}
														>
															<Trash2 className='h-4 w-4' /> O‘chirish
														</Button>
													</div>
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
