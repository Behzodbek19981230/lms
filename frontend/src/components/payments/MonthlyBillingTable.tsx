import React, { useMemo, useState } from 'react';
import { BillingLedgerItem, MonthlyPaymentTransaction, StudentSettlementResult } from '@/types/payment';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, isValid, parse } from 'date-fns';
import { uz } from 'date-fns/locale';
import { MoreHorizontal, CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
	month: string; // YYYY-MM
	ledger: BillingLedgerItem[];
	sortKey: SortKey | null;
	sortDir: 'asc' | 'desc';
	onSortChange: (key: SortKey, dir: 'asc' | 'desc') => void;
	onSaveProfile: (
		studentId: number,
		groupId: number,
		data: { joinDate?: string; monthlyAmount?: number; dueDay?: number }
	) => Promise<void>;
	onCollect: (data: {
		studentId: number;
		groupId: number;
		month: string;
		amount: number;
		note?: string;
		amountDueOverride?: number;
	}) => Promise<void>;
	onUpdateMonthly: (
		monthlyPaymentId: number,
		data: { amountDue?: number; dueDate?: string; note?: string }
	) => Promise<void>;
	onSettleStudent: (data: {
		studentId: number;
		leaveDate: string;
		persist: boolean;
	}) => Promise<StudentSettlementResult>;
	onGetHistory: (monthlyPaymentId: number) => Promise<MonthlyPaymentTransaction[]>;
	isTeacher?: boolean; // Teacher uchun actions'larni yashirish
};

export type SortKey =
	| 'student'
	| 'group'
	| 'joinDate'
	| 'monthlyAmount'
	| 'dueDate'
	| 'due'
	| 'paid'
	| 'remain'
	| 'status';

function statusBadge(status?: string | null) {
	switch (status) {
		case 'paid':
			return <Badge className='bg-green-100 text-green-800'>To‘langan</Badge>;
		case 'overdue':
			return <Badge variant='destructive'>Kechikkan</Badge>;
		case 'cancelled':
			return <Badge variant='outline'>Bekor qilingan</Badge>;
		default:
			return <Badge className='bg-yellow-100 text-yellow-800'>Kutilmoqda</Badge>;
	}
}

