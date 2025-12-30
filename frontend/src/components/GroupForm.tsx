'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { SubjectType } from '@/types/subject.type';

type UserLite = { id: number; firstName: string; lastName: string; role: string };

const days = [
    { value: 'monday', label: 'Dushanba' },
    { value: 'tuesday', label: 'Seshanba' },
    { value: 'wednesday', label: 'Chorshanba' },
    { value: 'thursday', label: 'Payshanba' },
    { value: 'friday', label: 'Juma' },
    { value: 'saturday', label: 'Shanba' },
    { value: 'sunday', label: 'Yakshanba' },
];

interface GroupFormProps {
    title?: string;
    initialValues?: Partial<{
        name: string;
        description: string;
        subjectId: string;
        studentIds: number[];
        daysOfWeek: string[];
        startTime: string;
        endTime: string;
    }>;
    students: UserLite[];
    subjects: SubjectType[];
    submitting?: boolean;
    onSubmit: (payload: any) => Promise<any>;
    onCancel?: () => void;
}

export default function GroupForm({ title, initialValues = {}, students, subjects, submitting, onSubmit, onCancel }: GroupFormProps) {
    const { toast } = useToast();
    const [form, setForm] = useState({
        name: initialValues.name || '',
        description: initialValues.description || '',
        subjectId: initialValues.subjectId || '',
        studentIds: initialValues.studentIds || [],
        daysOfWeek: initialValues.daysOfWeek || [],
        startTime: initialValues.startTime || '09:00',
        endTime: initialValues.endTime || '10:30',
    });

    const selectedCount = form.studentIds.length;
    const canSubmit = form.name && form.daysOfWeek.length > 0 && form.startTime && form.endTime && (form.startTime < form.endTime);

    const handleSubmit = async () => {
        if (!canSubmit) {
            toast({ title: 'Xatolik', description: 'Iltimos forma to‘liq to‘ldiring' });
            return;
        }
        await onSubmit({
            name: form.name,
            description: form.description || undefined,
            subjectId: form.subjectId ? Number(form.subjectId) : undefined,
            studentIds: form.studentIds,
            daysOfWeek: form.daysOfWeek,
            startTime: form.startTime,
            endTime: form.endTime,
        });
    };

    return (
        <div className="space-y-4">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                    <div>
                        <Label>Guruh nomi</Label>
                        <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
                    </div>

                    <div>
                        <Label>Tavsif</Label>
                        <Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} rows={4} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label>Fan</Label>
                            <Select value={form.subjectId} onValueChange={(v) => setForm(p => ({ ...p, subjectId: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Fan tanlang (ixtiyoriy)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map(s => (
                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Kunlar</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                {days.map(d => (
                                    <label key={d.value} className="flex items-start gap-2 text-sm min-w-0">
                                        <Checkbox checked={form.daysOfWeek.includes(d.value)} onCheckedChange={(v) => {
                                            setForm(p => ({
                                                ...p,
                                                daysOfWeek: v ? [...p.daysOfWeek, d.value] : p.daysOfWeek.filter(x => x !== d.value),
                                            }));
                                        }} />
                                        <span className="whitespace-normal">{d.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Boshlanish vaqti</Label>
                            <Input type="time" value={form.startTime} onChange={(e) => setForm(p => ({ ...p, startTime: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Tugash vaqti</Label>
                            <Input type="time" value={form.endTime} onChange={(e) => setForm(p => ({ ...p, endTime: e.target.value }))} />
                        </div>
                    </div>

                    {form.startTime >= form.endTime && (
                        <div className="text-sm text-destructive">Boshlanish vaqti tugash vaqtidan oldin bo‘lishi kerak.</div>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                        <Label>O'quvchilar ({selectedCount} tanlandi)</Label>
                        <div className="p-3 rounded-md border bg-muted/50">
                            <div className="flex flex-wrap gap-2">
                                {form.studentIds.map(id => {
                                    const s = students.find(x => x.id === id);
                                    if (!s) return null;
                                    return (
                                        <Badge key={id} variant='outline' className='flex items-center gap-2'>
                                            <Avatar className='h-6 w-6'>
                                                <AvatarFallback className='text-xs'>{(s.firstName?.[0]||'')+(s.lastName?.[0]||'')}</AvatarFallback>
                                            </Avatar>
                                            <span className='text-xs'>{s.firstName} {s.lastName}</span>
                                            <button onClick={() => setForm(p => ({ ...p, studentIds: p.studentIds.filter(x => x !== id) }))} className='ml-2 text-muted-foreground'>✕</button>
                                        </Badge>
                                    );
                                })}
                            </div>

                            <div className='mt-3 max-h-40 overflow-auto border rounded-md p-2 bg-white'>
                                {students.map(st => (
                                    <label key={st.id} className="flex items-center gap-2 text-sm py-1">
                                        <Checkbox
                                            checked={form.studentIds.includes(st.id)}
                                            onCheckedChange={(v) => setForm(p => ({
                                                ...p,
                                                studentIds: v ? [...p.studentIds, st.id] : p.studentIds.filter(id => id !== st.id),
                                            }))}
                                        />
                                        {st.firstName} {st.lastName}
                                    </label>
                                ))}
                            </div>

                            <div className='flex gap-2 mt-2'>
                                <Button variant='outline' onClick={() => setForm(p => ({ ...p, studentIds: students.map(s => s.id) }))}>Barchasini tanlash</Button>
                                <Button variant='ghost' onClick={() => setForm(p => ({ ...p, studentIds: [] }))}>Tozalash</Button>
                            </div>
                        </div>

                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        {onCancel && <Button variant="outline" onClick={onCancel}>Bekor qilish</Button>}
                        <Button disabled={!canSubmit || submitting} onClick={handleSubmit}>{submitting ? 'Saqlanmoqda...' : 'Saqlash'}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
