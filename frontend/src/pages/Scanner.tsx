import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { gradeByUnique, GradeResult } from '@/services/scanner.service';
import axios from 'axios';



export default function ScannerPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<GradeResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [variantId, setVariantId] = useState<string>('');
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const uploadPercent = useMemo(() => (loading ? 66 : 0), [loading]);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setFile(f);
            const url = URL.createObjectURL(f);
            setImagePreview(url);
            setResult(null);
            setVariantId('');
            setAnswers({});
        }
    };

    const handleScan = async () => {
        if (!file) return;
        setLoading(true); setError(null); setResult(null);
        try {
            // 1. Send image to backend /analyze
            const imageBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result;
                    if (typeof result === 'string') {
                        resolve(result.split(',')[1]); // Get base64 part
                    } else {
                        reject('Failed to read file');
                    }
                };
                reader.readAsDataURL(file);
            });

            const response = await axios.post(
                'http://localhost:5000/analyze',
                { image: imageBase64 },

                    {
                        auth: {
                            username: 'admin',
                            password: 'secret123',
                        },
                    },
                );

        

                if(response.data.variant_id) {
                    const variantId = response.data.variant_id;
                    setVariantId(variantId);
                    const answersArray: string[] = [];
                    const maxKey = Object.keys(response.data.answers).sort((a,b) => parseInt(b)-parseInt(a));
                    
                    for(let i = 1; i <= parseInt(maxKey[0]); i++) {
                        const ans = response.data.answers[i.toString()];
                        answersArray.push(ans || '-');
                    }
                    const gradeRes = await gradeByUnique(variantId, answersArray);
                    

                    setResult(gradeRes);
                    
                    
                }
                if(response.data.answers) {
                    setAnswers(response.data.answers);
                }



            } catch (e: any) {
                setError(e?.message || 'Xatolik yuz berdi');
            } finally {
                setLoading(false);
            }
        };



        return (
            <div className="max-w-4xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Telefon skaner — Javob varaqni tekshirish</CardTitle>
                        <CardDescription>Rasm yuklang. Variant va javoblar avtomatik aniqlanadi, natija chiqadi.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rasm (answer-sheet surati)</label>
                                <Input type="file" accept="image/*" onChange={onFileChange} />
                                <p className="text-xs text-muted-foreground">Maslahat: Sahifa to‘liq sig‘sin, pastki o‘ng burchakdagi ID blok aniq ko‘rinsin.</p>
                            </div>
                            <div className="border rounded-md overflow-hidden bg-muted/20 aspect-[3/4] flex items-center justify-center">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="h-full w-full object-contain" />
                                ) : (
                                    <div className="text-xs text-muted-foreground px-3 text-center">
                                        Rasm tanlang — bu yerda preview ko‘rinadi
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleScan} disabled={!file || loading} variant="secondary">Skanerlash va tekshirish</Button>
                        </div>

                        {loading && (
                            <div className="space-y-2">
                                <div className="text-xs text-muted-foreground">Yuklanmoqda...</div>
                                <Progress value={uploadPercent} className="h-2" />
                            </div>
                        )}

                        {variantId && (
                            <div className="text-xs text-muted-foreground">Aniqlangan variant ID: <b>{variantId}</b></div>
                        )}
                        {answers && Object.keys(answers).length > 0 && (
                            <div className="text-xs text-muted-foreground">Aniqlangan javoblar: {Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join(', ')}</div>
                        )}

                        {error && <div className="text-sm text-red-600">{error}</div>}
                        {result && (
                            <div className="mt-4 rounded border p-3">
                                <div className="font-medium">Natija</div>
                                <div className="text-sm mt-1 flex flex-wrap gap-2 items-center">
                                    <Badge variant="outline">Jami: {result.total}</Badge>
                                    <Badge className="bg-green-600 text-white hover:bg-green-600/90">To‘g‘ri: {result.correctCount}</Badge>
                                    <Badge className="bg-red-600 text-white hover:bg-red-600/90">Noto‘g‘ri: {result.wrongCount}</Badge>
                                    <Badge variant="secondary">Bo‘sh: {result.blankCount}</Badge>
                                </div>
                                <div className="mt-2 max-h-64 overflow-auto text-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="py-1 pr-2">#</th>
                                                <th className="py-1 pr-2">To‘g‘ri</th>
                                                <th className="py-1 pr-2">Skaner</th>
                                                <th className="py-1 pr-2">Holat</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(result.perQuestion || []).map((d) => (
                                                <tr key={d.index} className={`border-b ${d.isCorrect ? 'bg-green-50/50' : d.scanned === '-' ? '' : 'bg-red-50/50'}`}>
                                                    <td className="py-1 pr-2">{d.index + 1}</td>
                                                    <td className="py-1 pr-2">{d.correct}</td>
                                                    <td className="py-1 pr-2">{d.scanned}</td>
                                                    <td className={`py-1 pr-2 ${d.isCorrect ? 'text-green-600' : d.scanned === '-' ? 'text-muted-foreground' : 'text-red-600'}`}>{d.isCorrect ? '✓' : d.scanned === '-' ? '-' : '×'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }
