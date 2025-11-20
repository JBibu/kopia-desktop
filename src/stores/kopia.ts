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
  getMaintenanceInfo,
  listMounts,
  mountSnapshot as apiMountSnapshot,
  unmountSnapshot as apiUnmountSnapshot,
  type KopiaServerStatus,
  type KopiaServerInfo,
  type RepositoryStatus,
  type RepositoryConnectRequest,
} from '@/lib/kopia/client';
import type {
  Snapshot,
  SourcesResponse,
  PolicyDefinition,
  PolicyResponse,
  Task,
  TasksSummary,
  WebSocketEvent,
  MaintenanceInfo,
  MountsResponse,
} from '@/lib/kopia/types';
import { getErrorMessage } from '@/lib/kopia/errors';
import { notifyTaskComplete } from '@/lib/notifications';

interface KopiaStore {
  // Server state
  serverStatus: KopiaServerStatus | null;
  serverInfo: KopiaServerInfo | null; // Store server info including password
  serverError: string | null;
  isServerLoading: boolean;

  // Repository state
  repositoryStatus: RepositoryStatus | null;
  repositoryError: string | null;
  isRepositoryLoading: boolean;

  // Snapshots state
  snapshots: Snapshot[];
  sourcesResponse: SourcesResponse | null;
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

  // Maintenance state
  maintenanceInfo: MaintenanceInfo | null;
  maintenanceError: string | null;
  isMaintenanceLoading: boolean;

  // Mounts state
  mounts: MountsResponse | null;
  mountsError: string | null;
  isMountsLoading: boolean;

  // Polling state
  isPolling: boolean;
  serverPollingInterval: number; // For server/repo (30s)
  tasksPollingInterval: number; // For tasks (5s - real-time, fallback if WebSocket fails)

  // WebSocket state
  isWebSocketConnected: boolean;
  useWebSocket: boolean; // Prefer WebSocket over polling for tasks

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

