import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Search, DollarSign, Users, Clock, AlertTriangle } from 'lucide-react';
import {
	BillingLedgerItem,
	Payment,
	PaymentStats,
	PaymentStatus,
	CreatePaymentDto,
	NoGroupStudent,
} from '../../types/payment';
import { Group } from '../../types/group';
import { paymentService } from '../../services/payment.service';
import { groupService } from '../../services/group.service';
import PaymentTable from '../../components/payments/PaymentTable';
import CreatePaymentForm from '../../components/payments/CreatePaymentForm';
import MonthlyBillingTable from '@/components/payments/MonthlyBillingTable';
import { toast } from 'sonner';
import PageLoader from '@/components/PageLoader';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TeacherPayments: React.FC = () => {
	const { user } = useAuth();
	const [payments, setPayments] = useState<Payment[]>([]);
	const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
	const [studentsWithoutGroup, setStudentsWithoutGroup] = useState<NoGroupStudent[]>([]);
	const [stats, setStats] = useState<PaymentStats | null>(null);
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [selectedGroup, setSelectedGroup] = useState<Group | undefined>();
	const [billingMonth, setBillingMonth] = useState<string>(() => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	});
	const [ledger, setLedger] = useState<BillingLedgerItem[]>([]);
	const [ledgerPage, setLedgerPage] = useState(1);
	const [ledgerPageSize, setLedgerPageSize] = useState(20);
	const [ledgerTotal, setLedgerTotal] = useState(0);
	const [ledgerSearch, setLedgerSearch] = useState('');
	const [ledgerStatus, setLedgerStatus] = useState<string>('all'); // all|pending|paid|overdue
	const [ledgerDebt, setLedgerDebt] = useState<string>('all'); // all|withDebt|noDebt

	// Debts summary modal
	const [debtsOpen, setDebtsOpen] = useState(false);
	const [debtsLoading, setDebtsLoading] = useState(false);
	const [debtsSearch, setDebtsSearch] = useState('');
	const [debtsPage, setDebtsPage] = useState(1);
	const [debtsPageSize, setDebtsPageSize] = useState(20);
	const [debtsTotal, setDebtsTotal] = useState(0);
	const [debtsTotalSum, setDebtsTotalSum] = useState(0);
	const [debtsItems, setDebtsItems] = useState<any[]>([]);
	const [debtsError, setDebtsError] = useState<string | null>(null);

	// Filters
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [groupFilter, setGroupFilter] = useState<string>('all');

	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => {
		applyFilters();
	}, [payments, searchTerm, statusFilter, groupFilter]);

	const fetchData = async () => {
		setLoading(true);
		try {
			const [paymentsResponse, statsResponse, groupsResponse] = await Promise.all([
				paymentService.getTeacherPayments(),
				paymentService.getTeacherPaymentStats(),
				groupService.getMyGroups(),
			]);

			if (paymentsResponse.success && paymentsResponse.data) {
				setPayments(paymentsResponse.data.payments || []);
				setStudentsWithoutGroup(paymentsResponse.data.studentsWithoutGroup || []);
			} else {
				setPayments([]);
				setStudentsWithoutGroup([]);
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

			// Billing ledger
			try {
				const ledgerRes = await paymentService.getBillingLedger({
					month: billingMonth,
					page: 1,
					pageSize: ledgerPageSize,
					search: ledgerSearch || undefined,
					status: (ledgerStatus as any) || undefined,
					debt: (ledgerDebt as any) || undefined,
				});
				if (ledgerRes.success && ledgerRes.data) {
					setLedger(ledgerRes.data.items || []);
					setLedgerTotal(ledgerRes.data.total || 0);
					setLedgerPage(ledgerRes.data.page || 1);
					setLedgerPageSize(ledgerRes.data.pageSize || ledgerPageSize);
				} else {
					setLedger([]);
					setLedgerTotal(0);
				}
			} catch {
				setLedger([]);
				setLedgerTotal(0);
			}
		} catch (error) {
			console.error('Error fetching data:', error);
			toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
		} finally {
			setLoading(false);
		}
	};

	const refreshLedger = async (opts?: { month?: string; page?: number }) => {
		const m = opts?.month || billingMonth;
		const p = opts?.page || ledgerPage;
		const ledgerRes = await paymentService.getBillingLedger({
			month: m,
			page: p,
			pageSize: ledgerPageSize,
			search: ledgerSearch || undefined,
			status: (ledgerStatus as any) || undefined,
			debt: (ledgerDebt as any) || undefined,
		});
		if (ledgerRes.success && ledgerRes.data) {
			setLedger(ledgerRes.data.items || []);
			setLedgerTotal(ledgerRes.data.total || 0);
			setLedgerPage(ledgerRes.data.page || p);
			setLedgerPageSize(ledgerRes.data.pageSize || ledgerPageSize);
		}
	};

	const loadDebts = async (opts?: { page?: number }) => {
		try {
			setDebtsLoading(true);
			setDebtsError(null);
			const p = opts?.page || debtsPage;
			const res = await paymentService.getMonthlyBillingDebtSummary({
				upToMonth: billingMonth,
				page: p,
				pageSize: debtsPageSize,
				search: debtsSearch || undefined,
			});
			const data = res.data;
			setDebtsItems(data?.items || []);
			setDebtsTotal(data?.total || 0);
			setDebtsPage(data?.page || p);
			setDebtsPageSize(data?.pageSize || debtsPageSize);
			setDebtsTotalSum(data?.summary?.totalRemainingAll || 0);
		} catch (e: any) {
			setDebtsError(e?.message || 'Xatolik');
		} finally {
			setDebtsLoading(false);
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

	const handleEditAmount = async (paymentId: string, amount: number) => {
		try {
			const response = await paymentService.updatePayment(paymentId, { amount });
			if (response.success) {
				toast.success("To'lov miqdori yangilandi");
				fetchData();
			}
		} catch (error) {
			console.error('Error updating payment amount:', error);
			toast.error("To'lov miqdorini yangilashda xatolik yuz berdi");
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
			<Dialog open={debtsOpen} onOpenChange={setDebtsOpen}>
				<DialogContent className='max-w-[96vw] sm:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>Qarzdorliklar (hozirgi oygacha)</DialogTitle>
					</DialogHeader>

					<div className='flex flex-col lg:flex-row gap-3 lg:items-end'>
						<div className='flex-1 min-w-[220px]'>
							<div className='relative'>
								<Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
								<Input
									placeholder="O‘quvchi qidirish..."
									value={debtsSearch}
									onChange={(e) => setDebtsSearch(e.target.value)}
									className='pl-8'
								/>
							</div>
						</div>
						<div className='w-full sm:w-[160px]'>
							<Select
								value={String(debtsPageSize)}
								onValueChange={(v) => {
									const n = Number(v);
									setDebtsPageSize(n);
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder='Sahifadagi son' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='10'>10</SelectItem>
									<SelectItem value='20'>20</SelectItem>
									<SelectItem value='50'>50</SelectItem>
									<SelectItem value='100'>100</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<Button
							variant='outline'
							onClick={async () => {
								setDebtsPage(1);
								await loadDebts({ page: 1 });
							}}
						>
							Yangilash
						</Button>
					</div>

					<Card className='p-3'>
						<div className='text-sm text-muted-foreground'>
							Jami qarzdorlar: <span className='font-medium text-foreground'>{debtsTotal}</span> | Umumiy qarzdorlik:{' '}
							<span className='font-medium text-foreground'>
								{Number(debtsTotalSum || 0).toLocaleString('uz-UZ')} UZS
							</span>
						</div>
						{debtsError ? (
							<div className='text-sm text-red-600 mt-2'>{debtsError}</div>
						) : null}
					</Card>

					<div className='w-full overflow-x-auto border rounded-md'>
						<Table className='min-w-[980px]'>
							<TableHeader>
								<TableRow>
									<TableHead>O‘quvchi</TableHead>
									<TableHead>Umumiy qarz</TableHead>
									<TableHead>Qaysi oylar</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{debtsLoading ? (
									<TableRow>
										<TableCell colSpan={3} className='py-6 text-center text-muted-foreground'>
											Yuklanmoqda...
										</TableCell>
									</TableRow>
								) : debtsItems.length === 0 ? (
									<TableRow>
										<TableCell colSpan={3} className='py-6 text-center text-muted-foreground'>
											Qarzdor o‘quvchilar topilmadi
										</TableCell>
									</TableRow>
								) : (
									debtsItems.map((it: any) => (
										<TableRow key={it.student?.id}>
											<TableCell className='font-medium'>
												{it.student?.firstName} {it.student?.lastName}{' '}
												<span className='text-xs text-muted-foreground'>@{it.student?.username}</span>
											</TableCell>
											<TableCell className='font-semibold text-red-600'>
												{Number(it.totalRemaining || 0).toLocaleString('uz-UZ')} UZS
											</TableCell>
											<TableCell className='text-sm'>
												{(it.months || [])
													.slice(0, 10)
													.map((m: any) => `${m.month} (${Number(m.remaining || 0).toLocaleString('uz-UZ')})`)
													.join(', ')}
												{(it.months || []).length > 10 ? ` ... (+${(it.months || []).length - 10})` : ''}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>

					<DialogFooter className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
						<div className='text-sm text-muted-foreground'>
							Sahifa: <span className='font-medium text-foreground'>{debtsPage}</span> /{' '}
							<span className='font-medium text-foreground'>
								{Math.max(1, Math.ceil(debtsTotal / debtsPageSize))}
							</span>
						</div>
						<div className='flex items-center gap-2'>
							<Button
								variant='outline'
								size='sm'
								disabled={debtsPage <= 1}
								onClick={async () => {
									const next = Math.max(1, debtsPage - 1);
									setDebtsPage(next);
									await loadDebts({ page: next });
								}}
							>
								Oldingi
							</Button>
							<Button
								variant='outline'
								size='sm'
								disabled={debtsPage >= Math.max(1, Math.ceil(debtsTotal / debtsPageSize))}
								onClick={async () => {
									const maxPage = Math.max(1, Math.ceil(debtsTotal / debtsPageSize));
									const next = Math.min(maxPage, debtsPage + 1);
									setDebtsPage(next);
									await loadDebts({ page: next });
								}}
							>
								Keyingi
							</Button>
							<Button variant='outline' onClick={() => setDebtsOpen(false)}>
								Yopish
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4'>
				<h1 className='text-xl sm:text-2xl md:text-3xl font-bold'>To'lovlarni boshqarish</h1>
				{user?.role === 'teacher' && (
					<Button onClick={() => setShowCreateForm(true)} size='sm' className='w-full sm:w-auto'>
						<Plus className='w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2' />
						<span className='text-xs sm:text-sm'>Yangi to'lov</span>
					</Button>
				)}
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

			{/* Oylik billing jadvali */}
			<Card className='p-4 sm:p-5'>
				<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
					<div>
						<CardTitle className='text-lg'>Oylik to‘lovlar</CardTitle>
						<p className='text-sm text-muted-foreground mt-1'>
							O‘quvchi qo‘shilganda avtomatik ko‘rinadi (joinDate default: user yaratilgan sana). Qarzdorliklarni oy bo‘yicha
							belgilab, qisman to‘lov kiritish mumkin.
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
							size='sm'
							variant='outline'
							onClick={async () => {
								setDebtsOpen(true);
								setDebtsPage(1);
								await loadDebts({ page: 1 });
							}}
						>
							Qarzdorliklar
						</Button>
						<Button
							size='sm'
							variant='outline'
							onClick={async () => {
								try {
									const ok = confirm(
										"Qarzdor o‘quvchilarga (barcha oylar bo‘yicha) Telegram + bildirishnoma yuborilsinmi?",
									);
									if (!ok) return;
									const res = await paymentService.sendMonthlyBillingDebtReminders({
										upToMonth: billingMonth,
									});
									const s = res.data?.studentsNotified ?? 0;
									const t = res.data?.totalDebtors ?? 0;
									toast.success(`Yuborildi: ${s}. Qarzdorlar: ${t}.`);
								} catch (e: any) {
									toast.error(e?.message || 'Xatolik');
								}
							}}
						>
							Eslatma yuborish
						</Button>
						<Button
							size='sm'
							variant='outline'
							onClick={async () => {
								try {
									setLedgerPage(1);
									await refreshLedger({ month: billingMonth, page: 1 });
									toast.success('Oylik jadval yangilandi');
								} catch {
									toast.error("Yangilashda xatolik");
								}
							}}
						>
							Yangilash
						</Button>
					</div>
				</div>

				<div className='mt-4 flex flex-col lg:flex-row gap-3 lg:items-end'>
					<div className='flex-1 min-w-[220px]'>
						<div className='relative'>
							<Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
							<Input
								placeholder="O‘quvchi bo‘yicha qidirish (ism/familiya/username)..."
								value={ledgerSearch}
								onChange={(e) => setLedgerSearch(e.target.value)}
								className='pl-8'
							/>
						</div>
					</div>

					<div className='w-full sm:w-[200px]'>
						<Select value={ledgerStatus} onValueChange={setLedgerStatus}>
							<SelectTrigger>
								<SelectValue placeholder='Holat' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>Barchasi</SelectItem>
								<SelectItem value='pending'>Kutilmoqda</SelectItem>
								<SelectItem value='overdue'>Muddati o‘tgan</SelectItem>
								<SelectItem value='paid'>To‘langan</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className='w-full sm:w-[200px]'>
						<Select value={ledgerDebt} onValueChange={setLedgerDebt}>
							<SelectTrigger>
								<SelectValue placeholder='Qarz' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>Barchasi</SelectItem>
								<SelectItem value='withDebt'>Qarzdor</SelectItem>
								<SelectItem value='noDebt'>Qarzsiz</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className='w-full sm:w-[160px]'>
						<Select
							value={String(ledgerPageSize)}
							onValueChange={(v) => {
								const n = Number(v);
								setLedgerPageSize(n);
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder='Sahifadagi son' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='10'>10</SelectItem>
								<SelectItem value='20'>20</SelectItem>
								<SelectItem value='50'>50</SelectItem>
								<SelectItem value='100'>100</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Button
						variant='outline'
						onClick={async () => {
							try {
								setLedgerPage(1);
								await refreshLedger({ page: 1 });
								toast.success('Filter qo‘llandi');
							} catch {
								toast.error('Xatolik');
							}
						}}
					>
						Qo‘llash
					</Button>
				</div>

				<div className='mt-4'>
					<MonthlyBillingTable
						month={billingMonth}
						ledger={ledger}
						onSaveProfile={async (studentId, data) => {
							await paymentService.updateStudentBillingProfile(studentId, data as any);
							toast.success('Sozlamalar saqlandi');
							await refreshLedger();
						}}
						onCollect={async (data) => {
							await paymentService.collectMonthlyPayment(data as any);
							toast.success("To'lov kiritildi");
							await refreshLedger();
						}}
						onUpdateMonthly={async (monthlyPaymentId, data) => {
							await paymentService.updateMonthlyPayment(monthlyPaymentId, data as any);
									toast.success("Oylik to'lov yangilandi");
							await refreshLedger();
						}}
						onSettleStudent={async ({ studentId, leaveDate, persist }) => {
							try {
								if (persist) {
									const res = await paymentService.closeStudentSettlement({ studentId, leaveDate });
									const totalRemaining = res.data?.summary?.totalRemaining ?? 0;
									toast.success(
										`Hisoblandi. Qolgan qarzdorlik: ${Number(totalRemaining).toLocaleString('uz-UZ')} UZS`
									);
									await refreshLedger();
									return res.data as any;
								}
								const res = await paymentService.previewStudentSettlement({ studentId, leaveDate });
								return res.data as any;
							} catch (e: any) {
								toast.error(e?.message || 'Xatolik yuz berdi');
								throw e;
							}
						}}
						onGetHistory={async (monthlyPaymentId) => {
							const res = await paymentService.getMonthlyPaymentHistory(monthlyPaymentId);
							return res.data || [];
						}}
					/>
				</div>

				<div className='mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
					<div className='text-sm text-muted-foreground'>
						Jami: <span className='font-medium text-foreground'>{ledgerTotal}</span>
						{ledgerTotal > 0 ? (
							<>
								{' '}
								| Sahifa: <span className='font-medium text-foreground'>{ledgerPage}</span> /{' '}
								<span className='font-medium text-foreground'>
									{Math.max(1, Math.ceil(ledgerTotal / ledgerPageSize))}
								</span>
							</>
						) : null}
					</div>
					<div className='flex items-center gap-2'>
						<Button
							variant='outline'
							size='sm'
							disabled={ledgerPage <= 1}
							onClick={async () => {
								const next = Math.max(1, ledgerPage - 1);
								setLedgerPage(next);
								await refreshLedger({ page: next });
							}}
						>
							Oldingi
						</Button>
						<Button
							variant='outline'
							size='sm'
							disabled={ledgerPage >= Math.max(1, Math.ceil(ledgerTotal / ledgerPageSize))}
							onClick={async () => {
								const maxPage = Math.max(1, Math.ceil(ledgerTotal / ledgerPageSize));
								const next = Math.min(maxPage, ledgerPage + 1);
								setLedgerPage(next);
								await refreshLedger({ page: next });
							}}
						>
							Keyingi
						</Button>
					</div>
				</div>
			</Card>

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
					<PaymentTable
						payments={filteredPayments}
						onMarkPaid={handleMarkPaid}
						onSendReminder={handleSendReminder}
						onDelete={handleDeletePayment}
						onEditAmount={handleEditAmount}
						role={user?.role === 'teacher' ? 'teacher' : 'center_admin'}
					/>
				</CardContent>
			</Card>

			{/* Students without group (admin/superadmin) */}
			{user?.role !== 'teacher' && studentsWithoutGroup.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Guruhi yo‘q o‘quvchilar</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-sm text-muted-foreground mb-3'>
							Bu o‘quvchilarga guruh biriktirilmagani uchun to‘lov kiritib bo‘lmaydi.
						</div>
						<div className='space-y-2'>
							{studentsWithoutGroup.map((s) => (
								<div
									key={s.id}
									className='flex items-center justify-between border rounded-md px-3 py-2'
								>
									<div className='text-sm'>
										<span className='font-medium'>
											{s.firstName} {s.lastName}
										</span>{' '}
										<span className='text-xs text-muted-foreground'>@{s.username}</span>
									</div>
									<Badge variant='secondary'>Guruh yo‘q</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Create Payment Form */}
			{user?.role === 'teacher' && (
				<CreatePaymentForm
					open={showCreateForm}
					onClose={() => {
						setShowCreateForm(false);
						setSelectedGroup(undefined);
					}}
					onSubmit={handleCreatePayment}
					selectedGroup={selectedGroup}
				/>
			)}
		</div>
	);
};

export default TeacherPayments;
