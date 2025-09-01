import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Users, 
  Target, 
  Clock, 
  RefreshCw, 
  Trophy,
  TrendingUp,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { telegramService } from '@/services/telegram.service';
import { TestStatistics, TelegramStatsProps } from '@/types/telegram.type';

const TelegramStats: React.FC<TelegramStatsProps> = ({
  testId,
  autoRefresh = false,
  refreshInterval = 30000
}) => {
  const [stats, setStats] = useState<TestStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadStats();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(loadStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [testId, autoRefresh, refreshInterval]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const testStats = await telegramService.getTestStatistics(testId);
      setStats(testStats);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStats();
  };

  if (loading && !stats) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading statistics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !stats) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <p className="font-medium">Failed to load statistics</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No statistics available</p>
          <p className="text-muted-foreground">
            Statistics will appear once students start answering
          </p>
        </CardContent>
      </Card>
    );
  }

  const formattedStats = telegramService.formatTestStats(stats);
  const completionRate = telegramService.calculateCompletionRate(stats);

  // Prepare data for charts
  const performanceData = stats.studentResults
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 10) // Top 10 performers
    .map(result => ({
      name: result.student,
      score: result.totalPoints,
      correct: result.correctAnswers,
      total: result.totalQuestions,
      percentage: Math.round((result.correctAnswers / result.totalQuestions) * 100)
    }));

  const accuracyDistribution = [
    { name: 'Correct', value: stats.correctAnswers, color: '#22c55e' },
    { name: 'Incorrect', value: stats.totalAnswers - stats.correctAnswers, color: '#ef4444' }
  ];

  const completionData = [
    { name: 'Completed', value: stats.studentResults.length, color: '#3b82f6' },
    { name: 'Pending', value: stats.totalStudents - stats.studentResults.length, color: '#94a3b8' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Test Statistics</span>
              </CardTitle>
              <CardDescription>
                Real-time analysis of Test #{testId} responses
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {lastUpdated && (
                <span className="text-sm text-muted-foreground">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {formattedStats.completion} students
            </p>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formattedStats.accuracy}</div>
            <p className="text-xs text-muted-foreground">
              {stats.correctAnswers}/{stats.totalAnswers} correct
            </p>
            <Progress value={stats.accuracy} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formattedStats.avgScore}</div>
            <p className="text-xs text-muted-foreground">points per student</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {formattedStats.topPerformer || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">highest score</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Performance Chart */}
        {performanceData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Student Performance</CardTitle>
              <CardDescription>
                Top {Math.min(performanceData.length, 10)} performers by score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [value, name === 'score' ? 'Score' : 'Percentage']}
                    labelFormatter={(label) => `Student: ${label}`}
                  />
                  <Bar dataKey="score" fill="#3b82f6" name="score" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Accuracy Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Answer Distribution</CardTitle>
            <CardDescription>
              Overall accuracy across all responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={accuracyDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {accuracyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Student Results Table */}
      {stats.studentResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Results</CardTitle>
            <CardDescription>
              Individual student performance breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Student</th>
                    <th className="text-center py-2 px-3">Questions</th>
                    <th className="text-center py-2 px-3">Correct</th>
                    <th className="text-center py-2 px-3">Accuracy</th>
                    <th className="text-center py-2 px-3">Score</th>
                    <th className="text-center py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.studentResults
                    .sort((a, b) => b.totalPoints - a.totalPoints)
                    .map((result, index) => {
                      const accuracy = Math.round((result.correctAnswers / result.totalQuestions) * 100);
                      return (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-3 font-medium">{result.student}</td>
                          <td className="text-center py-2 px-3">{result.totalQuestions}</td>
                          <td className="text-center py-2 px-3">{result.correctAnswers}</td>
                          <td className="text-center py-2 px-3">
                            <Badge variant={accuracy >= 80 ? 'default' : accuracy >= 60 ? 'secondary' : 'destructive'}>
                              {accuracy}%
                            </Badge>
                          </td>
                          <td className="text-center py-2 px-3 font-bold">{result.totalPoints}</td>
                          <td className="text-center py-2 px-3">
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalStudents}</div>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.totalAnswers}</div>
              <p className="text-sm text-muted-foreground">Total Responses</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.studentResults.length > 0 ? stats.studentResults.length : 0}
              </div>
              <p className="text-sm text-muted-foreground">Students Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramStats;