  // Maintenance actions
  refreshMaintenanceInfo: () => Promise<void>;

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

// WebSocket event listener (outside store to avoid serialization issues)
let wsEventUnlisten: UnlistenFn | null = null;
let wsDisconnectUnlisten: UnlistenFn | null = null;

export const useKopiaStore = create<KopiaStore>()(
  subscribeWithSelector((set, get) => ({
    // ========================================================================
    // Initial State
    // ========================================================================

    // Server
    serverStatus: null,
    serverInfo: null,
    serverError: null,
    isServerLoading: false,

    // Repository
    repositoryStatus: null,
    repositoryError: null,
    isRepositoryLoading: false,

    // Snapshots
    snapshots: [],
    sourcesResponse: null,
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

    // Maintenance
    maintenanceInfo: null,
    maintenanceError: null,
    isMaintenanceLoading: false,

    // Mounts
    mounts: null,
    mountsError: null,
    isMountsLoading: false,

    // Polling
    isPolling: false,
    serverPollingInterval: 30000, // 30 seconds
    tasksPollingInterval: 5000, // 5 seconds

    // WebSocket
    isWebSocketConnected: false,
    useWebSocket: true, // Prefer WebSocket over polling by default

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
      try {
        const status = await getKopiaServerStatus();
        const currentStatus = get().serverStatus;

        // Only update if status actually changed to avoid unnecessary re-renders
        if (JSON.stringify(currentStatus) !== JSON.stringify(status)) {
          set({ serverStatus: status });
        }
        // Don't call set() at all if nothing changed - this prevents re-renders
      } catch (error) {
        const message = getErrorMessage(error);
        const currentError = get().serverError;

        // Only update if error changed
        if (currentError !== message) {
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
    },

    startServer: async () => {
      set({ isServerLoading: true, serverError: null });
      try {
        const info = await startKopiaServer();
        await get().refreshServerStatus();
        set({ isServerLoading: false, serverInfo: info });
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
      try {
        const status = await getRepositoryStatus();
        const currentStatus = get().repositoryStatus;

        // Only update if status actually changed to avoid unnecessary re-renders
        if (JSON.stringify(currentStatus) !== JSON.stringify(status)) {
          set({ repositoryStatus: status });
        }
        // Don't call set() at all if nothing changed
      } catch (error) {
        const message = getErrorMessage(error);
        const currentError = get().repositoryError;
        const currentStatus = get().repositoryStatus;

        // Only update if something changed
        const shouldUpdateError =
          !message.includes('not running') &&
          !message.includes('not connected') &&
          currentError !== message;
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
            // Add source info to each snapshot (snapshots from /api/v1/snapshots don't have source field)
            const snapshotsWithSource = (response.snapshots || []).map((snapshot) => ({
              ...snapshot,
              source: source.source,
            }));
            allSnapshots.push(...snapshotsWithSource);
          } catch (error) {
            // Continue with other sources even if one fails
            console.warn(
              `Failed to fetch snapshots for ${source.source.userName}@${source.source.host}:${source.source.path}`,
              error
            );
          }
        }

        const currentSnapshots = get().snapshots;

        // Only update if snapshots actually changed to avoid unnecessary re-renders
        if (JSON.stringify(currentSnapshots) !== JSON.stringify(allSnapshots)) {
          set({ snapshots: allSnapshots });
        }
        // Don't call set() at all if nothing changed
      } catch (error) {
        const message = getErrorMessage(error);
        const currentError = get().snapshotsError;

        // Only update if error changed
        if (currentError !== message) {
          set({ snapshotsError: message });
        }
      }
    },

    refreshSources: async () => {
      try {
        const response = await listSources();
        const currentResponse = get().sourcesResponse;

        // Only update if sources actually changed to avoid unnecessary re-renders
        if (JSON.stringify(currentResponse) !== JSON.stringify(response)) {
          set({ sourcesResponse: response });
        }
        // Don't call set() at all if nothing changed
      } catch (error) {
        const message = getErrorMessage(error);
        const currentError = get().snapshotsError;

        // Only update if error changed
        if (currentError !== message) {
          set({ snapshotsError: message });
        }
      }
    },

    createSnapshot: async (path: string, createSnapshot?: boolean, policy?: PolicyDefinition) => {
      set({ isSnapshotsLoading: true, snapshotsError: null });
      try {
        await apiCreateSnapshot(path, undefined, undefined, createSnapshot, policy);
        // Refresh both snapshots and sources to update UI
        await Promise.all([get().refreshSnapshots(), get().refreshSources()]);
        set({ isSnapshotsLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ snapshotsError: message, isSnapshotsLoading: false });
        throw error;
      }
    },

    deleteSnapshots: async (
      userName: string,
      host: string,
      path: string,
      manifestIDs: string[]
    ) => {
      set({ isSnapshotsLoading: true, snapshotsError: null });
      try {
        await apiDeleteSnapshots(userName, host, path, manifestIDs);
        // Refresh both snapshots and sources to update UI
        await Promise.all([get().refreshSnapshots(), get().refreshSources()]);
        set({ isSnapshotsLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ snapshotsError: message, isSnapshotsLoading: false });
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
      set({ isSnapshotsLoading: true, snapshotsError: null });
      try {
        const response = await listSnapshots(userName, host, path, all);
        set({ isSnapshotsLoading: false });
        return response.snapshots || [];
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
      try {
        const response = await listPolicies();
        const newPolicies = response.policies || [];
        const currentPolicies = get().policies;

        // Only update if policies actually changed to avoid unnecessary re-renders
        if (JSON.stringify(currentPolicies) !== JSON.stringify(newPolicies)) {
          set({ policies: newPolicies });
        }
        // Don't call set() at all if nothing changed
      } catch (error) {
        const message = getErrorMessage(error);
        const currentError = get().policiesError;

        // Only update if error changed
        if (currentError !== message) {
          set({ policiesError: message });
        }
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
      try {
        const response = await listTasks();
        const newTasks = response.tasks || [];
        const currentTasks = get().tasks;

        // Detect task completions for notifications
        if (currentTasks.length > 0) {
          for (const currentTask of currentTasks) {
            // Find if this task has changed status
            const newTask = newTasks.find((t) => t.id === currentTask.id);

            // If task was RUNNING and is now completed (SUCCESS, FAILED, or CANCELED)
            if (
              currentTask.status === 'RUNNING' &&
              newTask &&
              (newTask.status === 'SUCCESS' ||
                newTask.status === 'FAILED' ||
                newTask.status === 'CANCELED')
            ) {
              // Send desktop notification (fire and forget, don't await)
              void notifyTaskComplete(
                currentTask.description || currentTask.kind,
                newTask.status === 'SUCCESS'
              );
            }
          }
        }

        // Only update if tasks actually changed to avoid unnecessary re-renders
        if (JSON.stringify(currentTasks) !== JSON.stringify(newTasks)) {
          set({ tasks: newTasks, tasksError: null });
        }
        // Don't call set() at all if nothing changed
      } catch (error) {
        const message = getErrorMessage(error);
        const currentError = get().tasksError;

        // Only update if error changed
        if (currentError !== message) {
          set({ tasksError: message });
        }
      }
    },

    refreshTasksSummary: async () => {
      try {
        const summary = await getTasksSummary();
        const currentSummary = get().tasksSummary;

        // Only update if summary actually changed
        if (JSON.stringify(currentSummary) !== JSON.stringify(summary)) {
          set({ tasksSummary: summary });
        }
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
    // Maintenance Actions
    // ========================================================================

    refreshMaintenanceInfo: async () => {
      const { isRepoConnected } = get();

      // Only fetch maintenance info if repository is connected
      if (!isRepoConnected) {
        return;
      }

      try {
        const info = await getMaintenanceInfo();
        const currentInfo = get().maintenanceInfo;

        // Only update if info actually changed
        if (JSON.stringify(currentInfo) !== JSON.stringify(info)) {
          set({ maintenanceInfo: info, maintenanceError: null });
        }
      } catch (error) {
        const message = getErrorMessage(error);
        const currentError = get().maintenanceError;

        // Only update if error changed
        if (currentError !== message) {
          set({ maintenanceError: message });
        }
      }
    },

    // ========================================================================
    // Mount Actions
    // ========================================================================

    refreshMounts: async () => {
      const { isRepoConnected } = get();

      // Only fetch mounts if repository is connected
      if (!isRepoConnected()) {
        return;
      }

      set({ isMountsLoading: true });
      try {
        const mounts = await listMounts();
        set({ mounts, mountsError: null, isMountsLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ mountsError: message, isMountsLoading: false });
      }
    },

    mountSnapshot: async (root: string) => {
      const { isRepoConnected } = get();

      if (!isRepoConnected()) {
        throw new Error('Repository not connected');
      }

      set({ isMountsLoading: true });
      try {
        const path = await apiMountSnapshot(root);
        // Refresh mounts list
        await get().refreshMounts();
        set({ isMountsLoading: false });
        return path;
      } catch (error) {
        const message = getErrorMessage(error);
        set({ mountsError: message, isMountsLoading: false });
        throw error;
      }
    },

    unmountSnapshot: async (objectId: string) => {
      const { isRepoConnected } = get();

      if (!isRepoConnected()) {
        throw new Error('Repository not connected');
      }

      set({ isMountsLoading: true });
      try {
        await apiUnmountSnapshot(objectId);
        // Refresh mounts list
        await get().refreshMounts();
        set({ isMountsLoading: false });
      } catch (error) {
        const message = getErrorMessage(error);
        set({ mountsError: message, isMountsLoading: false });
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
      const { isPolling, serverPollingInterval, tasksPollingInterval, useWebSocket } = get();

      if (isPolling) return;

      // Initial fetch
      void get().refreshAll();

      // Try to start WebSocket if enabled
      if (useWebSocket) {
        void get().startWebSocket();
      }

      // Server/Repo/Maintenance/Snapshots/Mounts polling (30s)
      serverPollingTimer = setInterval(() => {
        void get().refreshServerStatus();
        void get().refreshRepositoryStatus();
        void get().refreshMaintenanceInfo();
        void get().refreshSnapshots();
        void get().refreshMounts();
      }, serverPollingInterval);

      // Tasks polling (5s for real-time updates)
      // Always poll tasks as fallback even if WebSocket is enabled
      // WebSocket events will trigger additional refreshes for better real-time updates
      // Also poll sources to update snapshot status on the Snapshots page
      tasksPollingTimer = setInterval(() => {
        void get().refreshTasks();
        void get().refreshTasksSummary();
        void get().refreshSources();
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
      const { isWebSocketConnected, serverStatus, serverInfo } = get();

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
        // Connect to WebSocket
        await connectWebSocket(
          serverStatus.serverUrl,
          'kopia-desktop', // Server username (constant from backend)
          serverInfo.password
        );

        // Set up event listeners
        wsEventUnlisten = await listen<WebSocketEvent>('kopia-ws-event', (event) => {
          const wsEvent = event.payload;
          if (import.meta.env.DEV) {
            console.log('WebSocket event received:', wsEvent.type);
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

        wsDisconnectUnlisten = await listen('kopia-ws-disconnected', () => {
          if (import.meta.env.DEV) {
            console.log('WebSocket disconnected');
          }
          set({ isWebSocketConnected: false });

          // Fall back to polling if WebSocket disconnects
          if (get().useWebSocket && !get().isPolling) {
            if (import.meta.env.DEV) {
              console.log('Falling back to polling after WebSocket disconnect');
            }
            get().startPolling();
          }
        });

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
      const { isWebSocketConnected } = get();

      if (!isWebSocketConnected) {
        return;
      }

      try {
        // Clean up event listeners
        if (wsEventUnlisten) {
          wsEventUnlisten();
          wsEventUnlisten = null;
        }
        if (wsDisconnectUnlisten) {
          wsDisconnectUnlisten();
          wsDisconnectUnlisten = null;
        }

        // Disconnect WebSocket
        await disconnectWebSocket();
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
      await Promise.all([
        get().refreshServerStatus(),
        get().refreshRepositoryStatus(),
        get().refreshSnapshots(),
        get().refreshSources(),
        get().refreshPolicies(),
        get().refreshTasks(),
        get().refreshTasksSummary(),
        get().refreshMaintenanceInfo(),
        get().refreshMounts(),
      ]);
    },

    reset: () => {
      get().stopPolling();
      void get().stopWebSocket();
      set({
        serverStatus: null,
        serverInfo: null,
        serverError: null,
        isServerLoading: false,
        repositoryStatus: null,
        repositoryError: null,
        isRepositoryLoading: false,
        snapshots: [],
        sourcesResponse: null,
        snapshotsError: null,
        isSnapshotsLoading: false,
        policies: [],
        policiesError: null,
        isPoliciesLoading: false,
        tasks: [],
        tasksSummary: null,
        tasksError: null,
        isTasksLoading: false,
        maintenanceInfo: null,
        maintenanceError: null,
        isMaintenanceLoading: false,
        mounts: null,
        mountsError: null,
        isMountsLoading: false,
        isWebSocketConnected: false,
      });
    },
  }))
);
