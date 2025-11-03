/**
 * Custom hook for task monitoring
 *
 * Now delegates to global Zustand store to eliminate redundant state management.
 * Polling is handled centrally in the store (5-second interval for real-time updates).
 */

import { useKopiaStore } from '@/stores/kopia';
import type { Task, TasksSummary } from '@/lib/kopia/types';

interface UseTasksOptions {
  autoRefresh?: boolean; // Legacy option - now ignored (always auto-refresh from store)
  refreshInterval?: number; // Legacy option - now ignored (controlled by store)
}

interface UseTasksReturn {
  tasks: Task[];
  summary: TasksSummary | null;
  isLoading: boolean;
  error: string | null;
  isWebSocketConnected: boolean;
  fetchTasks: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  getTask: (taskId: string) => Promise<Task | null>;
  cancelTask: (taskId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

/**
 * Hook for task monitoring.
 * Uses global Zustand store for state - no local state or polling.
 * Tasks are automatically updated in real-time via WebSocket, with polling fallback.
 */
export function useTasks(_options: UseTasksOptions = {}): UseTasksReturn {
  // Legacy options are ignored - polling is controlled by global store
  // Keeping the signature for backward compatibility

  // Subscribe to global store
  const tasks = useKopiaStore((state) => state.tasks);
  const summary = useKopiaStore((state) => state.tasksSummary);
  const isLoading = useKopiaStore((state) => state.isTasksLoading);
  const error = useKopiaStore((state) => state.tasksError);
  const isWebSocketConnected = useKopiaStore((state) => state.isWebSocketConnected);
  const fetchTasks = useKopiaStore((state) => state.refreshTasks);
  const fetchSummary = useKopiaStore((state) => state.refreshTasksSummary);
  const getTask = useKopiaStore((state) => state.getTask);
  const cancelTask = useKopiaStore((state) => state.cancelTask);

  const refreshAll = async () => {
    await Promise.all([fetchTasks(), fetchSummary()]);
  };

  return {
    tasks,
    summary,
    isLoading,
    error,
    isWebSocketConnected,
    fetchTasks,
    fetchSummary,
    getTask,
    cancelTask,
    refreshAll,
  };
}
