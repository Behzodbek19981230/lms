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
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const StudentPayments: React.FC = () => {
	const [payments, setPayments] = useState<Payment[]>([]);
	const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
	const [stats, setStats] = useState<PaymentStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [billingMonth, setBillingMonth] = useState<string>(() => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	});
	const [myBilling, setMyBilling] = useState<any>(null);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [history, setHistory] = useState<any[]>([]);
	const [historyError, setHistoryError] = useState<string | null>(null);

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
			const [paymentsResponse, statsResponse, billingRes] = await Promise.all([
				paymentService.getStudentPayments(),
				paymentService.getStudentPaymentStats(),
				paymentService.getMyMonthlyBilling({ month: billingMonth }),
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

			setMyBilling(billingRes.data || null);
		} catch (error) {
			console.error('Error fetching data:', error);
			toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
		} finally {
			setLoading(false);
		}
	};

	const openHistory = async () => {
		try {
			setHistoryError(null);
			setHistory([]);
			const mpId = myBilling?.monthlyPayment?.id;
			if (!mpId) {
				setHistoryError("Bu oy uchun to'lov yozuvi topilmadi");
				setHistoryOpen(true);
				return;
			}
			const res = await paymentService.getMonthlyPaymentHistory(mpId);
			setHistory(res.data || []);
			setHistoryOpen(true);
		} catch (e: any) {
			setHistoryError(e?.message || 'Tarixni yuklashda xatolik');
			setHistoryOpen(true);
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

			{/* Oylik billing (student) */}
			<Card className='p-4'>
				<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
					<div>
						<CardTitle className='text-lg'>Oylik to‘lovlarim</CardTitle>
						<p className='text-sm text-muted-foreground mt-1'>
							Oy bo‘yicha: summa, muddat, holat va tarix.
						</p>
					</div>
					<div className='flex items-center gap-2'>
						<span className='text-sm text-muted-foreground'>Oy</span>
						<Input
							className='w-[130px]'
							value={billingMonth}
							onChange={(e) => setBillingMonth(e.target.value)}
							placeholder='YYYY-MM'
						/>
						<Button
							variant='outline'
							onClick={async () => {
								try {
									const billingRes = await paymentService.getMyMonthlyBilling({ month: billingMonth });
									setMyBilling(billingRes.data || null);
									toast.success('Yangilandi');
								} catch (e: any) {
									toast.error(e?.message || 'Xatolik');
								}
							}}
						>
							Yangilash
						</Button>
					</div>
				</div>

				<div className='mt-4 grid grid-cols-1 md:grid-cols-4 gap-3'>
					<Card>
						<CardContent className='p-4'>
							<div className='text-xs text-muted-foreground'>Shu oy hisoblandi</div>
							<div className='text-lg font-semibold'>
								{Number(myBilling?.monthlyPayment?.amountDue || 0).toLocaleString('uz-UZ')} UZS
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className='p-4'>
							<div className='text-xs text-muted-foreground'>To‘langan</div>
							<div className='text-lg font-semibold'>
								{Number(myBilling?.monthlyPayment?.amountPaid || 0).toLocaleString('uz-UZ')} UZS
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className='p-4'>
							<div className='text-xs text-muted-foreground'>Qoldiq</div>
							<div className='text-lg font-semibold text-red-600'>
								{Math.max(
									0,
									Number(myBilling?.monthlyPayment?.amountDue || 0) - Number(myBilling?.monthlyPayment?.amountPaid || 0)
								).toLocaleString('uz-UZ')}{' '}
								UZS
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className='p-4'>
							<div className='text-xs text-muted-foreground'>Muddat</div>
							<div className='text-lg font-semibold'>
								{myBilling?.monthlyPayment?.dueDate ? String(myBilling.monthlyPayment.dueDate).slice(0, 10) : '—'}
							</div>
						</CardContent>
					</Card>
				</div>

				<div className='mt-3 flex items-center justify-between'>
					<div className='text-sm text-muted-foreground'>
						Holat: <span className='font-medium text-foreground'>{myBilling?.monthlyPayment?.status || '—'}</span>
					</div>
					<Button variant='outline' onClick={openHistory} disabled={!myBilling?.monthlyPayment?.id}>
						To‘lovlar tarixi
					</Button>
				</div>
			</Card>

			<Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
				<DialogContent className='max-w-[96vw] sm:max-w-3xl lg:max-w-5xl max-h-[85vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>To‘lovlar tarixi</DialogTitle>
					</DialogHeader>
					{historyError && <div className='text-sm text-red-600'>{historyError}</div>}
					<div className='w-full overflow-x-auto border rounded-md'>
						<Table className='min-w-[640px]'>
							<TableHeader>
								<TableRow>
									<TableHead>Sana</TableHead>
									<TableHead>Summa</TableHead>
									<TableHead>Izoh</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{history.length === 0 ? (
									<TableRow>
										<TableCell colSpan={3} className='text-center py-6 text-muted-foreground'>
											Hozircha to‘lovlar yo‘q
										</TableCell>
									</TableRow>
								) : (
									history.map((t) => (
										<TableRow key={t.id}>
											<TableCell>{new Date(t.paidAt).toLocaleString('uz-UZ')}</TableCell>
											<TableCell className='font-medium'>
												{Number(t.amount).toLocaleString('uz-UZ')} UZS
											</TableCell>
											<TableCell className='max-w-[420px] truncate'>{t.note || '—'}</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
					<DialogFooter>
						<Button variant='outline' onClick={() => setHistoryOpen(false)}>
							Yopish
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

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

			{/* Filters (eski guruhga bog'langan to'lovlar) */}
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
