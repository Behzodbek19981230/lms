import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Controller, useForm } from 'react-hook-form';
import { Checkbox } from '../ui/checkbox';
import { request } from '@/configs/request';
import { useToast } from '@/hooks/use-toast';

interface Props {
	open: boolean;
	setOpen: (open: boolean) => void;
	defaultValues?: {
		id: number;
		name: string;
		description: string;
		category: string;
		hasFormulas: boolean;
	};
}

export const SubjectModal = ({ open, setOpen, defaultValues }: Props) => {
	const { toast } = useToast();
	const { control, handleSubmit } = useForm({
		defaultValues: {
			name: defaultValues?.name || '',
			description: defaultValues?.description || '',
			category: defaultValues?.category || '',
			hasFormulas: defaultValues?.hasFormulas || false,
		},
	});

	const onSubmit = async (data) => {
		try {
			if (defaultValues) {
				await request.put(`/subjects/${defaultValues.id}`, { data });
			} else {
				await request.post('/subjects', { data });
			}
			toast({
				title: defaultValues ? 'Fan tahrirlandi' : "Fan qo'shildi",
				description: defaultValues ? 'Fan muvaffaqiyatli tahrirlandi.' : "Fan muvaffaqiyatli qo'shildi.",
				variant: 'default',
			});
			onClose();
		} catch (error) {
			toast({
				title: "Fan qo'shish muvaffaqiyatsiz",
				description: "Fan qo'shishda xato yuz berdi.",
				variant: 'destructive',
			});
		}
	};

	const onClose = () => setOpen(false);

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>Yangi fan qo'shish</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={handleSubmit(onSubmit)}
					className='space-y-6 max-w-md mx-auto p-6 bg-white rounded-2xl shadow'
				>
					<div>
						<Label htmlFor='name'>Nomi</Label>
						<Controller
							name='name'
							control={control}
							render={({ field }) => <Input id='name' placeholder='Fan nomi' {...field} />}
						/>
					</div>

					<div>
						<Label htmlFor='description'>Tavsif</Label>
						<Controller
							name='description'
							control={control}
							render={({ field }) => <Textarea id='description' placeholder='Fan tavsifi' {...field} />}
						/>
					</div>

					<div>
						<Label>Kategoriya</Label>
						<Controller
							name='category'
							control={control}
							render={({ field }) => (
								<Select onValueChange={field.onChange} defaultValue={field.value}>
									<SelectTrigger>
										<SelectValue placeholder='Kategoriyani tanlang' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='exact_science'>Aniq fanlar</SelectItem>
										<SelectItem value='social_science'>Ijtimoiy fanlar</SelectItem>
										<SelectItem value='other'>Boshqa</SelectItem>
									</SelectContent>
								</Select>
							)}
						/>
					</div>

					<div className='flex items-center space-x-2'>
						<Controller
							name='hasFormulas'
							control={control}
							render={({ field }) => (
								<Checkbox id='hasFormulas' checked={field.value} onCheckedChange={field.onChange} />
							)}
						/>
						<Label htmlFor='hasFormulas'>Formulalar mavjudmi</Label>
					</div>

					<Button type='submit' className='w-full'>
						Saqlash
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
};
