import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { DollarSign, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { PaymentStats } from '../../types/payment';
import { paymentService } from '../../services/payment.service';
import { useAuth } from '../../contexts/AuthContext';

const PaymentStatsWidget: React.FC = () => {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        let response;
        if (user?.role === 'teacher') {
          response = await paymentService.getTeacherPaymentStats();
        } else if (user?.role === 'student') {
          response = await paymentService.getStudentPaymentStats();
        } else {
          response = await paymentService.getPaymentStats();
        }
        
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Error fetching payment stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.role]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            To'lovlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Yuklanmoqda...</div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          To'lovlar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1">
                <Clock className="w-4 h-4 text-yellow-500" />
                Kutilayotgan
              </span>
              <Badge variant="secondary">{stats.totalPending}</Badge>
            </div>
            <div className="text-lg font-semibold text-yellow-600">
              {formatAmount(stats.pendingAmount)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Kechikkan
              </span>
              <Badge variant="destructive">{stats.totalOverdue}</Badge>
            </div>
            <div className="text-lg font-semibold text-red-600">
              {formatAmount(stats.overdueAmount)}
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Oylik daromad
              </span>
              <Badge variant="default">{stats.totalPaid}</Badge>
            </div>
            <div className="text-xl font-bold text-green-600">
              {formatAmount(stats.monthlyRevenue)}
            </div>
          </div>
        </div>

        {user?.role === 'teacher' && (
          <div className="pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => window.location.href = '/payments'}
            >
              Barcha to'lovlarni ko'rish
            </Button>
          </div>
        )}

        {user?.role === 'student' && (
          <div className="pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => window.location.href = '/student-payments'}
            >
              Mening to'lovlarim
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentStatsWidget;
