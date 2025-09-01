import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { PaymentStats, PaymentType, PaymentStatus } from '@/types/payment';
import { PaymentService } from '@/services/payment.service';

interface PaymentStatsProps {
  stats: PaymentStats;
  loading?: boolean;
  className?: string;
}

export const PaymentStatsOverview: React.FC<PaymentStatsProps> = ({ 
  stats, 
  loading = false, 
  className = '' 
}) => {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const paidPercentage = stats.totalAmount > 0 
    ? Math.round((stats.paidAmount / stats.totalAmount) * 100) 
    : 0;

  const monthlyGrowth = stats.previousMonthAmount > 0 
    ? Math.round(((stats.currentMonthAmount - stats.previousMonthAmount) / stats.previousMonthAmount) * 100)
    : 0;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Total Amount */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Jami summa</p>
              <p className="text-2xl font-bold text-gray-900">
                {PaymentService.formatCurrency(stats.totalAmount)}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <Progress value={paidPercentage} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              {paidPercentage}% to'langan
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Paid Amount */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">To'langan</p>
              <p className="text-2xl font-bold text-green-600">
                {PaymentService.formatCurrency(stats.paidAmount)}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <Badge className="text-green-600 bg-green-50 border-green-200">
              {stats.paidPayments} ta to'lov
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pending Amount */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Kutilayotgan</p>
              <p className="text-2xl font-bold text-yellow-600">
                {PaymentService.formatCurrency(stats.pendingAmount)}
              </p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <Badge className="text-yellow-600 bg-yellow-50 border-yellow-200">
              {stats.pendingPayments} ta to'lov
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Amount */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Kechikkan</p>
              <p className="text-2xl font-bold text-red-600">
                {PaymentService.formatCurrency(stats.overdueAmount)}
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <Badge className="text-red-600 bg-red-50 border-red-200">
              {stats.overduePayments} ta to'lov
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const PaymentTypeChart: React.FC<PaymentStatsProps> = ({ 
  stats, 
  loading = false, 
  className = '' 
}) => {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="animate-pulse h-4 bg-gray-200 rounded"></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalByType = stats.paymentsByType.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2" />
          To'lov turlari bo'yicha
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.paymentsByType.map((item) => {
            const percentage = totalByType > 0 ? (item.amount / totalByType) * 100 : 0;
            return (
              <div key={item.type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {PaymentService.getPaymentTypeLabel(item.type)}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {PaymentService.formatCurrency(item.amount)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {item.count}
                    </Badge>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  {percentage.toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export const MonthlyTrendChart: React.FC<PaymentStatsProps> = ({ 
  stats, 
  loading = false, 
  className = '' 
}) => {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="animate-pulse h-4 bg-gray-200 rounded"></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const maxAmount = Math.max(...stats.monthlyTrend.map(item => item.amount));
  const monthlyGrowth = stats.previousMonthAmount > 0 
    ? Math.round(((stats.currentMonthAmount - stats.previousMonthAmount) / stats.previousMonthAmount) * 100)
    : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Oylik tendentsiya
          </div>
          <div className="flex items-center space-x-2">
            {monthlyGrowth > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${
              monthlyGrowth > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth}%
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.monthlyTrend.map((item, index) => {
            const percentage = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
            const isCurrentMonth = index === stats.monthlyTrend.length - 1;
            
            return (
              <div key={item.month}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    isCurrentMonth ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {item.month}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {PaymentService.formatCurrency(item.amount)}
                    </span>
                    <Badge 
                      variant={isCurrentMonth ? "default" : "outline"} 
                      className="text-xs"
                    >
                      {item.count}
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={percentage} 
                  className={`h-3 ${isCurrentMonth ? 'bg-blue-100' : ''}`} 
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export const PaymentStatusChart: React.FC<PaymentStatsProps> = ({ 
  stats, 
  loading = false, 
  className = '' 
}) => {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="animate-pulse h-4 bg-gray-200 rounded"></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusData = [
    {
      status: 'paid',
      amount: stats.paidAmount,
      count: stats.paidPayments,
      color: 'green',
      icon: CheckCircle
    },
    {
      status: 'pending',
      amount: stats.pendingAmount,
      count: stats.pendingPayments,
      color: 'yellow',
      icon: Clock
    },
    {
      status: 'overdue',
      amount: stats.overdueAmount,
      count: stats.overduePayments,
      color: 'red',
      icon: AlertTriangle
    }
  ];

  const totalAmount = statusData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Status bo'yicha taqsimot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statusData.map((item) => {
            const percentage = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
            const Icon = item.icon;
            
            return (
              <div key={item.status}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-4 w-4 text-${item.color}-600`} />
                    <span className="text-sm font-medium">
                      {PaymentService.getPaymentStatusLabel(item.status)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {PaymentService.formatCurrency(item.amount)}
                    </span>
                    <Badge 
                      className={`text-${item.color}-600 bg-${item.color}-50 border-${item.color}-200 text-xs`}
                      variant="outline"
                    >
                      {item.count}
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={percentage} 
                  className={`h-2 bg-${item.color}-100`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {percentage.toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Compact stats widget for dashboard
export const PaymentStatsWidget: React.FC<PaymentStatsProps> = ({ 
  stats, 
  loading = false, 
  className = '' 
}) => {
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const collectionRate = stats.totalAmount > 0 
    ? Math.round((stats.paidAmount / stats.totalAmount) * 100) 
    : 0;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">To'lovlar</h3>
          <Badge className={`${
            collectionRate >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
            collectionRate >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
            'bg-red-50 text-red-700 border-red-200'
          }`}>
            {collectionRate}% yig'ilgan
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Jami</p>
            <p className="text-lg font-bold">
              {PaymentService.formatCurrency(stats.totalAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">To'langan</p>
            <p className="text-lg font-bold text-green-600">
              {PaymentService.formatCurrency(stats.paidAmount)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Progress value={collectionRate} className="h-2" />
        </div>

        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{stats.pendingPayments} kutilmoqda</span>
          <span>{stats.overduePayments} kechikkan</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Combined dashboard component
export const PaymentDashboard: React.FC<PaymentStatsProps> = ({ 
  stats, 
  loading = false, 
  className = '' 
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <PaymentStatsOverview stats={stats} loading={loading} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentTypeChart stats={stats} loading={loading} />
        <PaymentStatusChart stats={stats} loading={loading} />
      </div>
      
      <MonthlyTrendChart stats={stats} loading={loading} />
    </div>
  );
};

export default PaymentStatsOverview;
