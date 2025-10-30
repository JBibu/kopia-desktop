/**
 * Custom hook for task monitoring
 */

import { useState, useCallback, useEffect } from 'react';
import * as kopia from '@/lib/kopia/client';
import type { Task, TasksSummary } from '@/lib/kopia/types';
import { useAsyncOperation } from './useAsyncOperation';

interface UseTasksOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseTasksReturn {
  tasks: Task[];
  summary: TasksSummary | null;
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  getTask: (taskId: string) => Promise<Task | null>;
  cancelTask: (taskId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const { autoRefresh = false, refreshInterval = 5000 } = options;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<TasksSummary | null>(null);
  const { isLoading, error, execute } = useAsyncOperation();

  const fetchTasks = useCallback(async () => {
    const response = await execute(() => kopia.listTasks(), {
      errorContext: 'Failed to fetch tasks',
      // Don't show toast for polling errors to avoid spam
      showToast: !autoRefresh,
    });
    if (response) {
      setTasks(response.tasks || []);
    }
  }, [autoRefresh, execute]);

  const fetchSummary = useCallback(async () => {
    const result = await execute(() => kopia.getTasksSummary(), {
      errorContext: 'Failed to fetch task summary',
      showToast: !autoRefresh,
    });
    if (result) {
      setSummary(result);
    }
  }, [autoRefresh, execute]);

  const getTask = useCallback(
    async (taskId: string): Promise<Task | null> => {
      return await execute(() => kopia.getTask(taskId), {
        errorContext: 'Failed to fetch task details',
      });
    },
    [execute]
  );

  const cancelTask = useCallback(
    async (taskId: string) => {
      const result = await execute(() => kopia.cancelTask(taskId), {
        errorContext: 'Failed to cancel task',
        successMessage: 'Task cancelled successfully',
        onSuccess: () => void fetchTasks(),
      });
      if (!result) {
        throw new Error('Failed to cancel task');
      }
    },
    [execute, fetchTasks]
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchTasks(), fetchSummary()]);
  }, [fetchTasks, fetchSummary]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => void refreshAll(), refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshAll]);

  return {
    tasks,
    summary,
    isLoading,
    error,
    fetchTasks,
    fetchSummary,
    getTask,
    cancelTask,
    refreshAll,
  };
}
