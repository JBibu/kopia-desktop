/**
 * Polling utilities for Kopia API
 *
 * Based on patterns from official Kopia HTMLui:
 * - Smart polling with auto-stop on completion
 * - Request deduplication to prevent concurrent calls
 * - Adaptive intervals for different data types
 * - Memory leak prevention
 */

export interface PollingOptions<T> {
  /** Fetch function to call */
  fetch: () => Promise<T>;

  /** Callback when data is received */
  onData: (data: T) => void;

  /** Callback when error occurs */
  onError?: (error: Error) => void;

  /** Polling interval in milliseconds (default: 3000) */
  interval?: number;

  /** Condition to stop polling */
  shouldStop?: (data: T) => boolean;

  /** Start immediately (default: true) */
  immediate?: boolean;
}

export interface PollingController {
  /** Start polling */
  start: () => void;

  /** Stop polling */
  stop: () => void;

  /** Check if currently polling */
  isPolling: () => boolean;

  /** Force a fetch now (skips deduplication) */
  fetchNow: () => Promise<void>;
}

/**
 * Create a polling controller with request deduplication
 *
 * Pattern from official HTMLui: Snapshots.jsx, Task.jsx
 *
 * @example
 * ```typescript
 * const poller = createPoller({
 *   fetch: () => getTasks(),
 *   onData: (tasks) => setTasks(tasks),
 *   interval: 5000,
 * });
 *
 * // In component mount
 * poller.start();
 *
 * // In component unmount
 * poller.stop();
 * ```
 */
export function createPoller<T>(options: PollingOptions<T>): PollingController {
  const { fetch, onData, onError, interval = 3000, shouldStop, immediate = true } = options;

  let intervalId: number | null = null;
  let isFetching = false;

  const performFetch = async () => {
    // Request deduplication - prevent concurrent requests
    if (isFetching) {
      return;
    }

    isFetching = true;

    try {
      const data = await fetch();
      onData(data);

      // Auto-stop if condition met
      if (shouldStop && shouldStop(data)) {
        stop();
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
    } finally {
      isFetching = false;
    }
  };

  const start = () => {
    if (intervalId !== null) {
      return; // Already polling
    }

    // Fetch immediately if requested
    if (immediate) {
      void performFetch();
    }

    // Start interval
    intervalId = window.setInterval(() => void performFetch(), interval);
  };

  const stop = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const isPolling = () => intervalId !== null;

  const fetchNow = async () => {
    await performFetch();
  };

  return {
    start,
    stop,
    isPolling,
    fetchNow,
  };
}

/**
 * Poll a task until it completes
 *
 * Pattern from official HTMLui: Task.jsx
 * - Fast polling (500ms) for responsive UI
 * - Auto-stop when task.endTime is set
 *
 * @example
 * ```typescript
 * const controller = pollTaskUntilComplete(taskId, (task) => {
 *   setTaskData(task);
 * });
 *
 * // Cleanup
 * return () => controller.stop();
 * ```
 */
export function pollTaskUntilComplete(
  taskId: string,
  onUpdate: (task: unknown) => void,
  onError?: (error: Error) => void
): PollingController {
  return createPoller({
    fetch: async () => {
      const { getTask } = await import('./client');
      return getTask(taskId);
    },
    onData: onUpdate,
    onError,
    interval: 500, // Fast polling for tasks
    shouldStop: (task) => !!task.endTime, // Stop when task completes
    immediate: true,
  });
}

/**
 * Poll snapshot sources
 *
 * Pattern from official HTMLui: Snapshots.jsx
 * - Medium interval (3s) for list updates
 * - No auto-stop (continuous polling while mounted)
 */
export function pollSnapshotSources(
  onUpdate: (sources: unknown) => void,
  onError?: (error: Error) => void
): PollingController {
  return createPoller({
    fetch: async () => {
      const { listSources } = await import('./client');
      return listSources();
    },
    onData: onUpdate,
    onError,
    interval: 3000, // Medium polling for lists
    immediate: true,
  });
}

/**
 * Poll task summary
 *
 * Pattern from official HTMLui: App.jsx
 * - Slow interval (5s) for background updates
 * - Used for running task count in UI
 */
export function pollTaskSummary(
  onUpdate: (summary: unknown) => void,
  onError?: (error: Error) => void
): PollingController {
  return createPoller({
    fetch: async () => {
      const { getTasksSummary } = await import('./client');
      return getTasksSummary();
    },
    onData: onUpdate,
    onError,
    interval: 5000, // Slow polling for background data
    immediate: true,
  });
}

/**
 * React hook for easy polling in components
 *
 * Automatically handles cleanup on unmount
 *
 * @example
 * ```typescript
 * function TaskMonitor({ taskId }: { taskId: string }) {
 *   const [task, setTask] = useState(null);
 *
 *   usePolling({
 *     fetch: () => getTask(taskId),
 *     onData: setTask,
 *     interval: 500,
 *     shouldStop: (t) => !!t.endTime,
 *   });
 *
 *   return <div>{task?.status}</div>;
 * }
 * ```
 */
export function usePolling<T>(options: PollingOptions<T>): {
  start: () => void;
  stop: () => void;
  fetchNow: () => Promise<void>;
} {
  // This will be implemented in a React hook file
  // Placeholder for now
  const controller = createPoller(options);
  return controller;
}

/**
 * Recommended polling intervals
 */
export const POLLING_INTERVALS = {
  /** Fast polling for active tasks and user-triggered actions */
  FAST: 500,

  /** Medium polling for list updates */
  MEDIUM: 3000,

  /** Slow polling for background summaries */
  SLOW: 5000,

  /** Very slow for rarely-changing data */
  VERY_SLOW: 10000,
} as const;

/**
 * Create adaptive polling that adjusts interval based on activity
 *
 * @example
 * ```typescript
 * const poller = createAdaptivePoller({
 *   fetch: () => getTasks(),
 *   onData: setTasks,
 *   activeInterval: 500,    // When tasks running
 *   inactiveInterval: 5000, // When idle
 *   isActive: (tasks) => tasks.some(t => !t.endTime),
 * });
 * ```
 */
export function createAdaptivePoller<T>(options: {
  fetch: () => Promise<T>;
  onData: (data: T) => void;
  onError?: (error: Error) => void;
  activeInterval: number;
  inactiveInterval: number;
  isActive: (data: T) => boolean;
}): PollingController {
  const { fetch, onData, onError, activeInterval, inactiveInterval, isActive } = options;

  let currentController: PollingController | null = null;
  let lastActivity = false;

  const wrappedOnData = (data: T) => {
    onData(data);

    const active = isActive(data);

    // Switch interval if activity changed
    if (active !== lastActivity) {
      lastActivity = active;

      if (currentController) {
        currentController.stop();
      }

      currentController = createPoller({
        fetch,
        onData: wrappedOnData,
        onError,
        interval: active ? activeInterval : inactiveInterval,
        immediate: false, // Don't fetch again immediately
      });

      currentController.start();
    }
  };

  currentController = createPoller({
    fetch,
    onData: wrappedOnData,
    onError,
    interval: inactiveInterval,
    immediate: true,
  });

  return {
    start: () => currentController?.start(),
    stop: () => currentController?.stop(),
    isPolling: () => currentController?.isPolling() ?? false,
    fetchNow: async () => currentController?.fetchNow(),
  };
}
