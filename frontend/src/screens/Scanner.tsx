import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { gradeByCode, resolveCode, GradeResult } from '@/services/scanner.service';
import axios from 'axios';
import useSWR from 'swr';
import { request } from '@/configs/request';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type StudentOption = {
	id: number;
	firstName: string;
	lastName: string;
	username?: string;
};

type GroupWithStudents = {
	id: number;
	students: Array<{
		id: number;
		firstName: string;
		lastName: string;
		username?: string;
	}>;
};

export default function ScannerPage() {
	const [file, setFile] = useState<File | null>(null);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<GradeResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [variantId, setVariantId] = useState<string>('');
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [liveMode, setLiveMode] = useState(false);
	const [scanning, setScanning] = useState(false);
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const uploadPercent = useMemo(() => (loading ? 66 : 0), [loading]);
	const [studentId, setStudentId] = useState<number | undefined>(undefined);
	const [studentPopoverOpen, setStudentPopoverOpen] = useState(false);
	const { user } = useAuth();
	const isTeacher = user?.role === 'teacher';

	const studentsKey = user ? (isTeacher ? '/groups/me' : '/users?role=student') : null;
	const { data: studentsData, error: studentsLoadError } = useSWR(studentsKey, async (url: string) => {
		const res = await request.get(url);
		return res.data;
	});

	const students: StudentOption[] = useMemo(() => {
		if (!studentsData) return [];
		if (isTeacher) {
			const groups = (studentsData as GroupWithStudents[]) || [];
			const uniq = new Map<number, StudentOption>();
			for (const g of groups) {
				for (const s of g.students || []) {
					uniq.set(Number(s.id), {
						id: Number(s.id),
						firstName: s.firstName,
						lastName: s.lastName,
						username: s.username,
					});
				}
			}
			return Array.from(uniq.values()).sort((a, b) =>
				`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
			);
		}

		const users = (studentsData as any[]) || [];
		return users
			.filter((u) => u?.role === 'student')
			.map((u) => ({
				id: Number(u.id),
				firstName: u.firstName,
				lastName: u.lastName,
				username: u.username,
			}))
			.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
	}, [studentsData, isTeacher]);

	const selectedStudent = useMemo(
		() => (studentId ? students.find((s) => s.id === studentId) : undefined),
		[studentId, students]
	);

	// 🎥 Kamera ishga tushirish
	const startCamera = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' },
			});
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				await videoRef.current.play();
			}
		} catch (err) {
			console.error('Camera error:', err);
			setError('Kamera ruxsati berilmagan yoki mavjud emas.');
		}
	};

	// 🎥 Kamera to‘xtatish
	const stopCamera = () => {
		if (videoRef.current?.srcObject) {
			const stream = videoRef.current.srcObject as MediaStream;
			stream.getTracks().forEach((track) => track.stop());
		}
	};

	useEffect(() => {
		if (liveMode) {
			startCamera();
		} else {
			stopCamera();
		}
		return () => stopCamera();
	}, [liveMode]);

	const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (f) {
			setFile(f);
			setImagePreview(URL.createObjectURL(f));
			setResult(null);
			setVariantId('');
			setAnswers({});
		}
	};

	// 🧠 Rasmni base64 ga o‘tkazish
	const fileToBase64 = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result;
				if (typeof result === 'string') {
					resolve(result.split(',')[1]);
				} else {
					reject("Faylni o'qib bo'lmadi");
				}
			};
			reader.readAsDataURL(file);
		});
	};

	// 📸 Kamera kadri olish
	const captureImage = (): File | null => {
		if (!videoRef.current || !canvasRef.current) return null;
		const video = videoRef.current;
		const canvas = canvasRef.current;
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		const dataURL = canvas.toDataURL('image/jpeg');
		const blob = dataURLtoBlob(dataURL);
		return new File([blob], 'capture.jpg', { type: 'image/jpeg' });
	};

	const dataURLtoBlob = (dataURL: string) => {
		const byteString = atob(dataURL.split(',')[1]);
		const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
		const ab = new ArrayBuffer(byteString.length);
		const ia = new Uint8Array(ab);
		for (let i = 0; i < byteString.length; i++) {
			ia[i] = byteString.charCodeAt(i);
		}
		return new Blob([ab], { type: mimeString });
	};

	// 🧾 Asosiy skanerlash jarayoni
	const handleScan = async (imageFile?: File) => {
		const f = imageFile || file;
		if (!f) return;
		setLoading(true);
		setError(null);
		setResult(null);

		const pickAnalyzeCode = (payload: any): string | null => {
			const code =
				payload?.uniqueNumber ??
				payload?.unique_number ??
				payload?.unique ??
				payload?.variantNumber ??
				payload?.variant_number ??
				payload?.variant_id ??
				payload?.variantId;
			if (code === undefined || code === null) return null;
			const s = String(code).trim();
			return s.length ? s : null;
		};

		try {
			const imageBase64 = await fileToBase64(f);
			const response = await axios.post(
				'https://fast.universal-uz.uz/analyze',
				{ image: imageBase64 },
				{
					auth: { username: 'admin', password: 'secret123' },
				}
			);

			const code = pickAnalyzeCode(response.data);
			if (!code) {
				setError(
					'Variant kodi aniqlanmadi. Rasm aniqroq bo‘lishiga ishonch hosil qiling va qayta urinib ko‘ring.'
				);
				return;
			}

			setVariantId(code);

			const rawAnswers = response.data?.answers;
			let answersArray: string[] = [];
			const answersForUi: Record<string, string> = {};
			if (Array.isArray(rawAnswers)) {
				answersArray = rawAnswers.map((a) => (a ? String(a).toUpperCase() : '-'));
				rawAnswers.forEach((v, idx) => {
					answersForUi[String(idx + 1)] = v ? String(v).toUpperCase() : '-';
				});
			} else if (rawAnswers && typeof rawAnswers === 'object') {
				const keys = Object.keys(rawAnswers);
				const numericKeys = keys
					.map((k) => Number(k))
					.filter((n) => Number.isFinite(n))
					.sort((a, b) => a - b);
				if (numericKeys.length === 0) {
					setError('Javoblar aniqlanmadi. Iltimos, boshqa rasm bilan sinab ko‘ring.');
					return;
				}
				const startIndex = numericKeys[0] === 0 ? 0 : 1;
				const maxIndex = numericKeys[numericKeys.length - 1];
				for (let i = startIndex; i <= maxIndex; i++) {
					const v = rawAnswers[String(i)] ?? rawAnswers[i];
					const normalized = v ? String(v).toUpperCase() : '-';
					answersArray.push(normalized);
					answersForUi[String(i + (startIndex === 0 ? 1 : 0))] = normalized;
				}
			} else {
				setError('Javoblar aniqlanmadi. Iltimos, boshqa rasm bilan sinab ko‘ring.');
				return;
			}

			setAnswers(answersForUi);

			// Resolve universal code to determine type and auto-select student for exam variants
			let detectedStudentId = studentId;
			try {
				const resolved = await resolveCode(code);
				if (resolved.source === 'exam') {
					detectedStudentId = resolved.studentId;
					setStudentId(detectedStudentId);
					console.log(`Auto-detected student from exam variant: ${resolved.studentName}`);
				}
			} catch {
				console.log('Kod resolve qilinmadi, bevosita baholashga o‘tamiz');
			}

			try {
				const gradeRes = await gradeByCode(code, answersArray, detectedStudentId);
				setResult(gradeRes);
			} catch (e) {
				if (e?.response?.status === 500) {
					setError(
						"Bu rasmni skanerlashda ichki server xatosi yuz berdi. Iltimos, boshqa rasmni sinab ko'ring."
					);
				} else {
					setError(e?.response?.data?.message || 'Xatolik yuz berdi');
				}
			}
		} catch (e: any) {
			if (e?.response?.status === 500) {
				setError('Bu rasmni skanerlashda ichki server xatosi yuz berdi. Iltimos, boshqa rasmni sinab ko‘ring.');
			} else {
				setError(e?.message || 'Xatolik yuz berdi');
				console.log(e.response?.data);
			}
		} finally {
			setLoading(false);
		}
	};

	// 🔄 Live rejimda surat olish va tekshirish
	const handleLiveCapture = async () => {
		if (loading || scanning) return;
		setScanning(true);
		try {
			const captured = captureImage();
			if (captured) {
				setImagePreview(URL.createObjectURL(captured));
				await handleScan(captured);
			}
		} finally {
			setScanning(false);
		}
	};

	return (
		<div className='max-w-4xl mx-auto'>
			<Card>
				<CardHeader>
					<CardTitle>📄 Skaner — Javob varaqni tekshirish</CardTitle>
					<CardDescription>
						Rasm yuklang yoki kamerani yoqing. Variant va javoblar avtomatik aniqlanadi.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid gap-4 md:grid-cols-[1fr_260px]'>
						<div className='space-y-2'>
							<label className='text-xs md:text-sm font-medium'>Rasm (javob varaq surati)</label>
							<Input type='file' accept='image/*' capture='environment' onChange={onFileChange} />
							<Button
								variant={liveMode ? 'destructive' : 'default'}
								className='mt-2 w-full md:w-auto'
								onClick={() => setLiveMode(!liveMode)}
							>
								{liveMode ? 'Kamerani o‘chirish' : 'Kamerani yoqish'}
							</Button>
							{liveMode && (
								<Button
									variant='secondary'
									className='mt-2 w-full md:w-auto'
									onClick={handleLiveCapture}
									disabled={loading || scanning}
								>
									Suratga olish va tekshirish
								</Button>
							)}
							<p className='text-xs md:text-sm text-muted-foreground'>
								Maslahat: Sahifa to‘liq sig‘sin, pastki o‘ng burchakdagi ID blok aniq ko‘rinsin.
							</p>
						</div>

						<div className='border rounded-md overflow-hidden bg-muted/20 aspect-[3/4] flex items-center justify-center relative'>
							{liveMode ? (
								<video
									ref={videoRef}
									className='absolute inset-0 w-full h-full object-contain'
									autoPlay
									muted
								/>
							) : imagePreview ? (
								<img src={imagePreview} alt='Preview' className='h-full w-full object-contain' />
							) : (
								<div className='text-xs text-muted-foreground px-3 text-center'>
									Rasm tanlang yoki kamerani yoqing — bu yerda preview ko‘rinadi
								</div>
							)}
							<canvas ref={canvasRef} className='hidden' />
						</div>

						<div className='space-y-2'>
							<label className='text-xs md:text-sm font-medium'>O‘quvchi</label>
							<Popover open={studentPopoverOpen} onOpenChange={setStudentPopoverOpen}>
								<PopoverTrigger asChild>
									<Button
										variant='outline'
										role='combobox'
										aria-expanded={studentPopoverOpen}
										className='w-full justify-between'
									>
										{selectedStudent
											? `${selectedStudent.lastName} ${selectedStudent.firstName} (ID: ${selectedStudent.id})`
											: isTeacher
											? 'O‘zimning o‘quvchimni tanlang'
											: 'O‘quvchini tanlang'}
										<ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
									</Button>
								</PopoverTrigger>
								<PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0' align='start'>
									<Command>
										<CommandInput placeholder='O‘quvchi qidiring...' />
										<CommandEmpty>Natija topilmadi.</CommandEmpty>
										<CommandList>
											<CommandGroup>
												<CommandItem
													value='__none__'
													onSelect={() => {
														setStudentId(undefined);
														setStudentPopoverOpen(false);
													}}
													className='cursor-pointer'
												>
													<Check
														className={cn(
															'mr-2 h-4 w-4',
															!studentId ? 'opacity-100' : 'opacity-0'
														)}
													/>
													Tanlamaslik
												</CommandItem>
												{students.map((s) => (
													<CommandItem
														key={s.id}
														value={`${s.lastName} ${s.firstName} ${s.id} ${
															s.username ?? ''
														}`}
														onSelect={() => {
															setStudentId(s.id);
															setStudentPopoverOpen(false);
														}}
														className='cursor-pointer'
													>
														<Check
															className={cn(
																'mr-2 h-4 w-4',
																studentId === s.id ? 'opacity-100' : 'opacity-0'
															)}
														/>
														<span className='truncate'>
															{s.lastName} {s.firstName} (ID: {s.id})
														</span>
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
							{!!studentsLoadError && (
								<div className='text-xs text-red-600'>O‘quvchilar ro‘yxatini yuklab bo‘lmadi</div>
							)}
							{isTeacher && (
								<div className='text-xs text-muted-foreground'>
									Bu ro‘yxat faqat sizning guruhlaringizdagi o‘quvchilardan tuzilgan.
								</div>
							)}
						</div>
					</div>

					<div className='flex flex-col md:flex-row gap-2'>
						<Button
							onClick={() => handleScan()}
							disabled={!file || loading || liveMode}
							variant='secondary'
							className='w-full md:w-auto'
						>
							Skanerlash va tekshirish
						</Button>
					</div>

					{loading && (
						<div className='space-y-2'>
							<div className='text-xs md:text-sm text-muted-foreground'>Yuklanmoqda...</div>
							<Progress value={uploadPercent} className='h-2' />
						</div>
					)}

					{variantId && (
						<div className='text-xs text-muted-foreground'>
							Aniqlangan variant ID: <b>{variantId}</b>
						</div>
					)}
					{answers && Object.keys(answers).length > 0 && (
						<div className='text-xs text-muted-foreground'>
							Aniqlangan javoblar:{' '}
							{Object.entries(answers)
								.map(([k, v]) => `${k}: ${v}`)
								.join(', ')}
						</div>
					)}
					{error && <div className='text-sm text-red-600'>{error}</div>}

					{result && (
						<div className='mt-4 rounded border p-3'>
							<div className='font-medium'>Natija</div>
							<div className='text-sm mt-1 flex flex-wrap gap-2 items-center'>
								<Badge variant='outline'>Jami: {result.total}</Badge>
								<Badge className='bg-green-600 text-white hover:bg-green-600/90'>
									To‘g‘ri: {result.correctCount}
								</Badge>
								<Badge className='bg-red-600 text-white hover:bg-red-600/90'>
									Noto‘g‘ri: {result.wrongCount}
								</Badge>
								<Badge variant='secondary'>Bo‘sh: {result.blankCount}</Badge>
							</div>
							<div className='mt-2 max-h-64 overflow-auto text-sm'>
								<div className='w-full overflow-x-auto'>
									<table className='min-w-[400px] w-full text-left border-collapse'>
										<thead>
											<tr className='border-b'>
												<th className='py-1 pr-2'>#</th>
												<th className='py-1 pr-2'>To‘g‘ri</th>
												<th className='py-1 pr-2'>Skaner</th>
												<th className='py-1 pr-2'>Holat</th>
											</tr>
										</thead>
										<tbody>
											{(result.perQuestion || []).map((d) => (
												<tr
													key={d.index}
													className={`border-b ${
														d.isCorrect
															? 'bg-green-50/50'
															: d.scanned === '-'
															? ''
															: 'bg-red-50/50'
													}`}
												>
													<td className='py-1 pr-2'>{d.index + 1}</td>
													<td className='py-1 pr-2'>{d.correct}</td>
													<td className='py-1 pr-2'>{d.scanned}</td>
													<td
														className={`py-1 pr-2 ${
															d.isCorrect
																? 'text-green-600'
																: d.scanned === '-'
																? 'text-muted-foreground'
																: 'text-red-600'
														}`}
													>
														{d.isCorrect ? '✓' : d.scanned === '-' ? '-' : '×'}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
