/**
 * Global Kopia state store using Zustand
 *
 * Centralized state management for ALL Kopia data to eliminate redundant polling.
 * Single source of truth for:
 * - Server status
 * - Repository status
 * - Snapshots & sources
 * - Policies
 * - Tasks & summary
 * - Auto-refresh with configurable polling intervals
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
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
  type KopiaServerStatus,
  type KopiaServerInfo,
  type RepositoryStatus,
  type RepositoryConnectRequest,
} from '@/lib/kopia/client';
import type {
  Snapshot,
  SnapshotSource,
  PolicyDefinition,
  PolicyResponse,
  Task,
  TasksSummary,
} from '@/lib/kopia/types';
import { getErrorMessage } from '@/lib/kopia/errors';

interface KopiaStore {
  // Server state
  serverStatus: KopiaServerStatus | null;
  serverError: string | null;
  isServerLoading: boolean;

  // Repository state
  repositoryStatus: RepositoryStatus | null;
  repositoryError: string | null;
  isRepositoryLoading: boolean;

  // Snapshots state
  snapshots: Snapshot[];
  sources: SnapshotSource[];
  snapshotsError: string | null;
  isSnapshotsLoading: boolean;

  // Policies state
  policies: PolicyResponse[];
  policiesError: string | null;
  isPoliciesLoading: boolean;

  // Tasks state
  tasks: Task[];
  tasksSummary: TasksSummary | null;
  tasksError: string | null;
  isTasksLoading: boolean;

  // Polling state
  isPolling: boolean;
  serverPollingInterval: number; // For server/repo (30s)
  tasksPollingInterval: number; // For tasks (5s - real-time)

  // Derived state
  isServerRunning: () => boolean;
  isRepoConnected: () => boolean;

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
  createSnapshot: (path: string) => Promise<void>;
  deleteSnapshots: (manifestIDs: string[]) => Promise<void>;

  // Policies actions
  refreshPolicies: () => Promise<void>;
  getPolicy: (userName?: string, host?: string, path?: string) => Promise<PolicyResponse | null>;
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

  // Polling control
  startPolling: () => void;
  stopPolling: () => void;
  setServerPollingInterval: (interval: number) => void;
  setTasksPollingInterval: (interval: number) => void;

  // Utility
  refreshAll: () => Promise<void>;
  reset: () => void;
}

// Polling timer references (outside store to avoid serialization issues)
let serverPollingTimer: ReturnType<typeof setInterval> | null = null;
let tasksPollingTimer: ReturnType<typeof setInterval> | null = null;

export const useKopiaStore = create<KopiaStore>()(
  subscribeWithSelector((set, get) => ({
    // ========================================================================
    // Initial State
    // ========================================================================

    // Server
    serverStatus: null,
    serverError: null,
    isServerLoading: false,

    // Repository
    repositoryStatus: null,
    repositoryError: null,
    isRepositoryLoading: false,

    // Snapshots
    snapshots: [],
    sources: [],
    snapshotsError: null,
    isSnapshotsLoading: false,

    // Policies
    policies: [],
    policiesError: null,
    isPoliciesLoading: false,

    // Tasks
    tasks: [],
    tasksSummary: null,
    tasksError: null,
    isTasksLoading: false,

    // Polling
    isPolling: false,
    serverPollingInterval: 30000, // 30 seconds
    tasksPollingInterval: 5000, // 5 seconds

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

    // ========================================================================
    // Server Actions
    // ========================================================================

    refreshServerStatus: async () => {
      set({ isServerLoading: true, serverError: null });
      try {
        const status = await getKopiaServerStatus();
        set({ serverStatus: status, isServerLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({
          serverError: message,
          isServerLoading: false,
          serverStatus: {
            running: false,
            serverUrl: undefined,
            port: undefined,
            uptime: undefined,
          },
        });
      }
    },

    startServer: async () => {
      set({ isServerLoading: true, serverError: null });
      try {
        const info = await startKopiaServer();
        await get().refreshServerStatus();
        set({ isServerLoading: false });
        return info;
      } catch (error) {
        const message = getErrorMessage(error);
        set({ serverError: message, isServerLoading: false });
        return null;
      }
    },

    stopServer: async () => {
      set({ isServerLoading: true, serverError: null });
      try {
        await stopKopiaServer();
        await get().refreshServerStatus();
        set({ isServerLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ serverError: message, isServerLoading: false });
      }
    },

    // ========================================================================
    // Repository Actions
    // ========================================================================

    refreshRepositoryStatus: async () => {
      set({ isRepositoryLoading: true, repositoryError: null });
      try {
        const status = await getRepositoryStatus();
        set({ repositoryStatus: status, isRepositoryLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        if (!message.includes('not running') && !message.includes('not connected')) {
          set({ repositoryError: message });
        }
        set({
          isRepositoryLoading: false,
          repositoryStatus: {
            connected: false,
            configFile: undefined,
            storage: undefined,
            hash: undefined,
            encryption: undefined,
          },
        });
      }
    },

    connectRepo: async (config: RepositoryConnectRequest) => {
      set({ isRepositoryLoading: true, repositoryError: null });
      try {
        const status = await connectRepository(config);
        set({ repositoryStatus: status, isRepositoryLoading: false });
        return status.connected;
      } catch (error) {
        const message = getErrorMessage(error);
        set({ repositoryError: message, isRepositoryLoading: false });
        return false;
      }
    },

    disconnectRepo: async () => {
      set({ isRepositoryLoading: true, repositoryError: null });
      try {
        await disconnectRepository();
        await get().refreshRepositoryStatus();
        set({ isRepositoryLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ repositoryError: message, isRepositoryLoading: false });
      }
    },

    // ========================================================================
    // Snapshots Actions
    // ========================================================================

    refreshSnapshots: async () => {
      set({ isSnapshotsLoading: true, snapshotsError: null });
      try {
        // First, get all sources
        const sourcesResponse = await listSources();
        const sources = sourcesResponse.sources || [];

        // Then fetch snapshots for each source
        const allSnapshots: Snapshot[] = [];
        for (const source of sources) {
          try {
            const response = await listSnapshots(
              source.source.userName,
              source.source.host,
              source.source.path,
              true // all=true to include hidden snapshots
            );
            allSnapshots.push(...(response.snapshots || []));
          } catch (error) {
            // Continue with other sources even if one fails
            console.warn(
              `Failed to fetch snapshots for ${source.source.userName}@${source.source.host}:${source.source.path}`,
              error
            );
          }
        }

        set({ snapshots: allSnapshots, isSnapshotsLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ snapshotsError: message, isSnapshotsLoading: false });
      }
    },

    refreshSources: async () => {
      set({ isSnapshotsLoading: true, snapshotsError: null });
      try {
        const response = await listSources();
        set({ sources: response.sources || [], isSnapshotsLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ snapshotsError: message, isSnapshotsLoading: false });
      }
    },

    createSnapshot: async (path: string) => {
      set({ isSnapshotsLoading: true, snapshotsError: null });
      try {
        await apiCreateSnapshot(path);
        await get().refreshSnapshots();
        set({ isSnapshotsLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ snapshotsError: message, isSnapshotsLoading: false });
        throw error;
      }
    },

    deleteSnapshots: async (manifestIDs: string[]) => {
      set({ isSnapshotsLoading: true, snapshotsError: null });
      try {
        await apiDeleteSnapshots(manifestIDs);
        await get().refreshSnapshots();
        set({ isSnapshotsLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ snapshotsError: message, isSnapshotsLoading: false });
        throw error;
      }
    },

    // ========================================================================
    // Policies Actions
    // ========================================================================

    refreshPolicies: async () => {
      set({ isPoliciesLoading: true, policiesError: null });
      try {
        const response = await listPolicies();
        set({ policies: response.policies || [], isPoliciesLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ policiesError: message, isPoliciesLoading: false });
      }
    },

    getPolicy: async (userName?: string, host?: string, path?: string) => {
      set({ isPoliciesLoading: true, policiesError: null });
      try {
        const policy = await apiGetPolicy(userName, host, path);
        set({ isPoliciesLoading: false });
        return policy;
      } catch (error) {
        const message = getErrorMessage(error);
        set({ policiesError: message, isPoliciesLoading: false });
        return null;
      }
    },

    setPolicy: async (
      policy: PolicyDefinition,
      userName?: string,
      host?: string,
      path?: string
    ) => {
      set({ isPoliciesLoading: true, policiesError: null });
      try {
        await apiSetPolicy(policy, userName, host, path);
        await get().refreshPolicies();
        set({ isPoliciesLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ policiesError: message, isPoliciesLoading: false });
        throw error;
      }
    },

    deletePolicy: async (userName?: string, host?: string, path?: string) => {
      set({ isPoliciesLoading: true, policiesError: null });
      try {
        await apiDeletePolicy(userName, host, path);
        await get().refreshPolicies();
        set({ isPoliciesLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ policiesError: message, isPoliciesLoading: false });
        throw error;
      }
    },

    // ========================================================================
    // Tasks Actions
    // ========================================================================

    refreshTasks: async () => {
      // Don't show errors for tasks polling - they happen frequently
      set({ isTasksLoading: true });
      try {
        const response = await listTasks();
        set({ tasks: response.tasks || [], tasksError: null, isTasksLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ tasksError: message, isTasksLoading: false });
      }
    },

    refreshTasksSummary: async () => {
      try {
        const summary = await getTasksSummary();
        set({ tasksSummary: summary });
      } catch {
        // Silently fail for summary - not critical
      }
    },

    getTask: async (taskId: string) => {
      set({ isTasksLoading: true, tasksError: null });
      try {
        const task = await apiGetTask(taskId);
        set({ isTasksLoading: false });
        return task;
      } catch (error) {
        const message = getErrorMessage(error);
        set({ tasksError: message, isTasksLoading: false });
        return null;
      }
    },

    cancelTask: async (taskId: string) => {
      set({ isTasksLoading: true, tasksError: null });
      try {
        await apiCancelTask(taskId);
        await get().refreshTasks();
        set({ isTasksLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ tasksError: message, isTasksLoading: false });
        throw error;
      }
    },

    // ========================================================================
    // Polling Control
    // ========================================================================

    startPolling: () => {
      const { isPolling, serverPollingInterval, tasksPollingInterval } = get();

      if (isPolling) return;

      // Initial fetch
      void get().refreshAll();

      // Server/Repo polling (30s)
      serverPollingTimer = setInterval(() => {
        void get().refreshServerStatus();
        void get().refreshRepositoryStatus();
      }, serverPollingInterval);

      // Tasks polling (5s for real-time updates)
      tasksPollingTimer = setInterval(() => {
        void get().refreshTasks();
        void get().refreshTasksSummary();
      }, tasksPollingInterval);

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
    // Utility
    // ========================================================================

    refreshAll: async () => {
      await Promise.all([
        get().refreshServerStatus(),
        get().refreshRepositoryStatus(),
        get().refreshSnapshots(),
        get().refreshSources(),
        get().refreshPolicies(),
        get().refreshTasks(),
        get().refreshTasksSummary(),
      ]);
    },

    reset: () => {
      get().stopPolling();
      set({
        serverStatus: null,
        serverError: null,
        isServerLoading: false,
        repositoryStatus: null,
        repositoryError: null,
        isRepositoryLoading: false,
        snapshots: [],
        sources: [],
        snapshotsError: null,
        isSnapshotsLoading: false,
        policies: [],
        policiesError: null,
        isPoliciesLoading: false,
        tasks: [],
        tasksSummary: null,
        tasksError: null,
        isTasksLoading: false,
      });
    },
  }))
);
