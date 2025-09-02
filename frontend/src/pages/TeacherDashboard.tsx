import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	BarChart3,
	Bell,
	BookOpen,
	Calendar,
	CheckCircle,
	Clock,
	FileText,
	Plus,
	Upload,
	Users,
	Video,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { request } from '@/configs/request';
import type { SubjectType } from '@/types/subject.type';
import { useAuth } from '@/contexts/AuthContext';
import TelegramManagementCard from '@/components/TelegramManagementCard';
import TelegramConnectCard from '@/components/TelegramConnectCard';
import AttendanceCard from '@/components/AttendanceCard';
import PaymentStatsWidget from '@/components/payments/PaymentStatsWidget';
import moment from 'moment';
export default function TeacherDashboard() {
	const navigate = useNavigate();
	const { user } = useAuth();

	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [subjects, setSubjects] = useState<SubjectType[]>([]);
	const [subjectStats, setSubjectStats] = useState<any>(null);
	const [testStats, setTestStats] = useState<any>(null);
	const [groups, setGroups] = useState<any[]>([]);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			setIsLoading(true);
			setErrorMessage('');
			try {
				const [subjectsRes, statsRes, testsStatsRes, groupsRes] = await Promise.all([
					request.get('/subjects'),
					request.get('/subjects/stats'),
					request.get('/tests/stats'),
					request.get('/groups/me'),
				]);
				if (!isMounted) return;
				setSubjects(subjectsRes.data || []);
				setSubjectStats(statsRes.data || null);
				setTestStats(testsStatsRes.data || null);
				setGroups(groupsRes.data || []);
			} catch (e: any) {
				if (!isMounted) return;
				setErrorMessage(e?.response?.data?.message || "Ma'lumotlarni yuklab bo'lmadi");
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	const todaySchedule = useMemo(() => {
		const dayAliases: Record<string, string> = {
			dushanba: 'monday',
			seshanba: 'tuesday',
			chorshanba: 'wednesday',
			payshanba: 'thursday',
			juma: 'friday',
			shanba: 'saturday',
			yakshanba: 'sunday',
		};
		const normalize = (d: string) => (dayAliases[d] ? dayAliases[d] : d).toLowerCase();
		const todayEn = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

		return groups
			.filter((g) => {
				const days = (g.daysOfWeek || []).map((d: string) => normalize(String(d).toLowerCase()));
				return days.includes(todayEn);
			})
			.map((g) => ({
				id: g.id,
				time: `${g.startTime}`,
				subject: subjects.find((s) => s.id === g.subjectId)?.name || '—',
				group: g.name,
				students: g.studentIds?.length || 0,
				room: '-',
				type: 'offline',
			}))
			.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
			.slice(0, 5);
	}, [groups, subjects]);

	const myGroups = useMemo(
		() =>
			groups.map((g: any) => ({
				id: g.id,
				name: g.name,
				students: g.studentIds?.length || 0,
				nextLesson: new Date().toISOString(),
				attendance: 0,
			})),
		[groups]
	);

	const recentActivities = [
		{ id: 1, action: 'Yangi test yaratildi', group: 'Intermediate B1', time: '30 daqiqa oldin' },
		{ id: 2, action: "Yo'qlama olindi", group: 'Beginner A1', time: '2 soat oldin' },
		{ id: 3, action: 'Vazifa baholandi', group: 'Advanced C1', time: '4 soat oldin' },
		{ id: 4, action: 'Video dars yuklandi', group: 'IELTS Preparation', time: 'Kecha' },
	];
	console.log(user);
	return (
		<div className='min-h-screen bg-gradient-subtle'>
			{/* Header */}
			<header className='bg-card border-b border-border p-6'>
				<div className='flex justify-between items-center'>
					<div>
						<h1 className='text-3xl font-bold text-foreground'>O'qituvchi paneli</h1>
						<p className='text-muted-foreground'>
							{`${user?.firstName}  ${user?.lastName}`} — {subjects[0]?.name || user?.center?.name || ''}
						</p>
					</div>
					<div className='flex items-center space-x-4'>
						<Button variant='outline' size='sm'>
							<Bell className='h-4 w-4 mr-2' />
							Bildirishnomalar
						</Button>
						<Button variant='hero'>
							<Plus className='h-4 w-4 mr-2' />
							Yangi dars
						</Button>
					</div>
				</div>
			</header>

			<div className='p-6'>
				{/* Loading / Error */}
				{isLoading && <div className='mb-6 text-sm text-muted-foreground'>Yuklanmoqda...</div>}
				{!isLoading && errorMessage && <div className='mb-6 text-sm text-destructive'>{errorMessage}</div>}

				{/* Stats Grid */}
				<div className='grid grid-cols-1 md:grid-cols-5 gap-6 mb-8'>
					<Card className='border-border'>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>Fanlarim</CardTitle>
							<Users className='h-4 w-4 text-primary' />
						</CardHeader>
						<CardContent>
							<div className='text-2xl font-bold text-foreground'>{subjects.length}</div>
							<p className='text-xs text-muted-foreground'>Jami fanlar</p>
						</CardContent>
					</Card>

					<Card className='border-border'>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>Faol fanlar</CardTitle>
							<BookOpen className='h-4 w-4 text-accent' />
						</CardHeader>
						<CardContent>
							<div className='text-2xl font-bold text-foreground'>
								{subjectStats?.activeSubjects ?? 0}
							</div>
							<p className='text-xs text-accent'>Faol holatda</p>
						</CardContent>
					</Card>

					<Card className='border-border'>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>Testlar</CardTitle>
							<Calendar className='h-4 w-4 text-primary' />
						</CardHeader>
						<CardContent>
							<div className='text-2xl font-bold text-foreground'>
								{testStats?.totalTests ?? subjectStats?.totalTests ?? 0}
							</div>
							<p className='text-xs text-muted-foreground'>Jami testlar</p>
						</CardContent>
					</Card>

					<Card className='border-border'>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>
								Kutilayotgan testlar
							</CardTitle>
							<FileText className='h-4 w-4 text-accent' />
						</CardHeader>
						<CardContent>
							<div className='text-2xl font-bold text-foreground'>{testStats?.draftTests ?? 0}</div>
							<p className='text-xs text-accent'>Qoralama testlar</p>
						</CardContent>
					</Card>

					<Card className='border-border'>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-sm font-medium text-muted-foreground'>
								Formulali fanlar
							</CardTitle>
							<CheckCircle className='h-4 w-4 text-primary' />
						</CardHeader>
						<CardContent>
							<div className='text-2xl font-bold text-foreground'>{groups?.length ?? 0}</div>
							<p className='text-xs text-muted-foreground'>Mening guruhlarim</p>
						</CardContent>
					</Card>
				</div>

				<div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6'>
					{/* Today's Schedule */}
					<Card className='border-border'>
						<CardHeader>
							<CardTitle className='text-card-foreground flex items-center'>
								<Calendar className='h-5 w-5 mr-2' />
								Bugungi jadval
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='space-y-4'>
								{todaySchedule.map((lesson) => (
									<div
										key={lesson.id}
										className='flex items-center justify-between p-3 bg-muted rounded-lg'
									>
										<div className='flex items-center space-x-3'>
											<div className='text-center'>
												<div className='text-sm font-medium text-foreground'>{lesson.time}</div>
												<Badge
													variant={lesson.type === 'online' ? 'default' : 'secondary'}
													className='text-xs'
												>
													{lesson.type === 'online' ? 'Online' : 'Offline'}
												</Badge>
											</div>
											<div>
												<h4 className='font-medium text-foreground'>{lesson.subject}</h4>
												<p className='text-sm text-muted-foreground'>{lesson.group}</p>
												<p className='text-xs text-muted-foreground'>
													{lesson.students} student • {lesson.room}
												</p>
											</div>
										</div>
										{lesson.type === 'online' && (
											<Button size='sm' variant='outline'>
												<Video className='h-4 w-4 mr-1' />
												Qo'shilish
											</Button>
										)}
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					{/* My Groups */}
					<Card className='border-border'>
						<CardHeader>
							<CardTitle className='text-card-foreground flex items-center'>
								<BookOpen className='h-5 w-5 mr-2' />
								Mening guruhlarim
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='space-y-4'>
								{myGroups.map((group) => (
									<div key={group.id} className='p-3 bg-muted rounded-lg'>
										<div className='flex justify-between items-start mb-2'>
											<h4 className='font-medium text-foreground'>{group.name}</h4>
											<Badge variant='outline' className='text-xs'>
												{group.attendance}% yo'qlama
											</Badge>
										</div>
										<p className='text-sm text-muted-foreground mb-1'>{group.students} student</p>
										<div className='flex items-center text-xs text-muted-foreground'>
											<Clock className='h-3 w-3 mr-1' />
											Keyingi dars: {moment(group.nextLesson).format('DD.MM.YYYY')}
										</div>
									</div>
								))}
							</div>
							<Button variant='ghost' className='w-full mt-4'>
								Batafsil ko'rish
							</Button>
						</CardContent>
					</Card>

					{/* Payment & Attendance Section */}
					<div className='space-y-6'>
						<PaymentStatsWidget />
						<AttendanceCard />
					</div>
				</div>

				{/* Additional Dashboard Sections */}
				<div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8'>
					{/* Quick Actions & Recent Activity */}
					<div className='space-y-6'>
						{/* Telegram Personal Connection */}
						<TelegramConnectCard />

						{/* Telegram Management */}
						<TelegramManagementCard />

					</div>
				</div>

				{/* Subjects Section */}
				<div className='mt-8'>
					<div className='flex items-center justify-between mb-6'>
						<h2 className='text-2xl font-bold text-foreground'>Mening fanlarim</h2>
						<Button variant='outline' onClick={() => navigate('/account/test/create')}>
							<Plus className='h-4 w-4 mr-2' />
							Yangi test yaratish
						</Button>
					</div>

					{subjects.length === 0 ? (
						<Card className='border-border'>
							<CardContent className='flex flex-col items-center justify-center py-12'>
								<BookOpen className='h-12 w-12 text-muted-foreground mb-4' />
								<h3 className='text-lg font-medium text-foreground mb-2'>Fanlar mavjud emas</h3>
								<p className='text-muted-foreground mb-4'>Sizga hali fanlar tayinlanmagan</p>
							</CardContent>
						</Card>
					) : (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
							{subjects.map((subject) => (
								<Card
									key={subject.id}
									className='border-border hover:shadow-md transition-shadow cursor-pointer'
									onClick={() => navigate(`/account/subject/${subject.id}/tests`)}
								>
									<CardHeader>
										<div className='flex items-start justify-between'>
											<div className='flex items-center space-x-2'>
												<Badge variant='outline' className='text-xs'>
													{subject.category}
												</Badge>
												{subject.hasFormulas && (
													<Badge variant='secondary' className='text-xs'>
														Formulalar
													</Badge>
												)}
											</div>
											<div className='text-right'>
												<div className='text-2xl font-bold text-foreground'>
													{subject.testsCount || 0}
												</div>
												<div className='text-xs text-muted-foreground'>test</div>
											</div>
										</div>
										<CardTitle className='text-lg text-card-foreground'>{subject.name}</CardTitle>
									</CardHeader>
									<CardContent>
										<p className='text-sm text-muted-foreground mb-4 line-clamp-2'>
											{subject.description || 'Tavsif mavjud emas'}
										</p>

										<div className='flex items-center justify-between text-xs text-muted-foreground'>
											<span>Yaratilgan: {moment(subject.createdAt).format('DD.MM.YYYY')}</span>
											<span
												className={`px-2 py-1 rounded-full text-xs ${
													subject.isActive
														? 'bg-green-100 text-green-800'
														: 'bg-gray-100 text-gray-800'
												}`}
											>
												{subject.isActive ? 'Faol' : 'Faol emas'}
											</span>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
