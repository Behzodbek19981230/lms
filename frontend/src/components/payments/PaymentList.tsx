import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter, Plus, CreditCard } from 'lucide-react';
import PaymentCard from './PaymentCard';
import { 
  Payment, 
  PaymentQueryDto, 
  PaymentResponse, 
  PaymentStatus, 
  PaymentType 
} from '@/types/payment';
import { PaymentService } from '@/services/payment.service';

interface PaymentListProps {
  payments?: Payment[];
  loading?: boolean;
  onPaymentClick?: (payment: Payment) => void;
  onCreatePayment?: () => void;
  onMarkAsPaid?: (payment: Payment) => void;
  onSendReminder?: (payment: Payment) => void;
  onEdit?: (payment: Payment) => void;
  onDelete?: (payment: Payment) => void;
  showCreateButton?: boolean;
  showFilters?: boolean;
  showStudentInfo?: boolean;
  showTeacherInfo?: boolean;
  initialFilters?: PaymentQueryDto;
  endpoint?: 'general' | 'teacher' | 'student' | 'admin';
}

export const PaymentList: React.FC<PaymentListProps> = ({
  payments: propPayments,
  loading: propLoading,
  onPaymentClick,
  onCreatePayment,
  onMarkAsPaid,
  onSendReminder,
  onEdit,
  onDelete,
  showCreateButton = true,
  showFilters = true,
  showStudentInfo = true,
  showTeacherInfo = false,
  initialFilters,
  endpoint = 'general'
}) => {
  const [payments, setPayments] = useState<Payment[]>(propPayments || []);
  const [loading, setLoading] = useState(propLoading || false);
  const [filters, setFilters] = useState<PaymentQueryDto>({
    page: 1,
    limit: 20,
    sortBy: 'dueDate',
    sortOrder: 'ASC',
    ...initialFilters
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [totalPages, setTotalPages] = useState(1);

  // Fetch payments when filters change (only if no props payments provided)
  useEffect(() => {
    if (!propPayments) {
      fetchPayments();
    }
  }, [filters, propPayments]);

  // Update local state when prop payments change
  useEffect(() => {
    if (propPayments) {
      setPayments(propPayments);
    }
  }, [propPayments]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let response: PaymentResponse;
      
      const queryFilters = {
        ...filters,
        search: searchTerm || undefined
      };

      switch (endpoint) {
        case 'teacher':
          response = await PaymentService.getTeacherPayments(queryFilters);
          break;
        case 'student':
          response = await PaymentService.getStudentPayments(queryFilters);
          break;
        case 'admin':
          response = await PaymentService.getAllPayments(queryFilters);
          break;
        default:
          response = await PaymentService.getPayments(queryFilters);
      }

      setPayments(response.payments);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof PaymentQueryDto, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm,
      page: 1
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      sortBy: 'dueDate',
      sortOrder: 'ASC'
    });
    setSearchTerm('');
  };

  const getFilterCounts = () => {
    const counts = {
      total: payments.length,
      pending: payments.filter(p => p.status === PaymentStatus.PENDING).length,
      paid: payments.filter(p => p.status === PaymentStatus.PAID).length,
      overdue: payments.filter(p => p.status === PaymentStatus.OVERDUE).length
    };
    return counts;
  };

  const filterCounts = getFilterCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">To'lovlar</h2>
          <p className="text-gray-600">
            Jami {filterCounts.total} ta to'lov
          </p>
        </div>
        {showCreateButton && onCreatePayment && (
        <Button onClick={onCreatePayment} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Yangi to'lov</span>
        </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900">Jami</h3>
          <p className="text-2xl font-bold text-blue-900">{filterCounts.total}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-900">Kutilmoqda</h3>
          <p className="text-2xl font-bold text-yellow-900">{filterCounts.pending}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-900">To'langan</h3>
          <p className="text-2xl font-bold text-green-900">{filterCounts.paid}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-red-900">Kechikkan</h3>
          <p className="text-2xl font-bold text-red-900">{filterCounts.overdue}</p>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filter va Qidiruv</span>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Tozalash
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Qidiruv</label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Student, o'qituvchi yoki guruh nomi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button size="sm" onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => 
                    handleFilterChange('status', value === 'all' ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha statuslar</SelectItem>
                    <SelectItem value="pending">Kutilmoqda</SelectItem>
                    <SelectItem value="paid">To'langan</SelectItem>
                    <SelectItem value="overdue">Muddati o'tgan</SelectItem>
                    <SelectItem value="cancelled">Bekor qilingan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">To'lov turi</label>
                <Select
                  value={filters.type || 'all'}
                  onValueChange={(value) => 
                    handleFilterChange('type', value === 'all' ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tur tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha turlar</SelectItem>
                    <SelectItem value="monthly_fee">Oylik to'lov</SelectItem>
                    <SelectItem value="registration_fee">Ro'yxatdan o'tish</SelectItem>
                    <SelectItem value="exam_fee">Imtihon to'lovi</SelectItem>
                    <SelectItem value="material_fee">Materiallar</SelectItem>
                    <SelectItem value="other">Boshqa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tartiblash</label>
                <div className="flex space-x-2">
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) => handleFilterChange('sortBy', value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dueDate">Muddat bo'yicha</SelectItem>
                      <SelectItem value="amount">Summa bo'yicha</SelectItem>
                      <SelectItem value="createdAt">Yaratilgan sana</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.sortOrder}
                    onValueChange={(value) => handleFilterChange('sortOrder', value)}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASC">O'sish</SelectItem>
                      <SelectItem value="DESC">Kamayish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Dan sana</label>
                <Input
                  type="date"
                  value={filters.fromDate || ''}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Gacha sana</label>
                <Input
                  type="date"
                  value={filters.toDate || ''}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applied Filters Display */}
      {(filters.status || filters.type || filters.search || filters.fromDate || filters.toDate) && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">Qo'llangan filterlar:</span>
          {filters.status && (
            <Badge variant="outline">
              Status: {PaymentService.getPaymentStatusLabel(filters.status)}
            </Badge>
          )}
          {filters.type && (
            <Badge variant="outline">
              Tur: {PaymentService.getPaymentTypeLabel(filters.type)}
            </Badge>
          )}
          {filters.search && (
            <Badge variant="outline">
              Qidiruv: "{filters.search}"
            </Badge>
          )}
          {filters.fromDate && (
            <Badge variant="outline">
              Dan: {filters.fromDate}
            </Badge>
          )}
          {filters.toDate && (
            <Badge variant="outline">
              Gacha: {filters.toDate}
            </Badge>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Yuklanmoqda...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && payments.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            To'lovlar topilmadi
          </h3>
          <p className="text-gray-600 mb-4">
            {filters.search || filters.status || filters.type 
              ? "Filter shartlariga mos to'lovlar mavjud emas."
              : "Hali hech qanday to'lov yaratilmagan."
            }
          </p>
          {showCreateButton && onCreatePayment && (
            <Button onClick={onCreatePayment}>
              <Plus className="h-4 w-4 mr-2" />
              Birinchi to'lovni yaratish
            </Button>
          )}
        </div>
      )}

      {/* Payments Grid */}
      {!loading && payments.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {payments.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                showStudentInfo={showStudentInfo}
                showTeacherInfo={showTeacherInfo}
                onMarkAsPaid={onMarkAsPaid}
                onSendReminder={onSendReminder}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === 1}
                onClick={() => handlePageChange((filters.page || 1) - 1)}
              >
                Oldingi
              </Button>
              
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  const isActive = page === filters.page;
                  
                  return (
                    <Button
                      key={page}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="w-10"
                    >
                      {page}
                    </Button>
                  );
                })}
                
                {totalPages > 5 && (
                  <>
                    {totalPages > 6 && <span className="px-2 text-gray-500">...</span>}
                    <Button
                      variant={totalPages === filters.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(totalPages)}
                      className="w-10"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === totalPages}
                onClick={() => handlePageChange((filters.page || 1) + 1)}
              >
                Keyingi
              </Button>
            </div>
          )}
        </>
      )}

      {/* Load More Button (alternative to pagination) */}
      {!loading && payments.length > 0 && totalPages > (filters.page || 1) && (
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => handlePageChange((filters.page || 1) + 1)}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Yuklanmoqda...
              </>
            ) : (
              'Ko\'proq yuklash'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaymentList;
