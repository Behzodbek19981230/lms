'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CalendarDays, Loader2 } from 'lucide-react';
import { request } from '@/configs/request';
import { useToast } from '@/components/ui/use-toast';

function statusLabel(status: string) {
	if (status === 'present') return 'Kelgan';
	if (status === 'absent') return 'Kelmagan';
	if (status === 'late') return 'Kechikkan';
	if (status === 'excused') return 'Sababli';
	return status;
}

export default function StudentAttendance() {
	const { toast } = useToast();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<any>(null);

	const fetchAttendance = async () => {
		try {
			setLoading(true);
			const res = await request.get('/students/attendance');
			setData(res.data);
		} catch {
			toast({
				title: 'Xatolik',
				description: "Davomat yuklanmadi",
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAttendance();
	}, []);

	if (loading) {
		return (
			<div className='min-h-[60vh] flex items-center justify-center'>
				<div className='text-center'>
					<Loader2 className='h-8 w-8 animate-spin mx-auto mb-3' />
					<p className='text-muted-foreground'>Davomat yuklanmoqda...</p>
				</div>
			</div>
		);
	}

	const records: any[] = data?.records || [];
	const summary = data?.summary;

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between gap-3'>
				<div className='flex items-center gap-2'>
					<CalendarDays className='h-5 w-5 text-primary' />
					<h1 className='text-xl font-semibold'>Mening davomatim</h1>
				</div>
				<Button variant='outline' onClick={fetchAttendance}>
					Yangilash
				</Button>
			</div>

			{summary && (
				<div className='grid grid-cols-2 md:grid-cols-5 gap-3'>
					<Card>
						<CardHeader className='pb-2'>
							<CardTitle className='text-sm text-muted-foreground'>Jami</CardTitle>
						</CardHeader>
						<CardContent className='text-2xl font-semibold'>{summary.total ?? 0}</CardContent>
					</Card>
					<Card>
						<CardHeader className='pb-2'>
							<CardTitle className='text-sm text-muted-foreground'>Kelgan</CardTitle>
						</CardHeader>
						<CardContent className='text-2xl font-semibold'>{summary.present ?? 0}</CardContent>
					</Card>
					<Card>
						<CardHeader className='pb-2'>
							<CardTitle className='text-sm text-muted-foreground'>Kelmagan</CardTitle>
						</CardHeader>
						<CardContent className='text-2xl font-semibold'>{summary.absent ?? 0}</CardContent>
					</Card>
					<Card>
						<CardHeader className='pb-2'>
							<CardTitle className='text-sm text-muted-foreground'>Kechikkan</CardTitle>
						</CardHeader>
						<CardContent className='text-2xl font-semibold'>{summary.late ?? 0}</CardContent>
					</Card>
					<Card>
						<CardHeader className='pb-2'>
							<CardTitle className='text-sm text-muted-foreground'>Sababli</CardTitle>
						</CardHeader>
						<CardContent className='text-2xl font-semibold'>{summary.excused ?? 0}</CardContent>
					</Card>
				</div>
			)}

			{records.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2 text-base'>
							<AlertCircle className='h-4 w-4 text-muted-foreground' />
							Davomat topilmadi
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-sm text-muted-foreground'>Tanlangan davr bo‘yicha davomat yozuvlari yo‘q.</p>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle className='text-base'>Oxirgi davomat yozuvlari</CardTitle>
						{summary?.from && summary?.to && (
							<p className='text-sm text-muted-foreground'>
								{summary.from} — {summary.to}
							</p>
						)}
					</CardHeader>
					<CardContent>
						<div className='overflow-x-auto'>
							<table className='w-full text-sm'>
								<thead>
									<tr className='border-b'>
										<th className='text-left py-2 pr-3 font-medium'>Sana</th>
										<th className='text-left py-2 pr-3 font-medium'>Guruh</th>
										<th className='text-left py-2 pr-3 font-medium'>Holat</th>
										<th className='text-left py-2 pr-3 font-medium'>Izoh</th>
									</tr>
								</thead>
								<tbody>
									{records.map((r) => (
										<tr key={r.id} className='border-b last:border-b-0'>
											<td className='py-2 pr-3 whitespace-nowrap'>{r.date}</td>
											<td className='py-2 pr-3'>{r.group?.name || '-'}</td>
											<td className='py-2 pr-3 whitespace-nowrap'>{statusLabel(r.status)}</td>
											<td className='py-2 pr-3'>{r.notes || '-'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
