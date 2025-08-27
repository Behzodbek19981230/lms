import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { request } from '@/configs/request';
import { useToast } from '@/components/ui/use-toast';

type TestItem = { id: number; title: string; subject: { id: number; name: string }; createdAt: string };
type GroupItem = { id: number; name: string };

export default function ExamsPage() {
    const [tests, setTests] = useState<TestItem[]>([]);
    const [groups, setGroups] = useState<GroupItem[]>([]);
    const [openId, setOpenId] = useState<number | null>(null);
    const [form, setForm] = useState({ groupId: '', numQuestions: 10, shuffleAnswers: true, title: '' });
    const { toast } = useToast();

    const load = async () => {
        try {
            const { data } = await request.get('/tests');
            setTests(data || []);
        } catch { }
        try {
            const { data } = await request.get('/groups/me');
            setGroups((data || []).map((g: any) => ({ id: g.id, name: g.name })));
        } catch { }
    };

    useEffect(() => { load(); }, []);

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Imtihonlar</h1>
                <p className="text-muted-foreground">Yaratilgan testlar va sanalari</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tests.map((t) => (
                    <Card key={t.id} className="border-border">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-card-foreground">{t.title}</CardTitle>
                            <Button size="sm" variant="outline" onClick={() => {
                                setOpenId(t.id);
                                setForm((p) => ({ ...p, title: `${t.title} — blok`, groupId: groups[0]?.id ? String(groups[0].id) : '' }));
                            }}>Blok test tuzish</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">Fan: {t.subject?.name || '—'}</div>
                            <div className="text-sm">Sana: {new Date(t.createdAt).toLocaleDateString('uz-UZ')}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={!!openId} onOpenChange={(v) => { if (!v) setOpenId(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Blok test tuzish</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label>Guruh</Label>
                            <Select value={form.groupId} onValueChange={(v) => setForm((p) => ({ ...p, groupId: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Guruhni tanlang" />
                                </SelectTrigger>
                                <SelectContent>
                                    {groups.map((g) => (
                                        <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Sarlavha (ixtiyoriy)</Label>
                            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Savollar soni</Label>
                                <Input type="number" min="1" max="100" value={form.numQuestions}
                                    onChange={(e) => setForm((p) => ({ ...p, numQuestions: Math.max(1, Math.round(Number(e.target.value) || 1)) }))} />
                            </div>
                            <div className="flex items-end gap-2">
                                <input id="shuffle" type="checkbox" checked={form.shuffleAnswers} onChange={(e) => setForm((p) => ({ ...p, shuffleAnswers: e.target.checked }))} />
                                <Label htmlFor="shuffle">Javoblarni aralashtirish</Label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setOpenId(null)}>Bekor qilish</Button>
                            <Button onClick={async () => {
                                if (!openId || !form.groupId) { toast({ title: 'Maʼlumot yetarli emas', variant: 'destructive' }); return; }
                                try {
                                    await request.post('/assigned-tests/generate', {
                                        baseTestId: openId,
                                        groupId: Number(form.groupId),
                                        numQuestions: form.numQuestions,
                                        shuffleAnswers: form.shuffleAnswers,
                                        title: form.title || undefined,
                                    });
                                    toast({ title: 'Blok test yaratildi' });
                                    setOpenId(null);
                                } catch (e: any) {
                                    toast({ title: 'Xatolik', description: e?.response?.data?.message || 'Yaratib bo\'lmadi', variant: 'destructive' });
                                }
                            }}>Generatsiya</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
