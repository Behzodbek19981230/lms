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
import { Beaker, Calculator, CheckCircle, Eye, FileText, Globe, History, Plus, Save, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { request } from '@/configs/request';
import { useToast } from '@/components/ui/use-toast';

interface Question {
    id: number;
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
            const subject = subjects.find((s) => s.id === subjectId);
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

    const removeQuestion = (id: number) => {
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

    return (
        <main className='flex-1 p-6 space-y-6'>
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className=' text-3xl font-bold '>Yangi test yaratish</h1>
                    <p className='text-muted-foreground'>Studentlar uchun test tuzish</p>
                </div>
                <div className='flex gap-2'>
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
                                value={selectedSubject?.id || ''}
                                onValueChange={(value) => {
                                    const subject = subjects.find((s) => s.id === value);
                                    setSelectedSubject(subject || null);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder='Fanni tanlang' />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((subject) => (
                                        <SelectItem key={subject.id} value={subject.id}>
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
                            <TabsList className='grid w-full grid-cols-2'>
                                <TabsTrigger value='create'>Yangi savol</TabsTrigger>
                                <TabsTrigger value='list'>Savollar ro'yxati ({questions.length})</TabsTrigger>
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
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
