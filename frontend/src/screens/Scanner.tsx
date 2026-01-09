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
import { User } from '@/types/user';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
	const { data } = useSWR('/users?role=student', async (url: string) => {
		const res = await request.get(url);
		return res.data;
	});

	const students: User[] = data || [];

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

		try {
			const imageBase64 = await fileToBase64(f);
			const response = await axios.post(
				'https://fast.universal-uz.uz/analyze',
				{ image: imageBase64 },
				{
					auth: { username: 'admin', password: 'secret123' },
				}
			);

			if (response.data.variant_id) {
				const variantId = response.data.variant_id;
				setVariantId(variantId);
				const answersArray: string[] = [];
				const maxKey = Object.keys(response.data.answers).sort((a, b) => parseInt(b) - parseInt(a));
				for (let i = 1; i <= parseInt(maxKey[0]); i++) {
					const ans = response.data.answers[i.toString()];
					answersArray.push(ans || '-');
				}

				// Resolve universal code to determine type and auto-select student for exam variants
				let detectedStudentId = studentId;
				try {
					const resolved = await resolveCode(variantId);
					if (resolved.source === 'exam') {
						detectedStudentId = resolved.studentId;
						setStudentId(detectedStudentId);
						console.log(`Auto-detected student from exam variant: ${resolved.studentName}`);
					}
				} catch (variantError) {
					console.log('Kod resolve qilinmadi, bevosita baholashga o‘tamiz');
				}

				try {
					const gradeRes = await gradeByCode(variantId, answersArray, detectedStudentId);
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
			}
			if (response.data.answers) setAnswers(response.data.answers);
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
		const captured = captureImage();
		if (captured) {
			setImagePreview(URL.createObjectURL(captured));
			await handleScan(captured);
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
							<Input type='file' accept='image/*' onChange={onFileChange} />
							<Button
								variant={liveMode ? 'destructive' : 'default'}
								className='mt-2'
								onClick={() => setLiveMode(!liveMode)}
							>
								{liveMode ? 'Kamerani o‘chirish' : 'Kamerani yoqish'}
							</Button>
							{liveMode && (
								<Button
									variant='secondary'
									className='mt-2'
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

						<div>
							<Select
								value={studentId?.toString() || ''}
								onValueChange={(value) => setStudentId(Number(value))}
							>
								<SelectTrigger>
									<SelectValue placeholder='O‘quvchini tanlang' />
								</SelectTrigger>
								<SelectContent>
									{students?.map((student) => (
										<SelectItem key={student.id} value={student.id.toString()}>
											{student.lastName} {student.firstName} (ID: {student.id})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className='flex gap-2'>
						<Button
							onClick={() => handleScan()}
							disabled={!file || loading || liveMode}
							variant='secondary'
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
