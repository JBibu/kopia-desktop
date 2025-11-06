/**
 * Tasks page - Monitor and manage background tasks
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTasks } from '@/hooks/useTasks';
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
import { Spinner } from '@/components/ui/spinner';
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
} from 'lucide-react';
import type { Task } from '@/lib/kopia/types';
import { formatDateTime } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language';

export function Tasks() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const { tasks, summary, isLoading, error, isWebSocketConnected, cancelTask, refreshAll } =
    useTasks();

  // Map language code to locale
  const locale = language === 'es' ? 'es-ES' : 'en-US';

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleRefresh = async () => {
    await refreshAll();
  };

  const handleCancelTask = async () => {
    if (!selectedTask) return;

    setIsCancelling(true);
    try {
      await cancelTask(selectedTask.id);
      setShowCancelDialog(false);
      setSelectedTask(null);
    } catch {
      // Error is handled by the hook
    } finally {
      setIsCancelling(false);
    }
  };

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
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
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
                      {task.progressInfo ? (
                        <span className="text-sm text-muted-foreground">{task.progressInfo}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {task.status === 'RUNNING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task);
                            setShowCancelDialog(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Task Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
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
              onClick={() => setShowCancelDialog(false)}
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
