import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, RefreshCw, Phone, Hourglass, LogOut, Shield } from 'lucide-react';

const PendingCenterAssignment: React.FC = () => {
	const { user, logout } = useAuth();
	const router = useRouter();
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			setLastRefresh(new Date());
			if (typeof window !== 'undefined') window.location.reload();
		} catch (error) {
			console.error('Error refreshing user data:', error);
		} finally {
			setIsRefreshing(false);
		}
	};

	const handleLogout = () => {
		logout();
		router.push('/login');
	};

	useEffect(() => {
		// Auto refresh every 30 seconds
		const interval = setInterval(handleRefresh, 30000);
		return () => clearInterval(interval);
	}, []);

	if (!user) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='animate-pulse text-muted-foreground'>Yuklanmoqda...</div>
			</div>
		);
	}

	return (
		<div className='container max-w-3xl mx-auto py-6 min-h-screen flex items-center'>
			<div className='w-full space-y-4'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-3'>
						<div className='h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center'>
							<Hourglass className='h-5 w-5 text-yellow-700' />
						</div>
						<h1 className='text-2xl font-semibold text-yellow-700'>Kutilmoqda...</h1>
					</div>
					<Button variant='outline' onClick={handleLogout} className='gap-2'>
						<LogOut className='h-4 w-4' /> Chiqish
					</Button>
				</div>

				<Card>
					<CardContent className='p-4'>
						<div className='flex items-center gap-3'>
							<div className='h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold'>
								{user.firstName?.[0]}
							</div>
							<div className='flex-1'>
								<div className='font-semibold'>
									{user.firstName} {user.lastName}
								</div>
								<div className='text-sm text-muted-foreground'>@{user.username}</div>
								<div className='mt-1'>
									<Badge variant='secondary'>
										{user.role === 'student'
											? 'Talaba'
											: user.role === 'teacher'
											? "O'qituvchi"
											: 'Admin'}
									</Badge>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Alert>
					<AlertDescription>
						Tizimdan to'liq foydalanish uchun administrator tomonidan sizga markaz biriktirilishi kerak.
					</AlertDescription>
				</Alert>

				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Shield className='h-4 w-4' /> Keyingi qadamlar
						</CardTitle>
					</CardHeader>
					<CardContent className='space-y-2 text-sm'>
						<div>
							<strong>Administrator bilan bog'laning:</strong> O'quv markazingiz administratori bilan
							bog'laning.
						</div>
						<div>
							<strong>Ma'lumotlaringizni taqdim eting:</strong> @ {user.username}
						</div>
						<div>
							<strong>Kutib turing:</strong> Biriktirish yakunlangach sahifa yangilanadi.
						</div>
					</CardContent>
				</Card>

				<div className='flex items-center gap-2'>
					<Button onClick={handleRefresh} disabled={isRefreshing} className='gap-2'>
						<RefreshCw className='h-4 w-4' /> {isRefreshing ? 'Tekshirilmoqda...' : 'Holatni tekshirish'}
					</Button>
					<Button
						variant='outline'
						onClick={() => window.open('tel:+998900000000', '_self')}
						className='gap-2'
					>
						<Phone className='h-4 w-4' /> Yordam
					</Button>
				</div>

				<div className='text-xs text-muted-foreground'>
					Oxirgi tekshiruv: {lastRefresh.toLocaleTimeString('uz-UZ')} • Avtomatik: 30s
				</div>
			</div>
		</div>
	);
};

export default PendingCenterAssignment;
