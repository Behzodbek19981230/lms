import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { MoreHorizontal, Check, X, Send, Pencil } from 'lucide-react';
import { Payment, PaymentStatus } from '../../types/payment';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface PaymentTableProps {
  payments: Payment[];
  onMarkPaid: (paymentId: string) => void;
  onSendReminder: (paymentId: string) => void;
  onDelete?: (paymentId: string) => void;
  onEditAmount?: (paymentId: string, amount: number) => void;
  showActions?: boolean;
  role?: 'teacher' | 'student' | 'center_admin';
}

const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  onMarkPaid,
  onSendReminder,
  onDelete,
  onEditAmount,
  showActions = true,
  role = 'teacher'
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return <Badge variant="default" className="bg-green-100 text-green-800">To'langan</Badge>;
      case PaymentStatus.PENDING:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Kutilmoqda</Badge>;
      case PaymentStatus.OVERDUE:
        return <Badge variant="destructive">Kechikkan</Badge>;
      case PaymentStatus.CANCELLED:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Bekor qilingan</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="rounded-md border">
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) {
            setEditPaymentId(null);
            setEditAmount('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>To'lov miqdorini o'zgartirish</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Yangi miqdor (UZS)</Label>
              <Input
                inputMode="numeric"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="300000"
              />
            </div>
            <Button
              onClick={() => {
                if (!onEditAmount || !editPaymentId) return;
                const n = Number(String(editAmount).replace(/[^\d]/g, ''));
                if (!Number.isFinite(n) || n <= 0) return;
                onEditAmount(editPaymentId, n);
                setEditOpen(false);
              }}
            >
              Saqlash
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Table>
        <TableHeader>
          <TableRow>
            {role !== 'student' && <TableHead>O'quvchi</TableHead>}
            <TableHead>Guruh</TableHead>
            <TableHead>Miqdor</TableHead>
            <TableHead>Muddat</TableHead>
            <TableHead>Holat</TableHead>
            {role !== 'student' && <TableHead>To'langan sana</TableHead>}
            <TableHead>Tavsif</TableHead>
            {showActions && <TableHead className="text-right">Amallar</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={role === 'student' ? 6 : 8} className="text-center py-8">
                Hech qanday to'lov topilmadi
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment) => (
              <TableRow key={payment.id}>
                {role !== 'student' && (
                  <TableCell className="font-medium">
                    {payment.student.firstName} {payment.student.lastName}
                  </TableCell>
                )}
                <TableCell>{payment.group.name}</TableCell>
                <TableCell className="font-semibold">
                  {formatAmount(payment.amount)}
                </TableCell>
                <TableCell>
                  {format(new Date(payment.dueDate), 'dd MMM yyyy', { locale: uz })}
                </TableCell>
                <TableCell>
                  {getStatusBadge(payment.status)}
                </TableCell>
                {role !== 'student' && (
                  <TableCell>
                    {payment.paidDate 
                      ? format(new Date(payment.paidDate), 'dd MMM yyyy', { locale: uz })
                      : '-'
                    }
                  </TableCell>
                )}
                <TableCell className="max-w-[200px] truncate">
                  {payment.description}
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Menyuni ochish</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEditAmount && role !== 'student' && payment.status !== PaymentStatus.PAID && (
                          <DropdownMenuItem
                            onClick={() => {
                              setEditPaymentId(payment.id);
                              setEditAmount(String(payment.amount));
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Miqdorni o'zgartirish
                          </DropdownMenuItem>
                        )}
                        {payment.status !== PaymentStatus.PAID && role === 'teacher' && (
                          <DropdownMenuItem onClick={() => onMarkPaid(payment.id)}>
                            <Check className="mr-2 h-4 w-4" />
                            To'landi deb belgilash
                          </DropdownMenuItem>
                        )}
                        {payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.OVERDUE ? (
                          <DropdownMenuItem onClick={() => onSendReminder(payment.id)}>
                            <Send className="mr-2 h-4 w-4" />
                            Eslatma yuborish
                          </DropdownMenuItem>
                        ) : null}
                        {onDelete && role === 'teacher' && payment.status !== PaymentStatus.PAID && (
                          <DropdownMenuItem 
                            onClick={() => onDelete(payment.id)}
                            className="text-red-600"
                          >
                            <X className="mr-2 h-4 w-4" />
                            O'chirish
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PaymentTable;
