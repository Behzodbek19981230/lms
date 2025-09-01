import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, CreditCard, User, Loader2 } from 'lucide-react';
import { 
  Payment, 
  CreatePaymentDto, 
  UpdatePaymentDto, 
  PaymentType,
  PaymentStatus 
} from '@/types/payment';
import { PaymentService } from '@/services/payment.service';

// Form validation schema
const paymentSchema = z.object({
  studentId: z.number().min(1, 'Student tanlash majburiy'),
  teacherId: z.number().min(1, 'O\'qituvchi tanlash majburiy'),
  groupId: z.number().min(1, 'Guruh tanlash majburiy'),
  amount: z.number().min(0.01, 'Summa 0 dan katta bo\'lishi kerak'),
  currency: z.string().min(1, 'Valyuta majburiy'),
  type: z.nativeEnum(PaymentType, { required_error: 'To\'lov turini tanlang' }),
  description: z.string().optional(),
  dueDate: z.string().min(1, 'Muddat majburiy'),
});

type FormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: Payment | null;
  onSubmit: (data: CreatePaymentDto | UpdatePaymentDto) => Promise<void>;
  students?: Array<{ id: number; firstName: string; lastName: string; email: string }>;
  teachers?: Array<{ id: number; firstName: string; lastName: string; email: string }>;
  groups?: Array<{ id: number; name: string; center?: { name: string } }>;
  loading?: boolean;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  open,
  onOpenChange,
  payment,
  onSubmit,
  students = [],
  teachers = [],
  groups = [],
  loading = false
}) => {
  const isEditing = !!payment;
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      currency: 'UZS',
      type: PaymentType.MONTHLY_FEE
    }
  });

  const watchedStudentId = watch('studentId');
  const watchedTeacherId = watch('teacherId');
  const watchedGroupId = watch('groupId');

  // Update selected entities when IDs change
  useEffect(() => {
    if (watchedStudentId) {
      const student = students.find(s => s.id === watchedStudentId);
      setSelectedStudent(student);
    }
  }, [watchedStudentId, students]);

  useEffect(() => {
    if (watchedTeacherId) {
      const teacher = teachers.find(t => t.id === watchedTeacherId);
      setSelectedTeacher(teacher);
    }
  }, [watchedTeacherId, teachers]);

  useEffect(() => {
    if (watchedGroupId) {
      const group = groups.find(g => g.id === watchedGroupId);
      setSelectedGroup(group);
    }
  }, [watchedGroupId, groups]);

  // Initialize form with payment data when editing
  useEffect(() => {
    if (payment && isEditing) {
      setValue('studentId', payment.student.id);
      setValue('teacherId', payment.teacher.id);
      setValue('groupId', payment.group.id);
      setValue('amount', payment.amount);
      setValue('currency', payment.currency);
      setValue('type', payment.type);
      setValue('description', payment.description || '');
      setValue('dueDate', payment.dueDate.split('T')[0]); // Format for date input
      
      setSelectedStudent(payment.student);
      setSelectedTeacher(payment.teacher);
      setSelectedGroup(payment.group);
    } else {
      reset({
        currency: 'UZS',
        type: PaymentType.MONTHLY_FEE
      });
      setSelectedStudent(null);
      setSelectedTeacher(null);
      setSelectedGroup(null);
    }
  }, [payment, isEditing, setValue, reset]);

  const onFormSubmit = async (data: FormData) => {
    try {
      await onSubmit(data);
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const getDefaultDueDate = () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'To\'lovni tahrirlash' : 'Yangi to\'lov yaratish'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Student Selection */}
          <div className="space-y-2">
            <Label htmlFor="studentId">Student *</Label>
            <Select
              value={watchedStudentId?.toString()}
              onValueChange={(value) => setValue('studentId', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Student tanlang" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id.toString()}>
                    {student.firstName} {student.lastName} ({student.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.studentId && (
              <p className="text-sm text-red-600">{errors.studentId.message}</p>
            )}
            
            {/* Selected Student Preview */}
            {selectedStudent && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {selectedStudent.firstName?.[0]}{selectedStudent.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </p>
                      <p className="text-xs text-gray-600">{selectedStudent.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Teacher Selection */}
          <div className="space-y-2">
            <Label htmlFor="teacherId">O'qituvchi *</Label>
            <Select
              value={watchedTeacherId?.toString()}
              onValueChange={(value) => setValue('teacherId', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="O'qituvchi tanlang" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id.toString()}>
                    {teacher.firstName} {teacher.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.teacherId && (
              <p className="text-sm text-red-600">{errors.teacherId.message}</p>
            )}

            {/* Selected Teacher Preview */}
            {selectedTeacher && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <User className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">
                        {selectedTeacher.firstName} {selectedTeacher.lastName}
                      </p>
                      <p className="text-xs text-gray-600">{selectedTeacher.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Group Selection */}
          <div className="space-y-2">
            <Label htmlFor="groupId">Guruh *</Label>
            <Select
              value={watchedGroupId?.toString()}
              onValueChange={(value) => setValue('groupId', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Guruh tanlang" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    {group.name} 
                    {group.center && ` - ${group.center.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.groupId && (
              <p className="text-sm text-red-600">{errors.groupId.message}</p>
            )}

            {/* Selected Group Preview */}
            {selectedGroup && (
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-6 w-6 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">
                      G
                    </div>
                    <div>
                      <p className="font-medium text-sm">{selectedGroup.name}</p>
                      {selectedGroup.center && (
                        <p className="text-xs text-gray-600">{selectedGroup.center.name}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Summa *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">Valyuta *</Label>
              <Select
                value={watch('currency')}
                onValueChange={(value) => setValue('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Valyuta tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UZS">UZS - O'zbek so'm</SelectItem>
                  <SelectItem value="USD">USD - Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Evro</SelectItem>
                </SelectContent>
              </Select>
              {errors.currency && (
                <p className="text-sm text-red-600">{errors.currency.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Type */}
            <div className="space-y-2">
              <Label htmlFor="type">To'lov turi *</Label>
              <Select
                value={watch('type')}
                onValueChange={(value) => setValue('type', value as PaymentType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tur tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentType.MONTHLY_FEE}>
                    Oylik to'lov
                  </SelectItem>
                  <SelectItem value={PaymentType.REGISTRATION_FEE}>
                    Ro'yxatdan o'tish to'lovi
                  </SelectItem>
                  <SelectItem value={PaymentType.EXAM_FEE}>
                    Imtihon to'lovi
                  </SelectItem>
                  <SelectItem value={PaymentType.MATERIAL_FEE}>
                    Material to'lovi
                  </SelectItem>
                  <SelectItem value={PaymentType.OTHER}>
                    Boshqa
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Muddat *</Label>
              <Input
                id="dueDate"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                {...register('dueDate')}
              />
              {errors.dueDate && (
                <p className="text-sm text-red-600">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Izoh</Label>
            <Textarea
              id="description"
              placeholder="To'lov haqida qo'shimcha ma'lumot..."
              rows={3}
              {...register('description')}
            />
          </div>

          {/* Payment Preview */}
          {watch('amount') && watch('currency') && (
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  To'lov ko'rinishi
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Summa:</span>
                    <span className="font-semibold">
                      {PaymentService.formatCurrency(watch('amount') || 0, watch('currency'))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tur:</span>
                    <span>{PaymentService.getPaymentTypeLabel(watch('type'))}</span>
                  </div>
                  {selectedStudent && (
                    <div className="flex justify-between">
                      <span>Student:</span>
                      <span>{selectedStudent.firstName} {selectedStudent.lastName}</span>
                    </div>
                  )}
                  {selectedGroup && (
                    <div className="flex justify-between">
                      <span>Guruh:</span>
                      <span>{selectedGroup.name}</span>
                    </div>
                  )}
                  {watch('dueDate') && (
                    <div className="flex justify-between">
                      <span>Muddat:</span>
                      <span>
                        {new Date(watch('dueDate')).toLocaleDateString('uz-UZ')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Bekor qilish
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || loading}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? 'Saqlanmoqda...' : 'Yaratilmoqda...'}
                </>
              ) : (
                isEditing ? 'Saqlash' : 'Yaratish'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Simplified version for quick payment creation
export const QuickPaymentForm: React.FC<{
  studentId?: number;
  teacherId?: number;
  groupId?: number;
  onSubmit: (data: CreatePaymentDto) => Promise<void>;
  className?: string;
}> = ({ studentId, teacherId, groupId, onSubmit, className = '' }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<PaymentType>(PaymentType.MONTHLY_FEE);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Set default due date to next month
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setDueDate(nextMonth.toISOString().split('T')[0]);
  }, []);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentId || !teacherId || !groupId || !amount || !dueDate) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        studentId,
        teacherId,
        groupId,
        amount: parseFloat(amount),
        currency: 'UZS',
        type,
        dueDate
      });
      
      // Reset form
      setAmount('');
      setType(PaymentType.MONTHLY_FEE);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setDueDate(nextMonth.toISOString().split('T')[0]);
    } catch (error) {
      console.error('Quick payment creation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <form onSubmit={handleQuickSubmit} className="space-y-4">
          <h4 className="font-medium">Tez to'lov yaratish</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Input
                type="number"
                placeholder="Summa"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            
            <div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentType.MONTHLY_FEE}>Oylik</SelectItem>
                  <SelectItem value={PaymentType.EXAM_FEE}>Imtihon</SelectItem>
                  <SelectItem value={PaymentType.MATERIAL_FEE}>Material</SelectItem>
                  <SelectItem value={PaymentType.OTHER}>Boshqa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            size="sm" 
            disabled={loading || !amount || !dueDate}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Yaratilmoqda...
              </>
            ) : (
              'To\'lov yaratish'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
