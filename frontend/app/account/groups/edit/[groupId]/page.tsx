'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GroupForm from '@/components/GroupForm';
import { request } from '@/configs/request';
import PageLoader from '@/components/PageLoader';
import { useToast } from '@/hooks/use-toast';
import type { SubjectType } from '@/types/subject.type';

export default function EditGroupPage() {
    const params = useParams();
    const groupId = params?.groupId as string | undefined;
    const [students, setStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<SubjectType[]>([]);
    const [group, setGroup] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        if (!groupId) return;
        const load = async () => {
            try {
                // Backend doesn't expose GET /groups/:id — fetch the list and find the group
                const [{ data: groupsRes }, { data: studentsRes }, { data: subjectsRes }] = await Promise.all([
                    request.get('/groups/me'),
                    request.get('/users', { params: { role: 'student' } }),
                    request.get('/subjects'),
                ]);
                const found = (groupsRes || []).find((g: any) => String(g.id) === String(groupId));
                if (!found) {
                    setGroup(null);
                    toast({ title: 'Guruh topilmadi' });
                } else {
                    setGroup(found);
                }
                setStudents((studentsRes || []).filter((u: any) => u.role === 'student'));
                setSubjects(subjectsRes || []);
            } catch {
                toast({ title: 'Xatolik', description: 'Ma`lumot yuklashda xatolik yuz berdi' });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [groupId, toast]);

    if (loading) return <PageLoader title='Guruh yuklanmoqda...' fullscreen={false} />;
    if (!group) return <div className='p-6'>Guruh topilmadi</div>;

    const initial = {
        name: group.name,
        description: group.description || '',
        subjectId: group.subjectId ? String(group.subjectId) : '',
        studentIds: group.studentIds || [],
        daysOfWeek: group.daysOfWeek || [],
        startTime: group.startTime,
        endTime: group.endTime,
    };

    const handleSubmit = async (payload: any) => {
        setSubmitting(true);
        try {
            await request.patch(`/groups/${groupId}`, payload);
            toast({ title: 'Guruh yangilandi' });
            router.push('/account/groups');
        } catch {
            toast({ title: 'Xatolik', description: 'Guruhni yangilashda xatolik yuz berdi' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className='p-6 max-w-3xl'>
            <GroupForm title={`Guruhni tahrirlash: ${group.name}`} initialValues={initial} students={students} subjects={subjects} onSubmit={handleSubmit} submitting={submitting} onCancel={() => router.push('/account/groups')} />
        </div>
    );
}
