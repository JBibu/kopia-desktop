/**
 * Global Kopia state store using Zustand
 *
 * Centralized state management for ALL Kopia data with multi-repository support.
 * Single source of truth for:
 * - Repository list and current repository selection
 * - Server status (per repository)
 * - Repository status
 * - Snapshots & sources
 * - Policies
 * - Tasks & summary
 * - Auto-refresh with configurable polling intervals
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import {
  getKopiaServerStatus,
  getRepositoryStatus,
  startKopiaServer,
  stopKopiaServer,
  connectRepository,
  disconnectRepository,
  listSnapshots,
  listSources,
  createSnapshot as apiCreateSnapshot,
  deleteSnapshots as apiDeleteSnapshots,
  listPolicies,
  getPolicy as apiGetPolicy,
  setPolicy as apiSetPolicy,
  deletePolicy as apiDeletePolicy,
  listTasks,
  getTasksSummary,
  getTask as apiGetTask,
  cancelTask as apiCancelTask,
  connectWebSocket,
  disconnectWebSocket,
  listMounts,
  mountSnapshot as apiMountSnapshot,
  unmountSnapshot as apiUnmountSnapshot,
  listRepositories as apiListRepositories,
  addRepository as apiAddRepository,
  removeRepository as apiRemoveRepository,
  type KopiaServerStatus,
  type KopiaServerInfo,
  type RepositoryStatus,
  type RepositoryConnectRequest,
  type RepositoryEntry,
} from '@/lib/kopia';
import type {
  Snapshot,
  SourcesResponse,
  PolicyDefinition,
  PolicyResponse,
  Task,
  TasksSummary,
  WebSocketEvent,
  WebSocketDisconnectEvent,
  MountsResponse,
} from '@/lib/kopia';
import { getErrorMessage, parseKopiaError, KopiaErrorCode } from '@/lib/kopia';
import { notifyTaskComplete } from '@/lib/notifications';

/** Default repository ID (matches Kopia CLI default) */
const DEFAULT_REPO_ID = 'repository';

// ============================================================================
// Store Helper Functions (reduce repetitive patterns)
// ============================================================================

type StoreGet = () => KopiaStore;
type StoreSet = (partial: Partial<KopiaStore>) => void;

/**
 * Track in-flight refresh operations to prevent duplicate concurrent requests.
 * When a refresh is already in-flight for a given key, subsequent calls are skipped.
 */
const inFlightRequests = new Set<string>();

/**
 * Execute a refresh operation with deduplication.
 *
 * If the same operation is already in-flight, this call will be skipped to prevent
 * duplicate concurrent HTTP requests. This is particularly important when:
 * - WebSocket events trigger refreshes while polling refresh is in-flight
 * - Multiple UI components trigger the same refresh simultaneously
 *
 * @param key - Unique identifier for the operation (e.g., 'tasks', 'snapshots')
 * @param fn - Async function to execute
 * @returns The result of fn, or undefined if skipped due to deduplication
 */
async function withDeduplication<T>(key: string, fn: () => Promise<T>): Promise<T | undefined> {
  if (inFlightRequests.has(key)) {
    if (import.meta.env.DEV) {
      console.log(`Skipping duplicate ${key} refresh (already in-flight)`);
    }
    return undefined;
  }

  inFlightRequests.add(key);
  try {
    return await fn();
  } finally {
    inFlightRequests.delete(key);
  }
}

/**
 * Execute an async action only if a repository is currently selected.
 *
 * Use this helper for store actions that should gracefully skip when no repository
 * is selected (e.g., refresh operations during polling).
 *
 * @param get - Store getter function
 * @param fn - Async function to execute with the current repository ID
 * @returns The result of fn, or undefined if no repository is selected
 *
 * @example
 * ```ts
 * refreshSnapshots: async () => {
 *   await withRepoId(get, async (repoId) => {
 *     const snapshots = await listSnapshots(repoId);
 *     set({ snapshots });
 *   });
 * }
 * ```
 */
async function withRepoId<T>(
  get: StoreGet,
  fn: (repoId: string) => Promise<T>
): Promise<T | undefined> {
  const { currentRepoId } = get();
  if (!currentRepoId) return undefined;
  return fn(currentRepoId);
}

/**
 * Get the current repository ID or throw an error if none is selected.
 *
 * Use this helper for store actions that require a repository to be selected
 * and should fail explicitly if one isn't (e.g., create/delete operations).
 *
 * @param get - Store getter function
 * @returns The current repository ID
 * @throws Error if no repository is selected
 *
 * @example
 * ```ts
 * createSnapshot: async (path: string) => {
 *   const repoId = requireRepoId(get);
 *   await apiCreateSnapshot(repoId, path);
 * }
 * ```
 */
