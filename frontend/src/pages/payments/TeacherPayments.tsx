import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CreditCard,
  Plus,
  Bell,
  BarChart3,
  Users,
  Calendar,
  AlertTriangle,
  Clock
} from 'lucide-react';

import PaymentList from '@/components/payments/PaymentList';
import PaymentForm from '@/components/payments/PaymentForm';
import { 
  PaymentStatsOverview, 
  PaymentTypeChart, 
  MonthlyTrendChart 
} from '@/components/payments/PaymentStats';
import { PaymentService } from '@/services/payment.service';
import { 
  Payment, 
  PaymentStats, 
  CreatePaymentDto, 
  UpdatePaymentDto,
  StudentPaymentSummary 
} from '@/types/payment';

export const TeacherPayments: React.FC = () => {
  const { toast } = useToast();
  
  // State management
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [studentSummaries, setStudentSummaries] = useState<StudentPaymentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  
  // Dialog state
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; payment: Payment | null }>({
    open: false,
    payment: null
  });
  const [reminderDialog, setReminderDialog] = useState<{ open: boolean; payment: Payment | null }>({
    open: false,
    payment: null
  });

  // Mock data - these would come from API calls
  const [students] = useState([
    { id: 1, firstName: 'Ali', lastName: 'Valiyev', email: 'ali@example.com' },
    { id: 2, firstName: 'Malika', lastName: 'Karimova', email: 'malika@example.com' },
    { id: 3, firstName: 'Bobur', lastName: 'Rahimov', email: 'bobur@example.com' }
  ]);
  
  const [teachers] = useState([
    { id: 1, firstName: 'Nodira', lastName: 'Toshmatova', email: 'nodira@example.com' }
  ]);
  
  const [groups] = useState([
    { id: 1, name: 'Beginner A1', center: { id: 1, name: 'Navoiy filiali' } },
    { id: 2, name: 'Intermediate B1', center: { id: 1, name: 'Navoiy filiali' } },
    { id: 3, name: 'Advanced C1', center: { id: 1, name: 'Navoiy filiali' } }
  ]);

  // Load initial data
  useEffect(() => {
    loadPayments();
    loadStats();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const response = await PaymentService.getTeacherPayments();
      setPayments(response.payments);
    } catch (error) {
      console.error('Failed to load payments:', error);
      toast({
        title: "Xatolik",
        description: "To'lovlarni yuklashda xatolik yuz berdi",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const [statsData, dashboardData] = await Promise.all([
        PaymentService.getTeacherPaymentStats(),
        PaymentService.getTeacherDashboardData()
      ]);
      setStats(statsData);
      setStudentSummaries(dashboardData.studentSummaries);
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast({
        title: "Xatolik",
        description: "Statistikalarni yuklashda xatolik yuz berdi",
        variant: "destructive"
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const loadGroupSummary = async (groupId: number) => {
    try {
      const summaries = await PaymentService.getGroupPaymentSummary(groupId);
      setStudentSummaries(summaries);
    } catch (error) {
      console.error('Failed to load group summary:', error);
      toast({
        title: "Xatolik",
        description: "Guruh ma'lumotlarini yuklashda xatolik",
        variant: "destructive"
      });
    }
  };

  // CRUD Operations
  const handleCreatePayment = async (data: CreatePaymentDto) => {
    try {
      await PaymentService.createPayment(data);
      toast({
        title: "Muvaffaqiyat",
        description: "To'lov muvaffaqiyatli yaratildi"
      });
      loadPayments();
      loadStats();
    } catch (error) {
      console.error('Failed to create payment:', error);
      toast({
        title: "Xatolik",
        description: "To'lov yaratishda xatolik yuz berdi",
        variant: "destructive"
      });
    }
  };

  const handleUpdatePayment = async (data: UpdatePaymentDto) => {
    if (!editingPayment) return;
    
    try {
      await PaymentService.updatePayment(editingPayment.id, data);
      toast({
        title: "Muvaffaqiyat",
        description: "To'lov muvaffaqiyatli yangilandi"
      });
      loadPayments();
      loadStats();
      setEditingPayment(null);
    } catch (error) {
      console.error('Failed to update payment:', error);
      toast({
        title: "Xatolik",
        description: "To'lovni yangilashda xatolik yuz berdi",
        variant: "destructive"
      });
    }
  };

  const handleMarkAsPaid = async (payment: Payment) => {
    try {
      await PaymentService.markPaymentAsPaid(payment.id);
      toast({
        title: "Muvaffaqiyat",
        description: `${payment.student.firstName}ning to'lovi belgilandi`
      });
      loadPayments();
      loadStats();
    } catch (error) {
      console.error('Failed to mark payment as paid:', error);
      toast({
        title: "Xatolik",
        description: "To'lovni belgilashda xatolik yuz berdi",
        variant: "destructive"
      });
    }
  };

  const handleSendReminder = async (payment: Payment) => {
    try {
      await PaymentService.sendPaymentReminder(payment.id);
      toast({
        title: "Muvaffaqiyat",
        description: `${payment.student.firstName}ga eslatma yuborildi`
      });
      setReminderDialog({ open: false, payment: null });
      loadPayments();
    } catch (error) {
      console.error('Failed to send reminder:', error);
      toast({
        title: "Xatolik",
        description: "Eslatma yuborishda xatolik yuz berdi",
        variant: "destructive"
      });
    }
  };

  const handleDeletePayment = async () => {
    if (!deleteDialog.payment) return;
    
    try {
      await PaymentService.deletePayment(deleteDialog.payment.id);
      toast({
        title: "Muvaffaqiyat",
        description: "To'lov muvaffaqiyatli o'chirildi"
      });
      setDeleteDialog({ open: false, payment: null });
      loadPayments();
      loadStats();
    } catch (error) {
      console.error('Failed to delete payment:', error);
      toast({
        title: "Xatolik",
        description: "To'lovni o'chirishda xatolik yuz berdi",
        variant: "destructive"
      });
    }
  };

  const handleSendGroupReminders = async (groupId: number) => {
    try {
      const result = await PaymentService.sendGroupPaymentReminders(groupId);
      toast({
        title: "Muvaffaqiyat",
        description: `${result.sent} ta eslatma yuborildi, ${result.failed} ta xatolik`
      });
    } catch (error) {
      console.error('Failed to send group reminders:', error);
      toast({
        title: "Xatolik",
        description: "Guruh eslatmalarini yuborishda xatolik",
        variant: "destructive"
      });
    }
  };

  const overduePayments = payments.filter(p => 
    p.status === 'pending' && PaymentService.isPaymentOverdue(p.dueDate)
  );
  const upcomingPayments = payments.filter(p => 
    p.status === 'pending' && PaymentService.isPaymentDueSoon(p.dueDate, 7)
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">To'lovlar boshqaruvi</h1>
          <p className="text-gray-600">O'quvchilar to'lovlarini boshqaring va kuzating</p>
        </div>
        <Button onClick={() => setShowPaymentForm(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Yangi to'lov</span>
        </Button>
      </div>

      {/* Alert for overdue payments */}
      {overduePayments.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{overduePayments.length} ta to'lov muddati o'tgan!</strong>
            {' '}Studentlarga eslatma yuborish tavsiya etiladi.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Umumiy ko'rinish</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>To'lovlar</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Studentlar</span>
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Eslatmalar</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {stats && (
            <>
              <PaymentStatsOverview stats={stats} loading={statsLoading} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PaymentTypeChart stats={stats} loading={statsLoading} />
                <MonthlyTrendChart stats={stats} loading={statsLoading} />
              </div>
            </>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <PaymentList
            payments={payments}
            loading={loading}
            endpoint="teacher"
            showStudentInfo={true}
            showTeacherInfo={false}
            onCreatePayment={() => setShowPaymentForm(true)}
            onMarkAsPaid={handleMarkAsPaid}
            onSendReminder={(payment) => setReminderDialog({ open: true, payment })}
            onEdit={(payment) => {
              setEditingPayment(payment);
              setShowPaymentForm(true);
            }}
            onDelete={(payment) => setDeleteDialog({ open: true, payment })}
          />
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Studentlar bo'yicha to'lovlar</h2>
            <Select
              value={selectedGroupId?.toString() || 'all'}
              onValueChange={(value) => {
                const groupId = value === 'all' ? null : parseInt(value);
                setSelectedGroupId(groupId);
                if (groupId) {
                  loadGroupSummary(groupId);
                }
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Guruh tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha guruhlar</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentSummaries.map((summary) => (
              <Card key={summary.studentId} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold">{summary.studentName}</h3>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Jami</p>
                      <p className="font-bold">
                        {PaymentService.formatCurrency(summary.totalAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">To'langan:</span>
                      <span className="font-medium text-green-600">
                        {PaymentService.formatCurrency(summary.paidAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-yellow-600">Kutilayotgan:</span>
                      <span className="font-medium text-yellow-600">
                        {PaymentService.formatCurrency(summary.pendingAmount)}
                      </span>
                    </div>
                    {summary.overdueAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-red-600">Kechikkan:</span>
                        <span className="font-medium text-red-600">
                          {PaymentService.formatCurrency(summary.overdueAmount)}
                        </span>
                      </div>
                    )}
                  </div>

                  {summary.nextDueDate && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        Keyingi to'lov: {new Date(summary.nextDueDate).toLocaleDateString('uz-UZ')}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overdue Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Muddati o'tgan to'lovlar ({overduePayments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overduePayments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Muddati o'tgan to'lovlar yo'q
                  </p>
                ) : (
                  <div className="space-y-3">
                    {overduePayments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 bg-red-50 rounded">
                        <div>
                          <p className="font-medium">{payment.student.firstName} {payment.student.lastName}</p>
                          <p className="text-sm text-gray-600">
                            {PaymentService.formatCurrency(payment.amount)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReminderDialog({ open: true, payment })}
                        >
                          Eslatma
                        </Button>
                      </div>
                    ))}
                    {overduePayments.length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        +{overduePayments.length - 5} ta ko'proq
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-600">
                  <Clock className="h-5 w-5 mr-2" />
                  Yaqinlashayotgan to'lovlar ({upcomingPayments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingPayments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Yaqinlashayotgan to'lovlar yo'q
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingPayments.slice(0, 5).map((payment) => {
                      const daysLeft = PaymentService.getDaysUntilDue(payment.dueDate);
                      return (
                        <div key={payment.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                          <div>
                            <p className="font-medium">{payment.student.firstName} {payment.student.lastName}</p>
                            <p className="text-sm text-gray-600">
                              {PaymentService.formatCurrency(payment.amount)} • {daysLeft} kun qoldi
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReminderDialog({ open: true, payment })}
                          >
                            Eslatma
                          </Button>
                        </div>
                      );
                    })}
                    {upcomingPayments.length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        +{upcomingPayments.length - 5} ta ko'proq
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Group Reminders */}
          <Card>
            <CardHeader>
              <CardTitle>Guruh bo'yicha eslatmalar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {groups.map((group) => {
                  const groupPayments = payments.filter(p => p.group.id === group.id);
                  const groupOverdue = groupPayments.filter(p => 
                    p.status === 'pending' && PaymentService.isPaymentOverdue(p.dueDate)
                  );
                  
                  return (
                    <div key={group.id} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">{group.name}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Jami to'lovlar:</span>
                          <span>{groupPayments.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Kechikkan:</span>
                          <span className="text-red-600">{groupOverdue.length}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-3"
                        onClick={() => handleSendGroupReminders(group.id)}
                        disabled={groupOverdue.length === 0}
                      >
                        <Bell className="h-4 w-4 mr-1" />
                        Eslatma yuborish
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Form Dialog */}
      <PaymentForm
        open={showPaymentForm}
        onOpenChange={setShowPaymentForm}
        payment={editingPayment}
        onSubmit={editingPayment ? handleUpdatePayment : handleCreatePayment}
        students={students}
        teachers={teachers}
        groups={groups}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, payment: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>To'lovni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.payment && (
                <>
                  <strong>{deleteDialog.payment.student.firstName} {deleteDialog.payment.student.lastName}</strong>
                  ning {PaymentService.formatCurrency(deleteDialog.payment.amount)} 
                  miqdoridagi to'lovini o'chirishni xohlaysizmi?
                  <br /><br />
                  Bu amalni qaytarib bo'lmaydi.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment} className="bg-red-600 hover:bg-red-700">
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reminder Confirmation Dialog */}
      <AlertDialog open={reminderDialog.open} onOpenChange={(open) => setReminderDialog({ open, payment: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eslatma yuborish</AlertDialogTitle>
            <AlertDialogDescription>
              {reminderDialog.payment && (
                <>
                  <strong>{reminderDialog.payment.student.firstName} {reminderDialog.payment.student.lastName}</strong>
                  ga {PaymentService.formatCurrency(reminderDialog.payment.amount)} 
                  miqdoridagi to'lov haqida eslatma yuborilsinmi?
                  <br /><br />
                  Eslatma Telegram va dashboard orqali yuboriladi.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={() => reminderDialog.payment && handleSendReminder(reminderDialog.payment)}>
              Eslatma yuborish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeacherPayments;
