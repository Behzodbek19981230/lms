import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';

interface DeleteDialogProps {
	open: boolean;
	setOpen: (open: boolean) => void;
	id?: string;
	name?: string;
}

export const DeleteSubjectDialog = ({ open, setOpen, id, name }: DeleteDialogProps) => {
	const { toast } = useToast();

	const onClose = () => setOpen(false);

	const onDelete = async () => {
		try {
			await request.delete(`/subjects/${id}`);
			toast({
				title: 'Fan o‘chirildi',
				description: `${name} muvaffaqiyatli o‘chirildi`,
				variant: 'default',
			});
			onClose();
		} catch (error) {
			toast({
				title: 'Xatolik',
				description: 'Fan o‘chirishda xatolik yuz berdi',
				variant: 'destructive',
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className='max-w-md'>
				<DialogHeader>
					<DialogTitle>Haqiqatan ham o‘chirmoqchimisiz?</DialogTitle>
				</DialogHeader>

				<p className='text-sm text-gray-500'>{name} fani o‘chirilganda qaytarib bo‘lmaydi.</p>

				<DialogFooter className='flex justify-end gap-2 pt-4'>
					<Button variant='outline' onClick={onClose}>
						Bekor qilish
					</Button>
					<Button variant='destructive' onClick={onDelete}>
						O‘chirish
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