function requireRepoId(get: StoreGet): string {
  const { currentRepoId } = get();
  if (!currentRepoId) throw new Error('No repository selected');
  return currentRepoId;
}

/**
 * Update an error state only if the message has changed.
 *
 * This helper prevents redundant state updates during polling, which would
 * cause unnecessary re-renders. Used in refresh operations to deduplicate
 * repeated error messages.
 *
 * @param get - Store getter function
 * @param set - Store setter function
 * @param errorKey - The error state key to update
 * @param message - The new error message
 *
 * @example
 * ```ts
 * refreshSnapshots: async () => {
 *   try {
 *     // ... fetch logic
 *   } catch (error) {
 *     setErrorIfChanged(get, set, 'snapshotsError', getErrorMessage(error));
 *   }
 * }
 * ```
 */
function setErrorIfChanged(
  get: StoreGet,
  set: StoreSet,
  errorKey:
    | 'serverError'
    | 'repositoryError'
    | 'snapshotsError'
    | 'policiesError'
    | 'tasksError'
    | 'mountsError',
  message: string
) {
  const currentError = get()[errorKey];
  if (currentError !== message) {
    set({ [errorKey]: message } as Partial<KopiaStore>);
  }
}

interface KopiaStore {
  // Multi-repository state
  repositories: RepositoryEntry[];
  currentRepoId: string | null;
  repositoriesError: string | null;
  isRepositoriesLoading: boolean;

  // Server state (for current repository)
  serverStatus: KopiaServerStatus | null;
  serverInfo: KopiaServerInfo | null;
  serverError: string | null;
  isServerLoading: boolean;

  // Repository state (for current repository)
  repositoryStatus: RepositoryStatus | null;
  repositoryError: string | null;
  isRepositoryLoading: boolean;

  // Snapshots state (for current repository)
  snapshots: Snapshot[];
  sourcesResponse: SourcesResponse | null;
  snapshotsError: string | null;
  isSnapshotsLoading: boolean;

  // Policies state (for current repository)
  policies: PolicyResponse[];
  policiesError: string | null;
  isPoliciesLoading: boolean;

  // Tasks state (for current repository)
  tasks: Task[];
  tasksSummary: TasksSummary | null;
  tasksError: string | null;
  isTasksLoading: boolean;

  // Mounts state (for current repository)
  mounts: MountsResponse | null;
  mountsError: string | null;
  isMountsLoading: boolean;

  // Polling state
  isPolling: boolean;
  serverPollingInterval: number; // For server/repo (30s)
  tasksPollingInterval: number; // For tasks (5s - real-time, fallback if WebSocket fails)
  sourcesPollingInterval: number; // For sources (3s - matches official KopiaUI)

  // WebSocket state
  isWebSocketConnected: boolean;
  useWebSocket: boolean; // Prefer WebSocket over polling for tasks

  // Derived state
  isServerRunning: () => boolean;
  isRepoConnected: () => boolean;
  isRepoInitializing: () => boolean;
  hasRepositories: () => boolean;
  getCurrentRepository: () => RepositoryEntry | null;

  // Multi-repo management actions
  refreshRepositories: () => Promise<void>;
  addRepository: (repoId?: string) => Promise<string | null>;
  removeRepository: (repoId: string) => Promise<void>;
  setCurrentRepository: (repoId: string) => Promise<void>;

  // Server actions
  refreshServerStatus: () => Promise<void>;
  startServer: () => Promise<KopiaServerInfo | null>;
  stopServer: () => Promise<void>;

  // Repository actions
  refreshRepositoryStatus: () => Promise<void>;
  connectRepo: (config: RepositoryConnectRequest) => Promise<boolean>;
  disconnectRepo: () => Promise<void>;

  // Snapshots actions
  refreshSnapshots: () => Promise<void>;
  refreshSources: () => Promise<void>;
  createSnapshot: (
    path: string,
    createSnapshot?: boolean,
    policy?: PolicyDefinition
  ) => Promise<void>;
  deleteSnapshots: (
    userName: string,
    host: string,
    path: string,
    manifestIDs: string[]
  ) => Promise<void>;
  fetchSnapshotsForSource: (
    userName: string,
    host: string,
    path: string,
    all?: boolean
  ) => Promise<Snapshot[]>;

  // Policies actions
  refreshPolicies: () => Promise<void>;
  getPolicy: (userName?: string, host?: string, path?: string) => Promise<PolicyDefinition | null>;
  setPolicy: (
    policy: PolicyDefinition,
    userName?: string,
    host?: string,
    path?: string
  ) => Promise<void>;
  deletePolicy: (userName?: string, host?: string, path?: string) => Promise<void>;

  // Tasks actions
  refreshTasks: () => Promise<void>;
  refreshTasksSummary: () => Promise<void>;
  getTask: (taskId: string) => Promise<Task | null>;
  cancelTask: (taskId: string) => Promise<void>;

