import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { detectUniqueFromImage, gradeByUnique, gradeFromImage, type GradeResult } from '@/services/scanner.service';

// Normalize backend grade result to UI shape
function normalizeGrade(r: any): GradeResult {
  if (!r) {
    return { total: 0, correct: 0, wrong: 0, blank: 0, details: [] };
  }
  // Already UI shape
  if (Array.isArray(r.details)) {
    return {
      total: Number(r.total) || 0,
      correct: Number(r.correct) || Number(r.correctCount) || 0,
      wrong: Number(r.wrong) || Number(r.wrongCount) || 0,
      blank: Number(r.blank) || Number(r.blankCount) || 0,
      details: r.details,
    };
  }
  // Backend shape: perQuestion + *Count
  const perQuestion = Array.isArray(r.perQuestion) ? r.perQuestion : [];
  return {
    total: Number(r.total) || perQuestion.length || 0,
    correct: Number(r.correctCount) || 0,
    wrong: Number(r.wrongCount) || 0,
    blank: Number(r.blankCount) || 0,
    details: perQuestion.map((p: any) => ({
      index: Number(p.index) || 0,
      correct: String(p.correct || '').toUpperCase(),
      scanned: String(p.scanned || '-').toUpperCase(),
      isCorrect: Boolean(p.isCorrect),
    })),
  };
}

export default function ScannerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uniqueNumber, setUniqueNumber] = useState<string>('');
  const [answersText, setAnswersText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [detectedMeta, setDetectedMeta] = useState<{ uniqueNumber?: string; method?: string; totalQuestions?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const uploadPercent = useMemo(() => (loading ? 66 : 0), [loading]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const url = URL.createObjectURL(f);
      setImagePreview(url);
    }
  };

  const handleDetect = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await detectUniqueFromImage(file);
      if (res.statusCode && res.statusCode !== 200) throw new Error(res.message || 'Xatolik');
      if (res.uniqueNumber) {
        setUniqueNumber(res.uniqueNumber);
        setDetectedMeta({ uniqueNumber: res.uniqueNumber, method: res.method, totalQuestions: res.totalQuestions });
        // If answers are provided, immediately grade by detected unique
        const maybeAnswers = parseAnswers();
        if (maybeAnswers && maybeAnswers.length > 0) {
          const grade = await gradeByUnique(res.uniqueNumber, maybeAnswers);
          setResult(normalizeGrade(grade));
        }
      } else {
        setError("ID topilmadi. Rasm sifatini yaxshilang yoki ID blokni aniq tushiring.");
      }
    } catch (e: any) {
      setError(e?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const parseAnswers = (): string[] | null => {
    const raw = answersText.trim();
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr as string[];
      setError("Javoblar JSON massiv bo'lishi kerak, masalan: [\"A\",\"B\",\"-\"]");
      return null;
    } catch {
      // also allow comma/space separated letters
      const simple = raw.split(/[\s,]+/).filter(Boolean);
      if (simple.length > 0) return simple;
      setError('Javoblarni JSON yoki vergul bilan ajratilgan ko‘rinishda kiriting');
      return null;
    }
  };

  const handleGradeFromImage = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const answers = parseAnswers();
      if (answers === null) return; // error already set
      const res = await gradeFromImage(file, answers && answers.length ? answers : undefined);
      if (res.statusCode && res.statusCode !== 200) throw new Error(res.message || 'Xatolik');
  if (res.result) setResult(normalizeGrade(res.result));
      if (res.uniqueNumber) setUniqueNumber(res.uniqueNumber);
      setDetectedMeta({ uniqueNumber: res.uniqueNumber, method: res.method, totalQuestions: res.totalQuestions });
      // If backend auto-detected answers but cannot grade (rare), show them in answers input for transparency
      if (!res.result && (res.autoDetectedAnswers || res.answers)) {
        const arr = (res.autoDetectedAnswers || res.answers) as string[];
        if (Array.isArray(arr) && arr.length) setAnswersText(arr.join(','));
      }
    } catch (e: any) {
      setError(e?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeByUnique = async () => {
    if (!uniqueNumber) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const answers = parseAnswers();
      if (answers === null) return;
  const res = await gradeByUnique(uniqueNumber, answers || []);
  setResult(normalizeGrade(res));
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
          <CardDescription>Rasm yuklang. ID avtomatik topiladi, savollar soni va javoblar ham rasm asosida aniqlanadi.</CardDescription>
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
            <Button onClick={handleDetect} disabled={!file || loading} variant="secondary">ID ni aniqlash</Button>
            <Button onClick={handleGradeFromImage} disabled={!file || loading}>Avto tekshirish</Button>
          </div>

          {loading && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Yuklanmoqda...</div>
              <Progress value={uploadPercent} className="h-2" />
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Aniqlangan uniqueNumber (ID)</label>
              <Input value={uniqueNumber} onChange={(e) => setUniqueNumber(e.target.value)} placeholder="10 xonali ID" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {detectedMeta?.method && (
                  <Badge variant="secondary">Usul: {detectedMeta.method}</Badge>
                )}
                {detectedMeta?.totalQuestions ? (
                  <Badge variant="outline">Savollar: {detectedMeta.totalQuestions}</Badge>
                ) : null}
                {result?.total ? (
                  <Badge>Topildi: {result.total}</Badge>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Javoblar (JSON yoki A,B,C ko‘rinishida)</label>
              <Input value={answersText} onChange={(e) => setAnswersText(e.target.value)} placeholder='["A","B","-","C"] yoki A,B,C,-' />
              <Button onClick={handleGradeByUnique} disabled={!uniqueNumber || loading} variant="outline">ID bo‘yicha tekshirish</Button>
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          {result && (
            <div className="mt-4 rounded border p-3">
              <div className="font-medium">Natija</div>
              <div className="text-sm mt-1 flex flex-wrap gap-2 items-center">
                <Badge variant="outline">Jami: {result.total}</Badge>
                <Badge className="bg-green-600 text-white hover:bg-green-600/90">To‘g‘ri: {result.correct}</Badge>
                <Badge className="bg-red-600 text-white hover:bg-red-600/90">Noto‘g‘ri: {result.wrong}</Badge>
                <Badge variant="secondary">Bo‘sh: {result.blank}</Badge>
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
                    {(result.details || []).map((d) => (
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
