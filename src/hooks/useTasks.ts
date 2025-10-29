/**
 * Custom hook for task monitoring
 */

import { useState, useCallback, useEffect } from 'react';
import * as kopia from '@/lib/kopia/client';
import type { Task, TasksSummary } from '@/lib/kopia/types';
import { getErrorMessage } from '@/lib/kopia/errors';
import { toast } from 'sonner';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await kopia.listTasks();
      setTasks(response.tasks || []);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      // Don't show toast for polling errors to avoid spam
      if (!autoRefresh) {
        toast.error(`Failed to fetch tasks: ${message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [autoRefresh]);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await kopia.getTasksSummary();
      setSummary(result);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      if (!autoRefresh) {
        toast.error(`Failed to fetch task summary: ${message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [autoRefresh]);

  const getTask = useCallback(async (taskId: string): Promise<Task | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await kopia.getTask(taskId);
      return result;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(`Failed to fetch task details: ${message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelTask = useCallback(
    async (taskId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await kopia.cancelTask(taskId);
        toast.success('Task cancelled successfully');
        await fetchTasks();
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(`Failed to cancel task: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchTasks]
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
