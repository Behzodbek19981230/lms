import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MathLiveInput } from '@/components/latex/mathlive-input';
import { LaTeXRenderer } from '@/components/latex/latex-renderer';
import { HtmlRenderer } from '@/components/HtmlRenderer';
import {
	ArrowLeft,
	Plus,
	Edit,
	Trash2,
	FileText,
	Clock,
	CheckCircle,
	AlertCircle,
	Archive,
	Hash,
	Type,
	Download,
	Upload,
	FileSpreadsheet,
	Eye,
	Save,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { request } from '@/configs/request';
import { Test, TestStatus, TestTypeEnum } from '@/types/test.type';
import { useAuth } from '@/contexts/AuthContext';
import moment from 'moment';
import PageLoader from '@/components/PageLoader';
import { toast } from '@/hooks/use-toast';
import { MathRenderer } from '@/components/math-renderer';

interface Question {
	id: number;
	text: string;
	type: 'multiple_choice' | 'true_false' | 'essay' | 'short_answer' | 'fill_blank'; // already correct
	points: number;
	answers?: Answer[];
	testId: number;
	createdAt: string;
	updatedAt: string;
}

interface Answer {
	id: number;
	text: string;
	isCorrect: boolean;
	order: number;
	questionId: number;
}

export default function TestQuestions() {
	const { testId } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();

	const [test, setTest] = useState<Test | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState('');

	// Question management state
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	type QuestionForm = {
		text: string;
		type: Question['type'];
		points: number;
		answers: { text: string; isCorrect: boolean; order: number }[];
	};

	const [questionForm, setQuestionForm] = useState<QuestionForm>({
		text: '',
		 type: 'multiple_choice',
		points: 1,
		answers: [{ text: '', isCorrect: false, order: 0 }],
	});

	// Excel import state
	const [excelFile, setExcelFile] = useState<File | null>(null);
	const [importedQuestions, setImportedQuestions] = useState<Question[]>([]);
	const [activeTab, setActiveTab] = useState('list');

		useEffect(() => {
			if (!testId) return;
			const isNumeric = /^\d+$/.test(String(testId));
			if (!isNumeric) {
				setIsLoading(false);
				setErrorMessage("Noto'g'ri test ID");
				return;
			}
			loadTestAndQuestions();
		}, [testId]);

	const loadTestAndQuestions = async () => {
		try {
			setIsLoading(true);
			setErrorMessage('');

					const [testRes, questionsRes] = await Promise.all([
						request.get(`/tests/${Number(testId)}`),
						request.get(`/questions?testId=${Number(testId)}`),
					]);

			setTest(testRes.data);
			setQuestions(questionsRes.data || []);
		} catch (e: any) {
			setErrorMessage(e?.response?.data?.message || "Ma'lumotlarni yuklab bo'lmadi");
		} finally {
			setIsLoading(false);
		}
	};

	const handleAddQuestion = async () => {
		try {
			const isFreeText = questionForm.type === 'essay' || questionForm.type === 'short_answer';
			const questionData = {
				text: questionForm.text,
				type: questionForm.type,
				points: questionForm.points,
				testid: parseInt(testId!),
				answers: isFreeText ? undefined : questionForm.answers,
			};

			const response = await request.post('/questions', questionData);
			setQuestions([...questions, response.data]);
			resetQuestionForm();
			setActiveTab('list');
		} catch (e: any) {
			setErrorMessage(e?.response?.data?.message || "Savolni qo'shib bo'lmadi");
		}
	};

	const handleEditQuestion = (question: Question) => {
		setEditingQuestion(question);
		setQuestionForm({
			text: question.text,
			type: question.type,
			points: question.points,
			answers:
				question.answers && question.answers.length > 0
					? question.answers.map((ans, index) => ({ ...ans, order: index }))
					: [{ text: '', isCorrect: false, order: 0 }],
		});
		setActiveTab('create');
	};

	const handleUpdateQuestion = async () => {
		if (!editingQuestion) return;

		try {
			const isFreeText = questionForm.type === 'essay' || questionForm.type === 'short_answer';
			const questionData = {
				text: questionForm.text,
				type: questionForm.type,
				points: questionForm.points,
				testid: parseInt(testId!),
				answers: isFreeText ? undefined : questionForm.answers,
			};

			const response = await request.patch(`/questions/${editingQuestion.id}`, questionData);
			setQuestions(questions.map((q) => (q.id === editingQuestion.id ? response.data : q)));
			setEditingQuestion(null);
			resetQuestionForm();
			setActiveTab('list');
		} catch (e: any) {
			setErrorMessage(e?.response?.data?.message || "Savolni yangilab bo'lmadi");
		}
	};

	const handleDeleteQuestion = async (questionId: number) => {
		if (!confirm("Bu savolni o'chirishni xohlaysizmi?")) return;

		try {
			await request.delete(`/questions/${questionId}`);
			setQuestions(questions.filter((q) => q.id !== questionId));
		} catch (e: any) {
			setErrorMessage(e?.response?.data?.message || "Savolni o'chirib bo'lmadi");
		}
	};

	const resetQuestionForm = () => {
		setQuestionForm({
			text: '',
			 type: 'multiple_choice',
			points: 1,
			answers: [{ text: '', isCorrect: false, order: 0 }],
		});
	};

	const addAnswer = () => {
		setQuestionForm({
			...questionForm,
			answers: [...questionForm.answers, { text: '', isCorrect: false, order: questionForm.answers.length }],
		});
	};

	const removeAnswer = (index: number) => {
		if (questionForm.answers.length > 1) {
			const newAnswers = questionForm.answers.filter((_, i) => i !== index);
			setQuestionForm({
				...questionForm,
				answers: newAnswers.map((ans, i) => ({ ...ans, order: i })),
			});
		}
	};

	const updateAnswer = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
		const newAnswers = [...questionForm.answers];
		newAnswers[index] = { ...newAnswers[index], [field]: value };
		setQuestionForm({
			...questionForm,
			answers: newAnswers,
		});
	};

	const needsAnswers = (type: string) => {
		 return type === 'multiple_choice' || type === 'true_false' || type === 'fill_blank'; // already correct
	};

	// Excel import functions
	const downloadExcelTemplate = () => {
		// Faqat multiple_choice savollar uchun soddalashtirilgan shablon
            const templateData = [
                {
                    'Savol matni': '2+2 nechaga teng?',
                    'A)': '2',
                    'B)': '3',
                    'C)': '4',
                    "D)": '5',
                    "To'g'ri javob": 'C',
                    Ball: '1',
                },
                {
                    'Savol matni': 'Eng katta daryo?',
                    'A)': 'Nil',
                    'B)': 'Amazonka',
                    'C)': 'Missisipi',
                    "D)": 'Volga',
                    "To'g'ri javob": 'A',
                    Ball: '1',
                },
            ];
    
            const ws = XLSX.utils.json_to_sheet(templateData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Test Savollari');
    
            // Ustun kengliklari
            ws['!cols'] = [
                { width: 40 }, // Savol matni
                { width: 20 }, // A)
                { width: 20 }, // B)
                { width: 20 }, // C)
                { width: 20 }, // D)
                { width: 15 }, // To'g'ri javob
                { width: 10 }, // Ball
            ];
    
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const data = new Blob([excelBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
	
		saveAs(data, `test_shabloni_${test?.subject?.name || 'umumiy'}.xlsx`);
	};

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			if (
				file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
				file.type === 'application/vnd.ms-excel'
			) {
				setExcelFile(file);
				parseExcelFile(file);
			} else {
				setErrorMessage('Iltimos, Excel faylini (.xlsx yoki .xls) yuklang');
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

                    // Ensure row has minimum required data (savol matni, 4 variant, to'g'ri javob, ball)
                    if (row.length < 7 || !row[0] || !row[1] || !row[2] || !row[3] || !row[4] || !row[5]) {
                        errors.push(`Qator ${i + 1}: Ma'lumot yetarli emas`);
                        continue;
                    }

                    const questionText = String(row[0] || '');
                    const optionA = String(row[1] || '');
                    const optionB = String(row[2] || '');
                    const optionC = String(row[3] || '');
                    const optionD = String(row[4] || '');
                    const correctAnswer = String(row[5] || '');
                    const points = parseInt(String(row[6] || '1')) || 1;

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

                    const options: string[] = [];
                    let correctAnswerIndex: number | undefined;

                    // Barcha variantlarni to'plash
                    if (optionA.trim()) options.push(optionA);
                    if (optionB.trim()) options.push(optionB);
                    if (optionC.trim()) options.push(optionC);
                    if (optionD.trim()) options.push(optionD);

                    // To'g'ri javobni indeksga aylantirish
                    const correctAnswerLetter = correctAnswer.toUpperCase();
                    if (correctAnswerLetter === 'A' && optionA.trim()) {
                        correctAnswerIndex = 0;
                    } else if (correctAnswerLetter === 'B' && optionB.trim()) {
                        correctAnswerIndex = 1;
                    } else if (correctAnswerLetter === 'C' && optionC.trim()) {
                        correctAnswerIndex = 2;
                    } else if (correctAnswerLetter === 'D' && optionD.trim()) {
                        correctAnswerIndex = 3;
                    } else {
                        errors.push(`Qator ${i + 1}: To'g'ri javob A, B, C yoki D bo'lishi kerak va variant mavjud bo'lishi kerak`);
                        continue;
                    }

                    if (options.length < 2) {
                        errors.push(`Qator ${i + 1}: Kamida 2 ta variant bo'lishi kerak`);
                        continue;
                    }

					questions.push({
						id: Date.now() + i,
						 type: 'multiple_choice',
						text: questionText,
						points,
						answers: options.map((opt, idx) => ({
							id: Date.now() + i * 10 + idx,
							text: opt,
							isCorrect: idx === correctAnswerIndex,
							order: idx,
							questionId: 0,
						})),
						testId: Number(testId),
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					});
                }

                if (errors.length > 0) {
                    toast({
                        title: 'Xatoliklar topildi',
                        description: `${errors.length} ta xatolik. Iltimos, Excel faylini tekshiring.`,
                        variant: 'destructive',
                    });
                    console.log('Excel import errors:', errors);
                }

                setImportedQuestions(questions);
                toast({
                    title: 'Fayl muvaffaqiyatli yuklandi',
                    description: `${questions.length} ta savol topildi${
                        errors.length > 0 ? `, ${errors.length} ta xatolik` : ''
                    }`,
                });
            } catch (error) {
                toast({
                    title: 'Xatolik',
                    description: "Excel faylini o'qishda xatolik yuz berdi",
                    variant: 'destructive',
                });
                console.error('Excel parse error:', error);
            }
        };
        reader.readAsArrayBuffer(file);
    };

	const applyImportedQuestions = async () => {
		if (importedQuestions.length > 0) {
			try {
				for (const question of importedQuestions) {
					await handleAddQuestionFromImport(question);
				}
				setExcelFile(null);
				setImportedQuestions([]);
				setActiveTab('list');
			} catch (error) {
				setErrorMessage("Savollarni qo'shishda xatolik yuz berdi");
			}
		}
	};

	const handleAddQuestionFromImport = async (questionData: Question) => {
		try {
			const response = await request.post('/questions', {
				text: questionData.text,
				type: questionData.type,
				points: questionData.points,
				testid: parseInt(testId!),
				answers: questionData.answers,
			});
			setQuestions([...questions, response.data]);
		} catch (e: any) {
			throw new Error(e?.response?.data?.message || "Savolni qo'shib bo'lmadi");
		}
	};
    	const renderVariantContent = (text: string) => {
		const parts = text.split(/(\$\$?[^$]+\$\$?)/g);

		return (
			<div className='inline-block w-full'>
				{parts.map((part, index) => {
					if (part.includes('$')) {
						return (
							<span key={index} className='inline-block'>
								<MathRenderer latex={part} />
							</span>
						);
					} else {
						return (
							<span key={index} className='inline' dangerouslySetInnerHTML={{ __html: part }} />
						);
					}
				})}
			</div>
		);
	};

	const clearImportedQuestions = () => {
		setImportedQuestions([]);
		setExcelFile(null);
	};

	const getQuestionTypeText = (type: string) => {
		switch (type) {
			 case 'multiple_choice':
				return "Ko'p tanlovli";
			case 'true_false':
				return "To'g'ri/Noto'g'ri";
			case 'essay':
				return 'Ochiq savol';
			case 'short_answer':
				return 'Qisqa javob';
			case 'fill_blank':
				return "Bo'sh joyni to'ldirish";
			default:
				return type;
		}
	};

	const getStatusIcon = (status: TestStatus) => {
		switch (status) {
			case TestStatus.DRAFT:
				return <AlertCircle className='h-4 w-4 text-yellow-500' />;
			case TestStatus.PUBLISHED:
				return <CheckCircle className='h-4 w-4 text-green-500' />;
			case TestStatus.ARCHIVED:
				return <Archive className='h-4 w-4 text-gray-500' />;
			default:
				return <AlertCircle className='h-4 w-4' />;
		}
	};

	const getStatusText = (status: TestStatus) => {
		switch (status) {
			case TestStatus.DRAFT:
				return 'Qoralama';
			case TestStatus.PUBLISHED:
				return 'Nashr etilgan';
			case TestStatus.ARCHIVED:
				return 'Arxivlangan';
			default:
				return status;
		}
	};

	if (isLoading) {
		return <PageLoader title='Test savollari yuklanmoqda...' />;
	}

	if (errorMessage) {
		return (
			<div className='min-h-screen bg-gradient-subtle flex items-center justify-center'>
				<div className='text-center'>
					<div className='text-lg text-destructive'>{errorMessage}</div>
					<Button onClick={() => navigate(-1)} className='mt-4'>
						<ArrowLeft className='h-4 w-4 mr-2' />
						Orqaga qaytish
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gradient-subtle'>
			{/* Header */}
			<header className='bg-card border-b border-border p-6'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center space-x-4'>
						<Button variant='outline' size='sm' onClick={() => navigate(-1)}>
							<ArrowLeft className='h-4 w-4 mr-2' />
							Orqaga
						</Button>
						<div>
							<h1 className='text-3xl font-bold text-foreground'>{test?.title}</h1>
							<p className='text-muted-foreground'>Test savollari</p>
						</div>
					</div>
					<div className='flex items-center space-x-4'>
						<Button variant='hero' onClick={() => setActiveTab('create')}>
							<Plus className='h-4 w-4 mr-2' />
							Savol qo'shish
						</Button>
						<Button variant='outline' onClick={() => setActiveTab('excel')}>
							<FileSpreadsheet className='h-4 w-4 mr-2' />
							Excel import
						</Button>
					</div>
				</div>
			</header>

			<div className='p-6'>
				{/* Test Info */}
				<Card className='mb-6 border-border'>
					<CardHeader>
						<CardTitle className='text-card-foreground'>Test ma'lumotlari</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
							<div>
								<Label className='text-sm text-muted-foreground'>Test nomi</Label>
								<p className='font-medium'>{test?.title}</p>
							</div>
							<div>
								<Label className='text-sm text-muted-foreground'>Fan</Label>
								<p className='font-medium'>{test?.subject.name}</p>
							</div>
							<div>
								<Label className='text-sm text-muted-foreground'>Holat</Label>
								<div className='flex items-center space-x-2'>
									{getStatusIcon(test?.status!)}
									<Badge variant='outline'>{getStatusText(test?.status!)}</Badge>
								</div>
							</div>
							<div>
								<Label className='text-sm text-muted-foreground'>Savollar soni</Label>
								<p className='font-medium'>{questions.length}</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Enhanced Questions Panel */}
				<Card className='border-border'>
					<CardHeader>
						<CardTitle className='text-card-foreground'>Savollar boshqaruvi</CardTitle>
					</CardHeader>
					<CardContent>
						<Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
							<TabsList className='grid w-full grid-cols-3'>
								<TabsTrigger value='list'>Savollar ro'yxati ({questions.length})</TabsTrigger>
								<TabsTrigger value='create'>Yangi savol</TabsTrigger>
								<TabsTrigger value='excel'>Excel import</TabsTrigger>
							</TabsList>

							<TabsContent value='list' className='space-y-4'>
								{questions.length === 0 ? (
									<div className='text-center py-8'>
										<FileText className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
										<h3 className='text-lg font-medium text-foreground mb-2'>
											Savollar mavjud emas
										</h3>
										<p className='text-muted-foreground mb-4'>Bu testga hali savol qo'shilmagan</p>
										<Button onClick={() => setActiveTab('create')}>
											<Plus className='h-4 w-4 mr-2' />
											Birinchi savolni qo'shing
										</Button>
									</div>
								) : (
									<div className='space-y-4'>
										{questions.map((question, index) => (
											<Card key={question.id} className='border-border'>
												<CardHeader>
													<div className='flex items-start justify-between'>
														<div className='flex items-center space-x-2'>
															<Badge variant='secondary' className='text-xs'>
																{index + 1}
															</Badge>
															<Badge variant='outline' className='text-xs'>
																{getQuestionTypeText(question.type)}
															</Badge>
															<Badge variant='outline' className='text-xs'>
																{question.points} ball
															</Badge>
														</div>
														<div className='flex items-center space-x-2'>
															<Button
																variant='ghost'
																size='sm'
																onClick={() => handleEditQuestion(question)}
															>
																<Edit className='h-4 w-4' />
															</Button>
															<Button
																variant='ghost'
																size='sm'
																onClick={() => handleDeleteQuestion(question.id)}
																className='text-destructive hover:text-destructive'
															>
																<Trash2 className='h-4 w-4' />
															</Button>
														</div>
													</div>
													<CardTitle className='text-lg text-card-foreground'>
												{renderVariantContent(question.text)}
													</CardTitle>
												</CardHeader>
												<CardContent>
													{question.type !== 'essay' &&
														question.type !== 'short_answer' &&
														question.answers && (
															<div className='space-y-2'>
																<Label className='text-sm text-muted-foreground'>
																	Javoblar:
																</Label>
																<div className='space-y-2'>
																	{question.answers.map((answer, optIndex) => (
																		<div
																			key={optIndex}
																			className='flex items-center space-x-2'
																		>
																			<div
																				className={`w-4 h-4 rounded-full border-2 ${
																					answer.isCorrect
																						? 'border-green-500 bg-green-500'
																						: 'border-gray-300'
																				}`}
																			></div>
																			<span className='text-sm'>
																				{renderVariantContent(answer.text)}
																			</span>
																		</div>
																	))}
																</div>
															</div>
														)}

													<div className='flex items-center justify-between text-xs text-muted-foreground mt-4'>
														<span>
															Yaratilgan:{' '}
															{moment(question.createdAt).format('DD.MM.YYYY')}
														</span>
														<span>ID: {question.id}</span>
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								)}
							</TabsContent>

							<TabsContent value='create' className='space-y-4'>
								<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
									{/* Question Creation Form */}
									<div className='lg:col-span-2 space-y-4'>
										<div className='flex items-center justify-between'>
											<h3 className='text-lg font-semibold'>
												{editingQuestion ? 'Savolni tahrirlash' : "Yangi savol qo'shish"}
											</h3>
											{editingQuestion && (
												<Button
													variant='outline'
													size='sm'
													onClick={() => {
														setEditingQuestion(null);
														resetQuestionForm();
													}}
												>
													Yangi savol
												</Button>
											)}
										</div>
										{/* Question Type */}
									

										{/* Question Text */}
										<div className='space-y-2'>
											<Label htmlFor='text'>Savol matni</Label>
											{test?.subject?.hasFormulas ? (
												<MathLiveInput
													value={questionForm.text}
													onChange={(value) =>
														setQuestionForm({ ...questionForm, text: value })
													}
													placeholder="Savol matnini kiriting. Formula qo'shish uchun 'Formula qo'shish' tugmasini bosing"
													className='w-full'
												/>
											) : (
												<Textarea
													id='text'
													value={questionForm.text}
													onChange={(e) =>
														setQuestionForm({ ...questionForm, text: e.target.value })
													}
													placeholder='Savol matnini kiriting'
													rows={3}
												/>
											)}
										</div>

										{/* Answer Options */}
										{needsAnswers(questionForm.type) && (
											<div className='space-y-2'>
												<Label>Javoblar</Label>
												<div className='space-y-2'>
													{questionForm.answers.map((answer, index) => (
														<div key={index} className='flex items-center space-x-2'>
															{test?.subject?.hasFormulas ? (
																<MathLiveInput
																	value={answer.text}
																	onChange={(value) =>
																		updateAnswer(index, 'text', value)
																	}
																	placeholder={`Javob ${index + 1}`}
																	className='flex-1'
																/>
															) : (
																<Input
																	value={answer.text}
																	onChange={(e) =>
																		updateAnswer(index, 'text', e.target.value)
																	}
																	placeholder={`Javob ${index + 1}`}
																	className='flex-1'
																/>
															)}
															<div className='flex items-center space-x-2'>
																<input
																	type='checkbox'
																	id={`correct-${index}`}
																	checked={answer.isCorrect}
																	onChange={(e) =>
																		updateAnswer(
																			index,
																			'isCorrect',
																			e.target.checked
																		)
																	}
																	className='rounded'
																/>
																<Label htmlFor={`correct-${index}`} className='text-xs'>
																	To'g'ri
																</Label>
															</div>
															{questionForm.answers.length > 1 && (
																<Button
																	type='button'
																	variant='outline'
																	size='sm'
																	onClick={() => removeAnswer(index)}
																>
																	<Trash2 className='h-4 w-4' />
																</Button>
															)}
														</div>
													))}
													<Button
														type='button'
														variant='outline'
														size='sm'
														onClick={addAnswer}
													>
														<Plus className='h-4 w-4 mr-2' />
														Javob qo'shish
													</Button>
												</div>
											</div>
										)}

										{/* Points */}
										<div className='space-y-2'>
											<Label htmlFor='points'>Ballar</Label>
											<Input
												id='points'
												type='number'
												value={questionForm.points}
												onChange={(e) =>
													setQuestionForm({
														...questionForm,
														points: parseInt(e.target.value),
													})
												}
												min='1'
												max='100'
											/>
										</div>

										<Button
											onClick={editingQuestion ? handleUpdateQuestion : handleAddQuestion}
											className='w-full'
										>
											{editingQuestion ? (
												<>
													<Save className='h-4 w-4 mr-2' />
													Savolni saqlash
												</>
											) : (
												<>
													<Plus className='h-4 w-4 mr-2' />
													Savolni qo'shish
												</>
											)}
										</Button>
									</div>

									{/* Preview Panel */}
									<div className='lg:col-span-1'>
										<Card className='border-blue-200 bg-blue-50'>
											<CardHeader>
												<CardTitle className='text-blue-800 text-lg'>Ko'rinish</CardTitle>
											</CardHeader>
											<CardContent className='space-y-4'>
												{questionForm.text && (
													<div>
														<Label className='text-sm text-blue-700'>Savol:</Label>
														<div className='mt-1 p-3 bg-white rounded border'>
															{ /<\s*\w+[^>]*>/.test(questionForm.text || '') ? (
																<HtmlRenderer content={questionForm.text} />
															) : test?.subject?.hasFormulas ? (
																<LaTeXRenderer content={questionForm.text} />
															) : (
																<p>{questionForm.text}</p>
															)}
														</div>
													</div>
												)}

												 {questionForm.answers &&
												 questionForm.answers.length > 0 &&
												 (questionForm.type === 'multiple_choice' ||
												 questionForm.type === 'true_false' ||
												 questionForm.type === 'fill_blank') && (
														<div>
															<Label className='text-sm text-blue-700'>Javoblar:</Label>
															<div className='mt-1 space-y-1'>
																{questionForm.answers.map((answer, index) => (
																	<div
																		key={index}
																		className={`p-2 rounded text-sm ${
																			answer.isCorrect
																				? 'bg-green-100 text-green-800'
																				: 'bg-white'
																		}`}
																	>
																		<div className='flex items-center gap-2'>
																			<span className='font-medium'>
																				{String.fromCharCode(65 + index)}.
																			</span>
																			{ /<\s*\w+[^>]*>/.test(answer.text || '') ? (
																				<HtmlRenderer content={answer.text} inline />
																			) : test?.subject?.hasFormulas ? (
																				<LaTeXRenderer content={answer.text} inline />
																			) : (
																				<span>{answer.text}</span>
																			)}
																			{answer.isCorrect && (
																				<CheckCircle className='h-3 w-3 ml-auto' />
																			)}
																		</div>
																	</div>
																))}
															</div>
														</div>
													)}

												<div className='pt-2 border-t border-blue-200'>
													<div className='flex justify-between text-sm'>
														<span className='text-blue-700'>Ball:</span>
														<span className='font-medium'>{questionForm.points}</span>
													</div>
												</div>
											</CardContent>
										</Card>
									</div>
								</div>
							</TabsContent>

							<TabsContent value='excel' className='space-y-4'>
								<div className='text-center py-8'>
									<FileSpreadsheet className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
									<h3 className='text-lg font-semibold mb-2'>Excel orqali savollar yuklash</h3>
									<p className='text-muted-foreground mb-6'>
										Excel faylini yuklab oling, to'ldiring va qayta yuklang. Har bir fan uchun
										alohida shablon yaratiladi.
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
																{getQuestionTypeText(question.type)}
															</Badge>
														</div>
														<p className='text-sm mb-2'>{question.text}</p>
														{question.answers && (
															<div className='space-y-1'>
																{question.answers.map((answer, optIndex) => (
																	<div
																		key={optIndex}
																		className='text-xs p-1 rounded bg-white'
																	>
																		<span className='font-medium'>
																			{String.fromCharCode(65 + optIndex)}.
																		</span>
																		<span className='ml-2'>{answer.text}</span>
																		{answer.isCorrect && (
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
										<h4 className='font-medium text-yellow-800 mb-2'>
											📋 Excel shablon tuzilishi:
										</h4>
										<div className='text-sm text-yellow-700 space-y-1'>
											<p>
												<strong>1-ustun:</strong> Savol turi (multiple_choice, true_false,
												essay)
											</p>
											<p>
												<strong>2-ustun:</strong> Savol matni
											</p>
											<p>
												<strong>3-6 ustunlar:</strong> Javob variantlari (A, B, C, D)
											</p>
											<p>
												<strong>7-ustun:</strong> To'g'ri javob (A, B, C yoki D)
											</p>
											<p>
												<strong>8-ustun:</strong> Ball (1-10)
											</p>
											<p className='text-red-600 font-medium'>
												⚠️ Muhim: Ko'p variantli savollar uchun faqat to'g'ri javob variantini
												to'ldiring!
											</p>
										</div>
									</div>
								</div>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</div>

			{/* Add Question Dialog */}
			<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
				<DialogContent className='max-w-2xl'>
					<DialogHeader>
						<DialogTitle>Yangi savol qo'shish</DialogTitle>
					</DialogHeader>

					<div className='space-y-4'>
						<div>
							<Label htmlFor='text'>Savol matni</Label>
							<Textarea
								id='text'
								value={questionForm.text}
								onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
								placeholder='Savol matnini kiriting'
								rows={3}
							/>
						</div>

						<div className='grid grid-cols-2 gap-4'>
							<div>
								<Label htmlFor='type'>Savol turi</Label>
								<Select
									value={questionForm.type}
									onValueChange={(value: any) => setQuestionForm({ ...questionForm, type: value })}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='multiple_choice'>Ko'p tanlovli</SelectItem>
										<SelectItem value='true_false'>To'g'ri/Noto'g'ri</SelectItem>
										<SelectItem value='essay'>Ochiq savol</SelectItem>
										<SelectItem value='short_answer'>Qisqa javob</SelectItem>
										<SelectItem value='fill_blank'>Bo'sh joyni to'ldirish</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label htmlFor='points'>Ballar</Label>
								<Input
									id='points'
									type='number'
									value={questionForm.points}
									onChange={(e) =>
										setQuestionForm({ ...questionForm, points: parseInt(e.target.value) })
									}
									min='1'
									max='100'
								/>
							</div>
						</div>

						{needsAnswers(questionForm.type) && (
							<div>
								<Label>Javoblar</Label>
								<div className='space-y-2'>
									{questionForm.answers.map((answer, index) => (
										<div key={index} className='flex items-center space-x-2'>
											<Input
												value={answer.text}
												onChange={(e) => updateAnswer(index, 'text', e.target.value)}
												placeholder={`Javob ${index + 1}`}
											/>
											<div className='flex items-center space-x-2'>
												<input
													type='checkbox'
													id={`correct-${index}`}
													checked={answer.isCorrect}
													onChange={(e) => updateAnswer(index, 'isCorrect', e.target.checked)}
													className='rounded'
												/>
												<Label htmlFor={`correct-${index}`} className='text-xs'>
													To'g'ri
												</Label>
											</div>
											{questionForm.answers.length > 1 && (
												<Button
													type='button'
													variant='outline'
													size='sm'
													onClick={() => removeAnswer(index)}
												>
													<Trash2 className='h-4 w-4' />
												</Button>
											)}
										</div>
									))}
									<Button type='button' variant='outline' size='sm' onClick={addAnswer}>
										<Plus className='h-4 w-4 mr-2' />
										Javob qo'shish
									</Button>
								</div>
							</div>
						)}
					</div>

					<div className='flex space-x-2 pt-4'>
						<Button variant='outline' onClick={() => setIsAddDialogOpen(false)} className='flex-1'>
							Bekor qilish
						</Button>
						<Button onClick={handleAddQuestion} className='flex-1'>
							Qo'shish
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit Question Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className='max-w-2xl'>
					<DialogHeader>
						<DialogTitle>Savolni tahrirlash</DialogTitle>
					</DialogHeader>

					<div className='space-y-4'>
						<div>
							<Label htmlFor='edit-text'>Savol matni</Label>
							<Textarea
								id='edit-text'
								value={questionForm.text}
								onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
								placeholder='Savol matnini kiriting'
								rows={3}
							/>
						</div>

						<div className='grid grid-cols-2 gap-4'>
							<div>
								<Label htmlFor='edit-type'>Savol turi</Label>
								<Select
									value={questionForm.type}
									onValueChange={(value: Question['type']) =>
										setQuestionForm({ ...questionForm, type: value })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='multiple_choice'>Ko'p tanlovli</SelectItem>
										<SelectItem value='true_false'>To'g'ri/Noto'g'ri</SelectItem>
										<SelectItem value='essay'>Ochiq savol</SelectItem>
										<SelectItem value='short_answer'>Qisqa javob</SelectItem>
										<SelectItem value='fill_blank'>Bo'sh joyni to'ldirish</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label htmlFor='edit-points'>Ballar</Label>
								<Input
									id='edit-points'
									type='number'
									value={questionForm.points}
									onChange={(e) =>
										setQuestionForm({ ...questionForm, points: parseInt(e.target.value) })
									}
									min='1'
									max='100'
								/>
							</div>
						</div>

						{questionForm.type !== 'essay' && questionForm.type !== 'short_answer' && (
							<div>
								<Label>Javoblar</Label>
								<div className='space-y-2'>
									{questionForm.answers.map((answer, index) => (
										<div key={index} className='flex items-center space-x-2'>
											<Input
												value={answer.text}
												onChange={(e) => updateAnswer(index, 'text', e.target.value)}
												placeholder={`Javob ${index + 1}`}
											/>
											<div className='flex items-center space-x-2'>
												<input
													type='checkbox'
													id={`edit-correct-${index}`}
													checked={answer.isCorrect}
													onChange={(e) => updateAnswer(index, 'isCorrect', e.target.checked)}
													className='rounded'
												/>
												<Label htmlFor={`edit-correct-${index}`} className='text-xs'>
													To'g'ri
												</Label>
											</div>
											{questionForm.answers.length > 1 && (
												<Button
													type='button'
													variant='outline'
													size='sm'
													onClick={() => removeAnswer(index)}
												>
													<Trash2 className='h-4 w-4' />
												</Button>
											)}
										</div>
									))}
									<Button type='button' variant='outline' size='sm' onClick={addAnswer}>
										<Plus className='h-4 w-4 mr-2' />
										Javob qo'shish
									</Button>
								</div>
							</div>
						)}
					</div>

					<div className='flex space-x-2 pt-4'>
						<Button variant='outline' onClick={() => setIsEditDialogOpen(false)} className='flex-1'>
							Bekor qilish
						</Button>
						<Button onClick={handleUpdateQuestion} className='flex-1'>
							Saqlash
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
