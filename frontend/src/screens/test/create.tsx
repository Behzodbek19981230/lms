'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
	Beaker,
	Calculator,
	CheckCircle,
	Eye,
	FileText,
	Globe,
	History,
	Plus,
	Save,
	Trash2,
	Download,
	Upload,
	FileSpreadsheet,
	MessageCircle,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { request } from '@/configs/request';
import { useToast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import TelegramManager from '@/components/telegram/TelegramManager';
import { buildWeeklyDescription } from '@/screens/weekly-tests/constants';
import { getToken } from '@/utils/auth';
import QuestionImportGuideTabs from '@/components/test/QuestionImportGuideTabs';

interface Question {
	id: string | number;
	type: 'multiple_choice' | 'essay' | 'true_false';
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
	const IMPORT_API_URL = useMemo(() => {
		// Prefer configured backend baseURL (e.g. http://localhost:3003/api)
		const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
		if (apiBase) return `${apiBase}/import/questions`;
		// Fallback: same-origin
		return '/api/import/questions';
	}, []);

	let mathJaxSvgLoadPromise: Promise<void> | null = null;
	const ensureMathJaxSvg = async () => {
		if (typeof window === 'undefined') return;
		// If already available (maybe loaded elsewhere), we're good.
		if ((window as any).MathJax?.tex2svg || (window as any).MathJax?.mathml2svg) return;
		if (mathJaxSvgLoadPromise) return mathJaxSvgLoadPromise;

		mathJaxSvgLoadPromise = new Promise<void>((resolve, reject) => {
			// If MathJax core is not present, tex-svg will bootstrap it.
			const script = document.createElement('script');
			script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-svg.js';
			script.async = true;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed to load MathJax tex-mml-svg'));
			document.head.appendChild(script);
		});

		return mathJaxSvgLoadPromise;
	};

	const svgToDataUrl = (svgMarkup: string) => {
		try {
			// Use URL-encoded SVG to avoid btoa/unescape Unicode issues
			const encoded = encodeURIComponent(svgMarkup).replace(/%0A/g, '').replace(/%20/g, ' ');
			return `data:image/svg+xml;charset=utf-8,${encoded}`;
		} catch {
			return '';
		}
	};

	// Download Word (.docx) template for test import
	const downloadWordTemplate = async () => {
		// npm install docx
		const docx = await import('docx');
		const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun } = docx;
		const table = new Table({
			rows: [
				new TableRow({
					children: [
						new TableCell({
							children: [new Paragraph('Savol matni')],
							width: { size: 40, type: WidthType.PERCENTAGE },
						}),
						new TableCell({
							children: [new Paragraph('A)')],
							width: { size: 20, type: WidthType.PERCENTAGE },
						}),
						new TableCell({
							children: [new Paragraph('B)')],
							width: { size: 20, type: WidthType.PERCENTAGE },
						}),
						new TableCell({
							children: [new Paragraph('C)')],
							width: { size: 20, type: WidthType.PERCENTAGE },
						}),
						new TableCell({
							children: [new Paragraph('D)')],
							width: { size: 20, type: WidthType.PERCENTAGE },
						}),
						new TableCell({
							children: [new Paragraph("To'g'ri javob")],
							width: { size: 15, type: WidthType.PERCENTAGE },
						}),
						new TableCell({
							children: [new Paragraph('Ball')],
							width: { size: 10, type: WidthType.PERCENTAGE },
						}),
					],
				}),
				new TableRow({
					children: [
						new TableCell({ children: [new Paragraph('2+2 nechaga teng?')] }),
						new TableCell({ children: [new Paragraph('2')] }),
						new TableCell({ children: [new Paragraph('3')] }),
						new TableCell({ children: [new Paragraph('4')] }),
						new TableCell({ children: [new Paragraph('5')] }),
						new TableCell({ children: [new Paragraph('C')] }),
						new TableCell({ children: [new Paragraph('1')] }),
					],
				}),
				new TableRow({
					children: [
						new TableCell({ children: [new Paragraph('Eng katta daryo?')] }),
						new TableCell({ children: [new Paragraph('Nil')] }),
						new TableCell({ children: [new Paragraph('Amazonka')] }),
						new TableCell({ children: [new Paragraph('Missisipi')] }),
						new TableCell({ children: [new Paragraph('Volga')] }),
						new TableCell({ children: [new Paragraph('A')] }),
						new TableCell({ children: [new Paragraph('1')] }),
					],
				}),
			],
			width: { size: 100, type: WidthType.PERCENTAGE },
		});
		const doc = new Document({
			sections: [
				{
					children: [
						new Paragraph({
							text: 'Test savollarini Word orqali import qilish uchun shablon',
							heading: 'Heading1',
						}),
						table,
						new Paragraph({
							text: "1-ustun: Savol matni\n2-5 ustunlar: Javob variantlari (A, B, C, D)\n6-ustun: To'g'ri javob (A, B, C yoki D)\n7-ustun: Ball (1-10)",
							spacing: { before: 200, after: 200 },
						}),
						new Paragraph({
							text: "Formulalar uchun: Word'dagi Equation (Insert → Equation) obyektlari importda best-effort tarzda SVG ko'rinishiga o'girib olinadi. Agar konvertatsiya qilinmasa, formula rasm (image) bo'lsa ham import qilinadi. Alternativa: formulani $...$ (LaTeX) ko'rinishida yozing (masalan: $\\frac{a}{b}$).",
							spacing: { before: 200, after: 200 },
						}),
						new Paragraph({
							children: [
								new TextRun({
									text: "⚠️ Muhim: Ko'p variantli savollar uchun faqat to'g'ri javob variantini to'ldiring!",
									bold: true,
								}),
							],
							spacing: { before: 200 },
						}),
					],
				},
			],
		});
		const buffer = await Packer.toBlob(doc);
		const fileName = `test_shabloni_${selectedSubject?.name || 'umumiy'}.docx`;
		saveAs(buffer, fileName);
		toast({ title: 'Word shablon yuklandi', description: "Word faylini to'ldiring va qayta yuklang" });
	};
	const router = useRouter();
	const searchParams = useSearchParams();
	const subjectId = searchParams?.get('subject');
	const titleParam = searchParams?.get('title');
	const fixedTitle = searchParams?.get('fixedTitle') === '1';
	const isWeekly = searchParams?.get('weekly') === '1';
	const weeklyFrom = searchParams?.get('weeklyFrom');
	const weeklyTo = searchParams?.get('weeklyTo');
	const { toast } = useToast();
	const [isLoading, setIsLoading] = useState(false);

	const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
	const [testTitle, setTestTitle] = useState('');
	const [testDescription, setTestDescription] = useState('');
	const [testType, setTestType] = useState<'open' | 'closed'>('open');
	const [timeLimit, setTimeLimit] = useState(60);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [currentQuestion, setCurrentQuestion] = useState<Question>({
		id: '',
		type: 'multiple_choice',
		question: '',
		options: ['', '', '', ''],
		correctAnswer: 0,
		points: 1,
		explanation: '',
	});

	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [excelFile, setExcelFile] = useState<File | null>(null);
	const [wordFile, setWordFile] = useState<File | null>(null);
	const [importedQuestions, setImportedQuestions] = useState<Question[]>([]);
	const [savedTestId, setSavedTestId] = useState<number | null>(null);
	const [printableUrl, setPrintableUrl] = useState<string | null>(null);

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
			} catch (e) {
				console.log(e);
			}
		})();
	}, []);

	useEffect(() => {
		if (subjectId) {
			const subject = subjects.find((s) => s.id === Number(subjectId));
			if (subject) {
				setSelectedSubject(subject);
			}
		}
	}, [subjectId, subjects]);

	useEffect(() => {
		if (!titleParam) return;
		// Only set initial value once (don't overwrite user's manual edits)
		setTestTitle((prev) => (prev ? prev : titleParam));
	}, [titleParam]);

	const addQuestion = () => {
		if (currentQuestion.question.trim()) {
			const newQuestion: Question = {
				...currentQuestion,
				id: Date.now().toString(),
			};
			setQuestions([...questions, newQuestion]);
			setCurrentQuestion({
				id: '',
				type: testType === 'open' ? 'multiple_choice' : 'essay',
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
				description: 'Iltimos, fan, test nomi va kamida bitta savol kiriting.',
				variant: 'destructive',
			});
			return;
		}
		setIsLoading(true);

		try {
			const weeklyTag =
				isWeekly && weeklyFrom && weeklyTo ? buildWeeklyDescription(String(weeklyFrom), String(weeklyTo)) : '';
			const finalDescription = weeklyTag
				? `${weeklyTag}${testDescription ? `\n${testDescription}` : ''}`
				: testDescription || undefined;

			// 1) Create test
			const { data: testRes } = await request.post('/tests', {
				title: testTitle,
				description: finalDescription,
				type: testType,
				duration: timeLimit,
				shuffleQuestions: true,
				showResults: true,
				subjectid: Number(selectedSubject.id),
			});
			const testId = testRes?.id;
			setPrintableUrl(null);

			// 2) Create questions
			for (let idx = 0; idx < questions.length; idx++) {
				const q = questions[idx];
				const isMC = q.type === 'multiple_choice';
				await request.post('/questions', {
					text: q.question,
					explanation: q.explanation || undefined,
					type: isMC ? 'multiple_choice' : q.type === 'true_false' ? 'true_false' : 'essay',
					points: q.points,
					order: idx,
					hasFormula: !!selectedSubject?.hasFormulas,
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

			setSavedTestId(Number(testId));

			if (isWeekly) {
				try {
					const { data } = await request.post(`/tests/${Number(testId)}/printable-html`, {
						shuffleQuestions: true,
						shuffleAnswers: true,
					});
					if (data?.url) setPrintableUrl(String(data.url));
					router.push(`/account/weekly-tests`);
				} catch (err: any) {
					toast({
						title: 'Ogohlantirish',
						description: err?.response?.data?.message || 'Printable HTML yaratilmadi',
						variant: 'destructive',
					});
				}
			}
			toast({
				title: 'Test yaratildi',
				description: 'Test va savollar muvaffaqiyatli saqlandi. Endi Telegram orqali tarqatishingiz mumkin.',
			});
		} catch (e: any) {
			toast({
				title: 'Xatolik',
				description: e?.response?.data?.message || 'Saqlashda xatolik yuz berdi',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	const shareUrl = useMemo(() => {
		if (!printableUrl) return undefined;
		const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
		const inferred = apiBase.replace(/\/?api\/?$/, '');
		const base = (process.env.NEXT_PUBLIC_FILE_BASE_URL || inferred).replace(/\/$/, '');
		return `${base}${printableUrl}`;
	}, [printableUrl]);

	const downloadExcelTemplate = () => {
		// Faqat multiple_choice savollar uchun soddalashtirilgan shablon
		const templateData = [
			{
				'Savol matni': '2+2 nechaga teng?',
				'A)': '2',
				'B)': '3',
				'C)': '4',
				'D)': '5',
				"To'g'ri javob": 'C',
				Ball: '1',
			},
			{
				'Savol matni': 'Eng katta daryo?',
				'A)': 'Nil',
				'B)': 'Amazonka',
				'C)': 'Missisipi',
				'D)': 'Volga',
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
		saveAs(data, `test_shabloni_${selectedSubject?.name || 'umumiy'}.xlsx`);

		toast({ title: 'Shablon yuklandi', description: "Excel faylini to'ldiring va qayta yuklang" });
	};

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			const isExcel =
				file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
				file.type === 'application/vnd.ms-excel' ||
				/\.xlsx$/i.test(file.name);
			const isWord =
				file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
				/\.docx$/i.test(file.name);

			if (!isExcel && !isWord) {
				toast({
					title: "Noto'g'ri fayl turi",
					description: 'Iltimos, Excel (.xlsx/.xls) yoki Word (.docx) faylini yuklang',
					variant: 'destructive',
				});
				return;
			}

			setImportedQuestions([]);
			if (isExcel) {
				setExcelFile(file);
				setWordFile(null);
			} else {
				setWordFile(file);
				setExcelFile(null);
			}

			// Use Python backend import so Word equations (OMML) are reliably converted to LaTeX.
			parseFileViaBackend(file);
		}
	};

	const parseFileViaBackend = async (file: File) => {
		toast({
			title: 'Fayl yuklanmoqda...',
			description: "Formulalar Python server orqali LaTeX ko'rinishiga o‘tkaziladi",
		});
		try {
			const fd = new FormData();
			fd.append('file', file);
			const token = getToken();
			const res = await fetch(IMPORT_API_URL, {
				method: 'POST',
				body: fd,
				headers: token ? { Authorization: `Bearer ${token}` } : undefined,
			});
			console.log(res);

			if (!res.ok) {
				let msg = `Import xatolik: ${res.status}`;
				try {
					const j = await res.json();
					msg = j?.message || j?.error || msg;
				} catch {
					// ignore
				}
				throw new Error(msg);
			}
			const data = await res.json();
			const parsed: Question[] = (data?.questions || []).map((q: any, i: number) => ({
				id: Date.now() + i,
				type: 'multiple_choice',
				question: String(q?.question || ''),
				options: Array.isArray(q?.options) ? q.options.map((x: any) => String(x)) : [],
				correctAnswer: typeof q?.correctAnswer === 'number' ? q.correctAnswer : 0,
				points: Number(q?.points || 1) || 1,
			}));

			setImportedQuestions(parsed);
			toast({
				title: 'Import tayyor',
				description: `${parsed.length} ta savol topildi${
					Array.isArray(data?.errors) && data.errors.length > 0 ? `, ${data.errors.length} ta xatolik` : ''
				}`,
			});

			if (Array.isArray(data?.errors) && data.errors.length > 0) {
				toast({
					title: 'Xatoliklar topildi',
					description: `${data.errors.length} ta xatolik. Iltimos, faylni tekshiring.`,
					variant: 'destructive',
				});
				console.log('Import errors:', data.errors);
			}
		} catch (e: any) {
			toast({
				title: 'Import xatolik',
				description: e?.message || 'Fayl import qilinmadi',
				variant: 'destructive',
			});
			setImportedQuestions([]);
			setExcelFile(null);
			setWordFile(null);
		}
	};

	const applyImportedQuestions = () => {
		if (importedQuestions.length > 0) {
			setQuestions(importedQuestions);
			setExcelFile(null);
			setWordFile(null);
			setImportedQuestions([]);
			toast({
				title: "Savollar qo'shildi",
				description: `${importedQuestions.length} ta savol testga qo\'shildi`,
			});
		}
	};

	const clearImportedQuestions = () => {
		setImportedQuestions([]);
		setExcelFile(null);
		setWordFile(null);
	};

	return (
		<main className='min-h-screen bg-gradient-subtle'>
			<div className='bg-card border-b border-border p-4 md:p-6 sticky top-0 z-10 shadow-sm'>
				<div className='max-w-7xl mx-auto'>
					<div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
						<div>
							<h1 className='text-2xl md:text-3xl font-bold text-foreground'>Yangi test yaratish</h1>
							<p className='text-sm text-muted-foreground mt-1'>O‘quvchilar uchun test tuzish</p>
						</div>
						<div className='flex flex-wrap gap-2'>
							<Button onClick={saveTest} className='bg-primary hover:bg-primary/90' disabled={isLoading}>
								<Save className='h-4 w-4 mr-2' />
								{isLoading ? 'Yuklanmoqda...' : 'Saqlash'}
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div className='max-w-7xl mx-auto p-4 md:p-6 space-y-6'>
				{/* Test Settings */}
				<div className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6'>
					{/* Settings Card */}
					<Card className='lg:col-span-1 border-border h-fit'>
						<CardHeader className='pb-3'>
							<CardTitle className='text-lg'>Test sozlamalari</CardTitle>
							<CardDescription>Asosiy ma'lumotlar va sozlamalar</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							{/* Subject Selection */}
							<div className='space-y-2'>
								<Label className='text-sm font-medium'>Fan</Label>
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

							{/* Test Title */}
							<div className='space-y-2'>
								<Label htmlFor='title' className='text-sm font-medium'>
									Test nomi
								</Label>
								<Input
									id='title'
									value={testTitle}
									onChange={(e) => {
										if (!fixedTitle) setTestTitle(e.target.value);
									}}
									readOnly={fixedTitle}
									placeholder='Masalan: Algebra asoslari'
									className='h-10'
								/>
							</div>

							{/* Test Description */}
							<div className='space-y-2'>
								<Label htmlFor='description' className='text-sm font-medium'>
									Tavsif
								</Label>
								<Textarea
									id='description'
									value={testDescription}
									onChange={(e) => setTestDescription(e.target.value)}
									placeholder="Test haqida qisqacha ma'lumot"
									className='min-h-[80px] resize-none'
								/>
							</div>

							{/* Test Stats */}
							<div className='pt-3 border-t space-y-3'>
								<h4 className='text-sm font-medium text-foreground'>Statistika</h4>
								<div className='space-y-2'>
									<div className='flex justify-between items-center text-sm'>
										<span className='text-muted-foreground'>Savollar soni:</span>
										<Badge variant='secondary' className='font-semibold'>
											{questions.length}
										</Badge>
									</div>
									<div className='flex justify-between items-center text-sm'>
										<span className='text-muted-foreground'>Jami ball:</span>
										<Badge variant='secondary' className='font-semibold'>
											{questions.reduce((sum, q) => sum + q.points, 0)}
										</Badge>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Question Creation */}
					<Card className='lg:col-span-2 border-border'>
						<CardHeader className='pb-3'>
							<CardTitle className='text-lg'>Savol yaratish</CardTitle>
							<CardDescription>
								{testType === 'open' ? 'Variantli savol tuzish' : 'Ochiq savol tuzish'}
							</CardDescription>
						</CardHeader>
						<CardContent className='p-4 md:p-6'>
							<Tabs defaultValue='create' className='w-full'>
								<TabsList className={`grid w-full mb-4 ${savedTestId ? 'grid-cols-4' : 'grid-cols-3'}`}>
									<TabsTrigger value='create' className='text-xs md:text-sm'>
										Yangi savol
									</TabsTrigger>
									<TabsTrigger value='list' className='text-xs md:text-sm'>
										Ro'yxat ({questions.length})
									</TabsTrigger>
									<TabsTrigger value='excel' className='text-xs md:text-sm'>
										Excel/Word orqali import
									</TabsTrigger>
								</TabsList>

								<TabsContent value='create' className='space-y-4 mt-4'>
									{/* Question Text */}
									<div className='space-y-2'>
										<Label htmlFor='question' className='text-sm font-medium'>
											Savol matni
										</Label>
										{selectedSubject?.hasFormulas ? (
											<MathLiveInput
												value={currentQuestion.question}
												onChange={(value) => updateCurrentQuestion('question', value)}
												placeholder="Savol matnini kiriting. Formula qo'shish uchun toolbar'dan foydalaning"
												className='w-full'
											/>
										) : (
											<Textarea
												id='question'
												value={currentQuestion.question}
												onChange={(e) => updateCurrentQuestion('question', e.target.value)}
												placeholder='Savol matnini kiriting'
												className='min-h-[100px] resize-none'
											/>
										)}
									</div>

									{/* Answer Options */}
									{testType === 'open' && currentQuestion.type === 'multiple_choice' && (
										<div className='space-y-3'>
											<Label className='text-sm font-medium'>Javob variantlari</Label>
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
																className='mt-1'
															/>
														</RadioGroup>
														{selectedSubject?.hasFormulas ? (
															<MathLiveInput
																value={option}
																onChange={(value) => updateQuestionOption(index, value)}
																placeholder={`Variant ${String.fromCharCode(
																	65 + index
																)}`}
																className='flex-1'
															/>
														) : (
															<Input
																value={option}
																onChange={(e) =>
																	updateQuestionOption(index, e.target.value)
																}
																placeholder={`Variant ${String.fromCharCode(
																	65 + index
																)}`}
																className='flex-1'
															/>
														)}
													</div>
												))}
											</div>
											<p className='text-xs text-muted-foreground'>
												To'g'ri javobni doira belgisini bosib belgilang
											</p>
										</div>
									)}

									{testType === 'open' && currentQuestion.type === 'true_false' && (
										<div className='space-y-2'>
											<Label className='text-sm font-medium'>To'g'ri javob</Label>
											<RadioGroup
												value={currentQuestion.correctAnswer?.toString()}
												onValueChange={(value) =>
													updateCurrentQuestion('correctAnswer', value === 'true')
												}
											>
												<div className='flex items-center space-x-2'>
													<RadioGroupItem value='true' id='true' />
													<Label htmlFor='true' className='cursor-pointer'>
														To'g'ri
													</Label>
												</div>
												<div className='flex items-center space-x-2'>
													<RadioGroupItem value='false' id='false' />
													<Label htmlFor='false' className='cursor-pointer'>
														Noto'g'ri
													</Label>
												</div>
											</RadioGroup>
										</div>
									)}

									{/* Points */}
									<div className='space-y-2'>
										<Label htmlFor='points' className='text-sm font-medium'>
											Ball (1-10)
										</Label>
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
											className='w-24'
										/>
									</div>

									{/* Explanation */}
									<div className='space-y-2'>
										<Label htmlFor='explanation' className='text-sm font-medium'>
											Tushuntirish (ixtiyoriy)
										</Label>
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
												className='min-h-[60px] resize-none'
											/>
										)}
									</div>

									<Button onClick={addQuestion} className='w-full'>
										<Plus className='h-4 w-4 mr-2' />
										Savolni qo'shish
									</Button>
								</TabsContent>

								<TabsContent value='list' className='space-y-4 mt-4'>
									{questions.length === 0 ? (
										<div className='text-center py-12 px-4'>
											<FileText className='h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50' />
											<h3 className='text-lg font-medium text-foreground mb-2'>
												Hali savollar qo'shilmagan
											</h3>
											<p className='text-sm text-muted-foreground mb-4'>
												Yangi savol qo'shish yoki Excel orqali import qilish mumkin
											</p>
											<Button
												variant='outline'
												size='sm'
												onClick={() => {
													const createTab = document.querySelector(
														'[data-value="create"]'
													) as HTMLElement;
													if (createTab) createTab.click();
												}}
											>
												<Plus className='h-4 w-4 mr-2' />
												Birinchi savolni qo'shing
											</Button>
										</div>
									) : (
										<div className='space-y-3'>
											{questions.map((question, index) => (
												<Card
													key={question.id}
													className='border-border hover:shadow-sm transition-shadow'
												>
													<CardContent className='p-3 md:p-4'>
														<div className='flex items-start justify-between gap-3'>
															<div className='flex-1 min-w-0'>
																<div className='flex flex-wrap items-center gap-2 mb-2'>
																	<Badge variant='outline' className='text-xs'>
																		#{index + 1}
																	</Badge>
																	<Badge variant='secondary' className='text-xs'>
																		{question.points} ball
																	</Badge>
																	{question.type === 'multiple_choice' && (
																		<Badge variant='outline' className='text-xs'>
																			Ko'p variantli
																		</Badge>
																	)}
																	{question.type === 'true_false' && (
																		<Badge variant='outline' className='text-xs'>
																			To'g'ri/Noto'g'ri
																		</Badge>
																	)}
																	{question.type === 'essay' && (
																		<Badge variant='outline' className='text-xs'>
																			Ochiq
																		</Badge>
																	)}
																</div>
																<div className='text-sm text-foreground mb-2 break-words'>
																	{selectedSubject?.hasFormulas ? (
																		<LaTeXRenderer content={question.question} />
																	) : (
																		<p className='line-clamp-2'>
																			{question.question}
																		</p>
																	)}
																</div>
																{question.options && (
																	<div className='space-y-1'>
																		{question.options.map((option, optIndex) => (
																			<div
																				key={optIndex}
																				className={`text-xs p-2 rounded transition-colors ${
																					question.correctAnswer === optIndex
																						? 'bg-green-50 text-green-800 border border-green-200'
																						: 'bg-muted'
																				}`}
																			>
																				<div className='flex items-center gap-2'>
																					<span className='font-medium'>
																						{String.fromCharCode(
																							65 + optIndex
																						)}
																						.
																					</span>
																					{selectedSubject?.hasFormulas ? (
																						<LaTeXRenderer
																							content={option}
																							inline
																						/>
																					) : (
																						<span className='line-clamp-1'>
																							{option}
																						</span>
																					)}
																					{question.correctAnswer ===
																						optIndex && (
																						<CheckCircle className='h-3 w-3 ml-auto flex-shrink-0' />
																					)}
																				</div>
																			</div>
																		))}
																	</div>
																)}
																{question.explanation && (
																	<div className='mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-xs'>
																		<strong className='text-blue-800'>
																			Tushuntirish:
																		</strong>{' '}
																		{selectedSubject?.hasFormulas ? (
																			<LaTeXRenderer
																				content={question.explanation}
																				inline
																			/>
																		) : (
																			<span className='text-blue-700'>
																				{question.explanation}
																			</span>
																		)}
																	</div>
																)}
															</div>
															<Button
																variant='ghost'
																size='sm'
																onClick={() => removeQuestion(question.id)}
																className='text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0'
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

								<TabsContent value='excel' className='space-y-4 mt-4'>
									<div className='space-y-4'>
										<div className='text-center py-8 px-4'>
											<FileSpreadsheet className='h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50' />
											<h3 className='text-lg font-semibold mb-2'>Savollarni import qilish</h3>
											<p className='text-sm text-muted-foreground mb-6'>
												Word yoki Excel shablonini yuklab oling, to'ldiring va qayta yuklang.
											</p>
										</div>

										<QuestionImportGuideTabs />

										<Tabs defaultValue='word' className='w-full'>
											<TabsList className='grid w-full grid-cols-2'>
												<TabsTrigger value='word'>Word (.docx)</TabsTrigger>
												<TabsTrigger value='excel'>Excel (.xlsx)</TabsTrigger>
											</TabsList>

											<TabsContent value='word' className='mt-4'>
												<div className='flex flex-col sm:flex-row gap-3 justify-center'>
													<Button onClick={downloadWordTemplate} variant='outline'>
														<Download className='h-4 w-4 mr-2' />
														Word shablon
													</Button>

													<div className='relative'>
														<input
															type='file'
															accept='.docx'
															onChange={handleFileUpload}
															className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
															id='word-upload'
														/>
														<Button variant='outline' asChild>
															<label htmlFor='word-upload'>
																<Upload className='h-4 w-4 mr-2' />
																Word yuklash
															</label>
														</Button>
													</div>
												</div>
											</TabsContent>

											<TabsContent value='excel' className='mt-4'>
												<div className='flex flex-col sm:flex-row gap-3 justify-center'>
													<Button onClick={downloadExcelTemplate} variant='outline'>
														<Download className='h-4 w-4 mr-2' />
														Excel shablon
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
																Excel yuklash
															</label>
														</Button>
													</div>
												</div>
											</TabsContent>
										</Tabs>

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
													<Button
														onClick={clearImportedQuestions}
														variant='outline'
														size='sm'
													>
														Bekor qilish
													</Button>
												</div>
											</div>
										)}
										{wordFile && (
											<div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
												<div className='flex items-center gap-2 mb-2'>
													<FileSpreadsheet className='h-4 w-4 text-blue-600' />
													<span className='font-medium text-blue-800'>{wordFile.name}</span>
												</div>
												<p className='text-sm text-blue-700 mb-3'>
													{importedQuestions.length} ta savol topildi
												</p>
												<div className='flex gap-2'>
													<Button onClick={applyImportedQuestions} size='sm'>
														Savollarni qo'shish
													</Button>
													<Button
														onClick={clearImportedQuestions}
														variant='outline'
														size='sm'
													>
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
																	{question.type === 'multiple_choice'
																		? "Ko'p variantli"
																		: question.type === 'true_false'
																		? "To'g'ri/Noto'g'ri"
																		: 'Ochiq'}
																</Badge>
															</div>
															{selectedSubject?.hasFormulas ? (
																<LaTeXRenderer content={question.question} />
															) : (
																<div
																	className='text-sm'
																	dangerouslySetInnerHTML={{
																		__html: question.question,
																	}}
																/>
															)}
															{question.options && (
																<div className='space-y-1'>
																	{question.options.map((option, optIndex) => (
																		<div
																			key={optIndex}
																			className='text-xs p-1 rounded bg-white'
																		>
																			<span className='font-medium'>
																				{String.fromCharCode(65 + optIndex)}.
																			</span>
																			{selectedSubject?.hasFormulas ? (
																				<span className='ml-2 inline-block align-middle'>
																					<LaTeXRenderer
																						content={option}
																						inline
																					/>
																				</span>
																			) : (
																				<span
																					className='ml-2'
																					dangerouslySetInnerHTML={{
																						__html: option,
																					}}
																				/>
																			)}
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
											<h4 className='font-medium text-yellow-800 mb-2'>
												📋 Excel shablon tuzilishi:
											</h4>
											<div className='text-sm text-yellow-700 space-y-1'>
												<p>
													<strong>1-ustun:</strong> Savol matni
												</p>
												<p>
													<strong>2-5 ustunlar:</strong> Javob variantlari (A, B, C, D)
												</p>
												<p>
													<strong>6-ustun:</strong> To'g'ri javob (A, B, C yoki D)
												</p>
												<p>
													<strong>7-ustun:</strong> Ball (1-10)
												</p>

												<p className='text-red-600 font-medium'>
													⚠️ Muhim: Ko'p variantli savollar uchun faqat to'g'ri javob
													variantini to'ldiring!
												</p>
											</div>
										</div>
									</div>
								</TabsContent>

								{savedTestId && (
									<TabsContent value='telegram' className='space-y-4'>
										<div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-4'>
											<div className='flex items-center gap-2 mb-2'>
												<CheckCircle className='h-4 w-4 text-green-600' />
												<span className='font-medium text-green-800'>
													Test muvaffaqiyatli yaratildi!
												</span>
											</div>
											<p className='text-sm text-green-700 mb-3'>
												Endi testni Telegram orqali tarqatishingiz va natijalarni kuzatishingiz
												mumkin.
											</p>
											<div className='flex gap-2'>
												<Button
													variant='outline'
													size='sm'
													onClick={() => router.push('/account/teacher')}
												>
													Testlar ro'yxatiga qaytish
												</Button>
											</div>
										</div>
										<TelegramManager
											testId={savedTestId}
											shareUrl={shareUrl}
											onSuccess={(message) => {
												toast({
													title: 'Muvaffaqiyat',
													description: message,
												});
											}}
											onError={(error) => {
												toast({
													title: 'Xatolik',
													description: error,
													variant: 'destructive',
												});
											}}
										/>
									</TabsContent>
								)}
							</Tabs>
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	);
}
