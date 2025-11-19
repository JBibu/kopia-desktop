/**
 * Tasks page - Monitor and manage background tasks
 */

import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTasks } from '@/hooks/useTasks';
import { useSnapshots } from '@/hooks/useSnapshots';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import {
  ListChecks,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Clock,
  Play,
  AlertCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import type { Task } from '@/lib/kopia/types';
import { formatDateTime, formatBytes } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language';

export function Tasks() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const { tasks, summary, isLoading, error, isWebSocketConnected, cancelTask, refreshAll } =
    useTasks();
  const { sources } = useSnapshots();

  // Map language code to locale
  const locale = language === 'es' ? 'es-ES' : 'en-US';

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Task details state
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const handleRefresh = async () => {
    await refreshAll();
  };

  const handleToggleDetails = (taskId: string) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
    } else {
      setExpandedTaskId(taskId);
    }
  };

  // Format counter key to human-readable label
  const formatCounterLabel = (key: string): string => {
    // Convert snake_case to Title Case
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Calculate progress percentage from task counters
  const getTaskProgress = (task: Task): number | null => {
    if (!task.counters) return null;

    // Try to calculate from processed/estimated counters
    const processedBytes = task.counters.processed_bytes?.value;
    const estimatedBytes = task.counters.estimated_bytes?.value;
    const processedFiles = task.counters.processed_files?.value;
    const estimatedFiles = task.counters.estimated_files?.value;

    // Prefer bytes-based progress if available
    if (processedBytes !== undefined && estimatedBytes !== undefined && estimatedBytes > 0) {
      return Math.min(100, (processedBytes / estimatedBytes) * 100);
    }

    // Fall back to files-based progress
    if (processedFiles !== undefined && estimatedFiles !== undefined && estimatedFiles > 0) {
      return Math.min(100, (processedFiles / estimatedFiles) * 100);
    }

    return null;
  };

  const handleCancelTask = async () => {
    if (!selectedTask) return;

    setIsCancelling(true);
    try {
      await cancelTask(selectedTask.id);
      setIsCancelDialogOpen(false);
      setSelectedTask(null);
    } catch {
      // Error is handled by the hook
    } finally {
      setIsCancelling(false);
    }
  };

  // Get future tasks from sources with scheduled snapshots
  const futureTasks = sources
    .filter((source) => source.nextSnapshotTime)
    .sort((a, b) => {
      const timeA = new Date(a.nextSnapshotTime!).getTime();
      const timeB = new Date(b.nextSnapshotTime!).getTime();
      return timeA - timeB;
    });

  const getTaskStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }
    > = {
      RUNNING: { variant: 'default', icon: Play },
      SUCCESS: { variant: 'secondary', icon: CheckCircle2 },
      FAILED: { variant: 'destructive', icon: XCircle },
      CANCELLED: { variant: 'outline', icon: XCircle },
    };

    const config = variants[status] || variants.RUNNING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('tasks.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('tasks.subtitle')}
            {isWebSocketConnected && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Activity className="h-3 w-3 animate-pulse" />
                {t('tasks.realtimeUpdates')}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleRefresh()}
          disabled={isLoading}
          title={isWebSocketConnected ? t('tasks.manualRefresh') : t('tasks.pollingMode')}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                {t('tasks.running')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.running || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                {t('tasks.completed')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.success || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                {t('tasks.failed')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.failed || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                {t('tasks.total')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(summary.running || 0) + (summary.success || 0) + (summary.failed || 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tasks Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('tasks.allTasks')}</CardTitle>
          <CardDescription>{t('tasks.tasksFound', { count: tasks.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && tasks.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('tasks.noTasksRunning')}</h3>
              <p className="text-sm text-muted-foreground">{t('tasks.noTasksDescription')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('tasks.taskId')}</TableHead>
                  <TableHead>{t('tasks.kind')}</TableHead>
                  <TableHead>{t('tasks.status')}</TableHead>
                  <TableHead>{t('tasks.started')}</TableHead>
                  <TableHead>{t('tasks.duration')}</TableHead>
                  <TableHead>{t('tasks.progress')}</TableHead>
                  <TableHead className="w-[150px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <Fragment key={task.id}>
                    <TableRow>
                      <TableCell className="font-mono text-xs">{task.id.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <Badge variant="outline">{task.kind || t('tasks.unknown')}</Badge>
                      </TableCell>
                      <TableCell>{getTaskStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{formatDateTime(task.startTime, locale)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {task.endTime
                            ? formatDuration(
                                Math.floor(
                                  (new Date(task.endTime).getTime() -
                                    new Date(task.startTime).getTime()) /
                                    1000
                                )
                              )
                            : t('tasks.inProgress')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const progress = getTaskProgress(task);
                          if (progress !== null) {
                            return (
                              <div className="flex items-center gap-2">
                                <Progress value={progress} className="h-2 w-24" />
                                <span className="text-xs text-muted-foreground tabular-nums">
                                  {progress.toFixed(1)}%
                                </span>
                              </div>
                            );
                          }
                          return task.progressInfo ? (
                            <span className="text-sm text-muted-foreground">
                              {task.progressInfo}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleDetails(task.id)}
                            title={t('tasks.viewDetails')}
                          >
                            {expandedTaskId === task.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          {task.status === 'RUNNING' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTask(task);
                                setIsCancelDialogOpen(true);
                              }}
                              title={t('tasks.cancelTask')}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedTaskId === task.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/50 p-0">
                          <Collapsible open={true}>
                            <CollapsibleContent>
                              <div className="p-4">
                                <h4 className="text-sm font-medium mb-3">
                                  {t('tasks.taskDetails')}
                                </h4>
                                <div className="bg-background rounded-md border p-3 space-y-2 text-xs">
                                  {task.description && (
                                    <div>
                                      <span className="font-medium text-muted-foreground">
                                        {t('tasks.description')}:
                                      </span>{' '}
                                      <span className="text-foreground">{task.description}</span>
                                    </div>
                                  )}
                                  {task.errorMessage && (
                                    <div>
                                      <span className="font-medium text-destructive">
                                        {t('tasks.error')}:
                                      </span>{' '}
                                      <span className="text-destructive">{task.errorMessage}</span>
                                    </div>
                                  )}
                                  {task.counters && Object.keys(task.counters).length > 0 && (
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                                      {Object.entries(task.counters)
                                        .sort(([a], [b]) => a.localeCompare(b))
                                        .map(([key, value]) => {
                                          let formattedValue: string;

                                          if (
                                            typeof value === 'object' &&
                                            value !== null &&
                                            'value' in value
                                          ) {
                                            // Check if this is a byte counter (units === 'bytes' or key contains 'bytes')
                                            if (
                                              value.units === 'bytes' ||
                                              key.toLowerCase().includes('bytes')
                                            ) {
                                              formattedValue = formatBytes(value.value);
                                            } else {
                                              formattedValue = `${value.value.toLocaleString()}${value.units ? ` ${value.units}` : ''}`;
                                            }
                                          } else {
                                            formattedValue = String(value);
                                          }

                                          return (
                                            <div key={key} className="flex justify-between gap-2">
                                              <span className="font-medium text-muted-foreground">
                                                {formatCounterLabel(key)}:
                                              </span>
                                              <span className="text-foreground text-right">
                                                {formattedValue}
                                              </span>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Future Tasks Section */}
      {futureTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('tasks.futureTasks')}
            </CardTitle>
            <CardDescription>
              {t('tasks.futureTasksDescription', { count: futureTasks.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('tasks.source')}</TableHead>
                  <TableHead>{t('tasks.schedule')}</TableHead>
                  <TableHead>{t('tasks.nextRun')}</TableHead>
                  <TableHead>{t('tasks.timeUntilRun')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {futureTasks.map((source) => {
                  const nextRunTime = new Date(source.nextSnapshotTime!);
                  const now = new Date();
                  const timeUntilRun = Math.max(0, nextRunTime.getTime() - now.getTime());
                  const hoursUntil = Math.floor(timeUntilRun / (1000 * 60 * 60));
                  const minutesUntil = Math.floor((timeUntilRun % (1000 * 60 * 60)) / (1000 * 60));

                  // Build schedule description
                  let scheduleDesc = '';
                  if (source.schedule?.manual) {
                    scheduleDesc = t('tasks.scheduleManual');
                  } else if (source.schedule?.intervalSeconds) {
                    const hours = Math.floor(source.schedule.intervalSeconds / 3600);
                    if (hours >= 24) {
                      scheduleDesc = t('tasks.scheduleEveryDays', {
                        count: Math.floor(hours / 24),
                      });
                    } else if (hours > 0) {
                      scheduleDesc = t('tasks.scheduleEveryHours', { count: hours });
                    } else {
                      const minutes = Math.floor(source.schedule.intervalSeconds / 60);
                      scheduleDesc = t('tasks.scheduleEveryMinutes', { count: minutes });
                    }
                  } else if (source.schedule?.cron && source.schedule.cron.length > 0) {
                    scheduleDesc = t('tasks.scheduleCron', { expr: source.schedule.cron[0] });
                  } else if (source.schedule?.timeOfDay && source.schedule.timeOfDay.length > 0) {
                    scheduleDesc = t('tasks.scheduleDailyAt', {
                      time: source.schedule.timeOfDay[0],
                    });
                  } else {
                    scheduleDesc = t('tasks.scheduleUnknown');
                  }

                  const sourceId = `${source.source.userName}@${source.source.host}:${source.source.path}`;

                  return (
                    <TableRow key={sourceId}>
                      <TableCell className="font-mono text-xs">{sourceId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{scheduleDesc}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {formatDateTime(nextRunTime.toISOString(), locale)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {hoursUntil > 0
                            ? t('tasks.timeUntilHours', {
                                hours: hoursUntil,
                                minutes: minutesUntil,
                              })
                            : t('tasks.timeUntilMinutes', { minutes: minutesUntil })}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Cancel Task Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tasks.cancelTask')}</DialogTitle>
            <DialogDescription>{t('tasks.confirmCancel')}</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-2 py-4">
              <div className="text-sm">
                <span className="font-medium">{t('tasks.taskId')}:</span> {selectedTask.id}
              </div>
              <div className="text-sm">
                <span className="font-medium">{t('tasks.kind')}:</span>{' '}
                {selectedTask.kind || t('tasks.unknown')}
              </div>
              <div className="text-sm">
                <span className="font-medium">{t('tasks.started')}:</span>{' '}
                {formatDateTime(selectedTask.startTime, locale)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
              disabled={isCancelling}
            >
              {t('tasks.close')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleCancelTask()}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  {t('tasks.cancelling')}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  {t('tasks.cancelTask')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
