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
    student_id?: number;
    center_id?: number;
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
}

export default function Results() {
    const { data, isLoading } = useSWR<ResultType[]>('/tests/results-list', fetcher);
    const results = data || [];

    const columns: Column<ResultType>[] = [
        { header: () => "ID", cell: r => r.id },
        { header: () => "Talaba ID", cell: r => r.student_id ?? '-' },
        { header: () => "Markaz ID", cell: r => r.center_id ?? '-' },
        { header: () => "Variant raqami", cell: r => r.uniqueNumber },
        { header: () => "Savollar soni", cell: r => r.total },
        { header: () => "To'g'ri javoblar", cell: r => r.correctCount },
        { header: () => "Noto'g'ri javoblar", cell: r => r.wrongCount },
        { header: () => "Bo'sh javoblar", cell: r => r.blankCount },
        { header: () => "Yaratilgan vaqti", cell: r => moment(r.createdAt).format('YYYY-MM-DD HH:mm:ss') },
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
                <div className='rounded-lg border bg-card/50 backdrop-blur  overflow-x-scroll'>
                    <DataTable columns={columns} data={results} />
                </div>
            </CardContent>
        </Card>

    );
}
