import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar, 
  CreditCard, 
  User, 
  Building,
  AlertCircle,
  CheckCircle,
  Clock,
  Bell
} from 'lucide-react';
import { Payment } from '@/types/payment';
import { PaymentService } from '@/services/payment.service';

interface PaymentCardProps {
  payment: Payment;
  showStudentInfo?: boolean;
  showTeacherInfo?: boolean;
  showActions?: boolean;
  onMarkAsPaid?: (payment: Payment) => void;
  onSendReminder?: (payment: Payment) => void;
  onEdit?: (payment: Payment) => void;
  onDelete?: (payment: Payment) => void;
}

export const PaymentCard: React.FC<PaymentCardProps> = ({
  payment,
  showStudentInfo = true,
  showTeacherInfo = false,
  showActions = true,
  onMarkAsPaid,
  onSendReminder,
  onEdit,
  onDelete
}) => {
  const isOverdue = PaymentService.isPaymentOverdue(payment.dueDate);
  const isDueSoon = PaymentService.isPaymentDueSoon(payment.dueDate);
  const daysUntilDue = PaymentService.getDaysUntilDue(payment.dueDate);

  const getStatusIcon = () => {
    switch (payment.status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getCardBorderColor = () => {
    if (payment.status === 'paid') return 'border-l-green-500';
    if (payment.status === 'overdue') return 'border-l-red-500';
    if (isDueSoon) return 'border-l-yellow-500';
    return 'border-l-blue-500';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleMarkAsPaid = () => {
    if (onMarkAsPaid) {
      onMarkAsPaid(payment);
    }
  };

  const handleSendReminder = () => {
    if (onSendReminder) {
      onSendReminder(payment);
    }
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md border-l-4 ${getCardBorderColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold text-lg">
                {PaymentService.formatCurrency(payment.amount, payment.currency)}
              </h3>
              <p className="text-sm text-gray-600">
                {PaymentService.getPaymentTypeLabel(payment.type)}
              </p>
            </div>
          </div>
          <Badge 
            className={PaymentService.getPaymentStatusColor(payment.status)}
            variant="outline"
          >
            {PaymentService.getPaymentStatusLabel(payment.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Student Information */}
        {showStudentInfo && (
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {payment.student.firstName?.[0]}{payment.student.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {payment.student.firstName} {payment.student.lastName}
              </p>
              <p className="text-xs text-gray-500">{payment.student.email}</p>
            </div>
          </div>
        )}

        {/* Teacher Information */}
        {showTeacherInfo && (
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium">
                {payment.teacher.firstName} {payment.teacher.lastName}
              </p>
              <p className="text-xs text-gray-500">{payment.teacher.email}</p>
            </div>
          </div>
        )}

        {/* Group Information */}
        <div className="flex items-center space-x-2">
          <Building className="h-4 w-4 text-gray-500" />
          <div>
            <p className="text-sm font-medium">{payment.group.name}</p>
            {payment.group.center && (
              <p className="text-xs text-gray-500">{payment.group.center.name}</p>
            )}
          </div>
        </div>

        {/* Due Date Information */}
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              Muddat: {formatDate(payment.dueDate)}
            </p>
            {payment.status === 'pending' && (
              <p className={`text-xs ${
                isOverdue 
                  ? 'text-red-600' 
                  : isDueSoon 
                    ? 'text-yellow-600' 
                    : 'text-gray-500'
              }`}>
                {isOverdue 
                  ? `${Math.abs(daysUntilDue)} kun kechikkan`
                  : daysUntilDue > 0 
                    ? `${daysUntilDue} kun qoldi`
                    : 'Bugun muddat tugaydi'
                }
              </p>
            )}
          </div>
        </div>

        {/* Paid Date */}
        {payment.status === 'paid' && payment.paidDate && (
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <p className="text-sm text-green-600">
              To'langan: {formatDate(payment.paidDate)}
            </p>
          </div>
        )}

        {/* Description */}
        {payment.description && (
          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
            {payment.description}
          </div>
        )}

        {/* Reminder Information */}
        {payment.reminderCount > 0 && (
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Bell className="h-3 w-3" />
            <span>
              {payment.reminderCount} ta eslatma yuborilgan
              {payment.reminderSentAt && (
                <> • Oxirgi: {formatDate(payment.reminderSentAt)}</>
              )}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {payment.status === 'pending' && onMarkAsPaid && (
              <Button
                size="sm"
                variant="default"
                onClick={handleMarkAsPaid}
                className="flex-1 sm:flex-none"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                To'landi deb belgilash
              </Button>
            )}

            {payment.status === 'pending' && onSendReminder && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendReminder}
                className="flex-1 sm:flex-none"
              >
                <Bell className="h-4 w-4 mr-1" />
                Eslatma yuborish
              </Button>
            )}

            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(payment)}
                className="flex-1 sm:flex-none"
              >
                Tahrirlash
              </Button>
            )}

            {onDelete && payment.status !== 'paid' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(payment)}
                className="flex-1 sm:flex-none text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                O'chirish
              </Button>
            )}
          </div>
        )}

        {/* Payment Creation Info */}
        <div className="text-xs text-gray-400 border-t pt-2">
          Yaratilgan: {formatDate(payment.createdAt)}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentCard;
