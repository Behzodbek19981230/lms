import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { CreatePaymentDto } from '../../types/payment';
import { groupService } from '../../services/group.service';
import { Group } from '../../types/group';
import { User } from '../../types/user';

interface CreatePaymentFormProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (paymentData: CreatePaymentDto) => Promise<void>;
	selectedGroup?: Group;
}

interface Student extends User {
	groups: Group[];
}

const CreatePaymentForm: React.FC<CreatePaymentFormProps> = ({ open, onClose, onSubmit, selectedGroup }) => {
	const [formData, setFormData] = useState<CreatePaymentDto>({
		amount: 0,
		dueDate: '',
		description: '',
		studentId: '',
		groupId: selectedGroup?.id || '',
	});
	const [groups, setGroups] = useState<Group[]>([]);
	const [students, setStudents] = useState<Student[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingStudents, setLoadingStudents] = useState(false);

	useEffect(() => {
		if (open) {
			fetchGroups();
			if (selectedGroup) {
				setFormData((prev) => ({ ...prev, groupId: selectedGroup.id }));
				fetchGroupStudents(selectedGroup.id);
			}
		}
	}, [open, selectedGroup]);

	useEffect(() => {
		if (formData.groupId) {
			fetchGroupStudents(String(formData.groupId));
		}
	}, [formData.groupId]);

	const fetchGroups = async () => {
		try {
            const response = await groupService.getMyGroups();
            if (response.success && response.data) {
                setGroups(response.data);
            } else {
                setGroups([]);
            }
		} catch (error) {
			console.error('Error fetching groups:', error);
		}
	};

	const fetchGroupStudents = async (groupId: string) => {
		setLoadingStudents(true);
		try {
            const response = await groupService.getGroupStudents(groupId);
            if (response.success && response.data) {
                setStudents(response.data as any);
            } else {
                setStudents([]);
            }
		} catch (error) {
			console.error('Error fetching group students:', error);
			setStudents([]);
		} finally {
			setLoadingStudents(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			const paymentData = {
				...formData,
				studentId: formData.studentId ? Number(formData.studentId) : undefined,
				groupId: Number(formData.groupId),
			};
			await onSubmit(paymentData as any);
			setFormData({
				amount: 0,
				dueDate: '',
				description: '',
				studentId: '',
				groupId: selectedGroup?.id || '',
			});
			onClose();
		} catch (error) {
			console.error('Error creating payment:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleCreateForAllStudents = async () => {
		if (!formData.groupId || formData.amount <= 0 || !formData.dueDate || !formData.description) {
			alert("Iltimos, barcha maydonlarni to'ldiring");
			return;
		}

		setLoading(true);
		try {
			for (const student of students) {
				const paymentData = {
					...formData,
					studentId: Number(student.id),
					groupId: Number(formData.groupId),
				};
				await onSubmit(paymentData as any);
			}
			setFormData({
				amount: 0,
				dueDate: '',
				description: '',
				studentId: '',
				groupId: selectedGroup?.id || '',
			});
			onClose();
		} catch (error) {
			console.error('Error creating payments for all students:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose} modal>
			<DialogContent className='sm:max-w-4xl w-full max-h-[95vh] overflow-y-auto p-8' style={{ zIndex: 51 }}>
				<DialogHeader>
					<DialogTitle className='text-2xl font-semibold'>Yangi to'lov yaratish</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className='space-y-6'>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
						<div>
							<Label htmlFor='group' className='text-sm font-medium'>
								Guruh
							</Label>
							<select
								id='group'
								value={formData.groupId}
								onChange={(e) => setFormData({ ...formData, groupId: e.target.value, studentId: '' })}
								disabled={!!selectedGroup}
								className='flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
							>
								<option value=''>Guruhni tanlang</option>
								{groups.map((group) => (
									<option key={group.id} value={group.id}>
										{group.name}
									</option>
								))}
							</select>
						</div>

						<div>
							<Label htmlFor='student' className='text-sm font-medium'>
								O'quvchi (ixtiyoriy)
							</Label>
							<p className='text-xs text-muted-foreground mb-2'>
								Barcha o'quvchilar uchun yaratish uchun bo'sh qoldiring
							</p>
							<select
								id='student'
								value={formData.studentId}
								onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
								disabled={loadingStudents || !formData.groupId}
								className='flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
							>
								<option value=''>{loadingStudents ? 'Yuklanmoqda...' : "O'quvchini tanlang"}</option>
								{students.map((student) => (
									<option key={student.id} value={student.id}>
										{student.firstName} {student.lastName}
									</option>
								))}
							</select>
						</div>

						<div>
							<Label htmlFor='amount' className='text-sm font-medium'>
								Miqdor (UZS)
							</Label>
							<Input
								id='amount'
								type='number'
								value={formData.amount}
								onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
								required
								min='0'
								step='1000'
								className='h-11'
								placeholder='100000'
							/>
						</div>

						<div>
							<Label htmlFor='dueDate' className='text-sm font-medium'>
								To'lov muddati
							</Label>
							<Input
								id='dueDate'
								type='date'
								value={formData.dueDate}
								onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
								required
								className='h-11'
							/>
						</div>
					</div>

					<div>
						<Label htmlFor='description' className='text-sm font-medium'>
							Tavsif
						</Label>
						<Textarea
							id='description'
							value={formData.description}
							onChange={(e) => setFormData({ ...formData, description: e.target.value })}
							required
							placeholder="Masalan: Oktyabr oyi uchun to'lov, Kurs to'lovi, Kitob to'lovi"
							rows={3}
							className='resize-none'
						/>
					</div>

					<DialogFooter className='flex flex-col sm:flex-row gap-3 pt-6 border-t'>
						<Button type='button' variant='outline' onClick={onClose} className='h-11'>
							Bekor qilish
						</Button>
						{!formData.studentId && formData.groupId && students.length > 0 && (
							<Button
								type='button'
								onClick={handleCreateForAllStudents}
								disabled={loading}
								variant='secondary'
								className='h-11 flex-1'
							>
								Barcha o'quvchilar uchun yaratish ({students.length})
							</Button>
						)}
						<Button type='submit' disabled={loading} className='h-11 min-w-[120px]'>
							{loading ? 'Saqlanmoqda...' : 'Saqlash'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default CreatePaymentForm;