  // Mount actions
  refreshMounts: () => Promise<void>;
  mountSnapshot: (root: string) => Promise<string | null>;
  unmountSnapshot: (objectId: string) => Promise<void>;
  getMountForObject: (objectId: string) => string | null;

  // Polling control
  startPolling: () => void;
  stopPolling: () => void;
  setServerPollingInterval: (interval: number) => void;
  setTasksPollingInterval: (interval: number) => void;

  // WebSocket control
  startWebSocket: () => Promise<void>;
  stopWebSocket: () => Promise<void>;
  setUseWebSocket: (use: boolean) => void;

  // Utility
  refreshAll: () => Promise<void>;
  reset: () => void;
}

// Polling timer references (outside store to avoid serialization issues)
let serverPollingTimer: ReturnType<typeof setInterval> | null = null;
let tasksPollingTimer: ReturnType<typeof setInterval> | null = null;
let sourcesPollingTimer: ReturnType<typeof setInterval> | null = null;

// WebSocket event listener (outside store to avoid serialization issues)
let wsEventUnlisten: UnlistenFn | null = null;
let wsDisconnectUnlisten: UnlistenFn | null = null;

/** Helper to clean up WebSocket listeners */
function cleanupWSListeners() {
  if (wsEventUnlisten) {
    wsEventUnlisten();
    wsEventUnlisten = null;
  }
  if (wsDisconnectUnlisten) {
    wsDisconnectUnlisten();
    wsDisconnectUnlisten = null;
  }
}

/** Initial state values - used for store initialization and reset */
const INITIAL_STATE = {
  // Multi-repository
  repositories: [] as RepositoryEntry[],
  currentRepoId: null as string | null,
  repositoriesError: null as string | null,
  isRepositoriesLoading: false,

  // Server
  serverStatus: null as KopiaServerStatus | null,
  serverInfo: null as KopiaServerInfo | null,
  serverError: null as string | null,
  isServerLoading: false,

  // Repository
  repositoryStatus: null as RepositoryStatus | null,
  repositoryError: null as string | null,
  isRepositoryLoading: false,

  // Snapshots
  snapshots: [] as Snapshot[],
  sourcesResponse: null as SourcesResponse | null,
  snapshotsError: null as string | null,
  isSnapshotsLoading: false,

  // Policies
  policies: [] as PolicyResponse[],
  policiesError: null as string | null,
  isPoliciesLoading: false,

  // Tasks
  tasks: [] as Task[],
  tasksSummary: null as TasksSummary | null,
  tasksError: null as string | null,
  isTasksLoading: false,

  // Mounts
  mounts: null as MountsResponse | null,
  mountsError: null as string | null,
  isMountsLoading: false,

  // Polling
  isPolling: false,
  serverPollingInterval: 30000, // 30 seconds
  tasksPollingInterval: 5000, // 5 seconds
  sourcesPollingInterval: 3000, // 3 seconds (matches official KopiaUI)

  // WebSocket
  isWebSocketConnected: false,
  useWebSocket: true, // Prefer WebSocket over polling by default
};

