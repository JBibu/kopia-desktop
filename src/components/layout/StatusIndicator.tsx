/**
 * Status indicator component for the sidebar
 * Shows current Kopia operation status (idle, backup, maintenance, etc.)
 */

import { useTranslation } from 'react-i18next';
import { useTasks, useRepositoryStatus } from '@/hooks';
import { Activity, CheckCircle2, AlertCircle, Pause, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Status = 'idle' | 'backup' | 'maintenance' | 'error' | 'disconnected';

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  animate?: boolean;
}

export function StatusIndicator() {
  const { t } = useTranslation();
  const { tasks, summary } = useTasks();
  const { isConnected } = useRepositoryStatus();

  // Determine current status based on tasks and repository state
  const getCurrentStatus = (): Status => {
    if (!isConnected) return 'disconnected';

    const runningTasks = tasks.filter((task) => task.status === 'RUNNING');

    if (runningTasks.length === 0) {
      // Check if there are recent failures
      if (summary && summary.failed > 0) {
        return 'error';
      }
      return 'idle';
    }

    // Check task types to determine if it's backup or maintenance
    const hasSnapshotTask = runningTasks.some(
      (task) =>
        task.kind?.toLowerCase().includes('snapshot') || task.kind?.toLowerCase().includes('backup')
    );

    const hasMaintenanceTask = runningTasks.some(
      (task) =>
        task.kind?.toLowerCase().includes('maintenance') ||
        task.kind?.toLowerCase().includes('blob-gc') ||
        task.kind?.toLowerCase().includes('content-gc')
    );

    if (hasMaintenanceTask) return 'maintenance';
    if (hasSnapshotTask) return 'backup';

    // Generic running state
    return 'backup';
  };

  const status = getCurrentStatus();

  const statusConfigs: Record<Status, StatusConfig> = {
    idle: {
      label: t('status.idle', 'Idle'),
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-500',
      borderColor: 'border-green-600 dark:border-green-500',
    },
    backup: {
      label: t('status.backup', 'Backing up...'),
      icon: Activity,
      color: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-600 dark:border-blue-400',
      animate: true,
    },
    maintenance: {
      label: t('status.maintenance', 'Maintenance...'),
      icon: Wrench,
      color: 'text-amber-600 dark:text-amber-400',
      borderColor: 'border-amber-600 dark:border-amber-400',
      animate: true,
    },
    error: {
      label: t('status.error', 'Error'),
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      borderColor: 'border-red-600 dark:border-red-400',
    },
    disconnected: {
      label: t('status.disconnected', 'Disconnected'),
      icon: Pause,
      color: 'text-muted-foreground',
      borderColor: 'border-muted-foreground',
    },
  };

  const config = statusConfigs[status];
  const Icon = config.icon;

  // Get additional info for active tasks
  const getStatusDetail = (): string | null => {
    if (status === 'backup' || status === 'maintenance') {
      const runningCount = summary?.running || 0;
      if (runningCount > 1) {
        return t('status.tasksRunning', `${runningCount} tasks`, { count: runningCount });
      }
    }
    return null;
  };

  const detail = getStatusDetail();

  return (
    <div className="px-3 py-2">
      <div className={cn('rounded-md border px-3 py-2', config.borderColor)}>
        {/* Status line */}
        <div className="flex items-center gap-2.5">
          <Icon
            className={cn('h-4 w-4 shrink-0', config.color, config.animate && 'animate-pulse')}
          />
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium', config.color)}>{config.label}</p>
            {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
