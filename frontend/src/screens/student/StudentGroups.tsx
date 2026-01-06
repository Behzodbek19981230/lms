'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Users2 } from 'lucide-react';
import { request } from '@/configs/request';
import { useToast } from '@/components/ui/use-toast';

export default function StudentGroups() {
	const { toast } = useToast();
	const [loading, setLoading] = useState(true);
	const [groups, setGroups] = useState<any[]>([]);

	const fetchGroups = async () => {
		try {
			setLoading(true);
			const res = await request.get('/students/groups');
			setGroups(res.data?.groups || []);
		} catch {
			toast({
				title: 'Xatolik',
				description: "Guruhlar yuklanmadi",
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchGroups();
	}, []);

	if (loading) {
		return (
			<div className='min-h-[60vh] flex items-center justify-center'>
				<div className='text-center'>
					<Loader2 className='h-8 w-8 animate-spin mx-auto mb-3' />
					<p className='text-muted-foreground'>Guruhlar yuklanmoqda...</p>
				</div>
			</div>
		);
	}

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between gap-3'>
				<div className='flex items-center gap-2'>
					<Users2 className='h-5 w-5 text-primary' />
					<h1 className='text-xl font-semibold'>Mening guruhlarim</h1>
				</div>
				<Button variant='outline' onClick={fetchGroups}>
					Yangilash
				</Button>
			</div>

			{groups.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2 text-base'>
							<AlertCircle className='h-4 w-4 text-muted-foreground' />
							Guruh topilmadi
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-sm text-muted-foreground'>Siz hali hech qaysi guruhga biriktirilmagansiz.</p>
					</CardContent>
				</Card>
			) : (
				<div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
					{groups.map((g) => (
						<Card key={g.id}>
							<CardHeader>
								<CardTitle className='text-base'>{g.name}</CardTitle>
							</CardHeader>
							<CardContent className='space-y-2'>
								{g.description ? (
									<p className='text-sm text-muted-foreground line-clamp-2'>{g.description}</p>
								) : (
									<p className='text-sm text-muted-foreground'>Tavsif yo‘q</p>
								)}
								<p className='text-sm'>O‘quvchilar: {g.studentsCount ?? 0}</p>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
