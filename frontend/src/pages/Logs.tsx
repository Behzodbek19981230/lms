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
  const [level, setLevel] = useState<string>('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [context, setContext] = useState('1');
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

      if (level) {
        params.append('level', level);
      }

      if (search) {
        params.append('search', search);
      }

      if (startDate) {
        params.append('startDate', startDate);
      }

      if (endDate) {
        params.append('endDate', endDate);
      }

      if (context) {
        params.append('context', context);
      }

      const response = await fetch(`/api/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
     const res=await request<LogStats>('/logs/stats');
     setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [level, limit, offset, search, startDate, endDate, context]);

  // Auto-refresh effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs();
        fetchStats();
        setLastRefresh(new Date());
      }, 30000); // Refresh every 30 seconds
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: {lastRefresh.toLocaleTimeString('uz-UZ')}
            {autoRefresh && (
              <span className="ml-2 text-green-600">
                • Auto-refresh enabled (30s)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Disable' : 'Enable'} Auto-refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const csvContent = [
                ['ID', 'Level', 'Message', 'Context', 'User ID', 'User Agent', 'IP', 'Created At'].join(','),
                ...logs.map(log => [
                  log.id,
                  log.level,
                  `"${log.message.replace(/"/g, '""')}"`,
                  log.context || '',
                  log.userId || '',
                  `"${(log.userAgent || '').replace(/"/g, '""')}"`,
                  log.ip || '',
                  log.createdAt
                ].join(','))
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
            Export CSV
          </Button>
          <Button onClick={() => { fetchLogs(); fetchStats(); setLastRefresh(new Date()); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.log || 0) + (stats.error || 0) + (stats.warn || 0) + (stats.debug || 0) + (stats.verbose || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.error || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.warn || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Debug</CardTitle>
            <Bug className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.debug || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
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
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Quick Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search in logs
              </Label>
              <Input
                id="search"
                type="text"
                placeholder="Search messages, context, or user info..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="context">Context/Service</Label>
              <Select value={context} onValueChange={setContext}>
                <SelectTrigger>
                  <SelectValue placeholder="All contexts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TelegramService">Telegram Service</SelectItem>
                  <SelectItem value="UsersService">Users Service</SelectItem>
                  <SelectItem value="AuthService">Auth Service</SelectItem>
                  <SelectItem value="Application">Application</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range and Level Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                End Date
              </Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="level">Log Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All levels</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="log">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="verbose">Verbose</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="limit">Results per page</Label>
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

          {/* Quick Filters */}
          <div className="space-y-3">
            {/* Time Filters */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground mr-2">Time:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
                  setStartDate(lastHour.toISOString().slice(0, 16));
                  setEndDate(now.toISOString().slice(0, 16));
                }}
              >
                Last Hour
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                  setStartDate(last24h.toISOString().slice(0, 16));
                  setEndDate(now.toISOString().slice(0, 16));
                }}
              >
                Last 24 Hours
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  setStartDate(last7d.toISOString().slice(0, 16));
                  setEndDate(now.toISOString().slice(0, 16));
                }}
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear Dates
              </Button>
            </div>

            {/* Level Filters */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground mr-2">Level:</span>
              <Button
                variant={level === 'error' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLevel(level === 'error' ? '' : 'error')}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Errors
              </Button>
              <Button
                variant={level === 'warn' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLevel(level === 'warn' ? '' : 'warn')}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Warnings
              </Button>
              <Button
                variant={level === 'log' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLevel(level === 'log' ? '' : 'log')}
              >
                <Info className="h-3 w-3 mr-1" />
                Info
              </Button>
              <Button
                variant={level === 'debug' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLevel(level === 'debug' ? '' : 'debug')}
              >
                <Bug className="h-3 w-3 mr-1" />
                Debug
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
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
              Clear All Filters
            </Button>
            <Button onClick={fetchLogs} disabled={loading}>
              Apply Filters
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
            <span>Recent Logs</span>
            <div className="text-sm text-muted-foreground">
              Showing {logs.length} logs (Page {Math.floor(offset / limit) + 1})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No logs found</p>
              <p className="text-sm">Try adjusting your filters or check back later</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 flex-wrap gap-2">
                      {getLevelIcon(log.level)}
                      <Badge variant={getLevelBadgeVariant(log.level)}>
                        {log.level.toUpperCase()}
                      </Badge>
                      {log.context && (
                        <Badge variant="outline" className="text-xs">
                          {log.context}
                        </Badge>
                      )}
                      {log.userId && (
                        <Badge variant="secondary" className="text-xs">
                          User: {log.userId}
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
                      {log.userAgent && (
                        <span title={log.userAgent}>
                          Browser: {log.userAgent.substring(0, 50)}...
                        </span>
                      )}
                      {log.ip && (
                        <span>IP: {log.ip}</span>
                      )}
                    </div>
                    <span>ID: {log.id}</span>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Page {Math.floor(offset / limit) + 1} of results
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0 || loading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(offset + limit)}
                    disabled={logs.length < limit || loading}
                  >
                    Next
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