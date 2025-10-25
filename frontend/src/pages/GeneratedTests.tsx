import { useEffect, useState } from 'react';
import { request } from '@/configs/request';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Eye, ListChecks, Printer } from 'lucide-react';
// Note: HtmlRenderer available if needed later for HTML answers rendering
import { useToast } from '@/components/ui/use-toast';

interface GeneratedTestDto {
    id: number;
    title: string;
    subject: { id: number; name: string } | null;
    teacher: { id: number; fullName?: string } | null;
    createdAt: string;
    variantCount: number;
    questionCount: number;
    timeLimit: number;
    difficulty: string;
}

interface VariantDto {
    uniqueNumber: string;
    variantNumber: number;
    printableUrl: string | null;
    printableFileName: string | null;
    generatedAt: string;
    answerKey?: { total: number; answers: string[] } | null;
}

export default function GeneratedTestsPage() {
    const { toast } = useToast();
    const [items, setItems] = useState<GeneratedTestDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState<GeneratedTestDto | null>(null);
    const [variants, setVariants] = useState<VariantDto[]>([]);
    const [variantsLoading, setVariantsLoading] = useState(false);
    const [answerGenLoading, setAnswerGenLoading] = useState<string | null>(null);

    const escapeHtml = (s: string) =>
        String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

    const printAnswerKeys = () => {
        const withKeys = variants.filter((v) => v.answerKey && v.answerKey.answers?.length);
        if (withKeys.length === 0) {
            toast({ title: 'Xatolik', description: "Javoblar kaliti mavjud emas", variant: 'destructive' });
            return;
        }

        const subjectName = active?.subject?.name || '-';
        const title = active?.title || 'Test';
        const dateStr = new Date().toLocaleDateString('uz-UZ');

        const htmlParts: string[] = [];
        htmlParts.push(`<!DOCTYPE html><html lang="uz"><head><meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Javoblar kaliti — ${title}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, sans-serif; color: #111; }
        .header { text-align: center; margin-bottom: 16px; }
        .title { font-size: 18px; font-weight: 700; }
        .subtitle { font-size: 12px; color: #555; margin-top: 4px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .card { border: 1px solid #ddd; border-radius: 6px; padding: 10px; break-inside: avoid; }
        .card h3 { margin: 0 0 8px 0; font-size: 14px; }
        .answers { font-size: 13px; line-height: 1.8; }
        .answers span { display: inline-block; width: 42px; }
        @media print { .no-print { display: none; } }
      </style>
    </head><body>`);

        htmlParts.push(`<div class="header">
        <div class="title">Javoblar kaliti — ${escapeHtml(title)}</div>
        <div class="subtitle">Fan: ${escapeHtml(subjectName)} • Sana: ${dateStr}</div>
      </div>`);

        htmlParts.push('<div class="grid">');
        for (const v of withKeys) {
            const answers = v.answerKey?.answers || [];
            const lines = answers
                .map((ans, idx) => `<span>${idx + 1}. ${String(ans || '-')}</span>`) // safe stringify
                .join('');
            htmlParts.push(`
        <div class="card">
          <h3>Variant ${v.variantNumber} — #${v.uniqueNumber}</h3>
          <div class="answers">${lines}</div>
        </div>
      `);
        }
        htmlParts.push('</div>');

        htmlParts.push('<script>window.onload = function(){ window.print(); }<\/script>');
        htmlParts.push('</body></html>');

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ title: 'Xatolik', description: 'Print oynasini ochib bo\'lmadi', variant: 'destructive' });
            return;
        }
        printWindow.document.open();
        printWindow.document.write(htmlParts.join(''));
        printWindow.document.close();
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const { data } = await request.get('/tests/generated');
                setItems(data || []);
            } catch (e: any) {
                toast({ title: 'Xatolik', description: e?.response?.data?.message || 'Yaratilgan testlar yuklanmadi', variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, []);

    const openVariants = async (test: GeneratedTestDto) => {
        const idNum = Number(test.id);
        if (!Number.isFinite(idNum)) {
            toast({ title: 'Xatolik', description: "Noto'g'ri test ID", variant: 'destructive' });
            return;
        }

        setActive(test);
        setOpen(true);
        setVariants([]);
        setVariantsLoading(true);
        try {
            const { data } = await request.get(`/tests/generated/${idNum}/variants`);
            setVariants(data || []);
        } catch (e: any) {
            toast({ title: 'Xatolik', description: e?.response?.data?.message || 'Variantlar yuklanmadi', variant: 'destructive' });
        } finally {
            setVariantsLoading(false);
        }
    };

    const openAnswerSheet = async (uniqueNumber: string) => {
        if (!uniqueNumber) return;
        try {
            setAnswerGenLoading(uniqueNumber);
            const { data } = await request.post(`/tests/generated/variant/${uniqueNumber}/answer-sheet`);
            const url = data?.url as string | undefined;
            if (!url) {
                toast({ title: 'Xatolik', description: 'Answer-sheet linki olinmadi', variant: 'destructive' });
                return;
            }
            const fullUrl = `${import.meta.env.VITE_FILE_BASE_URL}${url}`;
            window.open(fullUrl, '_blank');
        } catch (e: any) {
            toast({ title: 'Xatolik', description: e?.response?.data?.message || 'Answer-sheet yaratilmadi', variant: 'destructive' });
        } finally {
            setAnswerGenLoading(null);
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" /> Yaratilgan testlar</span>
                        <div className="flex gap-2">
                         <a href={`/Javoblar_Varogi.pdf`} target="_blank" rel="noreferrer">
                        <Button variant="outline" className="bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                            Javob varag'ini yuklab olish(PDF)
                        </Button>
                    </a>
                        <Badge variant="secondary">{items.length} ta</Badge>
                        </div>
                    </CardTitle>
                   
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fan</TableHead>
                                    <TableHead>Test nomi</TableHead>
                                    <TableHead>Yaratuvchi</TableHead>
                                    <TableHead>Yaratilgan vaqt</TableHead>
                                    <TableHead>Variantlar</TableHead>
                                    <TableHead>Amallar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6}>Yuklanmoqda...</TableCell></TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow><TableCell colSpan={6}>Hozircha ma'lumot yo'q</TableCell></TableRow>
                                ) : (
                                    items.map((it) => (
                                        <TableRow key={it.id}>
                                            <TableCell>{it.subject?.name || '-'}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{it.title}</div>
                                                <div className="text-xs text-muted-foreground">{it.questionCount} savol • {it.timeLimit} daqiqa • {it.difficulty}</div>
                                            </TableCell>
                                            <TableCell>{it.teacher?.fullName || '-'}</TableCell>
                                            <TableCell>{new Date(it.createdAt).toLocaleString('uz-UZ')}</TableCell>
                                            <TableCell><Badge variant="outline">{it.variantCount}</Badge></TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="outline" onClick={() => openVariants(it)}>
                                                    <Eye className="h-4 w-4 mr-1" /> Variantlar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen} >
                <DialogContent className="max-w-6xl">
                    <DialogHeader>
                        <DialogTitle>
                            {active ? (
                                <div>
                                    <div className="font-semibold">{active.title}</div>
                                    <div className="text-xs text-muted-foreground">{active.subject?.name || '-'} • {active.variantCount} variant</div>
                                </div>
                            ) : 'Variantlar'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 overflow-auto max-h-[70vh]">
                        {variantsLoading ? (
                            <div>Yuklanmoqda...</div>
                        ) : variants.length === 0 ? (
                            <div>Variantlar topilmadi</div>
                        ) : (
                            <div className="divide-y border rounded">
                                {variants.map((v) => (
                                    <div key={v.uniqueNumber} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline">Variant {v.variantNumber}</Badge>
                                            <Badge variant="outline" className="text-green-600 border-green-600">#{v.uniqueNumber}</Badge>
                                            <span className="text-xs text-muted-foreground">{new Date(v.generatedAt).toLocaleString('uz-UZ')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {v.printableUrl ? (
                                                <>
                                                    <a href={import.meta.env.VITE_FILE_BASE_URL + v.printableUrl} target="_blank" rel="noreferrer" className="text-primary underline">Ochish</a>
                                                    <a href={import.meta.env.VITE_FILE_BASE_URL + v.printableUrl} download={v.printableFileName || undefined} className="inline-flex">
                                                        <Button size="sm" variant="outline" className="gap-2">
                                                            <Download className="h-4 w-4" /> Yuklab olish
                                                        </Button>
                                                    </a>
                                                </>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Chop etish fayli hali yaratilmagan</span>
                                            )}

                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {variants.some((v) => v.answerKey && v.answerKey.answers?.length) && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base">Javoblar kaliti</CardTitle>
                                        <Button size="sm" variant="outline" onClick={printAnswerKeys}>
                                            <Printer className="h-4 w-4 mr-2" /> Chop etish
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {variants.map((v) => (
                                            <div key={`ak-${v.uniqueNumber}`}>
                                                <div className="font-medium mb-1">Variant {v.variantNumber} — #{v.uniqueNumber}</div>
                                                {v.answerKey?.answers?.length ? (
                                                    <div className="text-sm leading-7">
                                                        {v.answerKey.answers.map((ans, idx) => (
                                                            <span key={idx} className="inline-block w-12">{idx + 1}. {ans}</span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-muted-foreground">Javoblar mavjud emas</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
