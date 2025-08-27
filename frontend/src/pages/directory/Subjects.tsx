import { request } from '@/configs/request.ts';
import useSWR from 'swr';
import { SubjectType } from '@/types/subject.type.ts';
import DataTable, { Column } from '@/components/DataTable.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { BookOpen, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import OpenDialogButton from '@/components/modal/OpenDialogButton.tsx';
import { buttonProps } from '@/types/props.ts';
import { SubjectModal } from '@/components/modal/SubjectModal.tsx';
import { DeleteSubjectDialog } from '@/components/modal/DeleteSubjectDialog';

export default function Subjects() {
    const fetcher = async () => {
        const res = await request.get('/subjects');
        return res.data;
    };
    const { data, isLoading, mutate } = useSWR('/subjects', fetcher);

    const subjects = data || ([] as SubjectType[]);
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
            cell: (row) => row.category,
        },
        {
            header: () => 'Formulalar',
            cell: (row) => (row.hasFormulas ? 'Ha' : 'Yo‘q'),
        },
        {
            header: () => 'Yaratilgan sana',
            cell: (row) => new Date(row.createdAt).toLocaleDateString(),
        },
        {
            header: () => 'Yangilangan sana',
            cell: (row) => new Date(row.updatedAt).toLocaleDateString(),
        },
        {
            header: () => 'Amallar',
            cell: (row) => (
                <div className='flex gap-2'>
                    <OpenDialogButton
                        element={(props) => (
                            <Button {...props} className='bg-gradient-to-r from-primary to-secondary'>
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
        return <div>Yuklanmoqda...</div>;
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
                <div className='rounded-md border'>
                    <DataTable columns={columns} data={subjects} />
                </div>
            </CardContent>
        </Card>
    );
}
