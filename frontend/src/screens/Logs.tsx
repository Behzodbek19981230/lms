import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, RefreshCw, AlertCircle, Info, AlertTriangle, Bug, Search, Calendar, Filter } from 'lucide-react';
import { request } from '@/configs/request';

interface Log {
  id: number;
  level: 'log' | 'error' | 'warn' | 'debug' | 'verbose';
  message: string;
  context?: string;
  userId?: number;
  userFullName?: string;
  source?: 'mobile' | 'web';
  userAgent?: string;
  ip?: string;
  createdAt: string;
  updatedAt: string;
}

interface LogStats {
  log?: number;
  error?: number;
  warn?: number;
  debug?: number;
  verbose?: number;
}

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<LogStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<string>(''); // bo'sh string => placeholder ishlaydi
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [context, setContext] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (level) params.append('level', level);
      if (search) params.append('search', search);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (context) params.append('context', context);

      const res = await request<Log[]>(`/logs`, { params });
      setLogs(res?.data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await request<LogStats>('/logs/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [level, limit, offset, search, startDate, endDate, context]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs();
        fetchStats();
        setLastRefresh(new Date());
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, level, limit, offset, search, startDate, endDate, context]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'debug':
        return <Bug className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'secondary';
      case 'debug':
        return 'outline';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('uz-UZ');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tizim loglari</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Oxirgi yangilanish: {lastRefresh.toLocaleTimeString('uz-UZ')}
            {autoRefresh && (
              <span className="ml-2 text-green-600">• Avto-yangilash yoqilgan (30s)</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? "O'chirish" : 'Yoqish'} avto-yangilash
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const csvContent = [
                ['ID', 'Daraja', 'Manba', 'Xabar', 'Kontekst', 'Foydalanuvchi', 'User-Agent', 'IP', 'Yaratilgan sana'].join(','),
                ...logs.map((log) =>
                  [
                    log.id,
                    log.level,
                    log.source || '',
                    `"${log.message.replace(/"/g, '""')}"`,
                    log.context || '',
                    `"${(log.userFullName || (log.userId != null ? String(log.userId) : '')).replace(/"/g, '""')}"`,
                    `"${(log.userAgent || '').replace(/"/g, '""')}"`,
                    log.ip || '',
                    log.createdAt,
                  ].join(',')
                ),
              ].join('\n');

              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
            disabled={logs.length === 0}
          >
            CSV eksport
          </Button>
          <Button onClick={() => { fetchLogs(); fetchStats(); setLastRefresh(new Date()); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Total Logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jami loglar</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.log || 0) + (stats.error || 0) + (stats.warn || 0) + (stats.debug || 0) + (stats.verbose || 0)}
            </div>
          </CardContent>
        </Card>

        {/* Errors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Xatolar</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.error || 0}</div>
          </CardContent>
        </Card>

        {/* Warnings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ogohlantirishlar</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.warn || 0}</div>
          </CardContent>
        </Card>

        {/* Debug */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Debug</CardTitle>
            <Bug className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.debug || 0}</div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ma'lumot</CardTitle>
            <Info className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.log || 0) + (stats.verbose || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtrlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search + Context */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search" className="flex items-center gap-2">
                <Search className="h-4 w-4" /> Loglarda qidirish
              </Label>
              <Input
                id="search"
                type="text"
                placeholder="Xabar, kontekst yoki foydalanuvchi bo'yicha qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="context">Kontekst/Xizmat</Label>
              <Select value={context || undefined} onValueChange={setContext}>
                <SelectTrigger>
                  <SelectValue placeholder="Barcha kontekstlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TelegramService">Telegram xizmati</SelectItem>
                  <SelectItem value="UsersService">Foydalanuvchilar xizmati</SelectItem>
                  <SelectItem value="AuthService">Auth xizmati</SelectItem>
                  <SelectItem value="Application">Ilova</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date + Level + Limit */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Boshlanish sana
              </Label>
              <Input id="startDate" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Tugash sana
              </Label>
              <Input id="endDate" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="level">Log darajasi</Label>
              <Select value={level || undefined} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Barcha darajalar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Xato</SelectItem>
                  <SelectItem value="warn">Ogohlantirish</SelectItem>
                  <SelectItem value="log">Ma'lumot</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="verbose">Batafsil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="limit">Sahifadagi natijalar</Label>
              <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear + Apply */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setStartDate('');
                setEndDate('');
                setLevel('');
                setContext('');
                setOffset(0);
              }}
            >
              Barcha filterlarni tozalash
            </Button>
            <Button onClick={fetchLogs} disabled={loading}>
              Filterlarni qo'llash
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>So'nggi loglar</span>
            <div className="text-sm text-muted-foreground">
              Ko'rsatilmoqda {logs.length} log (Sahifa {Math.floor(offset / limit) + 1})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loglar yuklanmoqda...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Loglar topilmadi</p>
              <p className="text-sm">Filterlarni o'zgartiring yoki keyinroq qayta urinib ko'ring</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 flex-wrap gap-2">
                      {getLevelIcon(log.level)}
                      <Badge variant={getLevelBadgeVariant(log.level)}>{log.level.toUpperCase()}</Badge>
                      {log.context && <Badge variant="outline" className="text-xs">{log.context}</Badge>}
                      {log.source && (
                        <Badge variant="outline" className="text-xs">
                          {log.source === 'mobile' ? 'Mobil' : 'Web'}
                        </Badge>
                      )}
                      {(log.userFullName || log.userId != null) && (
                        <Badge variant="secondary" className="text-xs">
                          Foydalanuvchi: {log.userFullName || log.userId}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap ml-4">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-3 rounded border text-xs leading-relaxed max-h-32 overflow-y-auto">
                      {log.message}
                    </pre>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      {log.userAgent && <span title={log.userAgent}>Brauzer: {log.userAgent.substring(0, 50)}...</span>}
                      {log.ip && <span>IP: {log.ip}</span>}
                    </div>
                    <span>ID: {log.id}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Natijalar sahifasi: {Math.floor(offset / limit) + 1}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0 || loading}
                  >
                    Oldingi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(offset + limit)}
                    disabled={logs.length < limit || loading}
                  >
                    Keyingi
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Logs;
