import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

import PaymentTable from '../../components/payments/PaymentTable';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { paymentService } from '../../services/payment.service';
import { Payment, PaymentStatus } from '../../types/payment';

const StudentPayments: React.FC = () => {
	const [payments, setPayments] = useState<Payment[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [searchTerm, setSearchTerm] = useState<string>('');
	const [statusFilter, setStatusFilter] = useState<string>('all');

	useEffect(() => {
		void fetchData();
	}, []);

	const fetchData = async () => {
		setLoading(true);
		try {
			const res = await paymentService.getStudentPayments();
			setPayments(res.success && res.data ? res.data : []);
		} catch (error) {
			console.error('Error fetching student payments:', error);
			toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
			setPayments([]);
		} finally {
			setLoading(false);
		}
	};

	const filteredPayments = useMemo(() => {
		let filtered = [...payments];

		if (searchTerm.trim()) {
			const q = searchTerm.trim().toLowerCase();
			filtered = filtered.filter((p) => {
				const groupName = (p.group?.name || '').toLowerCase();
				const desc = (p.description || '').toLowerCase();
				return groupName.includes(q) || desc.includes(q);
			});
		}

		if (statusFilter !== 'all') {
			filtered = filtered.filter((p) => p.status === statusFilter);
		}

		return filtered;
	}, [payments, searchTerm, statusFilter]);

	return (
		<div className='container mx-auto py-6 space-y-4'>
			<div className='flex items-center justify-between gap-3'>
				<h1 className='text-3xl font-bold'>Mening to'lovlarim</h1>
			</div>

			<div className='flex flex-col md:flex-row gap-3'>
				<div className='relative flex-1'>
					<Search className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
					<Input
						placeholder="Guruh yoki tavsif bo'yicha qidirish..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className='pl-10'
					/>
				</div>

				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className='w-full md:w-56'>
						<SelectValue placeholder="Holat bo'yicha" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='all'>Barchasi</SelectItem>
						<SelectItem value={PaymentStatus.PENDING}>Kutilmoqda</SelectItem>
						<SelectItem value={PaymentStatus.OVERDUE}>Kechikkan</SelectItem>
						<SelectItem value={PaymentStatus.PAID}>To'langan</SelectItem>
						<SelectItem value={PaymentStatus.CANCELLED}>Bekor qilingan</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<PaymentTable
				payments={filteredPayments}
				onMarkPaid={() => {}}
				onSendReminder={() => {}}
				showActions={false}
				role='student'
			/>

			{loading ? <div className='text-center py-4 text-muted-foreground'>Yuklanmoqda...</div> : null}
		</div>
	);
};

export default StudentPayments;