export default function MonthlyBillingTable({
	month,
	ledger,
	sortKey,
	sortDir,
	onSortChange,
	onSaveProfile,
	onCollect,
	onUpdateMonthly,
	onSettleStudent,
	onGetHistory,
	isTeacher = false,
}: Props) {
	const [profileOpen, setProfileOpen] = useState(false);
	const [collectOpen, setCollectOpen] = useState(false);
	const [editMonthlyOpen, setEditMonthlyOpen] = useState(false);
	const [settleOpen, setSettleOpen] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);

	const [activeRowKey, setActiveRowKey] = useState<{ studentId: number; groupId: number } | null>(null);
	const activeRow = useMemo(() => {
		if (!activeRowKey) return null;
		return (
			ledger.find((x) => x.student.id === activeRowKey.studentId && x.group.id === activeRowKey.groupId) || null
		);
	}, [activeRowKey, ledger]);

	// Profile form
	const [joinDate, setJoinDate] = useState<string>('');
	const [monthlyAmount, setMonthlyAmount] = useState<string>('');
	const [dueDay, setDueDay] = useState<string>('');

	// Collect form
	const [collectMonth, setCollectMonth] = useState<string>(month);
	const [collectAmount, setCollectAmount] = useState<string>('');
	const [collectNote, setCollectNote] = useState<string>('');
	const [amountDueOverride, setAmountDueOverride] = useState<string>('');
	const monthlyAmountMissing = (activeRow?.profile?.monthlyAmount ?? 0) <= 0;

	// Edit monthly schedule
	const [editDueDate, setEditDueDate] = useState<string>('');
	const [editAmountDue, setEditAmountDue] = useState<string>('');
	const [editNote, setEditNote] = useState<string>('');

	// Settlement (leave)
	const [leaveDate, setLeaveDate] = useState<string>(() => format(new Date(), 'dd-MM-yyyy'));
	const [settleResult, setSettleResult] = useState<StudentSettlementResult | null>(null);
	const [settleError, setSettleError] = useState<string | null>(null);

	// History
	const [history, setHistory] = useState<MonthlyPaymentTransaction[]>([]);
	const [historyError, setHistoryError] = useState<string | null>(null);

	const toggleSort = (key: SortKey) => {
		if (sortKey === key) {
			onSortChange(key, sortDir === 'asc' ? 'desc' : 'asc');
			return;
		}
		onSortChange(key, 'asc');
	};

	const SortHead = ({ label, col, className }: { label: string; col: SortKey; className?: string }) => (
		<TableHead className={cn('p-0', className)}>
			<button
				type='button'
				onClick={() => toggleSort(col)}
				className='flex w-full items-center h-10 sm:h-12 px-2 sm:px-3 md:px-4 text-left select-none hover:bg-muted/30'
			>
				<span className='font-medium text-muted-foreground'>{label}</span>
				{sortKey === col ? (
					sortDir === 'asc' ? (
						<ArrowUp className='ml-2 h-4 w-4' />
					) : (
						<ArrowDown className='ml-2 h-4 w-4' />
					)
				) : (
					<ArrowUpDown className='ml-2 h-4 w-4 text-muted-foreground' />
				)}
			</button>
		</TableHead>
	);

	const openProfile = (row: BillingLedgerItem) => {
		setActiveRowKey({ studentId: row.student.id, groupId: row.group.id });
		const joinDateObj = new Date(row.profile.joinDate);
		setJoinDate(format(joinDateObj, 'dd-MM-yyyy'));
		setMonthlyAmount(String(row.profile.monthlyAmount ?? 0));
		setDueDay(String(row.profile.dueDay ?? 10));
		setProfileOpen(true);
	};

	const openCollect = (row: BillingLedgerItem) => {
		setActiveRowKey({ studentId: row.student.id, groupId: row.group.id });
		setCollectMonth(month);
		setCollectAmount('');
		setCollectNote('');
		setAmountDueOverride('');
		setCollectOpen(true);
	};

	const openEditMonthly = (row: BillingLedgerItem) => {
		if (!row.monthlyPayment) return;
		setActiveRowKey({ studentId: row.student.id, groupId: row.group.id });
		if (row.monthlyPayment?.dueDate) {
			const dueDateObj = new Date(row.monthlyPayment.dueDate);
			setEditDueDate(format(dueDateObj, 'dd-MM-yyyy'));
		} else {
			setEditDueDate('');
		}
		setEditAmountDue(String(row.monthlyPayment.amountDue ?? 0));
		setEditNote(row.monthlyPayment.note || '');
		setEditMonthlyOpen(true);
	};

	const openSettle = (row: BillingLedgerItem) => {
		setActiveRowKey({ studentId: row.student.id, groupId: row.group.id });
		setLeaveDate(new Date().toISOString().slice(0, 10));
		setSettleResult(null);
		setSettleError(null);
		setSettleOpen(true);
	};

	const openHistory = async (row: BillingLedgerItem) => {
		if (!row.monthlyPayment) return;
		setActiveRowKey({ studentId: row.student.id, groupId: row.group.id });
		setHistoryError(null);
		setHistory([]);
		setHistoryOpen(true);
		try {
			const data = await onGetHistory(row.monthlyPayment.id);
			setHistory(data);
		} catch (e: any) {
			setHistoryError(e?.message || 'Tarixni yuklashda xatolik');
		}
	};

	return (
		<div className='space-y-3'>
			<Card className='p-3'>
				<div className='text-sm text-muted-foreground'>
					Oy: <span className='font-medium text-foreground'>{month}</span>. Bu jadval o‘quvchilar bo‘yicha
					oylik to‘lov holatini ko‘rsatadi (joinDate default: student yaratilgan sana).
				</div>
			</Card>

			<Dialog open={profileOpen} onOpenChange={setProfileOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>O‘quvchi to‘lov sozlamalari</DialogTitle>
					</DialogHeader>
					<div className='grid grid-cols-1 gap-4'>
						<div>
							<Label>Qo'shilgan sana (joinDate)</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant='outline'
										className={cn(
											'w-full justify-start text-left font-normal',
											!joinDate && 'text-muted-foreground'
										)}
									>
										<CalendarIcon className='mr-2 h-4 w-4' />
										{joinDate ? joinDate : <span>Sana tanlang</span>}
									</Button>
								</PopoverTrigger>
								<PopoverContent className='w-auto p-0' align='start'>
									<Calendar
										mode='single'
										selected={joinDate ? parse(joinDate, 'dd-MM-yyyy', new Date()) : undefined}
										onSelect={(date) => {
											if (date) {
												setJoinDate(format(date, 'dd-MM-yyyy'));
											}
										}}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div>
							<Label>Oylik summa (UZS)</Label>
							<Input
								inputMode='numeric'
								value={monthlyAmount}
								onChange={(e) => setMonthlyAmount(e.target.value)}
							/>
						</div>
						<div>
							<Label>To‘lov kuni (1-31)</Label>
							<Input inputMode='numeric' value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
						</div>
					</div>
					<DialogFooter>
						<Button variant='outline' onClick={() => setProfileOpen(false)}>
							Bekor
						</Button>
						<Button
							onClick={async () => {
								if (!activeRow) return;
								// Convert DD-MM-YYYY to YYYY-MM-DD for backend
								let joinDateFormatted: string | undefined;
								if (joinDate) {
									try {
										const parsed = parse(joinDate, 'dd-MM-yyyy', new Date());
										joinDateFormatted = format(parsed, 'yyyy-MM-dd');
									} catch {
										joinDateFormatted = joinDate;
									}
								}
								await onSaveProfile(activeRow.student.id, activeRow.group.id, {
									joinDate: joinDateFormatted,
									monthlyAmount: monthlyAmount ? Number(monthlyAmount) : undefined,
									dueDay: dueDay ? Number(dueDay) : undefined,
								});
								setProfileOpen(false);
							}}
						>
							Saqlash
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={collectOpen} onOpenChange={setCollectOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>To‘lov kiritish (qaysi oy uchun)</DialogTitle>
					</DialogHeader>
					<div className='grid grid-cols-1 gap-4'>
						{monthlyAmountMissing && (
							<Card className='p-3 border border-red-200 bg-red-50'>
								<div className='text-sm text-red-800'>
									<b>Diqqat:</b> Oylik summa kiritilmagan. Avval “Sozlash” bo‘limida oylik summani
									belgilang.
								</div>
							</Card>
						)}
						<div>
							<Label>Oy (YYYY-MM)</Label>
							<Select value={collectMonth} onValueChange={(value) => setCollectMonth(value)}>
								<SelectTrigger className='w-full'>
									<SelectValue placeholder='Oy tanlang'>
										{collectMonth
											? format(
													parse(collectMonth + '-01', 'yyyy-MM-dd', new Date()),
													'MMMM yyyy',
													{
														locale: uz,
													}
											  )
											: 'Oy tanlang'}
									</SelectValue>
								</SelectTrigger>
								<SelectContent className='max-h-[300px]'>
									{[2025, 2026, 2027, 2028, 2029].map((year) => (
										<div key={year}>
											<div className='px-2 py-1.5 text-sm font-semibold text-muted-foreground'>
												{year}
											</div>
											{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
												const monthStr = `${year}-${String(month).padStart(2, '0')}`;
												const monthName = format(
													parse(monthStr + '-01', 'yyyy-MM-dd', new Date()),
													'MMMM',
													{ locale: uz }
												);
												return (
													<SelectItem key={monthStr} value={monthStr}>
														{monthName} {year}
													</SelectItem>
												);
											})}
										</div>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>To‘langan summa (UZS)</Label>
							<Input
								inputMode='numeric'
								value={collectAmount}
								onChange={(e) => setCollectAmount(e.target.value)}
							/>
						</div>
						<div>
							<Label>Izoh (ixtiyoriy)</Label>
							<Input
								value={collectNote}
								onChange={(e) => setCollectNote(e.target.value)}
								placeholder='Dekabr uchun qisman'
							/>
						</div>
						<div>
							<Label>Shu oy uchun kerakli summa (ixtiyoriy)</Label>
							<Input
								inputMode='numeric'
								value={amountDueOverride}
								onChange={(e) => setAmountDueOverride(e.target.value)}
								placeholder='Masalan: 150000'
							/>
							<p className='text-xs text-muted-foreground mt-1'>
								Agar tanlangan oy uchun oylik yozuvi hali yaratilmagan bo‘lsa, shu summa bilan
								yaratiladi (qisman oylar uchun qulay).
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button variant='outline' onClick={() => setCollectOpen(false)}>
							Bekor
						</Button>
						<Button
							disabled={monthlyAmountMissing}
							onClick={async () => {
								if (!activeRow) return;
								await onCollect({
									studentId: activeRow.student.id,
									groupId: activeRow.group.id,
									month: collectMonth || month,
									amount: Number(collectAmount),
									note: collectNote || undefined,
									amountDueOverride: amountDueOverride ? Number(amountDueOverride) : undefined,
								});
								setCollectOpen(false);
							}}
						>
							Saqlash
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={editMonthlyOpen} onOpenChange={setEditMonthlyOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Oylik to‘lov sozlamasini tahrirlash</DialogTitle>
					</DialogHeader>
					<div className='grid grid-cols-1 gap-4'>
						<div>
							<Label>To'lov sanasi</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant='outline'
										className={cn(
											'w-full justify-start text-left font-normal',
											!editDueDate && 'text-muted-foreground'
										)}
									>
										<CalendarIcon className='mr-2 h-4 w-4' />
										{editDueDate ? editDueDate : <span>Sana tanlang</span>}
									</Button>
								</PopoverTrigger>
								<PopoverContent className='w-auto p-0' align='start'>
									<Calendar
										mode='single'
										selected={
											editDueDate ? parse(editDueDate, 'dd-MM-yyyy', new Date()) : undefined
										}
										onSelect={(date) => {
											if (date) {
												setEditDueDate(format(date, 'dd-MM-yyyy'));
											}
										}}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div>
							<Label>Shu oy uchun summa (UZS)</Label>
							<Input
								inputMode='numeric'
								value={editAmountDue}
								onChange={(e) => setEditAmountDue(e.target.value)}
							/>
						</div>
						<div>
							<Label>Izoh</Label>
							<Input value={editNote} onChange={(e) => setEditNote(e.target.value)} />
						</div>
					</div>
					<DialogFooter>
						<Button variant='outline' onClick={() => setEditMonthlyOpen(false)}>
							Bekor
						</Button>
						<Button
							onClick={async () => {
								if (!activeRow?.monthlyPayment) return;
								// Convert DD-MM-YYYY to YYYY-MM-DD for backend
								let dueDateFormatted: string | undefined;
								if (editDueDate) {
									try {
										const parsed = parse(editDueDate, 'dd-MM-yyyy', new Date());
										dueDateFormatted = format(parsed, 'yyyy-MM-dd');
									} catch {
										dueDateFormatted = editDueDate;
									}
								}
								await onUpdateMonthly(activeRow.monthlyPayment.id, {
									dueDate: dueDateFormatted,
									amountDue: editAmountDue ? Number(editAmountDue) : undefined,
									note: editNote || undefined,
								});
								setEditMonthlyOpen(false);
							}}
						>
							Saqlash
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={settleOpen} onOpenChange={setSettleOpen}>
				<DialogContent className='max-w-[96vw] sm:max-w-3xl lg:max-w-6xl max-h-[90vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>O‘quvchini “ketdi” qilib hisoblash</DialogTitle>
					</DialogHeader>
					<div className='space-y-4'>
						<div>
							<Label>Ketish sanasi</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant='outline'
										className={cn(
											'w-full justify-start text-left font-normal',
											!leaveDate && 'text-muted-foreground'
										)}
									>
										<CalendarIcon className='mr-2 h-4 w-4' />
										{leaveDate ? leaveDate : <span>Sana tanlang</span>}
									</Button>
								</PopoverTrigger>
								<PopoverContent className='w-auto p-0' align='start'>
									<Calendar
										mode='single'
										selected={leaveDate ? parse(leaveDate, 'dd-MM-yyyy', new Date()) : undefined}
										onSelect={(date) => {
											if (date) {
												setLeaveDate(format(date, 'dd-MM-yyyy'));
											}
										}}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
							<p className='text-xs text-muted-foreground mt-1'>
								Tizim joinDate va oylik summaga qarab shu sanagacha bo'lgan qarzdorlikni kunlar bo'yicha
								hisoblaydi.
							</p>
						</div>

						{settleError && (
							<Card className='p-3 border border-red-200 bg-red-50'>
								<div className='text-sm text-red-800'>
									<b>Xatolik:</b> {settleError}
								</div>
							</Card>
						)}

						{settleResult && (
							<div className='space-y-3'>
								<Card className='p-3'>
									<div className='text-sm'>
										<b>Jami hisoblandi:</b>{' '}
										{Number(settleResult.summary.totalDue).toLocaleString('uz-UZ')} UZS
										{'  '}| <b>To‘langan:</b>{' '}
										{Number(settleResult.summary.totalPaid).toLocaleString('uz-UZ')} UZS
										{'  '}| <b>Qolgan qarz:</b>{' '}
										{Number(settleResult.summary.totalRemaining).toLocaleString('uz-UZ')} UZS
									</div>
								</Card>

								<div className='w-full overflow-x-auto border rounded-md'>
									<Table className='min-w-[760px]'>
										<TableHeader>
											<TableRow>
												<TableHead>Oy</TableHead>
												<TableHead>Davr</TableHead>
												<TableHead>Kun</TableHead>
												<TableHead>Hisoblandi</TableHead>
												<TableHead>To‘langan</TableHead>
												<TableHead>Qoldiq</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{settleResult.months.map((m) => (
												<TableRow key={m.billingMonth}>
													<TableCell className='font-medium'>
														{m.billingMonth.slice(0, 7)}
													</TableCell>
													<TableCell>
														{m.activeFrom} → {m.activeTo}
													</TableCell>
													<TableCell>
														{m.activeDays}/{m.daysInMonth}
													</TableCell>
													<TableCell>
														{Number(m.amountDue).toLocaleString('uz-UZ')} UZS
													</TableCell>
													<TableCell>
														{Number(m.amountPaid).toLocaleString('uz-UZ')} UZS
													</TableCell>
													<TableCell
														className={
															m.remaining > 0
																? 'font-semibold text-red-600'
																: 'text-green-700'
														}
													>
														{Number(m.remaining).toLocaleString('uz-UZ')} UZS
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant='outline' onClick={() => setSettleOpen(false)}>
							Bekor
						</Button>
						<Button
							variant='secondary'
							onClick={async () => {
								if (!activeRow) return;
								try {
									setSettleError(null);
									// Convert DD-MM-YYYY to YYYY-MM-DD for backend
									let leaveDateFormatted = leaveDate;
									if (leaveDate) {
										try {
											const parsed = parse(leaveDate, 'dd-MM-yyyy', new Date());
											leaveDateFormatted = format(parsed, 'yyyy-MM-dd');
										} catch {
											leaveDateFormatted = leaveDate;
										}
									}
									const res = await onSettleStudent({
										studentId: activeRow.student.id,
										leaveDate: leaveDateFormatted,
										persist: false,
									});
									setSettleResult(res);
								} catch (e: any) {
									setSettleResult(null);
									setSettleError(e?.message || 'Hisoblashda xatolik');
								}
							}}
						>
							Hisoblab ko‘rish
						</Button>
						<Button
							onClick={async () => {
								if (!activeRow) return;
								try {
									setSettleError(null);
									// Convert DD-MM-YYYY to YYYY-MM-DD for backend
									let leaveDateFormatted = leaveDate;
									if (leaveDate) {
										try {
											const parsed = parse(leaveDate, 'dd-MM-yyyy', new Date());
											leaveDateFormatted = format(parsed, 'yyyy-MM-dd');
										} catch {
											leaveDateFormatted = leaveDate;
										}
									}
									const res = await onSettleStudent({
										studentId: activeRow.student.id,
										leaveDate: leaveDateFormatted,
										persist: true,
									});
									setSettleResult(res);
									setSettleOpen(false);
								} catch (e: any) {
									setSettleError(e?.message || 'Yopishda xatolik');
								}
							}}
						>
							Ketdi qilib yopish
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
				<DialogContent className='max-w-[96vw] sm:max-w-3xl lg:max-w-5xl max-h-[85vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>To‘lovlar tarixi</DialogTitle>
					</DialogHeader>

					{historyError && (
						<Card className='p-3 border border-red-200 bg-red-50'>
							<div className='text-sm text-red-800'>
								<b>Xatolik:</b> {historyError}
							</div>
						</Card>
					)}

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

			<Card className='p-0 overflow-hidden'>
				<div className='w-full overflow-x-auto'>
					<Table className='min-w-[980px]'>
						<TableHeader>
							<TableRow>
								<SortHead label="O'quvchi" col='student' />
								<SortHead label='Guruh' col='group' />
								<SortHead label="Qo'shilgan sana" col='joinDate' />
								<SortHead label='Oylik' col='monthlyAmount' />
								<SortHead label='Muddat / summa' col='dueDate' />
								<SortHead label="To'langan" col='paid' />
								<SortHead label='Qoldiq' col='remain' />
								<SortHead label='Holat' col='status' />
								{!isTeacher && <TableHead className='text-right'>Amallar</TableHead>}
								{isTeacher && <TableHead className='text-right'>Tarix</TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							{ledger.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={isTeacher ? 8 : 9}
										className='text-center py-8 text-muted-foreground'
									>
										O'quvchilar topilmadi
									</TableCell>
								</TableRow>
							) : (
								ledger.map((row) => {
									const mp = row.monthlyPayment;
									const due = mp?.amountDue ?? 0;
									const paid = mp?.amountPaid ?? 0;
									const remain = Math.max(0, Number(due) - Number(paid));
									return (
										<TableRow key={`${row.student.id}-${row.group.id}`}>
											<TableCell className='font-medium'>
												{row.student.firstName} {row.student.lastName}
												<div className='text-xs text-muted-foreground'>
													@{row.student.username}
												</div>
											</TableCell>
											<TableCell>
												<div className='font-medium'>{row.group.name}</div>
												{row.group.subject && (
													<div className='text-xs text-muted-foreground'>
														{row.group.subject.name}
													</div>
												)}
												{row.group.teacher && (
													<div className='text-xs text-muted-foreground'>
														{row.group.teacher.firstName} {row.group.teacher.lastName}
													</div>
												)}
											</TableCell>
											<TableCell>{String(row.profile.joinDate).slice(0, 10)}</TableCell>
											<TableCell>
												{Number(row.profile.monthlyAmount || 0).toLocaleString('uz-UZ')}
											</TableCell>
											<TableCell>
												{mp?.dueDate
													? format(new Date(mp.dueDate), 'dd MMM yyyy', { locale: uz })
													: '-'}
												<div className='text-xs text-muted-foreground'>
													{Number(due).toLocaleString('uz-UZ')} UZS
												</div>
											</TableCell>
											<TableCell>{Number(paid).toLocaleString('uz-UZ')} UZS</TableCell>
											<TableCell
												className={remain > 0 ? 'font-semibold text-red-600' : 'text-green-700'}
											>
												{Number(remain).toLocaleString('uz-UZ')} UZS
											</TableCell>
											<TableCell>
												{statusBadge(mp?.status || (remain > 0 ? 'pending' : 'paid'))}
											</TableCell>
											{!isTeacher && (
												<TableCell className='text-right'>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
																<span className='sr-only'>Amallar</span>
																<MoreHorizontal className='h-4 w-4' />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align='end'>
															<DropdownMenuItem
																disabled={(row.profile.monthlyAmount ?? 0) <= 0}
																onClick={() => openCollect(row)}
															>
																To'lov kiritish
															</DropdownMenuItem>
															<DropdownMenuItem onClick={() => openProfile(row)}>
																Sozlash (join/oylik/kuni)
															</DropdownMenuItem>
															<DropdownMenuItem
																disabled={!row.monthlyPayment}
																onClick={() => openEditMonthly(row)}
															>
																Oylikni tahrirlash
															</DropdownMenuItem>
															<DropdownMenuItem
																disabled={!row.monthlyPayment}
																onClick={() => openHistory(row)}
															>
																Tarix
															</DropdownMenuItem>
															<DropdownMenuItem
																className='text-red-600 focus:text-red-600'
																onClick={() => openSettle(row)}
															>
																Ketdi (hisoblash)
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											)}
											{isTeacher && (
												<TableCell className='text-right'>
													<Button
														variant='ghost'
														size='sm'
														className='h-8 w-8 p-0'
														disabled={!row.monthlyPayment}
														onClick={() => openHistory(row)}
														title='Tarix'
													>
														<span className='sr-only'>Tarix</span>
														<MoreHorizontal className='h-4 w-4' />
													</Button>
												</TableCell>
											)}
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>
			</Card>
		</div>
	);
}
