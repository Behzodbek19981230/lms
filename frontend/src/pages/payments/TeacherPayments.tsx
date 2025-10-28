import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Plus, Search, Filter, DollarSign, Users, Clock, AlertTriangle } from 'lucide-react';
import { Payment, PaymentStats, PaymentStatus, CreatePaymentDto } from '../../types/payment';
import { Group } from '../../types/group';
import { paymentService } from '../../services/payment.service';
import { groupService } from '../../services/group.service';
import PaymentTable from '../../components/payments/PaymentTable';
import CreatePaymentForm from '../../components/payments/CreatePaymentForm';
import { toast } from 'sonner';
import PageLoader from '@/components/PageLoader';

const TeacherPayments: React.FC = () => {
	const [payments, setPayments] = useState<Payment[]>([]);
	const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
	const [stats, setStats] = useState<PaymentStats | null>(null);
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [selectedGroup, setSelectedGroup] = useState<Group | undefined>();

	// Filters
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [groupFilter, setGroupFilter] = useState<string>('all');
	const [activeTab, setActiveTab] = useState<string>('all');

	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => {
		applyFilters();
	}, [payments, searchTerm, statusFilter, groupFilter, activeTab]);

	const fetchData = async () => {
		setLoading(true);
		try {
			const [paymentsResponse, statsResponse, groupsResponse] = await Promise.all([
				paymentService.getTeacherPayments(),
				paymentService.getTeacherPaymentStats(),
				groupService.getMyGroups(),
			]);

			if (paymentsResponse.success && paymentsResponse.data) {
				setPayments(paymentsResponse.data);
			} else {
				setPayments([]);
			}

			if (statsResponse.success && statsResponse.data) {
				setStats(statsResponse.data);
			} else {
				setStats(null);
			}

			if (groupsResponse.success && groupsResponse.data) {
				setGroups(groupsResponse.data);
			} else {
				setGroups([]);
			}
		} catch (error) {
			console.error('Error fetching data:', error);
			toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
		} finally {
			setLoading(false);
		}
	};

	const applyFilters = () => {
		let filtered = [...payments];

		// Search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(payment) =>
					payment.student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
					payment.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
					payment.description.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		// Status filter
		if (statusFilter !== 'all') {
			filtered = filtered.filter((payment) => payment.status === statusFilter);
		}

		// Group filter
		if (groupFilter !== 'all') {
			filtered = filtered.filter((payment) => payment.groupId === groupFilter);
		}

		// Tab filter
		switch (activeTab) {
			case 'pending':
				filtered = filtered.filter((payment) => payment.status === PaymentStatus.PENDING);
				break;
			case 'overdue':
				filtered = filtered.filter((payment) => payment.status === PaymentStatus.OVERDUE);
				break;
			case 'paid':
				filtered = filtered.filter((payment) => payment.status === PaymentStatus.PAID);
				break;
		}

		setFilteredPayments(filtered);
	};

	const handleCreatePayment = async (paymentData: CreatePaymentDto) => {
		try {
			const response = await paymentService.createPayment(paymentData);
			if (response.success) {
				toast.success("To'lov muvaffaqiyatli yaratildi");
				fetchData();
			}
		} catch (error) {
			console.error('Error creating payment:', error);
			toast.error("To'lov yaratishda xatolik yuz berdi");
		}
	};

	const handleMarkPaid = async (paymentId: string) => {
		try {
			const response = await paymentService.markPaymentAsPaid(paymentId);
			if (response.success) {
				toast.success("To'lov to'landi deb belgilandi");
				fetchData();
			}
		} catch (error) {
			console.error('Error marking payment as paid:', error);
			toast.error("To'lovni belgilashda xatolik yuz berdi");
		}
	};

	const handleSendReminder = async (paymentId: string) => {
		try {
			const response = await paymentService.sendPaymentReminders([paymentId]);
			if (response.success) {
				toast.success('Eslatma yuborildi');
			}
		} catch (error) {
			console.error('Error sending reminder:', error);
			toast.error('Eslatma yuborishda xatolik yuz berdi');
		}
	};

	const handleDeletePayment = async (paymentId: string) => {
		if (!confirm("Haqiqatan ham bu to'lovni o'chirmoqchimisiz?")) return;

		try {
			const response = await paymentService.deletePayment(paymentId);
			if (response.success) {
				toast.success("To'lov o'chirildi");
				fetchData();
			}
		} catch (error) {
			console.error('Error deleting payment:', error);
			toast.error("To'lovni o'chirishda xatolik yuz berdi");
		}
	};

	const formatAmount = (amount: number) => {
		return new Intl.NumberFormat('uz-UZ', {
			style: 'currency',
			currency: 'UZS',
			minimumFractionDigits: 0,
		}).format(amount);
	};

	if (loading) {
		return <PageLoader title="To'lovlar yuklanmoqda..." fullscreen={false} className='rounded-lg' />;
	}

	return (
		<div className='container mx-auto py-3 sm:py-4 md:py-6 space-y-4 sm:space-y-6 px-3 sm:px-4'>
			<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4'>
				<h1 className='text-xl sm:text-2xl md:text-3xl font-bold'>To'lovlarni boshqarish</h1>
				<Button onClick={() => setShowCreateForm(true)} size='sm' className='w-full sm:w-auto'>
					<Plus className='w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2' />
					<span className='text-xs sm:text-sm'>Yangi to'lov</span>
				</Button>
			</div>

			{/* Statistics Cards */}
			{stats && (
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
					<Card>
						<CardContent className='p-4 sm:p-5 md:p-6'>
							<div className='flex items-center'>
								<Clock className='w-5 h-5 sm:w-4 sm:h-4 text-yellow-500' />
								<div className='ml-3 sm:ml-4'>
									<p className='text-xs sm:text-sm font-medium text-muted-foreground'>Kutilayotgan</p>
									<p className='text-xl sm:text-2xl font-bold'>{stats.totalPending}</p>
									<p className='text-[10px] sm:text-sm text-muted-foreground truncate'>
										{formatAmount(stats.pendingAmount)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className='p-4 sm:p-5 md:p-6'>
							<div className='flex items-center'>
								<AlertTriangle className='w-5 h-5 sm:w-4 sm:h-4 text-red-500' />
								<div className='ml-3 sm:ml-4'>
									<p className='text-xs sm:text-sm font-medium text-muted-foreground'>Kechikkan</p>
									<p className='text-xl sm:text-2xl font-bold'>{stats.totalOverdue}</p>
									<p className='text-[10px] sm:text-sm text-muted-foreground truncate'>
										{formatAmount(stats.overdueAmount)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className='p-4 sm:p-5 md:p-6'>
							<div className='flex items-center'>
								<DollarSign className='w-5 h-5 sm:w-4 sm:h-4 text-green-500' />
								<div className='ml-4'>
									<p className='text-sm font-medium text-muted-foreground'>To'langan</p>
									<p className='text-2xl font-bold'>{stats.totalPaid}</p>
									<p className='text-sm text-muted-foreground'>Bu oy</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className='p-4 sm:p-5 md:p-6'>
							<div className='flex items-center'>
								<Users className='w-5 h-5 sm:w-4 sm:h-4 text-blue-500' />
								<div className='ml-3 sm:ml-4'>
									<p className='text-xs sm:text-sm font-medium text-muted-foreground'>
										Oylik daromad
									</p>
									<p className='text-xl sm:text-2xl font-bold truncate'>
										{formatAmount(stats.monthlyRevenue)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Filters */}
			<Card>
				<CardContent className='p-6'>
					<div className='flex flex-wrap gap-4'>
						<div className='flex-1 min-w-[200px]'>
							<div className='relative'>
								<Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
								<Input
									placeholder="O'quvchi yoki tavsif bo'yicha qidirish..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className='pl-8'
								/>
							</div>
						</div>

						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className='w-[150px]'>
								<SelectValue placeholder='Holat' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>Barcha holatlar</SelectItem>
								<SelectItem value={PaymentStatus.PENDING}>Kutilmoqda</SelectItem>
								<SelectItem value={PaymentStatus.PAID}>To'langan</SelectItem>
								<SelectItem value={PaymentStatus.OVERDUE}>Kechikkan</SelectItem>
							</SelectContent>
						</Select>

						<Select value={groupFilter} onValueChange={setGroupFilter}>
							<SelectTrigger className='w-[150px]'>
								<SelectValue placeholder='Guruh' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>Barcha guruhlar</SelectItem>
								{groups.map((group) => (
									<SelectItem key={group.id} value={group.id}>
										{group.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Payment Table with Tabs */}
			<Card>
				<CardHeader>
					<CardTitle>To'lovlar ro'yxati</CardTitle>
				</CardHeader>
				<CardContent>
					<Tabs value={activeTab} onValueChange={setActiveTab}>
						<TabsList className='grid w-full grid-cols-2 sm:grid-cols-4 gap-1'>
							<TabsTrigger value='all' className='text-xs sm:text-sm px-2 sm:px-4'>
								<span className='hidden sm:inline'>Barchasi</span>
								<span className='sm:hidden'>Hammasi</span>
								<span className='ml-1'>({payments.length})</span>
							</TabsTrigger>
							<TabsTrigger value='pending' className='text-xs sm:text-sm px-2 sm:px-4'>
								<span className='hidden sm:inline'>Kutilayotgan</span>
								<span className='sm:hidden'>Kutish</span>
								<span className='ml-1'>({stats?.totalPending || 0})</span>
							</TabsTrigger>
							<TabsTrigger value='overdue' className='text-xs sm:text-sm px-2 sm:px-4'>
								<span className='hidden sm:inline'>Kechikkan</span>
								<span className='sm:hidden'>Kech</span>
								<span className='ml-1'>({stats?.totalOverdue || 0})</span>
							</TabsTrigger>
							<TabsTrigger value='paid' className='text-xs sm:text-sm px-2 sm:px-4'>
								<span className='hidden sm:inline'>To'langan</span>
								<span className='sm:hidden'>To'lov</span>
								<span className='ml-1'>({stats?.totalPaid || 0})</span>
							</TabsTrigger>
						</TabsList>

						<TabsContent value={activeTab} className='mt-4'>
							<PaymentTable
								payments={filteredPayments}
								onMarkPaid={handleMarkPaid}
								onSendReminder={handleSendReminder}
								onDelete={handleDeletePayment}
								role='teacher'
							/>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			{/* Create Payment Form */}
			<CreatePaymentForm
				open={showCreateForm}
				onClose={() => {
					setShowCreateForm(false);
					setSelectedGroup(undefined);
				}}
				onSubmit={handleCreatePayment}
				selectedGroup={selectedGroup}
			/>
		</div>
	);
};

export default TeacherPayments;
