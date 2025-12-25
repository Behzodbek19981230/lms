import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Search, DollarSign, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Payment, PaymentStats, PaymentStatus } from '../../types/payment';
import { paymentService } from '../../services/payment.service';
import PaymentTable from '../../components/payments/PaymentTable';
import { toast } from 'sonner';

const StudentPayments: React.FC = () => {
	const [payments, setPayments] = useState<Payment[]>([]);
	const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
	const [stats, setStats] = useState<PaymentStats | null>(null);
	const [loading, setLoading] = useState(true);

	// Filters
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [activeTab, setActiveTab] = useState<string>('all');

	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => {
		applyFilters();
	}, [payments, searchTerm, statusFilter, activeTab]);

	const fetchData = async () => {
		setLoading(true);
		try {
			const [paymentsResponse, statsResponse] = await Promise.all([
				paymentService.getStudentPayments(),
				paymentService.getStudentPaymentStats(),
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
					payment.group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					payment.description.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		// Status filter
		if (statusFilter !== 'all') {
			filtered = filtered.filter((payment) => payment.status === statusFilter);
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

	const handleSendReminder = async (paymentId: string) => {
		try {
			const response = await paymentService.sendPaymentReminders([paymentId]);
			if (response.success) {
				toast.success("Eslatma o'qituvchiga yuborildi");
			}
		} catch (error) {
			console.error('Error sending reminder:', error);
			toast.error('Eslatma yuborishda xatolik yuz berdi');
		}
	};

	const formatAmount = (amount: number) => {
		return new Intl.NumberFormat('uz-UZ', {
			style: 'currency',
			currency: 'UZS',
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const getPendingTotal = () => {
		return payments
			.filter((p) => p.status === PaymentStatus.PENDING || p.status === PaymentStatus.OVERDUE)
			.reduce((sum, p) => sum + p.amount, 0);
	};

	if (loading) {
		return (
			<div className='container mx-auto py-6'>
				<div className='text-center py-8'>Yuklanmoqda...</div>
			</div>
		);
	}

	return (
		<div className='container mx-auto py-6 space-y-6'>
			<div className='flex items-center justify-between'>
				<h1 className='text-3xl font-bold'>Mening to'lovlarim</h1>
			</div>

			{/* Statistics Cards */}
			<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
				<Card>
					<CardContent className='p-6'>
						<div className='flex items-center'>
							<Clock className='w-4 h-4 text-yellow-500' />
							<div className='ml-4'>
								<p className='text-sm font-medium text-muted-foreground'>Kutilayotgan</p>
								<p className='text-2xl font-bold'>
									{payments.filter((p) => p.status === PaymentStatus.PENDING).length}
								</p>
								<p className='text-sm text-muted-foreground'>
									{formatAmount(
										payments
											.filter((p) => p.status === PaymentStatus.PENDING)
											.reduce((sum, p) => sum + p.amount, 0)
									)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className='p-6'>
						<div className='flex items-center'>
							<AlertTriangle className='w-4 h-4 text-red-500' />
							<div className='ml-4'>
								<p className='text-sm font-medium text-muted-foreground'>Kechikkan</p>
								<p className='text-2xl font-bold'>
									{payments.filter((p) => p.status === PaymentStatus.OVERDUE).length}
								</p>
								<p className='text-sm text-muted-foreground'>
									{formatAmount(
										payments
											.filter((p) => p.status === PaymentStatus.OVERDUE)
											.reduce((sum, p) => sum + p.amount, 0)
									)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className='p-6'>
						<div className='flex items-center'>
							<CheckCircle className='w-4 h-4 text-green-500' />
							<div className='ml-4'>
								<p className='text-sm font-medium text-muted-foreground'>To'langan</p>
								<p className='text-2xl font-bold'>
									{payments.filter((p) => p.status === PaymentStatus.PAID).length}
								</p>
								<p className='text-sm text-muted-foreground'>Jami</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className='p-6'>
						<div className='flex items-center'>
							<DollarSign className='w-4 h-4 text-blue-500' />
							<div className='ml-4'>
								<p className='text-sm font-medium text-muted-foreground'>To'lanadigan summa</p>
								<p className='text-2xl font-bold'>{formatAmount(getPendingTotal())}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Payment Status Alert */}
			{getPendingTotal() > 0 && (
				<Card className='border-yellow-200 bg-yellow-50'>
					<CardContent className='p-4'>
						<div className='flex items-center'>
							<AlertTriangle className='w-5 h-5 text-yellow-600 mr-3' />
							<div>
								<p className='font-medium text-yellow-800'>
									Sizda {formatAmount(getPendingTotal())} miqdorida to'lanmagan to'lov bor
								</p>
								<p className='text-sm text-yellow-700'>
									To'lov haqida batafsil ma'lumot olish uchun o'qituvchingiz bilan bog'laning.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Filters */}
			<Card>
				<CardContent className='p-6'>
					<div className='flex flex-wrap gap-4'>
						<div className='flex-1 min-w-[200px]'>
							<div className='relative'>
								<Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
								<Input
									placeholder="Guruh yoki tavsif bo'yicha qidirish..."
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
					</div>
				</CardContent>
			</Card>

			{/* Payment Table with Tabs */}
			<Card>
				<CardHeader>
					<CardTitle>To'lovlar tarixi</CardTitle>
				</CardHeader>
				<CardContent>
					<Tabs value={activeTab} onValueChange={setActiveTab}>
						<TabsList className='grid w-full grid-cols-4'>
							<TabsTrigger value='all'>Barchasi ({payments.length})</TabsTrigger>
							<TabsTrigger value='pending'>
								Kutilayotgan ({payments.filter((p) => p.status === PaymentStatus.PENDING).length})
							</TabsTrigger>
							<TabsTrigger value='overdue'>
								Kechikkan ({payments.filter((p) => p.status === PaymentStatus.OVERDUE).length})
							</TabsTrigger>
							<TabsTrigger value='paid'>
								To'langan ({payments.filter((p) => p.status === PaymentStatus.PAID).length})
							</TabsTrigger>
						</TabsList>

						<TabsContent value={activeTab} className='mt-4'>
							<PaymentTable
								payments={filteredPayments}
								onMarkPaid={() => {}} // Students can't mark payments as paid
								onSendReminder={handleSendReminder}
								showActions={true}
								role='student'
							/>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
};

export default StudentPayments;
