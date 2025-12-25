import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { User, Lock, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ChangePasswordData {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

const Profile: React.FC = () => {
	const { user } = useAuth();
	const { toast } = useToast();

	const [passwordData, setPasswordData] = useState<ChangePasswordData>({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});

	const [isLoading, setIsLoading] = useState(false);
	const [showPasswordForm, setShowPasswordForm] = useState(false);

	const handlePasswordChange = (field: keyof ChangePasswordData, value: string) => {
		setPasswordData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const validatePasswordForm = (): string | null => {
		if (!passwordData.currentPassword) {
			return 'Joriy parolni kiriting';
		}
		if (!passwordData.newPassword) {
			return 'Yangi parolni kiriting';
		}
		if (passwordData.newPassword.length < 6) {
			return "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak";
		}
		if (!passwordData.confirmPassword) {
			return 'Parolni tasdiqlang';
		}
		if (passwordData.newPassword !== passwordData.confirmPassword) {
			return 'Yangi parol va tasdiqlash paroli mos kelmaydi';
		}
		return null;
	};

	const handleSubmitPasswordChange = async (e: React.FormEvent) => {
		e.preventDefault();

		const validationError = validatePasswordForm();
		if (validationError) {
			toast({
				variant: 'destructive',
				title: 'Xatolik',
				description: validationError,
			});
			return;
		}

		setIsLoading(true);

		try {
			const token = localStorage.getItem('token');
			if (!token) {
				throw new Error('Token topilmadi');
			}

			const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(passwordData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Parolni o'zgartirishda xatolik");
			}

			const result = await response.json();

			toast({
				title: 'Muvaffaqiyat',
				description: result.message || "Parol muvaffaqiyatli o'zgartirildi",
			});

			// Reset form
			setPasswordData({
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			});
			setShowPasswordForm(false);
		} catch (error) {
			console.error('Password change error:', error);
			toast({
				variant: 'destructive',
				title: 'Xatolik',
				description: error instanceof Error ? error.message : "Parolni o'zgartirishda xatolik yuz berdi",
			});
		} finally {
			setIsLoading(false);
		}
	};

	if (!user) {
		return (
			<div className='container mx-auto py-8'>
				<Alert>
					<AlertCircle className='h-4 w-4' />
					<AlertDescription>Profilni ko'rish uchun tizimga kiring</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className='container mx-auto py-8 max-w-2xl'>
			<div className='space-y-6'>
				<div className='text-center'>
					<h1 className='text-3xl font-bold'>Foydalanuvchi Profili</h1>
					<p className='text-muted-foreground mt-2'>
						Shaxsiy ma'lumotlaringizni ko'ring va parolni o'zgartiring
					</p>
				</div>

				{/* User Information Card */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<User className='h-5 w-5' />
							Shaxsiy Ma'lumotlar
						</CardTitle>
						<CardDescription>Sizning hisob ma'lumotlaringiz</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div>
								<Label className='text-sm font-medium text-muted-foreground'>Foydalanuvchi nomi</Label>
								<p className='text-lg font-semibold'>{user.username}</p>
							</div>
							<div>
								<Label className='text-sm font-medium text-muted-foreground'>Rol</Label>
								<p className='text-lg capitalize'>{user.role}</p>
							</div>
						</div>

						<Separator />

						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div>
								<Label className='text-sm font-medium text-muted-foreground'>Ism</Label>
								<p className='text-lg'>{user.firstName || 'Kiritilmagan'}</p>
							</div>
							<div>
								<Label className='text-sm font-medium text-muted-foreground'>Familiya</Label>
								<p className='text-lg'>{user.lastName || 'Kiritilmagan'}</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Password Change Card */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Lock className='h-5 w-5' />
							Parol O'zgartirish
						</CardTitle>
						<CardDescription>Hisobingiz xavfsizligi uchun parolni o'zgartiring</CardDescription>
					</CardHeader>
					<CardContent>
						{!showPasswordForm ? (
							<div className='text-center'>
								<Button onClick={() => setShowPasswordForm(true)} className='w-full md:w-auto'>
									<Key className='h-4 w-4 mr-2' />
									Parolni O'zgartirish
								</Button>
							</div>
						) : (
							<form onSubmit={handleSubmitPasswordChange} className='space-y-4'>
								<div>
									<Label htmlFor='currentPassword'>
										Joriy Parol <span className='text-red-500'>*</span>
									</Label>
									<Input
										id='currentPassword'
										type='password'
										value={passwordData.currentPassword}
										onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
										placeholder='Joriy parolni kiriting'
										required
									/>
								</div>

								<div>
									<Label htmlFor='newPassword'>
										Yangi Parol <span className='text-red-500'>*</span>
									</Label>
									<Input
										id='newPassword'
										type='password'
										value={passwordData.newPassword}
										onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
										placeholder='Yangi parolni kiriting (kamida 6 ta belgi)'
										required
										minLength={6}
									/>
								</div>

								<div>
									<Label htmlFor='confirmPassword'>
										Parolni Tasdiqlang <span className='text-red-500'>*</span>
									</Label>
									<Input
										id='confirmPassword'
										type='password'
										value={passwordData.confirmPassword}
										onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
										placeholder='Yangi parolni qayta kiriting'
										required
									/>
								</div>

								{passwordData.newPassword &&
									passwordData.confirmPassword &&
									passwordData.newPassword !== passwordData.confirmPassword && (
										<Alert>
											<AlertCircle className='h-4 w-4' />
											<AlertDescription>Parollar mos kelmaydi</AlertDescription>
										</Alert>
									)}

								<div className='flex gap-2'>
									<Button type='submit' disabled={isLoading} className='flex-1'>
										{isLoading ? (
											'Saqlanmoqda...'
										) : (
											<>
												<CheckCircle className='h-4 w-4 mr-2' />
												Parolni O'zgartirish
											</>
										)}
									</Button>
									<Button
										type='button'
										variant='outline'
										onClick={() => {
											setShowPasswordForm(false);
											setPasswordData({
												currentPassword: '',
												newPassword: '',
												confirmPassword: '',
											});
										}}
										disabled={isLoading}
									>
										Bekor Qilish
									</Button>
								</div>
							</form>
						)}
					</CardContent>
				</Card>

				{/* Info Alert */}
				<Alert>
					<AlertCircle className='h-4 w-4' />
					<AlertDescription>
						<strong>Eslatma:</strong> Telegram orqali ro'yxatdan o'tgan foydalanuvchilar uchun standart
						parol <code className='bg-muted px-1 rounded'>lms1234</code> belgilangan. Xavfsizlik uchun
						parolni o'zgartirishni tavsiya etamiz.
					</AlertDescription>
				</Alert>
			</div>
		</div>
	);
};

export default Profile;
