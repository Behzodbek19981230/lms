'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileText, Loader2 } from 'lucide-react';
import { request } from '@/configs/request';
import { useToast } from '@/components/ui/use-toast';

export default function StudentResults() {
	const { toast } = useToast();
	const [loading, setLoading] = useState(true);
	const [grades, setGrades] = useState<any[]>([]);

	const fetchGrades = async () => {
		try {
			setLoading(true);
			const res = await request.get('/students/grades');
			setGrades(res.data || []);
		} catch {
			toast({
				title: 'Xatolik',
				description: "Natijalar yuklanmadi",
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchGrades();
	}, []);

	if (loading) {
		return (
			<div className='min-h-[60vh] flex items-center justify-center'>
				<div className='text-center'>
					<Loader2 className='h-8 w-8 animate-spin mx-auto mb-3' />
					<p className='text-muted-foreground'>Natijalar yuklanmoqda...</p>
				</div>
			</div>
		);
	}

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between gap-3'>
				<div className='flex items-center gap-2'>
					<FileText className='h-5 w-5 text-primary' />
					<h1 className='text-xl font-semibold'>Mening natijalarim</h1>
				</div>
				<Button variant='outline' onClick={fetchGrades}>
					Yangilash
				</Button>
			</div>

			{grades.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2 text-base'>
							<AlertCircle className='h-4 w-4 text-muted-foreground' />
							Natija topilmadi
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-sm text-muted-foreground'>Hozircha natijalar mavjud emas.</p>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle className='text-base'>Oxirgi natijalar</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='overflow-x-auto'>
							<table className='w-full text-sm'>
								<thead>
									<tr className='border-b'>
										<th className='text-left py-2 pr-3 font-medium'>Tur</th>
										<th className='text-left py-2 pr-3 font-medium'>Fan</th>
										<th className='text-left py-2 pr-3 font-medium'>Nomi</th>
										<th className='text-left py-2 pr-3 font-medium'>Ball</th>
										<th className='text-left py-2 pr-3 font-medium'>Foiz</th>
										<th className='text-left py-2 pr-3 font-medium'>Sana</th>
									</tr>
								</thead>
								<tbody>
									{grades.map((g) => (
										<tr key={`${g.type}-${g.id}`} className='border-b last:border-b-0'>
											<td className='py-2 pr-3 whitespace-nowrap'>{g.type === 'exam' ? 'Imtihon' : 'Test'}</td>
											<td className='py-2 pr-3'>{g.subject || '-'}</td>
											<td className='py-2 pr-3'>{g.title || '-'}</td>
											<td className='py-2 pr-3 whitespace-nowrap'>
												{g.score}/{g.maxScore}
											</td>
											<td className='py-2 pr-3 whitespace-nowrap'>{g.percentage ?? 0}%</td>
											<td className='py-2 pr-3 whitespace-nowrap'>{String(g.date || '').slice(0, 10)}</td>
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
