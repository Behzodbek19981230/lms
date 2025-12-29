import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Eye, EyeOff, Lock, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getApiErrorMessage } from '@/utils/api-error';

const Login = () => {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const { login } = useAuth();
	const router = useRouter();
	const { toast } = useToast();
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		try {
			const user = await login(username, password);
			console.log(user);
			if (user) {
				toast({
					title: 'Welcome back!',
					description: 'You have successfully logged in.',
				});
				console.log('Login successful:', user);
				// Redirect based on user role
				if (!user) {
					toast({
						title: 'Error',
						description: 'User data not found.',
						variant: 'destructive',
					});
					setIsLoading(false);
					return;
				}

				// Check if user has center assigned (except for superadmin)
				if (user.role !== 'superadmin' && !user.center) {
					router.push('/no-center');
					return;
				}

				switch (user.role) {
					case 'superadmin':
						router.push('/account/superadmin');
						break;
					case 'admin':
						router.push('/account/admin');
						break;
					case 'teacher':
						router.push('/account/teacher');
						break;
					case 'student':
						router.push('/account/student');
						break;
					default:
						router.push('/');
						break;
				}
			} else {
				toast({
					title: 'Xatolik',
					description: 'Foydalanuvchi nomi yoki parolni tekshiring.',
					variant: 'destructive',
				});
			}
		} catch (err) {
			toast({
				title: 'Xatolik',
				description: getApiErrorMessage(err) || "Xatolik yuz berdi",
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className='min-h-screen bg-gradient-subtle flex items-center justify-center p-4'>
			<div className='w-full max-w-md'>
				{/* Header */}
				<div className='text-center mb-8'>
					<div className='flex justify-center mb-4'>
						<div className='p-3 bg-gradient-primary rounded-xl'>
							<BookOpen className='h-8 w-8 text-primary-foreground' />
						</div>
					</div>
					<h1 className='text-3xl font-bold text-foreground mb-2'>EduOne</h1>
					<p className='text-muted-foreground'>Tizimga kirish</p>
				</div>

				{/* Login Card */}
				<Card className='shadow-elegant border-border'>
					<CardHeader className='space-y-1'>
						<CardTitle className='text-2xl text-center text-card-foreground'>Hisobingizga kiring</CardTitle>
					</CardHeader>

					<CardContent>
						<form onSubmit={handleSubmit} className='space-y-6'>
							<div className='space-y-2'>
								<Label htmlFor='username' className='text-card-foreground'>
									Foydalanuvchi nomi
								</Label>
								<div className='relative'>
									<User className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
									<Input
										id='username'
										type='text'
										placeholder=''
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										className='pl-10'
										required
									/>
								</div>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='password' className='text-card-foreground'>
									Parol
								</Label>
								<div className='relative'>
									<Lock className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
									<Input
										id='password'
										type={showPassword ? 'text' : 'password'}
										placeholder='••••••••'
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className='pl-10 pr-10'
										required
									/>
									<button
										type='button'
										onClick={() => setShowPassword(!showPassword)}
										className='absolute right-3 top-3 text-muted-foreground hover:text-foreground'
									>
										{showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
									</button>
								</div>
							</div>

							<div className='flex items-center justify-between'>
								<label className='flex items-center space-x-2 text-sm'>
									<input type='checkbox' className='rounded border-border' />
									<span className='text-muted-foreground'>Meni eslab qol</span>
								</label>
								<Link
									href='/forgot-password'
									className='text-sm text-primary hover:text-primary-glow transition-colors'
								>
									Parolni unutdingizmi?
								</Link>
							</div>

							<Button type='submit' variant='hero' size='lg' className='w-full' disabled={isLoading}>
								{isLoading ? 'Tekshirilmoqda...' : 'Kirish'}
							</Button>
						</form>

						
					</CardContent>
				</Card>

				{/* Back to home */}
				<div className='text-center mt-6'>
					<Link href='/' className='text-sm text-muted-foreground hover:text-foreground transition-colors'>
						← Bosh sahifaga qaytish
					</Link>
				</div>
			</div>
		</div>
	);
};

export default Login;
