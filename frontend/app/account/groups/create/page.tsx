'use client';
import { useEffect, useState } from 'react';
import GroupForm from '@/components/GroupForm';
import { request } from '@/configs/request';
import { useRouter } from 'next/navigation';
import PageLoader from '@/components/PageLoader';
import { useToast } from '@/hooks/use-toast';
import type { SubjectType } from '@/types/subject.type';
import { Card, CardContent } from '@/components/ui/card';

export default function CreateGroupPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<SubjectType[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                const [{ data: studentsRes }, { data: subjectsRes }] = await Promise.all([
                    request.get('/users', { params: { role: 'student' } }),
                    request.get('/subjects'),
                ]);
                setStudents((studentsRes || []).filter((u: any) => u.role === 'student'));
                setSubjects(subjectsRes || []);
            } catch {
                toast({ title: 'Xatolik', description: 'Ma`lumot yuklanmadi' });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [toast]);

    if (loading) return <PageLoader title='Yuklanmoqda...' fullscreen={false} />;

    const handleSubmit = async (payload: any) => {
        setSubmitting(true);
        try {
            const { data: created } = await request.post('/groups', payload);
            const payloadToken = created?.telegramStartPayload as string | undefined;
            if (payloadToken) {
                const bot = (process.env.NEXT_PUBLIC_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'EduOnePlatformbot').replace('@', '').trim();
                const link = `https://t.me/${bot}?start=${encodeURIComponent(payloadToken)}`;
                try {
                    if (navigator.clipboard) await navigator.clipboard.writeText(link);
                    toast({ title: 'Guruh yaratildi', description: `Telegram havola nusxalandi: ${link}` });
                } catch {
                    toast({ title: 'Guruh yaratildi', description: `Telegram havola: ${link}` });
                }
            } else {
                toast({ title: 'Guruh yaratildi' });
            }
            router.push('/account/groups');
        } catch (e) {
            toast({ title: 'Xatolik', description: 'Guruh yaratishda xatolik yuz berdi' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card>
            <CardContent>
            <GroupForm title='Guruh yaratish' students={students} subjects={subjects} onSubmit={handleSubmit} submitting={submitting} />
            </CardContent>
        </Card>
    );
}
