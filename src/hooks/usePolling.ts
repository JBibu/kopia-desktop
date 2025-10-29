import { useEffect, useRef } from 'react';
import { createPoller, type PollingOptions } from '@/lib/kopia/polling';

/**
 * React hook for polling with automatic cleanup
 *
 * Based on patterns from official Kopia HTMLui
 *
 * Features:
 * - Automatic cleanup on unmount (prevents memory leaks)
 * - Request deduplication
 * - Auto-stop on condition
 *
 * @example
 * ```typescript
 * function TaskMonitor({ taskId }: { taskId: string }) {
 *   const [task, setTask] = useState<TaskDetail | null>(null);
 *
 *   usePolling({
 *     fetch: () => getTask(taskId),
 *     onData: setTask,
 *     interval: 500,
 *     shouldStop: (t) => !!t.endTime, // Stop when complete
 *   });
 *
 *   if (!task) return <div>Loading...</div>;
 *   return <div>Status: {task.status}</div>;
 * }
 * ```
 */
export function usePolling<T>(options: PollingOptions<T>) {
  const controllerRef = useRef(createPoller(options));

  useEffect(() => {
    // Start polling on mount
    const controller = controllerRef.current;
    controller.start();

    // Cleanup on unmount (CRITICAL for memory leak prevention)
    return () => {
      controller.stop();
    };
  }, []); // Empty deps - only mount/unmount

  return {
    stop: () => controllerRef.current.stop(),
    start: () => controllerRef.current.start(),
    fetchNow: () => controllerRef.current.fetchNow(),
  };
}

/**
 * Hook to poll a task until it completes
 *
 * @example
 * ```typescript
 * function TaskProgress({ taskId }: { taskId: string }) {
 *   const [task, setTask] = useState(null);
 *   useTaskPolling(taskId, setTask);
 *
 *   return <div>{task?.counters?.processedBytes} bytes</div>;
 * }
 * ```
 */
export function useTaskPolling(
  taskId: string | null,
  onUpdate: (task: unknown) => void,
  onError?: (error: Error) => void
) {
  usePolling({
    fetch: async () => {
      if (!taskId) throw new Error('No task ID');
      const { getTask } = await import('@/lib/kopia/client');
      return getTask(taskId);
    },
    onData: onUpdate,
    onError,
    interval: 500,
    shouldStop: (task) => !!task.endTime,
    immediate: !!taskId,
  });
}

/**
 * Hook to poll snapshot sources
 *
 * @example
 * ```typescript
 * function SnapshotList() {
 *   const [sources, setSources] = useState([]);
 *   useSnapshotSourcesPolling(setSources);
 *
 *   return sources.map(s => <div key={s.path}>{s.path}</div>);
 * }
 * ```
 */
export function useSnapshotSourcesPolling(
  onUpdate: (sources: unknown) => void,
  onError?: (error: Error) => void,
  enabled = true
) {
  usePolling({
    fetch: async () => {
      if (!enabled) throw new Error('Polling disabled');
      const { listSources } = await import('@/lib/kopia/client');
      return listSources();
    },
    onData: onUpdate,
    onError,
    interval: 3000,
    immediate: enabled,
  });
}

/**
 * Hook to poll task summary (for showing running task count)
 *
 * @example
 * ```typescript
 * function TaskBadge() {
 *   const [summary, setSummary] = useState({ runningCount: 0 });
 *   useTaskSummaryPolling(setSummary);
 *
 *   if (summary.runningCount === 0) return null;
 *   return <Badge>{summary.runningCount} tasks running</Badge>;
 * }
 * ```
 */
export function useTaskSummaryPolling(
  onUpdate: (summary: unknown) => void,
  onError?: (error: Error) => void
) {
  usePolling({
    fetch: async () => {
      const { getTasksSummary } = await import('@/lib/kopia/client');
      return getTasksSummary();
    },
    onData: onUpdate,
    onError,
    interval: 5000,
    immediate: true,
  });
}
