/**
 * Overview/Dashboard page
 */

import { useEffect, useRef, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useServerStatus, useRepositoryStatus, useSnapshots, useTasks } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { EmptyState } from '@/components/ui/empty-state';
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
import { formatBytes, formatDistanceToNow, formatShortDate } from '@/lib/utils';
import { usePreferencesStore } from '@/stores';

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(142 76% 36%)',
  warning: 'hsl(38 92% 50%)',
  destructive: 'hsl(0 84% 60%)',
  muted: 'hsl(var(--muted-foreground))',
  chart1: 'hsl(217 91% 60%)', // blue
  chart2: 'hsl(142 76% 36%)', // green
  chart3: 'hsl(38 92% 50%)', // orange
  chart4: 'hsl(0 84% 60%)', // red
  chart5: 'hsl(262 83% 58%)', // purple
};

export function Overview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const locale = usePreferencesStore((state) => state.getLocale());
  const byteFormat = usePreferencesStore((state) => state.byteFormat);
  const {
    status: serverStatus,
    isLoading: serverLoading,
    start: startServer,
    isRunning: isServerRunning,
  } = useServerStatus();
  const {
    status: repoStatus,
    isLoading: repoLoading,
    isConnected: isRepoConnected,
  } = useRepositoryStatus();
  const { snapshots, isLoading: snapshotsLoading } = useSnapshots();
  const { tasks, summary: tasksSummary } = useTasks();
  const hasTriedToStart = useRef(false);
  const [timeRange, setTimeRange] = useState<7 | 14 | 30 | 60>(7);

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

    // Use weekly grouping for 60-day range, daily for others
    const useWeeklyGrouping = timeRange === 60;
    const periods = useWeeklyGrouping ? Math.ceil(timeRange / 7) : timeRange;

    // Group snapshots by date/week based on selected time range
    const groups = Array.from({ length: periods }, (_, i) => {
      const date = new Date();
      if (useWeeklyGrouping) {
        date.setDate(date.getDate() - (periods - 1 - i) * 7);
      } else {
        date.setDate(date.getDate() - (timeRange - 1 - i));
      }
      date.setHours(0, 0, 0, 0);
      return date;
    });

    const snapshotsByPeriod = groups.map((date) => {
      const nextPeriod = new Date(date);
      if (useWeeklyGrouping) {
        nextPeriod.setDate(nextPeriod.getDate() + 7);
      } else {
        nextPeriod.setDate(nextPeriod.getDate() + 1);
      }

      const periodSnapshots = snapshots.filter((s) => {
        const snapshotDate = new Date(s.startTime);
        return snapshotDate >= date && snapshotDate < nextPeriod;
      });

      const totalSize = periodSnapshots.reduce((sum, s) => {
        const snapshotSize =
          s.summary?.totalFileSize || s.summary?.size || s.rootEntry?.summ?.size || 0;
        return sum + snapshotSize;
      }, 0);

      return {
        date: formatShortDate(date, locale),
        count: periodSnapshots.length,
        size: totalSize,
        sizeFormatted: formatBytes(totalSize, 2, byteFormat),
      };
    });

    // Total statistics
    // Try multiple fields for size: totalFileSize, size, or rootEntry size
    const totalSize = snapshots.reduce((sum, s) => {
      const snapshotSize =
        s.summary?.totalFileSize || s.summary?.size || s.rootEntry?.summ?.size || 0;
      return sum + snapshotSize;
    }, 0);
    const totalFiles = snapshots.reduce((sum, s) => sum + (s.summary?.files || 0), 0);
    const incompleteCount = snapshots.filter((s) => s.incomplete).length;

    return {
      total: snapshots.length,
      totalSize,
      totalFiles,
      incomplete: incompleteCount,
      complete: snapshots.length - incompleteCount,
      byPeriod: snapshotsByPeriod,
    };
  }, [snapshots, locale, timeRange, byteFormat]);

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
                  <span className="text-lg">{t('common.online')}</span>
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
                  <span className="text-lg">{t('common.offline')}</span>
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
                  <span className="text-lg">{t('common.connected')}</span>
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
                  <span className="text-lg">{t('common.notConnected')}</span>
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
            {repoLoading ? (
              <Spinner className="h-4 w-4" />
            ) : snapshotStats ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {formatBytes(snapshotStats.totalSize, 2, byteFormat)}
                </div>
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

      {/* Empty State or Charts Section */}
      {isServerRunning && isRepoConnected && !snapshotsLoading && (
        <>
          {!snapshotStats ? (
            <EmptyState
              icon={FolderArchive}
              title={t('overview.noSnapshotsYet')}
              description={t('overview.createFirstSnapshot')}
              action={{
                label: t('overview.createSnapshot'),
                onClick: () => void navigate('/snapshots/create'),
                icon: FolderArchive,
              }}
            />
          ) : (
            <>
              {/* Snapshot Activity Chart */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {t('overview.snapshotActivity')}
                    </CardTitle>
                    <Select
                      value={timeRange.toString()}
                      onValueChange={(value) => setTimeRange(Number(value) as 7 | 14 | 30 | 60)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">{t('overview.last7Days')}</SelectItem>
                        <SelectItem value="14">{t('overview.last14Days')}</SelectItem>
                        <SelectItem value="30">{t('overview.last30Days')}</SelectItem>
                        <SelectItem value="60">{t('overview.last60Days')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={snapshotStats.byPeriod}>
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
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Task Status Chart */}
              {taskStatusData && taskStatusData.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      {t('overview.taskStatusLabel')}
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
                          isAnimationActive={false}
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
                  <CardHeader className="pb-3">
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
                      {tasks.slice(0, 5).map((task) => {
                        const taskKindKey = task.kind?.toLowerCase() || 'unknown';
                        const taskKindTranslationKey = `overview.taskKind.${taskKindKey}`;
                        const taskKindDisplay = t(taskKindTranslationKey, {
                          defaultValue: task.kind || t('overview.taskKind.unknown'),
                        });

                        const taskStatusTranslationKey = `overview.taskStatus.${task.status}`;
                        const taskStatusDisplay = t(taskStatusTranslationKey, {
                          defaultValue: task.status,
                        });

                        return (
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
                                {taskStatusDisplay}
                              </Badge>
                              <div>
                                <p className="text-sm font-medium">{taskKindDisplay}</p>
                                {task.startTime && (
                                  <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(task.startTime))}
                                  </p>
                                )}
                              </div>
                            </div>
                            {task.progressInfo && (
                              <div className="text-xs text-muted-foreground">
                                {task.progressInfo}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
