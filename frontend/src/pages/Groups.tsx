import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { request } from '@/configs/request';
import type { SubjectType } from '@/types/subject.type';
import { Pencil, Trash2 } from 'lucide-react';

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

const GroupsPage = () => {
    const [groups, setGroups] = useState<any[]>([]);
    const [students, setStudents] = useState<UserLite[]>([]);
    const [subjects, setSubjects] = useState<SubjectType[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({
        name: '',
        description: '',
        subjectId: '' as string | '',
        studentIds: [] as number[],
        daysOfWeek: [] as string[],
        startTime: '09:00',
        endTime: '10:30',
    });

    const load = async () => {
        try {
            const [{ data: groupsRes }, { data: subjectsRes }] = await Promise.all([
                request.get('/groups/me'),
                request.get('/subjects'),
            ]);
            setGroups(groupsRes || []);
            setSubjects(subjectsRes || []);
        } catch { }
    };

    const loadStudents = async () => {
        try {
            const { data } = await request.get('/users', { params: { role: 'student' } });
            setStudents((data || []).filter((u: any) => u.role === 'student'));
        } catch { }
    };

    useEffect(() => {
        load();
        loadStudents();
    }, []);

    const selectedCount = form.studentIds.length;
    const canSubmit = form.name && form.daysOfWeek.length > 0 && form.startTime && form.endTime;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Mening guruhlarim</h1>
                <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditId(null); }}>
                    <DialogTrigger asChild>
                        <Button variant="hero">Yangi guruh</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editId ? 'Guruhni tahrirlash' : 'Guruh yaratish'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Guruh nomi</Label>
                                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Tavsif</Label>
                                <Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
                            </div>
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
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                    {days.map(d => (
                                        <label key={d.value} className="flex items-center gap-2 text-sm">
                                            <Checkbox checked={form.daysOfWeek.includes(d.value)} onCheckedChange={(v) => {
                                                setForm(p => ({
                                                    ...p,
                                                    daysOfWeek: v
                                                        ? [...p.daysOfWeek, d.value]
                                                        : p.daysOfWeek.filter(x => x !== d.value),
                                                }));
                                            }} />
                                            {d.label}
                                        </label>
                                    ))}
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
                            <div>
                                <Label>O'quvchilar ({selectedCount} tanlandi)</Label>
                                <div className="max-h-48 overflow-auto border rounded-md p-2 mt-1">
                                    {students.map(st => (
                                        <label key={st.id} className="flex items-center gap-2 text-sm py-1">
                                            <Checkbox
                                                checked={form.studentIds.includes(st.id)}
                                                onCheckedChange={(v) => setForm(p => ({
                                                    ...p,
                                                    studentIds: v
                                                        ? [...p.studentIds, st.id]
                                                        : p.studentIds.filter(id => id !== st.id),
                                                }))}
                                            />
                                            {st.firstName} {st.lastName}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => { setOpen(false); setEditId(null); }}>Bekor qilish</Button>
                                <Button disabled={!canSubmit || loading} onClick={async () => {
                                    setLoading(true);
                                    try {
                                        if (editId) {
                                            await request.patch(`/groups/${editId}`, {
                                                name: form.name,
                                                description: form.description || undefined,
                                                subjectId: form.subjectId ? Number(form.subjectId) : undefined,
                                                studentIds: form.studentIds,
                                                daysOfWeek: form.daysOfWeek,
                                                startTime: form.startTime,
                                                endTime: form.endTime,
                                            });
                                        } else {
                                            await request.post('/groups', {
                                                name: form.name,
                                                description: form.description || undefined,
                                                subjectId: form.subjectId ? Number(form.subjectId) : undefined,
                                                studentIds: form.studentIds,
                                                daysOfWeek: form.daysOfWeek,
                                                startTime: form.startTime,
                                                endTime: form.endTime,
                                            });
                                        }
                                        setOpen(false);
                                        setEditId(null);
                                        setForm({ name: '', description: '', subjectId: '', studentIds: [], daysOfWeek: [], startTime: '09:00', endTime: '10:30' });
                                        await load();
                                    } catch (e) { } finally {
                                        setLoading(false);
                                    }
                                }}>Saqlash</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map(g => (
                    <Card key={g.id} className="border-border">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-card-foreground">{g.name}</CardTitle>
                            <div className="flex gap-2">
                                <button
                                    className="p-2 rounded-md border hover:bg-muted transition-all transform hover:scale-105"
                                    title="Tahrirlash"
                                    onClick={() => {
                                        setForm({
                                            name: g.name,
                                            description: g.description || '',
                                            subjectId: g.subjectId ? String(g.subjectId) : '',
                                            studentIds: g.studentIds || [],
                                            daysOfWeek: g.daysOfWeek || [],
                                            startTime: g.startTime,
                                            endTime: g.endTime,
                                        });
                                        setEditId(g.id);
                                        setOpen(true);
                                    }}
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                    className="p-2 rounded-md border hover:bg-destructive/10 transition-all transform hover:scale-105"
                                    title="O'chirish"
                                    onClick={async () => {
                                        try { await request.delete(`/groups/${g.id}`); await load(); } catch { }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">{g.description || 'Tavsif yo\'q'}</div>
                            <div className="mt-2 text-sm">Kunlar: {g.daysOfWeek?.length ? g.daysOfWeek.join(', ') : '-'}</div>
                            <div className="text-sm">Vaqt: {g.startTime} - {g.endTime}</div>
                            <div className="text-sm">O'quvchilar: {g.studentIds?.length || 0}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default GroupsPage;
