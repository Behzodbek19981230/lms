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
import { useAuth } from '@/contexts/AuthContext';

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
    onSuccess?: () => void;
}

export const SubjectModal = ({ open, setOpen, defaultValues, onSuccess }: Props) => {
    const { toast } = useToast();
    const { user } = useAuth();
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
            const payload = { ...data, centerId: user?.center?.id };
            if (defaultValues && defaultValues.id) {
                await request.put(`/subjects/${defaultValues.id}`, payload);
            } else {
                await request.post('/subjects', payload);
            }
            toast({
                title: (defaultValues && defaultValues.id) ? 'Fan tahrirlandi' : "Fan qo'shildi",
                description: (defaultValues && defaultValues.id) ? 'Fan muvaffaqiyatli tahrirlandi.' : "Fan muvaffaqiyatli qo'shildi.",
                variant: 'default',
            });
            onClose();
            onSuccess?.();
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

                <form onSubmit={handleSubmit(onSubmit)} className='grid gap-4 py-4'>
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
