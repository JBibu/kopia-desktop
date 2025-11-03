/**
 * Overview/Dashboard page
 */

import { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useKopiaServer } from '@/hooks/useKopiaServer';
import { useRepository } from '@/hooks/useRepository';
import { useSnapshots } from '@/hooks/useSnapshots';
import { useTasks } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Database,
  Server,
  CheckCircle,
  XCircle,
  PlayCircle,
  FolderArchive,
  HardDrive,
  Clock,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatBytes, formatDistanceToNow } from '@/lib/utils';

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))',
  muted: 'hsl(var(--muted-foreground))',
  chart1: '#3b82f6',
  chart2: '#10b981',
  chart3: '#f59e0b',
  chart4: '#ef4444',
  chart5: '#8b5cf6',
};

export function Overview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { serverStatus, isLoading: serverLoading, startServer } = useKopiaServer();
  const { status: repoStatus, isLoading: repoLoading } = useRepository();
  const { snapshots, isLoading: snapshotsLoading } = useSnapshots();
  const { tasks, summary: tasksSummary } = useTasks();
  const hasTriedToStart = useRef(false);

  const isServerRunning = serverStatus?.running ?? false;
  const isRepoConnected = repoStatus?.connected ?? false;

  // Auto-start server if not running (only try once)
  useEffect(() => {
    if (!hasTriedToStart.current && serverStatus && !serverStatus.running && !serverLoading) {
      hasTriedToStart.current = true;
      void startServer();
    }
  }, [serverStatus, serverLoading, startServer]);

  // Calculate snapshot statistics
  const snapshotStats = useMemo(() => {
    if (!snapshots.length) return null;

    // Group snapshots by date (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    const snapshotsByDay = last7Days.map((date) => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const daySnapshots = snapshots.filter((s) => {
        const snapshotDate = new Date(s.startTime);
        return snapshotDate >= date && snapshotDate < nextDay;
      });

      const totalSize = daySnapshots.reduce((sum, s) => sum + (s.summary?.totalFileSize || 0), 0);

      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: daySnapshots.length,
        size: totalSize,
        sizeFormatted: formatBytes(totalSize),
      };
    });

    // Total statistics
    const totalSize = snapshots.reduce((sum, s) => sum + (s.summary?.totalFileSize || 0), 0);
    const totalFiles = snapshots.reduce((sum, s) => sum + (s.summary?.files || 0), 0);
    const incompleteCount = snapshots.filter((s) => s.incomplete).length;

    return {
      total: snapshots.length,
      totalSize,
      totalFiles,
      incomplete: incompleteCount,
      complete: snapshots.length - incompleteCount,
      byDay: snapshotsByDay,
    };
  }, [snapshots]);

  // Task status distribution
  const taskStatusData = useMemo(() => {
    if (!tasksSummary) return null;

    return [
      { name: t('tasks.running'), value: tasksSummary.running, color: CHART_COLORS.chart1 },
      { name: t('tasks.success'), value: tasksSummary.success, color: CHART_COLORS.chart2 },
      { name: t('tasks.failed'), value: tasksSummary.failed, color: CHART_COLORS.chart4 },
      {
        name: t('tasks.cancelled'),
        value: tasksSummary.canceled,
        color: CHART_COLORS.chart5,
      },
    ].filter((item) => item.value > 0);
  }, [tasksSummary, t]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('overview.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('overview.subtitle')}</p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Server Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              {t('overview.kopiaServer')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serverLoading ? (
              <div className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
              </div>
            ) : isServerRunning ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-2xl font-bold">{t('common.online')}</span>
                </div>
                {serverStatus?.uptime !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {t('overview.uptime', { minutes: Math.floor(serverStatus.uptime / 60) })}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span className="text-2xl font-bold">{t('common.offline')}</span>
                </div>
                <Button size="sm" onClick={() => void startServer()} className="w-full">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {t('overview.startServer')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Repository Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              {t('overview.repository')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {repoLoading ? (
              <div className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
              </div>
            ) : isRepoConnected ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-2xl font-bold">{t('common.connected')}</span>
                </div>
                {repoStatus?.storage && (
                  <Badge variant="secondary" className="text-xs">
                    {repoStatus.storage}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span className="text-2xl font-bold">{t('common.notConnected')}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => void navigate('/repository')}
                  className="w-full"
                  disabled={!isServerRunning}
                >
                  <Database className="mr-2 h-4 w-4" />
                  {t('common.connect')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Snapshots */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderArchive className="h-4 w-4 text-muted-foreground" />
              {t('overview.totalSnapshots')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {snapshotsLoading ? (
              <Spinner className="h-4 w-4" />
            ) : snapshotStats ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold">{snapshotStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {snapshotStats.complete} {t('overview.complete')}, {snapshotStats.incomplete}{' '}
                  {t('overview.incomplete')}
                </p>
              </div>
            ) : (
              <div className="text-2xl font-bold">0</div>
            )}
          </CardContent>
        </Card>

        {/* Storage Used */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              {t('overview.storageUsed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {snapshotsLoading ? (
              <Spinner className="h-4 w-4" />
            ) : snapshotStats ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold">{formatBytes(snapshotStats.totalSize)}</div>
                <p className="text-xs text-muted-foreground">
                  {snapshotStats.totalFiles.toLocaleString()} {t('overview.files')}
                </p>
              </div>
            ) : (
              <div className="text-2xl font-bold">0 B</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {isServerRunning && isRepoConnected && !snapshotsLoading && snapshotStats && (
        <>
          {/* Snapshot Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t('overview.snapshotActivity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={snapshotStats.byDay}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.chart1} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={CHART_COLORS.chart1} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={CHART_COLORS.chart1}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                    name={t('overview.snapshots')}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Task Status Chart */}
          {taskStatusData && taskStatusData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  {t('overview.taskStatus')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          {tasks.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('overview.recentActivity')}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => void navigate('/tasks')}>
                    {t('overview.viewAll')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            task.status === 'SUCCESS'
                              ? 'default'
                              : task.status === 'FAILED'
                                ? 'destructive'
                                : task.status === 'RUNNING'
                                  ? 'secondary'
                                  : 'outline'
                          }
                        >
                          {task.status}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{task.kind || t('tasks.unknown')}</p>
                          {task.startTime && (
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(task.startTime))}
                            </p>
                          )}
                        </div>
                      </div>
                      {task.progress && (
                        <div className="text-xs text-muted-foreground">
                          {task.progress.percentage}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
