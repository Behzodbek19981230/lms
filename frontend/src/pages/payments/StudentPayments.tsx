import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Bell,
  AlertTriangle as ExclamationTriangle
} from 'lucide-react';

import PaymentCard from '@/components/payments/PaymentCard';
import { PaymentStatsWidget } from '@/components/payments/PaymentStats';
import { PaymentService } from '@/services/payment.service';
import { 
  Payment, 
  PaymentStats, 
  DashboardPaymentData 
} from '@/types/payment';

export const StudentPayments: React.FC = () => {
  // State management
  const [dashboardData, setDashboardData] = useState<DashboardPaymentData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [dashboardResponse, paymentsResponse, statsResponse] = await Promise.all([
        PaymentService.getStudentDashboardData(),
        PaymentService.getStudentPayments({ limit: 50 }),
        PaymentService.getStudentPaymentStats()
      ]);
      
      setDashboardData(dashboardResponse);
      setPayments(paymentsResponse.payments);
      setStats(statsResponse);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const overduePayments = dashboardData?.overduePayments || [];
  const upcomingPayments = dashboardData?.upcomingPayments || [];
  const recentPayments = dashboardData?.recentPayments || [];

  const totalOwed = stats ? stats.pendingAmount + stats.overdueAmount : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mening to'lovlarim</h1>
        <p className="text-gray-600">To'lov majburiyatlaringizni kuzating</p>
      </div>

      {/* Critical Alerts */}
      {overduePayments.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <ExclamationTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Diqqat!</strong> {overduePayments.length} ta to'lovingiz muddati o'tgan. 
            Iltimos, o'qituvchingiz bilan bog'laning.
          </AlertDescription>
        </Alert>
      )}

      {upcomingPayments.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Eslatma:</strong> {upcomingPayments.length} ta to'lovingiz yaqinda tugaydi.
          </AlertDescription>
        </Alert>
      )}

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Owed */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Jami qarzdorlik</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats ? PaymentService.formatCurrency(totalOwed) : '---'}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            {stats && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>To'langan</span>
                  <span>
                    {stats.totalAmount > 0 
                      ? Math.round((stats.paidAmount / stats.totalAmount) * 100)
                      : 0
                    }%
                  </span>
                </div>
                <Progress 
                  value={stats.totalAmount > 0 ? (stats.paidAmount / stats.totalAmount) * 100 : 0} 
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Payments */}
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Muddati o'tgan</p>
                <p className="text-2xl font-bold text-red-600">
                  {overduePayments.length}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-red-600 mt-2">
              {stats ? PaymentService.formatCurrency(stats.overdueAmount) : '---'}
            </p>
          </CardContent>
        </Card>

        {/* Next Payment */}
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Keyingi to'lov</p>
                {upcomingPayments.length > 0 ? (
                  <>
                    <p className="text-2xl font-bold text-yellow-600">
                      {PaymentService.getDaysUntilDue(upcomingPayments[0].dueDate)} kun
                    </p>
                    <p className="text-sm text-gray-600">
                      {PaymentService.formatCurrency(upcomingPayments[0].amount)}
                    </p>
                  </>
                ) : (
                  <p className="text-lg text-gray-500">To'lovlar yo'q</p>
                )}
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Joriy to'lovlar</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>To'lov tarixi</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Statistika</span>
          </TabsTrigger>
        </TabsList>

        {/* Current Payments Tab */}
        <TabsContent value="current" className="space-y-6">
          {/* Urgent Payments */}
          {overduePayments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Shoshilinch to'lovlar
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {overduePayments.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    showStudentInfo={false}
                    showTeacherInfo={true}
                    showActions={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Payments */}
          {upcomingPayments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-yellow-600 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Yaqinlashayotgan to'lovlar
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {upcomingPayments.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    showStudentInfo={false}
                    showTeacherInfo={true}
                    showActions={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No pending payments */}
          {overduePayments.length === 0 && upcomingPayments.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Barcha to'lovlar amalga oshirilgan!
              </h3>
              <p className="text-gray-600">
                Sizda hozircha kutilayotgan to'lovlar yo'q.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="history">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">To'lov tarixi</h3>
            
            {recentPayments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  To'lov tarixi yo'q
                </h3>
                <p className="text-gray-600">
                  Hali hech qanday to'lov amalga oshirilmagan.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {payments.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    showStudentInfo={false}
                    showTeacherInfo={true}
                    showActions={false}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-6">
          {stats ? (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Jami to'lovlar</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalPayments}</p>
                      </div>
                      <CreditCard className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">To'langan</p>
                        <p className="text-2xl font-bold text-green-600">{stats.paidPayments}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Kutilayotgan</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Kechikkan</p>
                        <p className="text-2xl font-bold text-red-600">{stats.overduePayments}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>To'lov ko'rsatkichlari</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Payment Rate */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">To'lov foizi</span>
                        <span className="text-sm text-gray-600">
                          {stats.totalPayments > 0 
                            ? Math.round((stats.paidPayments / stats.totalPayments) * 100)
                            : 0
                          }%
                        </span>
                      </div>
                      <Progress 
                        value={stats.totalPayments > 0 ? (stats.paidPayments / stats.totalPayments) * 100 : 0}
                        className="h-3"
                      />
                    </div>

                    {/* Amount Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3">Summalar bo'yicha</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Jami summa:</span>
                            <span className="font-medium">
                              {PaymentService.formatCurrency(stats.totalAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-green-600">To'langan:</span>
                            <span className="font-medium text-green-600">
                              {PaymentService.formatCurrency(stats.paidAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-yellow-600">Kutilayotgan:</span>
                            <span className="font-medium text-yellow-600">
                              {PaymentService.formatCurrency(stats.pendingAmount)}
                            </span>
                          </div>
                          {stats.overdueAmount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-sm text-red-600">Kechikkan:</span>
                              <span className="font-medium text-red-600">
                                {PaymentService.formatCurrency(stats.overdueAmount)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-3">To'lov turlari</h4>
                        <div className="space-y-2">
                          {stats.paymentsByType.map((item) => (
                            <div key={item.type} className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">
                                {PaymentService.getPaymentTypeLabel(item.type)}:
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">
                                  {PaymentService.formatCurrency(item.amount)}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {item.count}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Trend */}
              {stats.monthlyTrend.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Oylik to'lovlar tendensiyasi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.monthlyTrend.slice(-6).map((item, index) => {
                        const maxAmount = Math.max(...stats.monthlyTrend.map(i => i.amount));
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
                              className={`h-2 ${isCurrentMonth ? 'bg-blue-100' : ''}`} 
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Statistika mavjud emas
              </h3>
              <p className="text-gray-600">
                To'lov tarixi bo'lganda statistika ko'rinadi.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Actions for Students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Tez amallar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Yordam kerakmi?</h4>
              <p className="text-sm text-gray-600">
                To'lov haqida savollaringiz bo'lsa, o'qituvchingiz bilan bog'laning.
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>Telegram:</strong> @your_teacher</p>
                <p><strong>Telefon:</strong> +998 90 123 45 67</p>
                <p><strong>Email:</strong> teacher@example.com</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">To'lov usullari</h4>
              <p className="text-sm text-gray-600">
                Quyidagi usullar orqali to'lov qilishingiz mumkin:
              </p>
              <div className="space-y-2 text-sm">
                <p>💳 <strong>Click/Payme:</strong> +998 90 123 45 67</p>
                <p>🏦 <strong>Bank kartasi:</strong> Markaz kassasida</p>
                <p>💵 <strong>Naqd pul:</strong> O'qituvchingizga</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentPayments;
