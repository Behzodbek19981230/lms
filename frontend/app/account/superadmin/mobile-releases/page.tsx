'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { request } from '@/configs/request';
import { useAuth } from '@/contexts/AuthContext';

type MobilePlatform = 'android' | 'ios';

type MobileReleaseRow = {
	id: number;
	platform: MobilePlatform;
	version: string;
	originalFileName: string;
	archiveUrl: string;
	archiveSizeBytes: number;
	createdAt: string;
};

export default function SuperAdminMobileReleasesPage() {
	const router = useRouter();
	const { toast } = useToast();
	const { user } = useAuth();

	const [platform, setPlatform] = useState<MobilePlatform>('android');
	const [version, setVersion] = useState('');
	const [file, setFile] = useState<File | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [rows, setRows] = useState<MobileReleaseRow[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (!user) return;
		if (user.role !== 'superadmin') {
			router.replace('/account/profile');
		}
	}, [user, router]);

	const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) || '';
	const downloadOrigin = useMemo(() => apiBaseUrl.replace(/\/?api\/?$/, ''), [apiBaseUrl]);

	const loadReleases = async () => {
		try {
			setIsLoading(true);
			const { data } = await request.get('/mobile-releases');
			setRows(Array.isArray(data) ? data : []);
		} catch (e: any) {
			toast({
				title: 'Xatolik',
				description: e?.response?.data?.message || 'Relizlar ro‘yxatini yuklab bo‘lmadi',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadReleases();
		 
	}, []);

	const uploadRelease = async () => {
		if (!version.trim()) {
			toast({ title: 'Versiya kerak', description: 'Masalan: 1 yoki 1.0.0', variant: 'destructive' });
			return;
		}
		if (!file) {
			toast({ title: 'Fayl kerak', description: 'APK/IPA/ZIP faylni tanlang', variant: 'destructive' });
			return;
		}

		const lowerName = file.name.toLowerCase();
		if (platform === 'android' && !lowerName.endsWith('.apk')) {
			toast({ title: 'Noto‘g‘ri fayl', description: 'Android uchun faqat .apk', variant: 'destructive' });
			return;
		}
		if (platform === 'ios' && !lowerName.endsWith('.ipa') && !lowerName.endsWith('.zip')) {
			toast({ title: 'Noto‘g‘ri fayl', description: 'iOS uchun .ipa yoki .zip', variant: 'destructive' });
			return;
		}

		try {
			setIsUploading(true);
			const form = new FormData();
			form.append('platform', platform);
			form.append('version', version.trim());
			form.append('file', file);

			await request.post('/mobile-releases', form, {
				headers: {
					// Let axios set boundary
					'Content-Type': 'multipart/form-data',
				},
			});

			toast({ title: 'Yuklandi', description: 'Fayl arxivlandi (parol: lms1234) va saqlandi' });
			setVersion('');
			setFile(null);
			await loadReleases();
		} catch (e: any) {
			toast({
				title: 'Xatolik',
				description: e?.response?.data?.message || 'Yuklash amalga oshmadi',
				variant: 'destructive',
			});
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<div className='space-y-4 md:space-y-6'>
			<div className='flex items-start justify-between gap-3'>
				<div>
					<h1 className='text-xl sm:text-2xl font-bold'>Mobil ilovalar</h1>
					<p className='text-sm text-muted-foreground'>APK/IPA build yuklash (arxiv paroli: lms1234)</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Yangi reliz yuklash</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
						<div>
							<Label>Platforma</Label>
							<Select value={platform} onValueChange={(v) => setPlatform(v as MobilePlatform)}>
								<SelectTrigger>
									<SelectValue placeholder='Platform tanlang' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='android'>Android</SelectItem>
									<SelectItem value='ios'>iOS</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Versiya</Label>
							<Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder='1 yoki 1.0.0' />
						</div>
						<div>
							<Label>Fayl</Label>
							<Input
								type='file'
								accept={platform === 'android' ? '.apk' : '.ipa,.zip'}
								onChange={(e) => setFile(e.target.files?.[0] || null)}
							/>
						</div>
					</div>
					<div className='mt-3 flex gap-2'>
						<Button variant='hero' onClick={uploadRelease} disabled={isUploading}>
							{isUploading ? 'Yuklanmoqda...' : 'Yuklash'}
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Relizlar ro‘yxati</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className='text-sm text-muted-foreground'>Yuklanmoqda...</div>
					) : rows.length === 0 ? (
						<div className='text-sm text-muted-foreground'>Hozircha reliz yo‘q</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Platforma</TableHead>
									<TableHead>Versiya</TableHead>
									<TableHead>Fayl</TableHead>
									<TableHead>Yuklab olish</TableHead>
									<TableHead>Yaratilgan</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((r) => {
									const href = r.archiveUrl ? `${downloadOrigin}${r.archiveUrl}` : '';
									return (
										<TableRow key={r.id}>
											<TableCell className='capitalize'>{r.platform}</TableCell>
											<TableCell>{r.version}</TableCell>
											<TableCell className='max-w-[280px] truncate'>{r.originalFileName}</TableCell>
											<TableCell>
												{href ? (
													<a className='text-primary underline' href={href} target='_blank' rel='noreferrer'>
														Yuklab olish
													</a>
												) : (
													<span className='text-muted-foreground'>-</span>
												)}
											</TableCell>
											<TableCell>
												{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
