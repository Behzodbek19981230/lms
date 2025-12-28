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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import { MoreHorizontal } from 'lucide-react';

type Props = {
	month: string; // YYYY-MM
	ledger: BillingLedgerItem[];
	onSaveProfile: (studentId: number, data: { joinDate?: string; monthlyAmount?: number; dueDay?: number }) => Promise<void>;
	onCollect: (data: { studentId: number; month: string; amount: number; note?: string; amountDueOverride?: number }) => Promise<void>;
	onUpdateMonthly: (monthlyPaymentId: number, data: { amountDue?: number; dueDate?: string; note?: string }) => Promise<void>;
	onSettleStudent: (data: { studentId: number; leaveDate: string; persist: boolean }) => Promise<StudentSettlementResult>;
	onGetHistory: (monthlyPaymentId: number) => Promise<MonthlyPaymentTransaction[]>;
};

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

export default function MonthlyBillingTable({ month, ledger, onSaveProfile, onCollect, onUpdateMonthly, onSettleStudent, onGetHistory }: Props) {
	const [profileOpen, setProfileOpen] = useState(false);
	const [collectOpen, setCollectOpen] = useState(false);
	const [editMonthlyOpen, setEditMonthlyOpen] = useState(false);
	const [settleOpen, setSettleOpen] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);

	const [activeStudentId, setActiveStudentId] = useState<number | null>(null);
	const activeRow = useMemo(
		() => (activeStudentId ? ledger.find((x) => x.student.id === activeStudentId) || null : null),
		[activeStudentId, ledger]
	);

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
	const [leaveDate, setLeaveDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [settleResult, setSettleResult] = useState<StudentSettlementResult | null>(null);
	const [settleError, setSettleError] = useState<string | null>(null);

	// History
	const [history, setHistory] = useState<MonthlyPaymentTransaction[]>([]);
	const [historyError, setHistoryError] = useState<string | null>(null);

	const openProfile = (row: BillingLedgerItem) => {
		setActiveStudentId(row.student.id);
		setJoinDate(String(row.profile.joinDate).slice(0, 10));
		setMonthlyAmount(String(row.profile.monthlyAmount ?? 0));
		setDueDay(String(row.profile.dueDay ?? 1));
		setProfileOpen(true);
	};

	const openCollect = (row: BillingLedgerItem) => {
		setActiveStudentId(row.student.id);
		setCollectMonth(month);
		setCollectAmount('');
		setCollectNote('');
		setAmountDueOverride('');
		setCollectOpen(true);
	};

	const openEditMonthly = (row: BillingLedgerItem) => {
		if (!row.monthlyPayment) return;
		setActiveStudentId(row.student.id);
		setEditDueDate(String(row.monthlyPayment.dueDate).slice(0, 10));
		setEditAmountDue(String(row.monthlyPayment.amountDue ?? 0));
		setEditNote(row.monthlyPayment.note || '');
		setEditMonthlyOpen(true);
	};

	const openSettle = (row: BillingLedgerItem) => {
		setActiveStudentId(row.student.id);
		setLeaveDate(new Date().toISOString().slice(0, 10));
		setSettleResult(null);
		setSettleError(null);
		setSettleOpen(true);
	};

	const openHistory = async (row: BillingLedgerItem) => {
		if (!row.monthlyPayment) return;
		setActiveStudentId(row.student.id);
		setHistoryError(null);
		setHistory([]);
		setHistoryOpen(true);
		try {
			const data = await onGetHistory(row.monthlyPayment.id);
			setHistory(data);
		} catch (e: any) {
			setHistoryError(e?.message || "Tarixni yuklashda xatolik");
		}
	};

	return (
		<div className='space-y-3'>
			<Card className='p-3'>
				<div className='text-sm text-muted-foreground'>
					Oy: <span className='font-medium text-foreground'>{month}</span>. Bu jadval o‘quvchilar bo‘yicha oylik to‘lov
					holatini ko‘rsatadi (joinDate default: student yaratilgan sana).
				</div>
			</Card>

			<Dialog open={profileOpen} onOpenChange={setProfileOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>O‘quvchi to‘lov sozlamalari</DialogTitle>
					</DialogHeader>
					<div className='grid grid-cols-1 gap-4'>
						<div>
							<Label>Qo‘shilgan sana (joinDate)</Label>
							<Input type='date' value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />
						</div>
						<div>
							<Label>Oylik summa (UZS)</Label>
							<Input inputMode='numeric' value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} />
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
								if (!activeStudentId) return;
								await onSaveProfile(activeStudentId, {
									joinDate: joinDate || undefined,
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
									<b>Diqqat:</b> Oylik summa kiritilmagan. Avval “Sozlash” bo‘limida oylik summani belgilang.
								</div>
							</Card>
						)}
						<div>
							<Label>Oy (YYYY-MM)</Label>
							<Input value={collectMonth} onChange={(e) => setCollectMonth(e.target.value)} placeholder='2025-12' />
						</div>
						<div>
							<Label>To‘langan summa (UZS)</Label>
							<Input inputMode='numeric' value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)} />
						</div>
						<div>
							<Label>Izoh (ixtiyoriy)</Label>
							<Input value={collectNote} onChange={(e) => setCollectNote(e.target.value)} placeholder='Dekabr uchun qisman' />
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
								Agar tanlangan oy uchun oylik yozuvi hali yaratilmagan bo‘lsa, shu summa bilan yaratiladi (qisman oylar uchun qulay).
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
								if (!activeStudentId) return;
								await onCollect({
									studentId: activeStudentId,
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
							<Label>To‘lov sanasi</Label>
							<Input type='date' value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
						</div>
						<div>
							<Label>Shu oy uchun summa (UZS)</Label>
							<Input inputMode='numeric' value={editAmountDue} onChange={(e) => setEditAmountDue(e.target.value)} />
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
								await onUpdateMonthly(activeRow.monthlyPayment.id, {
									dueDate: editDueDate || undefined,
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
							<Input type='date' value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} />
							<p className='text-xs text-muted-foreground mt-1'>
								Tizim joinDate va oylik summaga qarab shu sanagacha bo‘lgan qarzdorlikni kunlar bo‘yicha hisoblaydi.
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
										<b>Jami hisoblandi:</b> {Number(settleResult.summary.totalDue).toLocaleString('uz-UZ')} UZS
										{'  '}|{' '}
										<b>To‘langan:</b> {Number(settleResult.summary.totalPaid).toLocaleString('uz-UZ')} UZS
										{'  '}|{' '}
										<b>Qolgan qarz:</b> {Number(settleResult.summary.totalRemaining).toLocaleString('uz-UZ')} UZS
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
													<TableCell className='font-medium'>{m.billingMonth.slice(0, 7)}</TableCell>
													<TableCell>
														{m.activeFrom} → {m.activeTo}
													</TableCell>
													<TableCell>
														{m.activeDays}/{m.daysInMonth}
													</TableCell>
													<TableCell>{Number(m.amountDue).toLocaleString('uz-UZ')} UZS</TableCell>
													<TableCell>{Number(m.amountPaid).toLocaleString('uz-UZ')} UZS</TableCell>
													<TableCell className={m.remaining > 0 ? 'font-semibold text-red-600' : 'text-green-700'}>
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
								if (!activeStudentId) return;
								try {
									setSettleError(null);
									const res = await onSettleStudent({ studentId: activeStudentId, leaveDate, persist: false });
									setSettleResult(res);
								} catch (e: any) {
									setSettleResult(null);
									setSettleError(e?.message || "Hisoblashda xatolik");
								}
							}}
						>
							Hisoblab ko‘rish
						</Button>
						<Button
							onClick={async () => {
								if (!activeStudentId) return;
								try {
									setSettleError(null);
									const res = await onSettleStudent({ studentId: activeStudentId, leaveDate, persist: true });
									setSettleResult(res);
									setSettleOpen(false);
								} catch (e: any) {
									setSettleError(e?.message || "Yopishda xatolik");
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
											<TableCell>
												{new Date(t.paidAt).toLocaleString('uz-UZ')}
											</TableCell>
											<TableCell className='font-medium'>
												{Number(t.amount).toLocaleString('uz-UZ')} UZS
											</TableCell>
											<TableCell className='max-w-[420px] truncate'>
												{t.note || '—'}
											</TableCell>
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
							<TableHead>O‘quvchi</TableHead>
							<TableHead>Qo‘shilgan sana</TableHead>
							<TableHead>Oylik</TableHead>
							<TableHead>Muddat / summa</TableHead>
							<TableHead>To‘langan</TableHead>
							<TableHead>Qoldiq</TableHead>
							<TableHead>Holat</TableHead>
							<TableHead className='text-right'>Amallar</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{ledger.length === 0 ? (
							<TableRow>
								<TableCell colSpan={8} className='text-center py-8 text-muted-foreground'>
									O‘quvchilar topilmadi
								</TableCell>
							</TableRow>
						) : (
							ledger.map((row) => {
								const mp = row.monthlyPayment;
								const due = mp?.amountDue ?? 0;
								const paid = mp?.amountPaid ?? 0;
								const remain = Math.max(0, Number(due) - Number(paid));
								return (
									<TableRow key={row.student.id}>
										<TableCell className='font-medium'>
											{row.student.firstName} {row.student.lastName}
											<div className='text-xs text-muted-foreground'>@{row.student.username}</div>
										</TableCell>
										<TableCell>{String(row.profile.joinDate).slice(0, 10)}</TableCell>
										<TableCell>{Number(row.profile.monthlyAmount || 0).toLocaleString('uz-UZ')}</TableCell>
										<TableCell>
											{mp?.dueDate ? format(new Date(mp.dueDate), 'dd MMM yyyy', { locale: uz }) : '-'}
											<div className='text-xs text-muted-foreground'>
												{Number(due).toLocaleString('uz-UZ')} UZS
											</div>
										</TableCell>
										<TableCell>{Number(paid).toLocaleString('uz-UZ')} UZS</TableCell>
										<TableCell className={remain > 0 ? 'font-semibold text-red-600' : 'text-green-700'}>
											{Number(remain).toLocaleString('uz-UZ')} UZS
										</TableCell>
										<TableCell>{statusBadge(mp?.status || (remain > 0 ? 'pending' : 'paid'))}</TableCell>
										<TableCell className='text-right'>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
														<span className='sr-only'>Amallar</span>
														<MoreHorizontal className='h-4 w-4' />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align='end'>
													<DropdownMenuItem disabled={(row.profile.monthlyAmount ?? 0) <= 0} onClick={() => openCollect(row)}>
														To‘lov kiritish
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
