import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Building2,
	Users,
	GraduationCap,
	DollarSign,
	TrendingUp,
	Calendar,
	BarChart3,
	Settings,
	Plus,
	Bell,
	Search,
	Filter,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { request } from '@/configs/request';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const SuperAdminDashboard = () => {
	const router = useRouter();
	const [timeRange, setTimeRange] = useState('30d');
	const [centers, setCenters] = useState<any[]>([]);
	const [users, setUsers] = useState<any[]>([]);
	const [createCenterOpen, setCreateCenterOpen] = useState(false);
	const [assignAdminOpen, setAssignAdminOpen] = useState(false);
	const [newCenter, setNewCenter] = useState({ name: '', description: '', phone: '', address: '' });
	const [adminForm, setAdminForm] = useState({
		centerId: '',
		username: '',
		password: '',
		firstName: '',
		lastName: '',
		phone: '',
	});
	const { toast } = useToast();

	const loadCenters = async () => {
		try {
			const { data } = await request.get('/centers');
			setCenters(data);
		} catch (e) {
			// noop
		}
	};

	useEffect(() => {
		loadCenters();
		(async () => {
			try {
				const { data } = await request.get('/users');
				setUsers(data);
			} catch (e) {}
		})();
	}, []);

	const stats = {
		totalCenters: centers.length,
		totalUsers: users.length,
		monthlyRevenue: 0,
		activeStudents: users.filter((u: any) => u.role === 'student').length,
	};

	const recentCenters = centers.slice(0, 4).map((c: any) => ({
		id: c.id,
		name: c.name,
		students: c.users?.length || 0,
		status: c?.isActive === false ? 'inactive' : 'active',
		plan: 'standard',
	}));

	return (
		<div className='min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5'>
			{/* Header */}
			<header className='bg-gradient-to-r from-card/90 via-card to-card/90 backdrop-blur-md border-b border-border/60 p-3 sm:p-4 md:p-6 animate-fade-in'>
				<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4'>
					<div className='animate-slide-up'>
						<h1 className='text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent'>
							Super Admin Panel
						</h1>
						<p
							className='text-xs sm:text-sm text-muted-foreground animate-fade-in'
							style={{ animationDelay: '0.2s' }}
						>
							EduOne platformasini boshqarish
						</p>
					</div>
					<div
						className='flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 animate-slide-up w-full sm:w-auto'
						style={{ animationDelay: '0.3s' }}
					>
						<Button variant='outline' size='sm' className='flex-1 sm:flex-initial'>
							<Bell className='h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2' />
							<span className='hidden sm:inline'>Bildirishnomalar</span>
						</Button>
						<Dialog open={createCenterOpen} onOpenChange={setCreateCenterOpen}>
							<DialogTrigger asChild>
								<Button variant='hero' size='sm' className='flex-1 sm:flex-initial'>
									<Plus className='h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2' />
									<span className='text-xs sm:text-sm'>Yangi markaz</span>
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Yangi markaz yaratish</DialogTitle>
								</DialogHeader>
								<div className='space-y-3'>
									<div>
										<Label>Nom</Label>
										<Input
											value={newCenter?.name}
											onChange={(e) => setNewCenter((p) => ({ ...p, name: e.target.value }))}
										/>
									</div>
									<div>
										<Label>Tavsif</Label>
										<Input
											value={newCenter?.description}
											onChange={(e) =>
												setNewCenter((p) => ({ ...p, description: e.target.value }))
											}
										/>
									</div>
									<div>
										<Label>Telefon</Label>
										<Input
											value={newCenter?.phone}
											onChange={(e) => setNewCenter((p) => ({ ...p, phone: e.target.value }))}
										/>
									</div>
									<div>
										<Label>Manzil</Label>
										<Input
											value={newCenter?.address}
											onChange={(e) => setNewCenter((p) => ({ ...p, address: e.target.value }))}
										/>
									</div>
									<Button
										onClick={async () => {
											try {
												await request.post('/centers', newCenter);
												setCreateCenterOpen(false);
												setNewCenter({ name: '', description: '', phone: '', address: '' });
												await loadCenters();
												toast({ title: 'Markaz yaratildi' });
											} catch (e: any) {
												toast({
													title: 'Xatolik',
													description: e?.response?.data?.message || "Yaratib bo'lmadi",
													variant: 'destructive',
												});
											}
										}}
									>
										Saqlash
									</Button>
								</div>
							</DialogContent>
						</Dialog>
						<Dialog open={assignAdminOpen} onOpenChange={setAssignAdminOpen}>
							<DialogTrigger asChild>
								<Button variant='outline' size='sm' className='flex-1 sm:flex-initial'>
									<Users className='h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2' />
									<span className='text-xs sm:text-sm'>Admin tayinlash</span>
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Markazga admin tayinlash</DialogTitle>
								</DialogHeader>
								<div className='space-y-3'>
									<div>
										<Label>Markaz</Label>
										<Select
											value={adminForm.centerId}
											onValueChange={(v) => setAdminForm((p) => ({ ...p, centerId: v }))}
										>
											<SelectTrigger>
												<SelectValue placeholder='Markazni tanlang' />
											</SelectTrigger>
											<SelectContent>
												{centers.map((c) => (
													<SelectItem key={c.id} value={String(c.id)}>
														{c.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className='grid grid-cols-2 gap-3'>
										<div>
											<Label>Ism</Label>
											<Input
												value={adminForm.firstName}
												onChange={(e) =>
													setAdminForm((p) => ({ ...p, firstName: e.target.value }))
												}
											/>
										</div>
										<div>
											<Label>Familiya</Label>
											<Input
												value={adminForm.lastName}
												onChange={(e) =>
													setAdminForm((p) => ({ ...p, lastName: e.target.value }))
												}
											/>
										</div>
									</div>
									<div>
										<Label>Username</Label>
										<Input
											type='text'
											value={adminForm.username}
											onChange={(e) => setAdminForm((p) => ({ ...p, username: e.target.value }))}
										/>
									</div>
									<div>
										<Label>Telefon</Label>
										<Input
											value={adminForm.phone}
											onChange={(e) => setAdminForm((p) => ({ ...p, phone: e.target.value }))}
										/>
									</div>
									<div>
										<Label>Parol</Label>
										<Input
											type='password'
											value={adminForm.password}
											onChange={(e) => setAdminForm((p) => ({ ...p, password: e.target.value }))}
										/>
									</div>
									<Button
										onClick={async () => {
											try {
												if (!adminForm.centerId) return;
												await request.post(`/users/centers/${adminForm.centerId}/admin`, {
													username: adminForm.username,
													password: adminForm.password,
													firstName: adminForm.firstName,
													lastName: adminForm.lastName,
													phone: adminForm.phone,
													role: 'admin',
												});
												setAssignAdminOpen(false);
												setAdminForm({
													centerId: '',
													username: '',
													password: '',
													firstName: '',
													lastName: '',
													phone: '',
												});
												toast({ title: 'Admin yaratildi' });
											} catch (e: any) {
												toast({
													title: 'Xatolik',
													description:
														e?.response?.data?.message || "Admin tayinlab bo'lmadi",
													variant: 'destructive',
												});
											}
										}}
									>
										Saqlash
									</Button>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>
			</header>

			<div className='p-3 sm:p-4 md:p-6'>
				{/* Stats Grid */}
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8'>
					<Card className='group hover:shadow-glow transition-all duration-500 hover:-translate-y-2 bg-gradient-card border-border/50 backdrop-blur-sm animate-slide-up relative overflow-hidden'>
						{/* Shimmer effect */}
						<div className='absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-shimmer opacity-20'></div>

						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 relative z-10'>
							<CardTitle className='text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground/80 transition-colors'>
								Jami markazlar
							</CardTitle>
							<div className='p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-primary-glow/20 group-hover:scale-110 transition-transform duration-300'>
								<Building2 className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary group-hover:scale-110 transition-transform duration-300' />
							</div>
						</CardHeader>
						<CardContent className='relative z-10'>
							<div className='text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300'>
								{stats.totalCenters}
							</div>
							<p className='text-[10px] sm:text-xs text-accent flex items-center mt-1 sm:mt-2'>
								<TrendingUp className='h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 animate-pulse-glow' />
								<span className='hidden sm:inline'>+12% o'tgan oyga nisbatan</span>
								<span className='sm:hidden'>+12%</span>
							</p>
							{/* Progress indicator */}
							<div className='mt-3'>
								<div className='w-full h-1 bg-border/30 rounded-full overflow-hidden'>
									<div className='h-full rounded-full transition-all duration-1000 group-hover:w-full w-0 bg-gradient-primary'></div>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card
						className='group hover:shadow-glow transition-all duration-500 hover:-translate-y-2 bg-gradient-card border-border/50 backdrop-blur-sm animate-slide-up relative overflow-hidden'
						style={{ animationDelay: '0.1s' }}
					>
						<div className='absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-shimmer opacity-20'></div>

						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 relative z-10'>
							<CardTitle className='text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground/80 transition-colors'>
								Jami foydalanuvchilar
							</CardTitle>
							<div className='p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-accent/20 to-accent-glow/20 group-hover:scale-110 transition-transform duration-300'>
								<Users className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent group-hover:scale-110 transition-transform duration-300' />
							</div>
						</CardHeader>
						<CardContent className='relative z-10'>
							<div className='text-xl sm:text-2xl font-bold text-foreground group-hover:text-accent transition-colors duration-300'>
								{stats.totalUsers.toLocaleString()}
							</div>
							<p className='text-[10px] sm:text-xs text-accent flex items-center mt-1 sm:mt-2'>
								<TrendingUp className='h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 animate-pulse-glow' />
								<span className='hidden sm:inline'>+8% o'tgan oyga nisbatan</span>
								<span className='sm:hidden'>+8%</span>
							</p>
							<div className='mt-3'>
								<div className='w-full h-1 bg-border/30 rounded-full overflow-hidden'>
									<div className='h-full rounded-full transition-all duration-1000 group-hover:w-full w-0 bg-gradient-accent'></div>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card
						className='group hover:shadow-glow transition-all duration-500 hover:-translate-y-2 bg-gradient-card border-border/50 backdrop-blur-sm animate-slide-up relative overflow-hidden'
						style={{ animationDelay: '0.2s' }}
					>
						<div className='absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-shimmer opacity-20'></div>

						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 relative z-10'>
							<CardTitle className='text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground/80 transition-colors'>
								Oylik daromad
							</CardTitle>
							<div className='p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-primary-glow/20 group-hover:scale-110 transition-transform duration-300'>
								<DollarSign className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary group-hover:scale-110 transition-transform duration-300' />
							</div>
						</CardHeader>
						<CardContent className='relative z-10'>
							<div className='text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300'>
								{(stats.monthlyRevenue / 1000000).toFixed(1)}M so'm
							</div>
							<p className='text-[10px] sm:text-xs text-accent flex items-center mt-1 sm:mt-2'>
								<TrendingUp className='h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 animate-pulse-glow' />
								+23% o'tgan oyga nisbatan
							</p>
							<div className='mt-3'>
								<div className='w-full h-1 bg-border/30 rounded-full overflow-hidden'>
									<div className='h-full rounded-full transition-all duration-1000 group-hover:w-full w-0 bg-gradient-primary'></div>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card
						className='group hover:shadow-glow transition-all duration-500 hover:-translate-y-2 bg-gradient-card border-border/50 backdrop-blur-sm animate-slide-up relative overflow-hidden'
						style={{ animationDelay: '0.3s' }}
					>
						<div className='absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-shimmer opacity-20'></div>

						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 relative z-10'>
							<CardTitle className='text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground/80 transition-colors'>
								Faol studentlar
							</CardTitle>
							<div className='p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-accent/20 to-accent-glow/20 group-hover:scale-110 transition-transform duration-300'>
								<GraduationCap className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent group-hover:scale-110 transition-transform duration-300' />
							</div>
						</CardHeader>
						<CardContent className='relative z-10'>
							<div className='text-xl sm:text-2xl font-bold text-foreground group-hover:text-accent transition-colors duration-300'>
								{stats.activeStudents.toLocaleString()}
							</div>
							<p className='text-[10px] sm:text-xs text-accent flex items-center mt-1 sm:mt-2'>
								<TrendingUp className='h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 animate-pulse-glow' />
								<span className='hidden sm:inline'>+15% o'tgan oyga nisbatan</span>
								<span className='sm:hidden'>+15%</span>
							</p>
							<div className='mt-3'>
								<div className='w-full h-1 bg-border/30 rounded-full overflow-hidden'>
									<div className='h-full rounded-full transition-all duration-1000 group-hover:w-full w-0 bg-gradient-accent'></div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
					{/* Recent Centers */}
					<Card className='lg:col-span-2 border-border'>
						<CardHeader>
							<div className='flex justify-between items-center'>
								<CardTitle className='text-card-foreground'>So'nggi markazlar</CardTitle>
								<div className='flex space-x-2'>
									<Button variant='outline' size='sm'>
										<Search className='h-4 w-4' />
									</Button>
									<Button variant='outline' size='sm'>
										<Filter className='h-4 w-4' />
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className='space-y-4'>
								{recentCenters.map((center) => (
									<div
										key={center?.id}
										className='flex items-center justify-between p-4 bg-muted rounded-lg'
									>
										<div className='flex items-center space-x-4'>
											<div className='p-2 bg-primary/10 rounded-lg'>
												<Building2 className='h-5 w-5 text-primary' />
											</div>
											<div>
												<h3 className='font-medium text-foreground'>{center?.name}</h3>
												<p className='text-sm text-muted-foreground'>
													{center?.students} student
												</p>
											</div>
										</div>
										<div className='flex items-center space-x-2'>
											<Badge
												variant={center?.status === 'active' ? 'default' : 'secondary'}
												className={center?.status === 'active' ? 'bg-accent' : ''}
											>
												{center?.status === 'active' ? 'Faol' : 'Kutilmoqda'}
											</Badge>
											<Badge variant='outline' className='capitalize'>
												{center?.plan}
											</Badge>
										</div>
									</div>
								))}
							</div>
							<div className='mt-4'>
								<Button
									variant='ghost'
									className='w-full'
									onClick={() => router.push('/account/center-users')}
								>
									Barcha markazlar va foydalanuvchilarni ko'rish
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Quick Actions */}
					<Card className='border-border'>
						<CardHeader>
							<CardTitle className='text-card-foreground'>Tezkor amallar</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<Button variant='hero' className='w-full justify-start'>
								<Plus className='h-4 w-4 mr-2' />
								Yangi markaz qo'shish
							</Button>
							<Button variant='outline' className='w-full justify-start'>
								<BarChart3 className='h-4 w-4 mr-2' />
								Hisobotlarni ko'rish
							</Button>
							<Button variant='outline' className='w-full justify-start'>
								<Settings className='h-4 w-4 mr-2' />
								Tizim sozlamalari
							</Button>
							<Button variant='outline' className='w-full justify-start'>
								<Calendar className='h-4 w-4 mr-2' />
								To'lov jadvali
							</Button>
							<Button
								variant='outline'
								className='w-full justify-start'
								onClick={() => router.push('/account/center-users')}
							>
								<Users className='h-4 w-4 mr-2' />
								Markazlar va foydalanuvchilar
							</Button>
						</CardContent>
					</Card>
				</div>

				{/* Revenue Chart Placeholder */}
				<Card className='mt-6 border-border'>
					<CardHeader>
						<CardTitle className='text-card-foreground'>Daromad tahlili</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='h-64 bg-muted rounded-lg flex items-center justify-center'>
							<div className='text-center'>
								<BarChart3 className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
								<p className='text-muted-foreground'>Chart komponenti qo'shiladi</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default SuperAdminDashboard;