export const useKopiaStore = create<KopiaStore>()(
  subscribeWithSelector((set, get) => ({
    // ========================================================================
    // Initial State
    // ========================================================================
    ...INITIAL_STATE,

    // ========================================================================
    // Derived State
    // ========================================================================

    isServerRunning: () => {
      const { serverStatus } = get();
      return serverStatus?.running ?? false;
    },

    isRepoConnected: () => {
      const { repositoryStatus } = get();
      return repositoryStatus?.connected ?? false;
    },

    /**
     * Check if repository connection/initialization is in progress
     * (async connection that shows progress via initTaskID)
     */
    isRepoInitializing: () => {
      const { repositoryStatus } = get();
      return !!repositoryStatus?.initTaskID;
    },

    hasRepositories: () => {
      const { repositories } = get();
      return repositories.length > 0;
    },

    getCurrentRepository: () => {
      const { repositories, currentRepoId } = get();
      if (!currentRepoId) return null;
      return repositories.find((r) => r.id === currentRepoId) ?? null;
    },

    // ========================================================================
    // Multi-Repository Management Actions
    // ========================================================================

    refreshRepositories: async () => {
      set({ isRepositoriesLoading: true, repositoriesError: null });
      try {
        const repos = await apiListRepositories();
        const { currentRepoId } = get();

        // If we have repositories but no current selection, select the default or first
        let newCurrentRepoId = currentRepoId;
        if (repos.length > 0 && !currentRepoId) {
          // Prefer the default repository if it exists
          const defaultRepo = repos.find((r) => r.id === DEFAULT_REPO_ID);
          newCurrentRepoId = defaultRepo ? defaultRepo.id : repos[0].id;
        } else if (repos.length === 0) {
          newCurrentRepoId = null;
        } else if (currentRepoId && !repos.find((r) => r.id === currentRepoId)) {
          // Current repo no longer exists, select first available
          newCurrentRepoId = repos[0].id;
        }

        set({
          repositories: repos,
          currentRepoId: newCurrentRepoId,
          isRepositoriesLoading: false,
        });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ repositoriesError: message, isRepositoriesLoading: false });
      }
    },

    addRepository: async (repoId?: string) => {
      set({ isRepositoriesLoading: true, repositoriesError: null });
      try {
        const newRepoId = await apiAddRepository(repoId);
        await get().refreshRepositories();
        set({ isRepositoriesLoading: false });
        return newRepoId;
      } catch (error) {
        const message = getErrorMessage(error);
        set({ repositoriesError: message, isRepositoriesLoading: false });
        return null;
      }
    },

    removeRepository: async (repoId: string) => {
      set({ isRepositoriesLoading: true, repositoriesError: null });
      try {
        await apiRemoveRepository(repoId);
        await get().refreshRepositories();
        set({ isRepositoriesLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ repositoriesError: message, isRepositoriesLoading: false });
        throw error;
      }
    },

    setCurrentRepository: async (repoId: string) => {
      const { currentRepoId, repositories, isPolling, isWebSocketConnected, useWebSocket } = get();

      // Validate the repo exists
      const repo = repositories.find((r) => r.id === repoId);
      if (!repo) {
        throw new Error(`Repository not found: ${repoId}`);
      }

      // If already current, no-op
      if (currentRepoId === repoId) {
        return;
      }

      // Step 1: Stop polling to prevent race conditions during switch
      // Polling timers could fire and update state with old repo data
      const wasPolling = isPolling;
      if (wasPolling) {
        get().stopPolling();
      }

      // Step 2: Stop WebSocket for old repo if connected
      if (isWebSocketConnected) {
        await get().stopWebSocket();
      }

      // Step 3: Clear current data and switch repo (no polling can interfere now)
      set({
        currentRepoId: repoId,
        // Reset repository-specific state
        serverStatus: null,
        serverInfo: null,
        serverError: null,
        repositoryStatus: null,
        repositoryError: null,
        snapshots: [],
        sourcesResponse: null,
        snapshotsError: null,
        policies: [],
        policiesError: null,
        tasks: [],
        tasksSummary: null,
        tasksError: null,
        mounts: null,
        mountsError: null,
      });

      // Step 4: Refresh data for the new repository
      await get().refreshAll();

      // Step 5: Start WebSocket for new repo if enabled
      if (useWebSocket) {
        await get().startWebSocket();
      }

      // Step 6: Resume polling if it was running before
      if (wasPolling) {
        get().startPolling();
      }
    },

    // ========================================================================
    // Server Actions
    // ========================================================================

    refreshServerStatus: async () => {
      await withRepoId(get, async (repoId) => {
        try {
          const status = await getKopiaServerStatus(repoId);
          set({ serverStatus: status, serverError: null });
        } catch (error) {
          const message = getErrorMessage(error);
          if (get().serverError !== message) {
            set({
              serverError: message,
              serverStatus: {
                running: false,
                serverUrl: undefined,
                port: undefined,
                uptime: undefined,
              },
            });
          }
        }
      });
    },

    startServer: async () => {
      return withRepoId(get, async (repoId) => {
        set({ isServerLoading: true, serverError: null });
        try {
          const info = await startKopiaServer(repoId);
          await get().refreshServerStatus();
          set({ isServerLoading: false, serverInfo: info });
          return info;
        } catch (error) {
          set({ serverError: getErrorMessage(error), isServerLoading: false });
          return null;
        }
      }) as Promise<KopiaServerInfo | null>;
    },

    stopServer: async () => {
      await withRepoId(get, async (repoId) => {
        set({ isServerLoading: true, serverError: null });
        try {
          await stopKopiaServer(repoId);
          await get().refreshServerStatus();
          set({ isServerLoading: false });
        } catch (error) {
          set({ serverError: getErrorMessage(error), isServerLoading: false });
        }
      });
    },

    // ========================================================================
    // Repository Actions
    // ========================================================================

    refreshRepositoryStatus: async () => {
      await withRepoId(get, async (repoId) => {
        try {
          const status = await getRepositoryStatus(repoId);
          set({ repositoryStatus: status, repositoryError: null });
        } catch (error) {
          const kopiaError = parseKopiaError(error);
          const message = kopiaError.getUserMessage();
          const currentError = get().repositoryError;
          const currentStatus = get().repositoryStatus;

          // Don't show error for expected "not running/connected" states (language-independent)
          const isExpectedError =
            kopiaError.is(KopiaErrorCode.SERVER_NOT_RUNNING) ||
            kopiaError.is(KopiaErrorCode.REPOSITORY_NOT_CONNECTED);

          // Only update if something changed
          const shouldUpdateError = !isExpectedError && currentError !== message;
          const shouldUpdateStatus = currentStatus?.connected !== false;

          if (shouldUpdateError || shouldUpdateStatus) {
            set({
              ...(shouldUpdateError && { repositoryError: message }),
              repositoryStatus: {
                connected: false,
                configFile: undefined,
                storage: undefined,
                hash: undefined,
                encryption: undefined,
              },
            });
          }
        }
      });
    },

    connectRepo: async (config: RepositoryConnectRequest) => {
      const result = await withRepoId(get, async (repoId) => {
        set({ isRepositoryLoading: true, repositoryError: null });
        try {
          const status = await connectRepository(repoId, config);
          set({ repositoryStatus: status, isRepositoryLoading: false });
          return status.connected;
        } catch (error) {
          set({ repositoryError: getErrorMessage(error), isRepositoryLoading: false });
          return false;
        }
      });
      return result ?? false;
    },

    disconnectRepo: async () => {
      await withRepoId(get, async (repoId) => {
        set({ isRepositoryLoading: true, repositoryError: null });
        try {
          await disconnectRepository(repoId);
          await get().refreshRepositoryStatus();
          set({ isRepositoryLoading: false });
        } catch (error) {
          set({ repositoryError: getErrorMessage(error), isRepositoryLoading: false });
        }
      });
    },

    // ========================================================================
    // Snapshots Actions
    // ========================================================================

    refreshSnapshots: async () => {
      await withDeduplication('snapshots', async () => {
        await withRepoId(get, async (repoId) => {
          try {
            // First, get all sources
            const sourcesResponse = await listSources(repoId);
            const sources = sourcesResponse.sources || [];

            // Then fetch snapshots for each source
            const allSnapshots: Snapshot[] = [];
            for (const source of sources) {
              try {
                const response = await listSnapshots(
                  repoId,
                  source.source.userName,
                  source.source.host,
                  source.source.path,
                  true // all=true to include hidden snapshots
                );
                // Add source info to each snapshot (snapshots from /api/v1/snapshots don't have source field)
                const snapshotsWithSource = (response.snapshots || []).map((snapshot) => ({
                  ...snapshot,
                  source: source.source,
                }));
                allSnapshots.push(...snapshotsWithSource);
              } catch (error) {
                // Continue with other sources even if one fails
                if (import.meta.env.DEV) {
                  console.warn(
                    `Failed to fetch snapshots for ${source.source.userName}@${source.source.host}:${source.source.path}`,
                    error
                  );
                }
              }
            }

            set({ snapshots: allSnapshots, snapshotsError: null });
          } catch (error) {
            setErrorIfChanged(get, set, 'snapshotsError', getErrorMessage(error));
          }
        });
      });
    },

    refreshSources: async () => {
      await withDeduplication('sources', async () => {
        await withRepoId(get, async (repoId) => {
          try {
            const response = await listSources(repoId);
            set({ sourcesResponse: response, snapshotsError: null });
          } catch (error) {
            setErrorIfChanged(get, set, 'snapshotsError', getErrorMessage(error));
          }
        });
      });
    },

    createSnapshot: async (path: string, createSnapshot?: boolean, policy?: PolicyDefinition) => {
      const repoId = requireRepoId(get);
      set({ isSnapshotsLoading: true, snapshotsError: null });
      try {
        await apiCreateSnapshot(repoId, path, undefined, undefined, createSnapshot, policy);
        await Promise.all([get().refreshSnapshots(), get().refreshSources()]);
        set({ isSnapshotsLoading: false });
      } catch (error) {
        set({ snapshotsError: getErrorMessage(error), isSnapshotsLoading: false });
        throw error;
      }
    },

    deleteSnapshots: async (
      userName: string,
      host: string,
      path: string,
      manifestIDs: string[]
    ) => {
      const repoId = requireRepoId(get);
      set({ isSnapshotsLoading: true, snapshotsError: null });
      try {
        await apiDeleteSnapshots(repoId, userName, host, path, manifestIDs);
        await Promise.all([get().refreshSnapshots(), get().refreshSources()]);
        set({ isSnapshotsLoading: false });
      } catch (error) {
        set({ snapshotsError: getErrorMessage(error), isSnapshotsLoading: false });
        throw error;
      }
    },

    /**
     * Fetch snapshots for a specific source (used by SnapshotHistory page)
     * @param userName - User name (e.g., "javi")
     * @param host - Hostname (e.g., "laptop")
     * @param path - Path (e.g., "/home/javi/documents")
     * @param all - Include hidden snapshots (default: false)
     * @returns Array of snapshots for the specified source
     */
    fetchSnapshotsForSource: async (
      userName: string,
      host: string,
      path: string,
      all = false
    ): Promise<Snapshot[]> => {
      const repoId = requireRepoId(get);
      set({ isSnapshotsLoading: true, snapshotsError: null });
      try {
        const response = await listSnapshots(repoId, userName, host, path, all);
        set({ isSnapshotsLoading: false });
        return response.snapshots || [];
      } catch (error) {
        set({ snapshotsError: getErrorMessage(error), isSnapshotsLoading: false });
        throw error;
      }
    },

    // ========================================================================
    // Policies Actions
    // ========================================================================

    refreshPolicies: async () => {
      await withRepoId(get, async (repoId) => {
        try {
          const response = await listPolicies(repoId);
          set({ policies: response.policies || [], policiesError: null });
        } catch (error) {
          setErrorIfChanged(get, set, 'policiesError', getErrorMessage(error));
        }
      });
    },

    getPolicy: async (userName?: string, host?: string, path?: string) => {
      const result = await withRepoId(get, async (repoId) => {
        set({ isPoliciesLoading: true, policiesError: null });
        try {
          const response = await apiGetPolicy(repoId, userName, host, path);
          set({ isPoliciesLoading: false });
          return response.policy;
        } catch (error) {
          set({ policiesError: getErrorMessage(error), isPoliciesLoading: false });
          return null;
        }
      });
      return result ?? null;
    },

    setPolicy: async (
      policy: PolicyDefinition,
      userName?: string,
      host?: string,
      path?: string
    ) => {
      const repoId = requireRepoId(get);
      set({ isPoliciesLoading: true, policiesError: null });
      try {
        await apiSetPolicy(repoId, policy, userName, host, path);
        await get().refreshPolicies();
        set({ isPoliciesLoading: false });
      } catch (error) {
        set({ policiesError: getErrorMessage(error), isPoliciesLoading: false });
        throw error;
      }
    },

    deletePolicy: async (userName?: string, host?: string, path?: string) => {
      const repoId = requireRepoId(get);
      set({ isPoliciesLoading: true, policiesError: null });
      try {
        await apiDeletePolicy(repoId, userName, host, path);
        await get().refreshPolicies();
        set({ isPoliciesLoading: false });
      } catch (error) {
        set({ policiesError: getErrorMessage(error), isPoliciesLoading: false });
        throw error;
      }
    },

    // ========================================================================
    // Tasks Actions
    // ========================================================================

    refreshTasks: async () => {
      await withDeduplication('tasks', async () => {
        await withRepoId(get, async (repoId) => {
          try {
            const response = await listTasks(repoId);
            const newTasks = response.tasks || [];
            const currentTasks = get().tasks;

            // Detect task completions for notifications
            if (currentTasks.length > 0) {
              for (const currentTask of currentTasks) {
                const newTask = newTasks.find((t) => t.id === currentTask.id);
                if (
                  currentTask.status === 'RUNNING' &&
                  newTask &&
                  (newTask.status === 'SUCCESS' ||
                    newTask.status === 'FAILED' ||
                    newTask.status === 'CANCELED')
                ) {
                  void notifyTaskComplete(
                    currentTask.description || currentTask.kind,
                    newTask.status === 'SUCCESS'
                  );
                }
              }
            }

            set({ tasks: newTasks, tasksError: null });
          } catch (error) {
            setErrorIfChanged(get, set, 'tasksError', getErrorMessage(error));
          }
        });
      });
    },

    refreshTasksSummary: async () => {
      await withDeduplication('tasksSummary', async () => {
        await withRepoId(get, async (repoId) => {
          try {
            const summary = await getTasksSummary(repoId);
            set({ tasksSummary: summary });
          } catch (error) {
            // Log in dev mode but don't update error state - summary is not critical
            if (import.meta.env.DEV) {
              console.warn('Failed to fetch tasks summary:', error);
            }
          }
        });
      });
    },

    getTask: async (taskId: string) => {
      const result = await withRepoId(get, async (repoId) => {
        set({ isTasksLoading: true, tasksError: null });
        try {
          const task = await apiGetTask(repoId, taskId);
          set({ isTasksLoading: false });
          return task;
        } catch (error) {
          set({ tasksError: getErrorMessage(error), isTasksLoading: false });
          return null;
        }
      });
      return result ?? null;
    },

    cancelTask: async (taskId: string) => {
      const repoId = requireRepoId(get);
      set({ isTasksLoading: true, tasksError: null });
      try {
        await apiCancelTask(repoId, taskId);
        await get().refreshTasks();
        set({ isTasksLoading: false });
      } catch (error) {
        set({ tasksError: getErrorMessage(error), isTasksLoading: false });
        throw error;
      }
    },

    // ========================================================================
    // Mount Actions
    // ========================================================================

    refreshMounts: async () => {
      await withRepoId(get, async (repoId) => {
        // Only fetch mounts if repository is connected
        if (!get().isRepoConnected()) return;

        set({ isMountsLoading: true });
        try {
          const mounts = await listMounts(repoId);
          set({ mounts, mountsError: null, isMountsLoading: false });
        } catch (error) {
          set({ mountsError: getErrorMessage(error), isMountsLoading: false });
        }
      });
    },

    mountSnapshot: async (root: string) => {
      const repoId = requireRepoId(get);
      if (!get().isRepoConnected()) throw new Error('Repository not connected');

      set({ isMountsLoading: true });
      try {
        const path = await apiMountSnapshot(repoId, root);
        await get().refreshMounts();
        set({ isMountsLoading: false });
        return path;
      } catch (error) {
        set({ mountsError: getErrorMessage(error), isMountsLoading: false });
        throw error;
      }
    },

    unmountSnapshot: async (objectId: string) => {
      const repoId = requireRepoId(get);
      if (!get().isRepoConnected()) throw new Error('Repository not connected');

      set({ isMountsLoading: true });
      try {
        await apiUnmountSnapshot(repoId, objectId);
        await get().refreshMounts();
        set({ isMountsLoading: false });
      } catch (error) {
        set({ mountsError: getErrorMessage(error), isMountsLoading: false });
        throw error;
      }
    },

    getMountForObject: (objectId: string) => {
      const { mounts } = get();
      if (!mounts) return null;

      const mount = mounts.items.find((m) => m.root === objectId);
      return mount ? mount.path : null;
    },

    // ========================================================================
    // Polling Control
    // ========================================================================

    startPolling: () => {
      const {
        isPolling,
        serverPollingInterval,
        tasksPollingInterval,
        sourcesPollingInterval,
        useWebSocket,
      } = get();

      if (isPolling) return;

      // Initial fetch
      void get().refreshAll();

      // Try to start WebSocket if enabled
      if (useWebSocket) {
        void get().startWebSocket();
      }

      // Server/Repo/Snapshots/Mounts polling (30s)
      serverPollingTimer = setInterval(() => {
        void get().refreshServerStatus();
        void get().refreshRepositoryStatus();
        void get().refreshSnapshots();
        void get().refreshMounts();
      }, serverPollingInterval);

      // Tasks polling (5s for real-time updates)
      // Always poll tasks as fallback even if WebSocket is enabled
      // WebSocket events will trigger additional refreshes for better real-time updates
      tasksPollingTimer = setInterval(() => {
        void get().refreshTasks();
        void get().refreshTasksSummary();
      }, tasksPollingInterval);

      // Sources polling (3s - matches official KopiaUI)
      // Separate timer for faster source status updates
      sourcesPollingTimer = setInterval(() => {
        void get().refreshSources();
      }, sourcesPollingInterval);

      set({ isPolling: true });
    },

    stopPolling: () => {
      if (serverPollingTimer) {
        clearInterval(serverPollingTimer);
        serverPollingTimer = null;
      }
      if (tasksPollingTimer) {
        clearInterval(tasksPollingTimer);
        tasksPollingTimer = null;
      }
      if (sourcesPollingTimer) {
        clearInterval(sourcesPollingTimer);
        sourcesPollingTimer = null;
      }
      // Stop WebSocket if connected
      if (get().isWebSocketConnected) {
        void get().stopWebSocket();
      }
      set({ isPolling: false });
    },

    setServerPollingInterval: (interval: number) => {
      set({ serverPollingInterval: interval });
      const { isPolling } = get();
      if (isPolling) {
        get().stopPolling();
        get().startPolling();
      }
    },

    setTasksPollingInterval: (interval: number) => {
      set({ tasksPollingInterval: interval });
      const { isPolling } = get();
      if (isPolling) {
        get().stopPolling();
        get().startPolling();
      }
    },

    // ========================================================================
    // WebSocket Control
    // ========================================================================

    startWebSocket: async () => {
      const { isWebSocketConnected, serverStatus, serverInfo, currentRepoId } = get();

      if (!currentRepoId) {
        if (import.meta.env.DEV) {
          console.debug('Cannot connect WebSocket: no repository selected');
        }
        return;
      }

      if (isWebSocketConnected) {
        if (import.meta.env.DEV) {
          console.log('WebSocket already connected');
        }
        return;
      }

      if (!serverStatus?.running || !serverStatus.serverUrl) {
        if (import.meta.env.DEV) {
          console.debug('Cannot connect WebSocket: server not running');
        }
        return;
      }

      if (!serverInfo?.password) {
        if (import.meta.env.DEV) {
          console.error('Cannot connect WebSocket: server password not available');
        }
        return;
      }

      try {
        // Clean up any existing listeners first to prevent memory leaks
        cleanupWSListeners();

        // Connect to WebSocket
        await connectWebSocket(
          currentRepoId,
          serverStatus.serverUrl,
          'kopia', // Server username (must match SERVER_USERNAME in kopia_server.rs)
          serverInfo.password
        );

        // Set up event listeners
        wsEventUnlisten = await listen<WebSocketEvent>('kopia-ws-event', (event) => {
          const wsEvent = event.payload;
          const currentRepo = get().currentRepoId;

          // Only process events for the current repository
          if (wsEvent.repoId !== currentRepo) {
            if (import.meta.env.DEV) {
              console.log(
                `Ignoring WebSocket event for repo '${wsEvent.repoId}' (current: '${currentRepo}')`
              );
            }
            return;
          }

          if (import.meta.env.DEV) {
            console.log('WebSocket event received:', wsEvent.type, 'for repo:', wsEvent.repoId);
          }

          // Handle different event types
          if (wsEvent.type === 'task-progress') {
            // Refresh tasks to get updated status
            void get().refreshTasks();
          } else if (wsEvent.type === 'snapshot-progress') {
            // Refresh snapshots and sources
            void get().refreshSnapshots();
            void get().refreshSources();
          }
        });

        wsDisconnectUnlisten = await listen<WebSocketDisconnectEvent>(
          'kopia-ws-disconnected',
          (event) => {
            const disconnectEvent = event.payload;
            const currentRepo = get().currentRepoId;

            // Only handle disconnect for the current repository
            if (disconnectEvent.repoId !== currentRepo) {
              if (import.meta.env.DEV) {
                console.log(
                  `Ignoring WebSocket disconnect for repo '${disconnectEvent.repoId}' (current: '${currentRepo}')`
                );
              }
              return;
            }

            if (import.meta.env.DEV) {
              console.log('WebSocket disconnected for repo:', disconnectEvent.repoId);
            }
            set({ isWebSocketConnected: false });

            // Fall back to polling if WebSocket disconnects
            if (get().useWebSocket && !get().isPolling) {
              if (import.meta.env.DEV) {
                console.log('Falling back to polling after WebSocket disconnect');
              }
              get().startPolling();
            }
          }
        );

        set({ isWebSocketConnected: true });
        if (import.meta.env.DEV) {
          console.log('WebSocket connected successfully');
        }

        // Keep task polling running as fallback
        // WebSocket provides real-time updates, polling ensures we don't miss updates
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to connect WebSocket:', error);
        }
        set({ isWebSocketConnected: false });

        // Fall back to polling
        if (get().useWebSocket && !get().isPolling) {
          if (import.meta.env.DEV) {
            console.log('Falling back to polling after WebSocket error');
          }
          get().startPolling();
        }
      }
    },

    stopWebSocket: async () => {
      const { isWebSocketConnected, currentRepoId } = get();

      if (!isWebSocketConnected) {
        return;
      }

      try {
        // Clean up event listeners
        cleanupWSListeners();

        // Disconnect WebSocket
        if (currentRepoId) {
          await disconnectWebSocket(currentRepoId);
        }
        set({ isWebSocketConnected: false });
        if (import.meta.env.DEV) {
          console.log('WebSocket disconnected');
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to disconnect WebSocket:', error);
        }
      }
    },

    setUseWebSocket: (use: boolean) => {
      const { useWebSocket, isWebSocketConnected, isPolling } = get();

      if (useWebSocket === use) {
        return;
      }

      set({ useWebSocket: use });

      if (use) {
        // Enable WebSocket: stop polling and start WebSocket
        if (isPolling) {
          if (tasksPollingTimer) {
            clearInterval(tasksPollingTimer);
            tasksPollingTimer = null;
          }
        }
        if (!isWebSocketConnected) {
          void get().startWebSocket();
        }
      } else {
        // Disable WebSocket: stop WebSocket and start polling
        if (isWebSocketConnected) {
          void get().stopWebSocket();
        }
        if (isPolling && !tasksPollingTimer) {
          // Restart task polling
          const { tasksPollingInterval } = get();
          tasksPollingTimer = setInterval(() => {
            void get().refreshTasks();
            void get().refreshTasksSummary();
          }, tasksPollingInterval);
        }
      }
    },

    // ========================================================================
    // Utility
    // ========================================================================

    refreshAll: async () => {
      // First refresh repositories to ensure we have a current repo
      await get().refreshRepositories();

      // Then refresh all data for the current repo
      const { currentRepoId } = get();
      if (currentRepoId) {
        await Promise.all([
          get().refreshServerStatus(),
          get().refreshRepositoryStatus(),
          get().refreshSnapshots(),
          get().refreshSources(),
          get().refreshPolicies(),
          get().refreshTasks(),
          get().refreshTasksSummary(),
          get().refreshMounts(),
        ]);
      }
    },

    reset: () => {
      get().stopPolling();
      void get().stopWebSocket();
      set(INITIAL_STATE);
    },
  }))
);
