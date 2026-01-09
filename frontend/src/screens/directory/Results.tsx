import React from 'react';
import useSWR from 'swr';
import DataTable, { Column } from '@/components/DataTable';
import { request } from '@/configs/request';
import PageLoader from '@/components/PageLoader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListStartIcon } from 'lucide-react';
import moment from 'moment';

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

const fetcher = async (url: string) => {
	const response = await request.get<ResultType[]>(url);
	return response.data;
};

export default function Results() {
	const { data, isLoading } = useSWR<ResultType[]>('/tests/results-list', fetcher);
	const results = data || [];

	const columns: Column<ResultType>[] = [
		{ key: 'id', header: () => 'ID', cell: (r) => r.id },
		{ key: 'student_name', header: () => "O'quvchi", cell: (r) => r.student_name ?? '-' },
		{ key: 'center_name', header: () => 'Markaz', cell: (r) => r.center_name ?? '-' },
		{ key: 'uniqueNumber', header: () => 'Variant raqami', cell: (r) => r.uniqueNumber },
		{ key: 'total', header: () => 'Savollar soni', cell: (r) => r.total },
		{ key: 'correctCount', header: () => "To'g'ri javoblar", cell: (r) => r.correctCount },
		{ key: 'wrongCount', header: () => "Noto'g'ri javoblar", cell: (r) => r.wrongCount },
		{ key: 'blankCount', header: () => "Bo'sh javoblar", cell: (r) => r.blankCount },
		{
			key: 'createdAt',
			header: () => 'Yaratilgan vaqti',
			cell: (r) => moment(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
		},
	];

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
				{/* Desktop table */}
				<div className='hidden md:block rounded-lg border bg-card/50 backdrop-blur overflow-x-auto'>
					<DataTable columns={columns} data={results} />
				</div>

				{/* Mobile list */}
				<div className='md:hidden space-y-3'>
					{results.length === 0 ? (
						<div className='rounded-lg border bg-card/50 backdrop-blur p-4 text-center text-sm text-muted-foreground'>
							Natijalar topilmadi
						</div>
					) : (
						results.map((r) => (
							<div key={r.id} className='rounded-lg border bg-card/50 backdrop-blur p-3'>
								<div className='flex items-start justify-between gap-3'>
									<div className='min-w-0'>
										<div className='font-medium truncate'>{r.student_name ?? "-"}</div>
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
										<span className='text-muted-foreground'>Yaratilgan</span>
										<span className='font-medium'>{moment(r.createdAt).format('YYYY-MM-DD HH:mm')}</span>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</CardContent>
		</Card>
	);
}
