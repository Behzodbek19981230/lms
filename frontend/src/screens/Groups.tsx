import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { request } from '@/configs/request';
import { Pencil, Trash2, Plus, Users, Calendar, Clock, BookOpen } from 'lucide-react';
import PageLoader from '@/components/PageLoader';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const dayLabels: Record<string, string> = {
	monday: 'Dushanba',
	tuesday: 'Seshanba',
	wednesday: 'Chorshanba',
	thursday: 'Payshanba',
	friday: 'Juma',
	saturday: 'Shanba',
	sunday: 'Yakshanba',
};

const GroupsPage = () => {
	const router = useRouter();
	const { toast } = useToast();
	const { user } = useAuth();
	const [groups, setGroups] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [deleteId, setDeleteId] = useState<number | null>(null);

	const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

	const load = async () => {
		try {
			setIsLoading(true);
			const { data: groupsRes } = await request.get('/groups/me');
			setGroups(groupsRes || []);
		} catch (error: any) {
			toast({
				title: 'Xatolik',
				description: error?.response?.data?.message || "Guruhlarni yuklab bo'lmadi",
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		load();
	}, []);

	const handleDelete = async () => {
		if (!deleteId) return;
		try {
			await request.delete(`/groups/${deleteId}`);
			toast({
				title: 'Muvaffaqiyatli',
				description: "Guruh o'chirildi",
			});
			setDeleteId(null);
			await load();
		} catch (error: any) {
			toast({
				title: 'Xatolik',
				description: error?.response?.data?.message || "Guruhni o'chirib bo'lmadi",
				variant: 'destructive',
			});
		}
	};

	if (isLoading) {
		return <PageLoader title="Guruh ma'lumotlari yuklanmoqda..." fullscreen={false} className='rounded-lg' />;
	}

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='flex justify-between items-center'>
				<div>
					<h1 className='text-3xl font-bold'>{isAdmin ? 'Guruhlar' : 'Mening guruhlarim'}</h1>
					<p className='text-muted-foreground mt-1'>
						{isAdmin
							? 'Barcha guruhlarni boshqaring va yangi guruhlar yarating'
							: "Sizga biriktirilgan guruhlar ro'yxati"}
					</p>
				</div>
				{isAdmin && (
					<Button variant='hero' onClick={() => router.push('/account/groups/new')}>
						<Plus className='h-4 w-4 mr-2' />
						Yangi guruh
					</Button>
				)}
			</div>

			{/* Groups Grid */}
			{groups.length === 0 ? (
				<Card className='border-border'>
					<CardContent className='flex flex-col items-center justify-center py-12'>
						<BookOpen className='h-12 w-12 text-muted-foreground mb-4' />
						<h3 className='text-lg font-semibold mb-2'>Hali guruhlar yo'q</h3>
						<p className='text-muted-foreground text-center mb-4'>
							{isAdmin
								? "Birinchi guruhingizni yarating va o'quvchilarni qo'shing"
								: 'Sizga hali guruhlar biriktirilmagan'}
						</p>
						{isAdmin && (
							<Button variant='hero' onClick={() => router.push('/account/groups/new')}>
								<Plus className='h-4 w-4 mr-2' />
								Yangi guruh yaratish
							</Button>
						)}
					</CardContent>
				</Card>
			) : (
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
					{groups.map((g) => (
						<Card key={g.id} className='border-border hover:shadow-md transition-shadow'>
							<CardHeader className='flex flex-row items-start justify-between pb-3'>
								<div className='flex-1'>
									<CardTitle className='text-lg mb-1'>{g.name}</CardTitle>
									{g.description && (
										<CardDescription className='line-clamp-2'>{g.description}</CardDescription>
									)}
								</div>
								<div className='flex gap-2 ml-2'>
									<>
										<Button
											variant='ghost'
											size='icon'
											className='h-8 w-8'
											onClick={() => router.push(`/account/groups/${g.id}/edit`)}
											title='Tahrirlash'
										>
											<Pencil className='h-4 w-4' />
										</Button>

										{isAdmin && (
											<Button
												variant='ghost'
												size='icon'
												className='h-8 w-8 text-destructive hover:text-destructive'
												onClick={() => setDeleteId(g.id)}
												title="O'chirish"
											>
												<Trash2 className='h-4 w-4' />
											</Button>
										)}
									</>
								</div>
							</CardHeader>
							<CardContent className='space-y-3'>
								{g.daysOfWeek && g.daysOfWeek.length > 0 && (
									<div className='flex items-center gap-2 text-sm'>
										<Calendar className='h-4 w-4 text-muted-foreground' />
										<span className='text-muted-foreground'>
											{g.daysOfWeek.map((d: string) => dayLabels[d] || d).join(', ')}
										</span>
									</div>
								)}
								<div className='flex items-center gap-2 text-sm'>
									<Clock className='h-4 w-4 text-muted-foreground' />
									<span className='text-muted-foreground'>
										{g.startTime} - {g.endTime}
									</span>
								</div>
								<div className='flex items-center gap-2 text-sm'>
									<Users className='h-4 w-4 text-muted-foreground' />
									<span className='text-muted-foreground'>{g.studentIds?.length || 0} o'quvchi</span>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Guruhni o'chirish</AlertDialogTitle>
						<AlertDialogDescription>
							Bu guruhni o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Bekor qilish</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
						>
							O'chirish
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default GroupsPage;
