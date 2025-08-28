'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MathLiveInput } from '@/components/latex/mathlive-input';
import { LaTeXRenderer } from '@/components/latex/latex-renderer';
import { Beaker, Calculator, CheckCircle, Eye, FileText, Globe, History, Plus, Save, Trash2, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { request } from '@/configs/request';
import { useToast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Question {
    id: string | number;
    type: 'multiple-choice' | 'essay' | 'true-false';
    question: string;
    options?: string[];
    correctAnswer?: string | number;
    points: number;
    explanation?: string;
}

interface Subject {
    id: number;
    name: string;
    nameUz: string;
    hasFormulas: boolean;
    category: string;
    icon: any;
    color: string;
}

export default function CreateTestPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const subjectId = searchParams.get('subject');
    const { toast } = useToast();

    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [testTitle, setTestTitle] = useState('');
    const [testDescription, setTestDescription] = useState('');
    const [testType, setTestType] = useState<'open' | 'closed'>('open');
    const [timeLimit, setTimeLimit] = useState(60);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question>({
        id: '',
        type: 'multiple-choice',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 1,
        explanation: '',
    });

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [importedQuestions, setImportedQuestions] = useState<Question[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await request.get('/subjects');
                const mapped: Subject[] = (data || []).map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    nameUz: s.name,
                    hasFormulas: s.hasFormulas,
                    category: s.category,
                    icon: Calculator,
                    color: 'bg-blue-500',
                }));
                setSubjects(mapped);
            } catch { }
        })();
    }, []);

    useEffect(() => {
        if (subjectId) {
            const subject = subjects.find((s) => s.id === Number(subjectId));
            if (subject) {
                setSelectedSubject(subject);
            }
        }
    }, [subjectId]);

    const addQuestion = () => {
        if (currentQuestion.question.trim()) {
            const newQuestion: Question = {
                ...currentQuestion,
                id: Date.now().toString(),
            };
            setQuestions([...questions, newQuestion]);
            setCurrentQuestion({
                id: '',
                type: testType === 'open' ? 'multiple-choice' : 'essay',
                question: '',
                options: testType === 'open' ? ['', '', '', ''] : undefined,
                correctAnswer: testType === 'open' ? 0 : undefined,
                points: 1,
                explanation: '',
            });
        }
    };

    const removeQuestion = (id: string | number) => {
        setQuestions(questions.filter((q) => q.id !== id));
    };

    const updateCurrentQuestion = (field: string, value: any) => {
        setCurrentQuestion({ ...currentQuestion, [field]: value });
    };

    const updateQuestionOption = (index: number, value: string) => {
        const newOptions = [...(currentQuestion.options || [])];
        newOptions[index] = value;
        setCurrentQuestion({ ...currentQuestion, options: newOptions });
    };

    const saveTest = async () => {
        if (!selectedSubject || !testTitle || questions.length === 0) {
            toast({
                title: 'Maʼlumot yetarli emas',
                description: "Iltimos, fan, test nomi va kamida bitta savol kiriting.",
                variant: 'destructive',
            });
            return;
        }

        try {
            // 1) Create test
            const { data: testRes } = await request.post('/tests', {
                title: testTitle,
                description: testDescription || undefined,
                type: testType,
                duration: timeLimit,
                shuffleQuestions: true,
                showResults: true,
                subjectid: Number(selectedSubject.id),
            });
            const testId = testRes?.id;

            // 2) Create questions
            for (const [idx, q] of questions.entries()) {
                const isMC = q.type === 'multiple-choice';
                await request.post('/questions', {
                    text: q.question,
                    explanation: q.explanation || undefined,
                    type: isMC ? 'multiple_choice' : q.type === 'true-false' ? 'true_false' : 'essay',
                    points: q.points,
                    order: idx,
                    hasFormula: !!selectedSubject?.hasFormulas,
                    imageBase64: undefined,
                    testid: Number(testId),
                    answers: isMC
                        ? (q.options || []).map((opt: string, i: number) => ({
                            text: opt,
                            isCorrect: q.correctAnswer === i,
                            order: i,
                            hasFormula: !!selectedSubject?.hasFormulas,
                        }))
                        : undefined,
                });
            }

            toast({ title: 'Test yaratildi', description: 'Test va savollar muvaffaqiyatli saqlandi.' });
            navigate('/account/teacher');
        } catch (e: any) {
            toast({
                title: 'Xatolik',
                description: e?.response?.data?.message || 'Saqlashda xatolik yuz berdi',
                variant: 'destructive',
            });
        }
    };

    const downloadExcelTemplate = () => {
        // Create Excel template with sample data
        const templateData = [
            {
                'Savol turi': 'multiple-choice',
                'Savol matni': '2+2 nechaga teng?',
                'A) Birinchi variant': '2',
                'B) Ikkinchi variant': '3',
                'C) Uchinchi variant': '4',
                'D) To\'rtinchi variant': '5',
                'To\'g\'ri javob': 'C',
                'Ball': '1',
                'Izoh': 'Oddiy matematika savoli'
            },
            {
                'Savol turi': 'true-false',
                'Savol matni': 'Yer yassi shaklda',
                'A) Birinchi variant': 'To\'g\'ri',
                'B) Ikkinchi variant': 'Noto\'g\'ri',
                'C) Uchinchi variant': '',
                'D) To\'rtinchi variant': '',
                'To\'g\'ri javob': 'B',
                'Ball': '1',
                'Izoh': 'Geografiya savoli'
            },
            {
                'Savol turi': 'essay',
                'Savol matni': 'O\'zbekiston haqida gapirib bering',
                'A) Birinchi variant': '',
                'B) Ikkinchi variant': '',
                'C) Uchinchi variant': '',
                'D) To\'rtinchi variant': '',
                'To\'g\'ri javob': 'Javob o\'quvchi tomonidan yoziladi',
                'Ball': '5',
                'Izoh': 'Essa turidagi savol'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Test Savollari');

        // Set column widths
        ws['!cols'] = [
            { width: 15 }, // Savol turi
            { width: 40 }, // Savol matni
            { width: 20 }, // A) Birinchi variant
            { width: 20 }, // B) Ikkinchi variant
            { width: 20 }, // C) Uchinchi variant
            { width: 20 }, // D) To'rtinchi variant
            { width: 20 }, // To'g'ri javob
            { width: 10 }, // Ball
            { width: 30 }  // Izoh
        ];

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(data, `test_shabloni_${selectedSubject?.name || 'umumiy'}.xlsx`);

        toast({ title: 'Shablon yuklandi', description: 'Excel faylini to\'ldiring va qayta yuklang' });
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.type === 'application/vnd.ms-excel') {
                setExcelFile(file);
                parseExcelFile(file);
            } else {
                toast({
                    title: 'Noto\'g\'ri fayl turi',
                    description: 'Iltimos, Excel faylini (.xlsx yoki .xls) yuklang',
                    variant: 'destructive'
                });
            }
        }
    };

    const parseExcelFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Skip header row and parse data
                const questions: Question[] = [];
                const errors: string[] = [];

                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i] as any[];

                    // Skip empty rows
                    if (!row || row.length === 0) continue;

                    // Ensure row has minimum required data
                    if (row.length < 8 || !row[0] || !row[1]) {
                        console.log(`Skipping row ${i + 1}: insufficient data`, row);
                        continue;
                    }
                    const questionType = String(row[0] || '').toLowerCase();
                    const questionText = String(row[1] || '');
                    const optionA = String(row[2] || '');
                    const optionB = String(row[3] || '');
                    const optionC = String(row[4] || '');
                    const optionD = String(row[5] || '');
                    const correctAnswer = String(row[6] || '');
                    const points = parseInt(String(row[7] || '1')) || 1;
                    const explanation = String(row[8] || '');

                    // Validate question type
                    if (!['multiple-choice', 'true-false', 'essay', 'multiple', 'choice', 'true', 'false'].some(type =>
                        questionType.includes(type))) {
                        errors.push(`Qator ${i + 1}: Noto'g'ri savol turi "${questionType}"`);
                        continue;
                    }

                    // Validate question text
                    if (!questionText.trim()) {
                        errors.push(`Qator ${i + 1}: Savol matni bo'sh`);
                        continue;
                    }

                    // Validate points
                    if (points < 1 || points > 10) {
                        errors.push(`Qator ${i + 1}: Ball 1-10 oralig'ida bo'lishi kerak`);
                        continue;
                    }

                    let type: 'multiple-choice' | 'essay' | 'true-false';
                    let options: string[] | undefined;
                    let correctAnswerIndex: number | undefined;

                    if (questionType.includes('multiple') || questionType.includes('choice')) {
                        type = 'multiple-choice';
                        // Faqat to'g'ri javobni ko'rsatish uchun
                        const correctAnswerLetter = correctAnswer.toUpperCase();
                        let correctAnswerIndex = -1;

                        // To'g'ri javob indeksini aniqlash
                        if (correctAnswerLetter === 'A') {
                            correctAnswerIndex = 0;
                            options = [optionA].filter(opt => opt.trim());
                        } else if (correctAnswerLetter === 'B') {
                            correctAnswerIndex = 1;
                            options = [optionB].filter(opt => opt.trim());
                        } else if (correctAnswerLetter === 'C') {
                            correctAnswerIndex = 2;
                            options = [optionC].filter(opt => opt.trim());
                        } else if (correctAnswerLetter === 'D') {
                            correctAnswerIndex = 3;
                            options = [optionD].filter(opt => opt.trim());
                        } else {
                            errors.push(`Qator ${i + 1}: To'g'ri javob A, B, C yoki D bo'lishi kerak`);
                            continue;
                        }

                        if (options.length === 0) {
                            errors.push(`Qator ${i + 1}: To'g'ri javob variant bo'sh`);
                            continue;
                        }
                    } else if (questionType.includes('true') || questionType.includes('false')) {
                        type = 'true-false';
                        options = ['To\'g\'ri', 'Noto\'g\'ri'];
                        correctAnswerIndex = correctAnswer === 'A' || correctAnswer === 'a' ? 0 : 1;
                    } else {
                        type = 'essay';
                        options = undefined;
                        correctAnswerIndex = undefined;
                    }

                    questions.push({
                        id: Date.now() + i,
                        type,
                        question: questionText,
                        options,
                        correctAnswer: correctAnswerIndex,
                        points,
                        explanation
                    });
                }

                if (errors.length > 0) {
                    toast({
                        title: 'Xatoliklar topildi',
                        description: `${errors.length} ta xatolik. Iltimos, Excel faylini tekshiring.`,
                        variant: 'destructive'
                    });
                    console.log('Excel import errors:', errors);
                }

                setImportedQuestions(questions);
                toast({
                    title: 'Fayl muvaffaqiyatli yuklandi',
                    description: `${questions.length} ta savol topildi${errors.length > 0 ? `, ${errors.length} ta xatolik` : ''}`
                });
            } catch (error) {
                toast({
                    title: 'Xatolik',
                    description: 'Excel faylini o\'qishda xatolik yuz berdi',
                    variant: 'destructive'
                });
                console.error('Excel parse error:', error);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const applyImportedQuestions = () => {
        if (importedQuestions.length > 0) {
            setQuestions(importedQuestions);
            setExcelFile(null);
            setImportedQuestions([]);
            toast({ title: 'Savollar qo\'shildi', description: `${importedQuestions.length} ta savol testga qo\'shildi` });
        }
    };

    const clearImportedQuestions = () => {
        setImportedQuestions([]);
        setExcelFile(null);
    };

    return (
        <main className='flex-1 p-6 space-y-6'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className=' text-3xl font-bold '>Yangi test yaratish</h1>
                    <p className='text-muted-foreground'>Studentlar uchun test tuzish</p>
                </div>
                <div className='flex gap-2'>
                    <Button variant='outline' onClick={() => {
                        const excelTab = document.querySelector('[data-value="excel"]') as HTMLElement;
                        if (excelTab) excelTab.click();
                    }}>
                        <FileSpreadsheet className='h-4 w-4 mr-2' />
                        Excel import
                    </Button>
                    <Button variant='outline'>
                        <Eye className='h-4 w-4 mr-2' />
                        Ko'rib chiqish
                    </Button>
                    <Button onClick={saveTest} className='bg-primary hover:bg-primary/90'>
                        <Save className='h-4 w-4 mr-2' />
                        Saqlash
                    </Button>
                </div>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                {/* Test Settings */}
                <Card className='lg:col-span-1'>
                    <CardHeader>
                        <CardTitle>Test sozlamalari</CardTitle>
                        <CardDescription>Asosiy ma'lumotlar va sozlamalar</CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        {/* Subject Selection */}
                        <div className='space-y-2'>
                            <Label>Fan</Label>
                            <Select
                                value={selectedSubject?.id?.toString() || ''}
                                onValueChange={(value) => {
                                    const subject = subjects.find((s) => s.id === Number(value));
                                    setSelectedSubject(subject || null);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='Fanni tanlang' />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((subject) => (
                                        <SelectItem key={subject.id} value={subject.id.toString()}>
                                            <div className='flex items-center gap-2'>
                                                <subject.icon className='h-4 w-4' />
                                                {subject.nameUz}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedSubject && (
                                <div className='flex items-center gap-2 mt-2'>
                                    <Badge variant='secondary'>{selectedSubject.category}</Badge>
                                    {selectedSubject.hasFormulas && (
                                        <Badge variant='outline' className='text-green-600 border-green-600'>
                                            LaTeX qo'llab-quvvatlaydi
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Test Type */}
                        <div className='space-y-2'>
                            <Label>Test turi</Label>
                            <RadioGroup
                                value={testType}
                                onValueChange={(value: 'open' | 'closed') => setTestType(value)}
                            >
                                <div className='flex items-center space-x-2'>
                                    <RadioGroupItem value='open' id='open' />
                                    <Label htmlFor='open'>Ochiq test (variantli)</Label>
                                </div>
                                <div className='flex items-center space-x-2'>
                                    <RadioGroupItem value='closed' id='closed' />
                                    <Label htmlFor='closed'>Yopiq test (variantsiz)</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Test Title */}
                        <div className='space-y-2'>
                            <Label htmlFor='title'>Test nomi</Label>
                            <Input
                                id='title'
                                value={testTitle}
                                onChange={(e) => setTestTitle(e.target.value)}
                                placeholder='Masalan: Algebra asoslari'
                            />
                        </div>

                        {/* Test Description */}
                        <div className='space-y-2'>
                            <Label htmlFor='description'>Tavsif</Label>
                            <Textarea
                                id='description'
                                value={testDescription}
                                onChange={(e) => setTestDescription(e.target.value)}
                                placeholder="Test haqida qisqacha ma'lumot"
                            />
                        </div>

                        {/* Time Limit */}
                        <div className='space-y-2'>
                            <Label htmlFor='timeLimit'>Vaqt chegarasi (daqiqa)</Label>
                            <Input
                                id='timeLimit'
                                type='number'
                                value={timeLimit}
                                onChange={(e) => setTimeLimit(Number(e.target.value))}
                                min='1'
                                max='180'
                            />
                        </div>

                        {/* Test Stats */}
                        <div className='pt-4 border-t space-y-2'>
                            <div className='flex justify-between text-sm'>
                                <span className='text-muted-foreground'>Savollar soni:</span>
                                <span className='font-medium'>{questions.length}</span>
                            </div>
                            <div className='flex justify-between text-sm'>
                                <span className='text-muted-foreground'>Jami ball:</span>
                                <span className='font-medium'>{questions.reduce((sum, q) => sum + q.points, 0)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Question Creation */}
                <Card className='lg:col-span-2'>
                    <CardHeader>
                        <CardTitle>Savol yaratish</CardTitle>
                        <CardDescription>
                            {testType === 'open' ? 'Variantli savol tuzish' : 'Ochiq savol tuzish'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue='create' className='w-full'>
                            <TabsList className='grid w-full grid-cols-3'>
                                <TabsTrigger value='create'>Yangi savol</TabsTrigger>
                                <TabsTrigger value='list'>Savollar ro'yxati ({questions.length})</TabsTrigger>
                                <TabsTrigger value='excel'>Excel import</TabsTrigger>
                            </TabsList>

                            <TabsContent value='create' className='space-y-4'>
                                {/* Question Type */}
                                {testType === 'open' && (
                                    <div className='space-y-2'>
                                        <Label>Savol turi</Label>
                                        <Select
                                            value={currentQuestion.type}
                                            onValueChange={(value: 'multiple-choice' | 'essay' | 'true-false') =>
                                                updateCurrentQuestion('type', value)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value='multiple-choice'>Ko'p variantli</SelectItem>
                                                <SelectItem value='true-false'>To'g'ri/Noto'g'ri</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Question Text */}
                                <div className='space-y-2'>
                                    <Label htmlFor='question'>Savol matni</Label>
                                    {selectedSubject?.hasFormulas ? (
                                        <MathLiveInput
                                            value={currentQuestion.question}
                                            onChange={(value) => updateCurrentQuestion('question', value)}
                                            placeholder="Savol matnini kiriting. Formula qo'shish uchun 'Formula qo'shish' tugmasini bosing"
                                            className='w-full'
                                        />
                                    ) : (
                                        <Textarea
                                            id='question'
                                            value={currentQuestion.question}
                                            onChange={(e) => updateCurrentQuestion('question', e.target.value)}
                                            placeholder='Savol matnini kiriting'
                                            className='min-h-[100px]'
                                        />
                                    )}
                                </div>

                                {/* Answer Options */}
                                {testType === 'open' && currentQuestion.type === 'multiple-choice' && (
                                    <div className='space-y-2'>
                                        <Label>Javob variantlari</Label>
                                        <div className='space-y-2'>
                                            {currentQuestion.options?.map((option, index) => (
                                                <div key={index} className='flex items-center gap-2'>
                                                    <RadioGroup
                                                        value={currentQuestion.correctAnswer?.toString()}
                                                        onValueChange={(value) =>
                                                            updateCurrentQuestion('correctAnswer', Number(value))
                                                        }
                                                    >
                                                        <RadioGroupItem
                                                            value={index.toString()}
                                                            id={`option-${index}`}
                                                        />
                                                    </RadioGroup>
                                                    {selectedSubject?.hasFormulas ? (
                                                        <MathLiveInput
                                                            value={option}
                                                            onChange={(value) => updateQuestionOption(index, value)}
                                                            placeholder={`Variant ${String.fromCharCode(65 + index)}`}
                                                        />
                                                    ) : (
                                                        <Input
                                                            value={option}
                                                            onChange={(e) =>
                                                                updateQuestionOption(index, e.target.value)
                                                            }
                                                            placeholder={`Variant ${String.fromCharCode(65 + index)}`}
                                                            className='flex-1'
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <p className='text-xs text-muted-foreground'>To'g'ri javobni belgilang</p>
                                    </div>
                                )}

                                {testType === 'open' && currentQuestion.type === 'true-false' && (
                                    <div className='space-y-2'>
                                        <Label>To'g'ri javob</Label>
                                        <RadioGroup
                                            value={currentQuestion.correctAnswer?.toString()}
                                            onValueChange={(value) =>
                                                updateCurrentQuestion('correctAnswer', value === 'true')
                                            }
                                        >
                                            <div className='flex items-center space-x-2'>
                                                <RadioGroupItem value='true' id='true' />
                                                <Label htmlFor='true'>To'g'ri</Label>
                                            </div>
                                            <div className='flex items-center space-x-2'>
                                                <RadioGroupItem value='false' id='false' />
                                                <Label htmlFor='false'>Noto'g'ri</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                )}

                                {/* Points */}
                                <div className='space-y-2'>
                                    <Label htmlFor='points'>Ball</Label>
                                    <Input
                                        id='points'
                                        type='number'
                                        value={currentQuestion.points}
                                        onChange={(e) => {
                                            const n = Math.round(Number(e.target.value));
                                            const clamped = Math.min(10, Math.max(1, isNaN(n) ? 1 : n));
                                            updateCurrentQuestion('points', clamped);
                                        }}
                                        min='1'
                                        max='10'
                                        step='1'
                                        className='w-20'
                                    />
                                </div>

                                {/* Explanation */}
                                <div className='space-y-2'>
                                    <Label htmlFor='explanation'>Tushuntirish (ixtiyoriy)</Label>
                                    {selectedSubject?.hasFormulas ? (
                                        <MathLiveInput
                                            value={currentQuestion.explanation || ''}
                                            onChange={(value) => updateCurrentQuestion('explanation', value)}
                                            placeholder='Javob uchun tushuntirish'
                                        />
                                    ) : (
                                        <Textarea
                                            id='explanation'
                                            value={currentQuestion.explanation}
                                            onChange={(e) => updateCurrentQuestion('explanation', e.target.value)}
                                            placeholder='Javob uchun tushuntirish'
                                        />
                                    )}
                                </div>

                                <Button onClick={addQuestion} className='w-full'>
                                    <Plus className='h-4 w-4 mr-2' />
                                    Savolni qo'shish
                                </Button>
                            </TabsContent>

                            <TabsContent value='list' className='space-y-4'>
                                {questions.length === 0 ? (
                                    <div className='text-center py-8'>
                                        <FileText className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                                        <p className='text-muted-foreground'>Hali savollar qo'shilmagan</p>
                                    </div>
                                ) : (
                                    <div className='space-y-4'>
                                        {questions.map((question, index) => (
                                            <Card key={question.id} className='border-border'>
                                                <CardContent className='p-4'>
                                                    <div className='flex items-start justify-between'>
                                                        <div className='flex-1'>
                                                            <div className='flex items-center gap-2 mb-2'>
                                                                <Badge variant='outline'>Savol {index + 1}</Badge>
                                                                <Badge variant='secondary'>
                                                                    {question.points} ball
                                                                </Badge>
                                                                {question.type === 'multiple-choice' && (
                                                                    <Badge variant='outline'>Ko'p variantli</Badge>
                                                                )}
                                                                {question.type === 'true-false' && (
                                                                    <Badge variant='outline'>To'g'ri/Noto'g'ri</Badge>
                                                                )}
                                                                {question.type === 'essay' && (
                                                                    <Badge variant='outline'>Ochiq</Badge>
                                                                )}
                                                            </div>
                                                            <div className='text-sm text-foreground mb-2'>
                                                                {selectedSubject?.hasFormulas ? (
                                                                    <LaTeXRenderer content={question.question} />
                                                                ) : (
                                                                    <p>{question.question}</p>
                                                                )}
                                                            </div>
                                                            {question.options && (
                                                                <div className='space-y-1'>
                                                                    {question.options.map((option, optIndex) => (
                                                                        <div
                                                                            key={optIndex}
                                                                            className={`text-xs p-2 rounded ${question.correctAnswer === optIndex
                                                                                ? 'bg-green-100 text-green-800'
                                                                                : 'bg-muted'
                                                                                }`}
                                                                        >
                                                                            <div className='flex items-center gap-2'>
                                                                                <span>
                                                                                    {String.fromCharCode(65 + optIndex)}
                                                                                    .
                                                                                </span>
                                                                                {selectedSubject?.hasFormulas ? (
                                                                                    <LaTeXRenderer
                                                                                        content={option}
                                                                                        inline
                                                                                    />
                                                                                ) : (
                                                                                    <span>{option}</span>
                                                                                )}
                                                                                {question.correctAnswer ===
                                                                                    optIndex && (
                                                                                        <CheckCircle className='h-3 w-3 ml-auto' />
                                                                                    )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {question.explanation && (
                                                                <div className='mt-2 p-2 bg-blue-50 rounded text-xs'>
                                                                    <strong>Tushuntirish:</strong>{' '}
                                                                    {selectedSubject?.hasFormulas ? (
                                                                        <LaTeXRenderer
                                                                            content={question.explanation}
                                                                            inline
                                                                        />
                                                                    ) : (
                                                                        <span>{question.explanation}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Button
                                                            variant='ghost'
                                                            size='sm'
                                                            onClick={() => removeQuestion(question.id)}
                                                            className='text-destructive hover:text-destructive'
                                                        >
                                                            <Trash2 className='h-4 w-4' />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value='excel' className='space-y-4'>
                                <div className='text-center py-8'>
                                    <FileSpreadsheet className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                                    <h3 className='text-lg font-semibold mb-2'>Excel orqali savollar yuklash</h3>
                                    <p className='text-muted-foreground mb-6'>
                                        Excel faylini yuklab oling, to'ldiring va qayta yuklang.
                                        Har bir fan uchun alohida shablon yaratiladi.
                                    </p>

                                    <div className='flex flex-col sm:flex-row gap-4 justify-center mb-6'>
                                        <Button onClick={downloadExcelTemplate} variant='outline'>
                                            <Download className='h-4 w-4 mr-2' />
                                            Shablon yuklash
                                        </Button>

                                        <div className='relative'>
                                            <input
                                                type='file'
                                                accept='.xlsx,.xls'
                                                onChange={handleFileUpload}
                                                className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                                                id='excel-upload'
                                            />
                                            <Button variant='outline' asChild>
                                                <label htmlFor='excel-upload'>
                                                    <Upload className='h-4 w-4 mr-2' />
                                                    Excel fayl yuklash
                                                </label>
                                            </Button>
                                        </div>
                                    </div>

                                    {excelFile && (
                                        <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
                                            <div className='flex items-center gap-2 mb-2'>
                                                <FileSpreadsheet className='h-4 w-4 text-blue-600' />
                                                <span className='font-medium text-blue-800'>{excelFile.name}</span>
                                            </div>
                                            <p className='text-sm text-blue-700 mb-3'>
                                                {importedQuestions.length} ta savol topildi
                                            </p>
                                            <div className='flex gap-2'>
                                                <Button onClick={applyImportedQuestions} size='sm'>
                                                    Savollarni qo'shish
                                                </Button>
                                                <Button onClick={clearImportedQuestions} variant='outline' size='sm'>
                                                    Bekor qilish
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {importedQuestions.length > 0 && (
                                        <div className='space-y-3'>
                                            <h4 className='font-medium'>Topilgan savollar:</h4>
                                            {importedQuestions.map((question, index) => (
                                                <Card key={index} className='border-blue-200 bg-blue-50'>
                                                    <CardContent className='p-3'>
                                                        <div className='flex items-center gap-2 mb-2'>
                                                            <Badge variant='outline' className='text-xs'>
                                                                Savol {index + 1}
                                                            </Badge>
                                                            <Badge variant='secondary' className='text-xs'>
                                                                {question.points} ball
                                                            </Badge>
                                                            <Badge variant='outline' className='text-xs'>
                                                                {question.type === 'multiple-choice' ? 'Ko\'p variantli' :
                                                                    question.type === 'true-false' ? 'To\'g\'ri/Noto\'g\'ri' : 'Ochiq'}
                                                            </Badge>
                                                        </div>
                                                        <p className='text-sm mb-2'>{question.question}</p>
                                                        {question.options && (
                                                            <div className='space-y-1'>
                                                                {question.options.map((option, optIndex) => (
                                                                    <div key={optIndex} className='text-xs p-1 rounded bg-white'>
                                                                        <span className='font-medium'>
                                                                            {String.fromCharCode(65 + optIndex)}.
                                                                        </span>
                                                                        <span className='ml-2'>{option}</span>
                                                                        {question.correctAnswer === optIndex && (
                                                                            <CheckCircle className='h-3 w-3 ml-2 text-green-600 inline' />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}

                                    <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6'>
                                        <h4 className='font-medium text-yellow-800 mb-2'>📋 Excel shablon tuzilishi:</h4>
                                        <div className='text-sm text-yellow-700 space-y-1'>
                                            <p><strong>1-ustun:</strong> Savol turi (multiple-choice, true-false, essay)</p>
                                            <p><strong>2-ustun:</strong> Savol matni</p>
                                            <p><strong>3-6 ustunlar:</strong> Javob variantlari (A, B, C, D)</p>
                                            <p><strong>7-ustun:</strong> To'g'ri javob (A, B, C yoki D)</p>
                                            <p><strong>8-ustun:</strong> Ball (1-10)</p>
                                            <p><strong>9-ustun:</strong> Izoh (ixtiyoriy)</p>
                                            <p className='text-red-600 font-medium'>⚠️ Muhim: Ko'p variantli savollar uchun faqat to'g'ri javob variantini to'ldiring!</p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
