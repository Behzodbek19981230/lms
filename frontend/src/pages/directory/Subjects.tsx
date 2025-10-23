import { request } from '@/configs/request.ts';
import useSWR from 'swr';
import { SubjectType, SubjectCategory, SubjectCategoryLabels } from '@/types/subject.type.ts';
import DataTable, { Column } from '@/components/DataTable.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { BookOpen, Pencil, Trash2, PlusCircle, FlaskConical, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import OpenDialogButton from '@/components/modal/OpenDialogButton.tsx';
import { buttonProps } from '@/types/props.ts';
import { SubjectModal } from '@/components/modal/SubjectModal.tsx';
import { DeleteSubjectDialog } from '@/components/modal/DeleteSubjectDialog';
import { Badge } from '@/components/ui/badge.tsx';
import { Link } from 'react-router-dom';
import moment from 'moment';
import PageLoader from '@/components/PageLoader';
import 'moment/locale/uz';

moment.locale('uz');

export default function Subjects() {
    const fetcher = async () => {
        const res = await request.get('/subjects');
        return res.data;
    };
    const { data, isLoading, mutate } = useSWR('/subjects', fetcher);

    const subjects = data || ([] as SubjectType[]);

    const renderCategory = (category?: SubjectCategory | string) => {
        if (!category) return <Badge variant='outline'>Noma‘lum</Badge>;
        const label = SubjectCategoryLabels[category as SubjectCategory] || String(category);
        const colorClass =
            category === SubjectCategory.exact_science
                ? 'bg-blue-100 text-blue-800'
                : category === SubjectCategory.social_science
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 text-gray-800';
        const cfg = { label, className: colorClass };
        return <Badge className={cfg.className}>{cfg.label}</Badge>;
    };
    const columns: Column<SubjectType>[] = [
        {
            header: () => 'Nomi',
            cell: (row) => row.name,
        },
        {
            header: () => 'Tavsif',
            cell: (row) => row.description,
        },
        {
            header: () => 'Kategoriya',
            cell: (row) => renderCategory(row.category),
        },
        {
            header: () => 'Formulalar',
            cell: (row) => (
                <div className='flex items-center gap-2'>
                    {row.hasFormulas ? (
                        <Badge variant='outline' className='border-green-600 text-green-700'>
                            <FlaskConical className='h-3 w-3 mr-1' /> LaTeX
                        </Badge>
                    ) : (
                        <Badge variant='secondary' className='text-muted-foreground'>Yo‘q</Badge>
                    )}
                </div>
            ),
        },
        {
            header: () => 'Yaratilgan sana',
            cell: (row) => (
                <div className='leading-tight'>
                    <div className='font-medium'>{moment(row.createdAt).format('DD.MM.YYYY')}</div>
                    <div className='text-xs text-muted-foreground'>{moment(row.createdAt).fromNow()}</div>
                </div>
            ),
        },
        {
            header: () => 'Yangilangan sana',
            cell: (row) => (
                <div className='leading-tight'>
                    <div className='font-medium'>{moment(row.updatedAt).format('DD.MM.YYYY')}</div>
                    <div className='text-xs text-muted-foreground'>{moment(row.updatedAt).fromNow()}</div>
                </div>
            ),
        },
        {
            header: () => 'Amallar',
            cell: (row) => (
                <div className='flex flex-wrap gap-2'>
                    <Button asChild variant='default' className='bg-green-600 hover:bg-green-700'>
                        <Link to={`/account/subject/${row.id}/tests`}>
                            <Eye className='h-4 w-4 mr-1' /> 
                        </Link>
                    </Button>

                    <OpenDialogButton
                        element={(props) => (
                            <Button {...props} className=' from-primary to-secondary'>
                                <Pencil className='h-4 w-4' />
                            </Button>
                        )}
                        elementProps={{
                            ...buttonProps('Tahrirlash'),
                        }}
                        dialog={SubjectModal}
                        dialogProps={{
                            defaultValues: {
                                id: row.id,
                                name: row.name,
                                description: row.description,
                                category: row.category,
                                hasFormulas: row.hasFormulas,
                            },
                            onSuccess: () => mutate(),
                        }}
                    />
                    <OpenDialogButton
                        element={(props) => (
                            <Button {...props} variant='destructive'>
                                <Trash2 className='h-4 w-4' />
                            </Button>
                        )}
                        elementProps={{
                            ...buttonProps('O‘chirish'),
                        }}
                        dialog={DeleteSubjectDialog}
                        dialogProps={{
                            id: row.id,
                            name: row.name,
                            onSuccess: () => mutate(),
                        }}
                    />
                </div>
            ),
        },
    ];

    if (isLoading) {
        return <PageLoader title='Fanlar yuklanmoqda...' />;
    }

    return (
        <Card className='bg-gradient-card border-0'>
            <CardHeader>
                <div className='flex items-center justify-between'>
                    <div>
                        <CardTitle className='flex items-center gap-2'>
                            <BookOpen className='h-5 w-5' />
                            Fanlar
                        </CardTitle>
                        <CardDescription>Markazingizga tegishli barcha fanlar ro‘yxati</CardDescription>
                    </div>
                    <OpenDialogButton
                        element={(props) => (
                            <Button {...props} className='bg-gradient-to-r from-primary to-secondary'>
                                Yangi fan qo‘shish
                            </Button>
                        )}
                        elementProps={{
                            ...buttonProps('Yangi fan qo‘shish'),
                        }}
                        dialog={SubjectModal}
                        dialogProps={{
                            defaultValues: {
                                id: '' as any,
                                name: '',
                                description: '',
                                category: '',
                                hasFormulas: false,
                            },
                            onSuccess: () => mutate(),
                        }}
                    />
                </div>
            </CardHeader>

            <CardContent>
                <div className='rounded-lg border bg-card/50 backdrop-blur  overflow-x-scroll'>
                    <DataTable columns={columns} data={subjects} />
                </div>
            </CardContent>
        </Card>
    );
}
