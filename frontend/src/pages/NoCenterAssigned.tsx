import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, UserCheck, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const NoCenterAssigned = () => {
	const { user } = useAuth();
	const navigate = useNavigate();

	return (
		<div className='min-h-screen bg-gradient-subtle flex items-center justify-center p-4'>
			<div className='w-full max-w-md'>
				<Card className='shadow-elegant border-border'>
					<CardHeader className='text-center'>
						<div className='mx-auto mb-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center'>
							<AlertTriangle className='h-8 w-8 text-yellow-600' />
						</div>
						<CardTitle className='text-2xl text-foreground'>
							Hali markaz biriktirmadi
						</CardTitle>
					</CardHeader>

					<CardContent className='text-center space-y-6'>
						<div className='text-muted-foreground'>
							<p className='mb-4'>
								Hurmatli <strong>{user?.fullName}</strong>,
							</p>
							<p className='mb-4'>
								Sizga hali hech qanday o'quv markazi biriktirmagan. 
								Administrator tez orada sizni tegishli markazga biriktiradi.
							</p>
						</div>

						<div className='space-y-4'>
							<div className='flex items-center justify-center space-x-3 p-4 bg-blue-50 rounded-lg'>
								<Clock className='h-5 w-5 text-blue-600' />
								<span className='text-sm text-blue-800'>
									Administrator javobini kuting
								</span>
							</div>

							<div className='flex items-center justify-center space-x-3 p-4 bg-green-50 rounded-lg'>
								<UserCheck className='h-5 w-5 text-green-600' />
								<span className='text-sm text-green-800'>
									Ro'yxatdan o'tish muvaffaqiyatli tugallandi
								</span>
							</div>
						</div>

					<div className='pt-4 border-t space-y-4'>
						<div className='text-sm text-muted-foreground'>
							<p>
								Savollaringiz bo'lsa, administrator bilan bog'laning.
							</p>
						</div>

						<div className='text-center'>
							<p className='text-sm text-muted-foreground mb-3'>
								Markaz biriktirilishi va test xabarnomalarini olish uchun:
							</p>
							<Button 
								onClick={() => navigate('/telegram-connect')}
								variant='outline' 
								className='w-full'
							>
								<MessageCircle className='h-4 w-4 mr-2' />
								Telegramni ulash
							</Button>
						</div>
					</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default NoCenterAssigned;
