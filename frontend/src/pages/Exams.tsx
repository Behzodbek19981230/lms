import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { request } from '@/configs/request';
import { useToast } from '@/components/ui/use-toast';
import { Download, Eye } from 'lucide-react';
import { TestGenerator } from '@/components/TestGenerator';

type TestItem = { id: number; title: string; subject: { id: number; name: string }; createdAt: string };
type GroupItem = { id: number; name: string };
type AssignedTest = { id: number; title: string; group: { name: string }; createdAt: string; variants: AssignedTestVariant[] };
type AssignedTestVariant = { id: number; student: { id: number; fullName: string }; assignedAt: string; completedAt?: string; status: 'pending' | 'completed' };

export default function ExamsPage() {
    const [tests, setTests] = useState<TestItem[]>([]);
    const [groups, setGroups] = useState<GroupItem[]>([]);
    const [assignedTests, setAssignedTests] = useState<AssignedTest[]>([]);
    const [openId, setOpenId] = useState<number | null>(null);
    const [form, setForm] = useState({ groupId: '', numQuestions: 10, shuffleAnswers: true, title: '' });
    const [answersData, setAnswersData] = useState<any>(null);
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
        try {
            const { data } = await request.get('/assigned-tests');
            setAssignedTests(data || []);
        } catch { }
    };

    useEffect(() => { load(); }, []);

    const downloadPdf = async (assignedTestId: number) => {
        try {
            const response = await request.get(`/assigned-tests/${assignedTestId}/pdf`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `block-test-${assignedTestId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast({ title: 'PDF yuklandi' });
        } catch (e: any) {
            toast({ title: 'Xatolik', description: 'PDF yuklab bo\'lmadi', variant: 'destructive' });
        }
    };

    const viewAnswers = async (assignedTestId: number) => {
        try {
            const { data } = await request.get(`/assigned-tests/${assignedTestId}/answers`);
            setAnswersData(data);
        } catch (e: any) {
            toast({ title: 'Xatolik', description: 'Javoblarni olishda xatolik', variant: 'destructive' });
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Imtihonlar</h1>
                <p className="text-muted-foreground">Yaratilgan testlar va sanalari</p>
            </div>

            <Tabs defaultValue="tests" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="tests">Testlar</TabsTrigger>
                    <TabsTrigger value="assigned">Blok testlar</TabsTrigger>
                    <TabsTrigger value="generator">Test Generatori</TabsTrigger>
                </TabsList>

                <TabsContent value="tests" className="mt-4">
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
                </TabsContent>

                <TabsContent value="assigned" className="mt-4">
                    <div className="space-y-4">
                        {assignedTests.map((at) => (
                            <Card key={at.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>{at.title}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{at.group.name}</Badge>
                                            <Button size="sm" variant="outline" onClick={() => downloadPdf(at.id)}>
                                                <Download className="w-4 h-4 mr-2" />
                                                PDF
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => viewAnswers(at.id)}>
                                                <Eye className="w-4 h-4 mr-2" />
                                                Javoblar
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Yaratilgan: {new Date(at.createdAt).toLocaleDateString('uz-UZ')}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {at.variants.map((v) => (
                                            <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div>
                                                    <div className="font-medium">{v.student.fullName}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        Berilgan: {new Date(v.assignedAt).toLocaleDateString('uz-UZ')}
                                                    </div>
                                                    <div className="text-sm text-blue-600 font-medium">
                                                        Variant - Alohida test
                                                    </div>
                                                    {v.completedAt && (
                                                        <div className="text-sm text-muted-foreground">
                                                            Bajarilgan: {new Date(v.completedAt).toLocaleDateString('uz-UZ')}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={v.status === 'completed' ? 'default' : 'secondary'}>
                                                        {v.status === 'completed' ? 'Bajarildi' : 'Kutilmoqda'}
                                                    </Badge>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" variant="outline">Profil</Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle>{v.student.fullName} — {at.title}</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                                    <div>
                                                                        <span className="font-medium">O'quvchi:</span> {v.student.fullName}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Guruh:</span> {at.group.name}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Berilgan:</span> {new Date(v.assignedAt).toLocaleDateString('uz-UZ')}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Holat:</span>
                                                                        <Badge variant={v.status === 'completed' ? 'default' : 'secondary'} className="ml-2">
                                                                            {v.status === 'completed' ? 'Bajarildi' : 'Kutilmoqda'}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                                    <div className="font-medium text-blue-800 mb-1">⚠️ Muhim ma'lumot</div>
                                                                    <div className="text-sm text-blue-700">
                                                                        Bu o'quvchi uchun alohida test olgan.
                                                                        Har bir variant boshqacha savollar va javoblardan iborat.
                                                                    </div>
                                                                </div>
                                                                {v.completedAt && (
                                                                    <div className="p-3 bg-muted rounded-lg">
                                                                        <div className="font-medium mb-2">Test natijalari</div>
                                                                        <div className="text-sm text-muted-foreground">
                                                                            Bajarilgan vaqt: {new Date(v.completedAt).toLocaleDateString('uz-UZ')}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="generator" className="mt-4">
                    <TestGenerator />
                </TabsContent>
            </Tabs>

            {/* Answers Dialog */}
            <Dialog open={!!answersData} onOpenChange={(v) => { if (!v) setAnswersData(null); }}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{answersData?.title} — Javoblar</DialogTitle>
                    </DialogHeader>
                    {answersData && (
                        <div className="space-y-6">
                            <div className="p-3 bg-muted rounded-lg">
                                <div className="font-medium">Guruh: {answersData.group.name}</div>
                                <div className="text-sm text-muted-foreground">
                                    Jami savollar: {answersData.questions.length}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {answersData.questions.map((q: any, qIndex: number) => (
                                    <div key={q.id} className="border rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <h4 className="font-medium">{qIndex + 1}. {q.text}</h4>
                                            <Badge variant="outline">{q.points} ball</Badge>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            {q.answers?.map((a: any, aIndex: number) => (
                                                <div key={a.id} className={`flex items-center gap-2 p-2 rounded ${a.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                                                    }`}>
                                                    <span className="font-medium">{String.fromCharCode(65 + aIndex)}.</span>
                                                    <span>{a.text}</span>
                                                    {a.isCorrect && (
                                                        <Badge variant="default" className="ml-auto">To'g'ri</Badge>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="border-t pt-3">
                                            <div className="font-medium mb-2">O'quvchi javoblari:</div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {answersData.variants.map((v: any) => (
                                                    <div key={v.id} className="p-2 bg-muted rounded text-sm">
                                                        <div className="font-medium mb-1">{v.student.fullName}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            Variant
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!openId} onOpenChange={(v) => { if (!v) setOpenId(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Blok test tuzish</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="font-medium text-blue-800 mb-1">ℹ️ Blok test haqida</div>
                            <div className="text-sm text-blue-700">
                                Har bir o'quvchi uchun alohida test variant yaratiladi.
                                Savollar va javoblar har bir variantda boshqacha bo'ladi.
                            </div>
                        </div>
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
                                    load(); // Reload to show new assigned tests
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
