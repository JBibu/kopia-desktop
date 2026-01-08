/**
 * Task Detail Page - Individual task view with live updates
 *
 * Displays comprehensive task information including status, progress, counters,
 * and logs. Polls the task API every 500ms for live updates while task is running.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ChevronLeft,
  StopCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { TaskDetail as TaskDetailType } from '@/lib/kopia';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia';
import { formatDateTime, formatBytes } from '@/lib/utils';
import { usePreferencesStore } from '@/stores';
import { useKopiaStore } from '@/stores';

export function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const byteFormat = usePreferencesStore((state) => state.byteFormat);

  // Use store methods which handle repoId internally
  const getTask = useKopiaStore((state) => state.getTask);
  const cancelTaskAction = useKopiaStore((state) => state.cancelTask);

  const [task, setTask] = useState<TaskDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [showZeroCounters, setShowZeroCounters] = useState(false);

  // Fetch task details
  useEffect(() => {
    if (!taskId) return;

    let interval: number | null = null;

    const fetchTask = async () => {
      try {
        const taskData = await getTask(taskId);
        if (taskData) {
          setTask(taskData);
          setError(null);

          // Stop polling when task completes
          if (taskData.endTime && interval) {
            clearInterval(interval);
            interval = null;
          }
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch task:', err);
        setError(getErrorMessage(err));
        setIsLoading(false);
      }
    };

    void fetchTask();

    // Poll every 500ms while running (fast updates for live monitoring)
    interval = window.setInterval(() => void fetchTask(), 500) as unknown as number;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [taskId, getTask]);

  const handleCancel = () => {
    if (!taskId) return;

    void (async () => {
      try {
        await cancelTaskAction(taskId);
        toast.success(t('tasks.cancelled'));
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    })();
  };

  const handleGoBack = () => {
    void navigate('/tasks');
  };

  // Calculate duration
  const getDuration = (startTime?: string, endTime?: string): string => {
    if (!startTime) return t('common.unknown');

    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : new Date().getTime();
    const durationMs = end - start;

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Format counter value
  const formatCounterValue = (counter: { value: number; units?: string }): string => {
    if (counter.units === 'bytes') {
      return formatBytes(counter.value, 2, byteFormat);
    }
    return counter.value.toLocaleString();
  };

  // Filter counters by level and value
  const getCountersByLevel = (level: string) => {
    if (!task?.counters) return [];

    return Object.entries(task.counters)
      .filter(([_, counter]) => {
        if (!showZeroCounters && (counter.value ?? 0) <= 0) return false;
        return (counter.level || 'notice') === level;
      })
      .sort((a, b) => a[0].localeCompare(b[0]));
  };

  if (isLoading || !task) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={handleGoBack} className="mt-4">
          <ChevronLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const isRunning = task.status === 'RUNNING';
  const isSuccess = task.status === 'SUCCESS';
  const isFailed = task.status === 'FAILED';
  const isCanceled = task.status === 'CANCELED';
  const isCanceling = task.status === 'CANCELING';

  const duration = getDuration(task.startTime, task.endTime);

  // Get counters by level
  const noticeCounters = getCountersByLevel('notice');
  const detailCounters = getCountersByLevel('detail');
  const debugCounters = getCountersByLevel('debug');

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('tasks.detail.title')}</h1>
            <p className="text-sm text-muted-foreground">{task.id}</p>
          </div>
        </div>
        {isRunning && (
          <Button variant="destructive" size="sm" onClick={handleCancel}>
            <StopCircle className="h-4 w-4 mr-2" />
            {t('common.cancel')}
          </Button>
        )}
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('tasks.status')}
            {isRunning && <Spinner className="h-4 w-4" />}
            {isSuccess && <CheckCircle2 className="h-5 w-5 text-success" />}
            {isFailed && <XCircle className="h-5 w-5 text-destructive" />}
            {isCanceled && <AlertCircle className="h-5 w-5 text-warning" />}
            {isCanceling && <Spinner className="h-4 w-4 text-warning" />}
          </CardTitle>
          <CardDescription>{task.description || t('tasks.noDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Alert */}
          {isSuccess && (
            <Alert className="border-success bg-success/10">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription>{t('tasks.detail.succeeded', { duration })}</AlertDescription>
            </Alert>
          )}

          {isFailed && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('common.error')}:</strong> {task.errorMessage || t('tasks.unknownError')}
              </AlertDescription>
            </Alert>
          )}

          {isCanceled && (
            <Alert className="border-warning bg-warning/10">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription>{t('tasks.detail.canceled')}</AlertDescription>
            </Alert>
          )}

          {isCanceling && (
            <Alert>
              <Spinner className="h-4 w-4" />
              <AlertDescription>
                {t('tasks.detail.canceling', { duration })}: {task.progressInfo}
              </AlertDescription>
            </Alert>
          )}

          {isRunning && (
            <Alert>
              <Spinner className="h-4 w-4" />
              <AlertDescription>
                {t('tasks.detail.running', { duration })}: {task.progressInfo}
              </AlertDescription>
            </Alert>
          )}

          {/* Timing Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('tasks.startTime')}:
              </div>
              <div className="font-mono">
                {task.startTime ? formatDateTime(task.startTime) : t('common.unknown')}
              </div>
            </div>

            {task.endTime && (
              <div className="space-y-1">
                <div className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('tasks.endTime')}:
                </div>
                <div className="font-mono">{formatDateTime(task.endTime)}</div>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-muted-foreground">{t('tasks.duration')}:</div>
              <div className="font-mono font-semibold">{duration}</div>
            </div>

            <div className="space-y-1">
              <div className="text-muted-foreground">{t('tasks.kind')}:</div>
              <Badge variant="secondary">{task.kind || t('common.unknown')}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Counters Card */}
      {task.counters && Object.keys(task.counters).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('tasks.counters')}</CardTitle>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-zero"
                  checked={showZeroCounters}
                  onCheckedChange={setShowZeroCounters}
                />
                <Label htmlFor="show-zero" className="text-sm cursor-pointer">
                  {t('tasks.showZeroCounters')}
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Notice Level Counters */}
            {noticeCounters.length > 0 && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {noticeCounters.map(([label, counter]) => (
                    <div
                      key={label}
                      className="flex justify-between items-center p-2 rounded bg-muted/50"
                    >
                      <span className="text-sm font-medium">{label}</span>
                      <span className="font-mono font-semibold">{formatCounterValue(counter)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detail Level Counters */}
            {detailCounters.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">{t('tasks.detailCounters')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {detailCounters.map(([label, counter]) => (
                    <div key={label} className="flex justify-between items-center p-1.5 rounded">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono">{formatCounterValue(counter)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debug Level Counters */}
            {debugCounters.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                  {t('tasks.debugCounters')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {debugCounters.map(([label, counter]) => (
                    <div key={label} className="flex justify-between items-center p-1.5 rounded">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono">{formatCounterValue(counter)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Logs Card */}
      {task.logs && task.logs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('tasks.logs')}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowLog(!showLog)}>
                {showLog ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    {t('tasks.hideLog')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    {t('tasks.showLog')}
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {showLog && (
            <CardContent>
              <div className="bg-black text-white p-4 rounded font-mono text-xs max-h-96 overflow-y-auto whitespace-pre-wrap">
                {task.logs.join('\n')}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
