/**
 * Snapshot Estimation Results - Shows estimation task progress and results
 *
 * Displays real-time estimation results including bytes, files, directories,
 * and errors with excluded/ignored counts. Polls the task API for live updates.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChevronDown,
  ChevronUp,
  StopCircle,
  Calculator,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { getTask, cancelTask } from '@/lib/kopia/client';
import type { TaskDetail } from '@/lib/kopia/types';
import { formatBytes } from '@/lib/utils';
import { usePreferencesStore } from '@/stores/preferences';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia/errors';
import { useCurrentRepoId } from '@/hooks/useCurrentRepo';

interface SnapshotEstimationResultsProps {
  taskId: string;
  onClose: () => void;
}

export function SnapshotEstimationResults({ taskId, onClose }: SnapshotEstimationResultsProps) {
  const { t } = useTranslation();
  const byteFormat = usePreferencesStore((state) => state.byteFormat);
  const currentRepoId = useCurrentRepoId();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch task status
  useEffect(() => {
    if (!currentRepoId) {
      return;
    }

    let interval: number | null = null;

    const fetchTask = async () => {
      try {
        const taskData = await getTask(currentRepoId, taskId);
        setTask(taskData);
        setIsLoading(false);

        // Stop polling when task completes
        if (taskData.endTime && interval) {
          clearInterval(interval);
          interval = null;
        }
      } catch (err) {
        console.error('Failed to fetch estimation task:', err);
        toast.error(getErrorMessage(err));
        setIsLoading(false);
      }
    };

    void fetchTask();

    // Poll every 500ms while running (fast updates for estimation)
    interval = window.setInterval(() => void fetchTask(), 500) as unknown as number;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [taskId, currentRepoId]);

  const handleCancel = async () => {
    if (!currentRepoId) return;
    try {
      await cancelTask(currentRepoId, taskId);
      toast.success(t('tasks.cancelled'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (isLoading || !task) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Spinner className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isRunning = task.status === 'RUNNING';
  const isSuccess = task.status === 'SUCCESS';
  const isFailed = task.status === 'FAILED';
  const isCanceled = task.status === 'CANCELED';

  const counters = task.counters || {};
  const bytes = counters['Bytes']?.value || 0;
  const excludedBytes = counters['Excluded Bytes']?.value || 0;
  const files = counters['Files']?.value || 0;
  const excludedFiles = counters['Excluded Files']?.value || 0;
  const directories = counters['Directories']?.value || 0;
  const excludedDirs = counters['Excluded Directories']?.value || 0;
  const errors = counters['Errors']?.value || 0;
  const ignoredErrors = counters['Ignored Errors']?.value || 0;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          {t('snapshots.estimation.title')}
          {isRunning && <Spinner className="h-4 w-4" />}
          {isSuccess && <CheckCircle2 className="h-5 w-5 text-success" />}
          {isFailed && <XCircle className="h-5 w-5 text-destructive" />}
          {isCanceled && <AlertCircle className="h-5 w-5 text-warning" />}
        </CardTitle>
        <CardDescription>
          {isRunning && t('snapshots.estimation.running')}
          {isSuccess && t('snapshots.estimation.completed')}
          {isFailed && t('snapshots.estimation.failed')}
          {isCanceled && t('snapshots.estimation.canceled')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estimation Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <span className="text-muted-foreground">{t('snapshots.estimation.bytes')}:</span>
            <div className="font-mono font-semibold">
              {formatBytes(bytes, 2, byteFormat)}
              {excludedBytes > 0 && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({formatBytes(excludedBytes, 2, byteFormat)} {t('common.excluded')})
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground">{t('snapshots.estimation.files')}:</span>
            <div className="font-mono font-semibold">
              {files.toLocaleString()}
              {excludedFiles > 0 && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({excludedFiles.toLocaleString()} {t('common.excluded')})
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground">{t('snapshots.estimation.directories')}:</span>
            <div className="font-mono font-semibold">
              {directories.toLocaleString()}
              {excludedDirs > 0 && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({excludedDirs.toLocaleString()} {t('common.excluded')})
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground">{t('snapshots.estimation.errors')}:</span>
            <div className="font-mono font-semibold">
              {errors.toLocaleString()}
              {ignoredErrors > 0 && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({ignoredErrors.toLocaleString()} {t('common.ignored')})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error Message (if failed) */}
        {isFailed && task.errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{task.errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {isRunning && (
            <Button size="sm" variant="destructive" onClick={() => void handleCancel()}>
              <StopCircle className="h-4 w-4 mr-2" />
              {t('common.cancel')}
            </Button>
          )}

          <Button size="sm" variant="outline" onClick={() => setShowLog(!showLog)}>
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

          {!isRunning && (
            <Button size="sm" variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
          )}
        </div>

        {/* Logs */}
        {showLog && (
          <div className="bg-black text-white p-4 rounded font-mono text-xs max-h-64 overflow-y-auto whitespace-pre-wrap">
            {task.logs?.join('\n') || t('tasks.noLogs')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
