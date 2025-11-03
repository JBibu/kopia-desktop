/**
 * Kopia API Client
 *
 * This module provides a TypeScript client for communicating with the Kopia
 * server via Tauri commands. All HTTP requests are proxied through Rust
 * backend commands for security and lifecycle management.
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  RepositoryStatus,
  RepositoryConnectRequest,
  KopiaServerInfo,
  KopiaServerStatus,
  SystemInfo,
} from './types';

// Re-export types for convenience
export type {
  RepositoryStatus,
  RepositoryConnectRequest,
  KopiaServerInfo,
  KopiaServerStatus,
  SystemInfo,
  StorageType,
  StorageConfig,
} from './types';

// Re-export error handling utilities
export {
  KopiaError,
  KopiaErrorCode,
  parseKopiaError,
  isNotConnectedError,
  isServerNotRunningError,
  isInvalidPasswordError,
  getErrorMessage,
  handleKopiaError,
  createErrorHandler,
  retryOnError,
} from './errors';

// ============================================================================
// Kopia Server Lifecycle
// ============================================================================

/**
 * Start the Kopia server process
 */
export async function startKopiaServer(): Promise<KopiaServerInfo> {
  return invoke('kopia_server_start');
}

/**
 * Stop the Kopia server process
 */
export async function stopKopiaServer(): Promise<void> {
  return invoke('kopia_server_stop');
}

/**
 * Get Kopia server status
 */
export async function getKopiaServerStatus(): Promise<KopiaServerStatus> {
  return invoke('kopia_server_status');
}

// ============================================================================
// Repository Management
// ============================================================================

/**
 * Get repository status
 */
export async function getRepositoryStatus(): Promise<RepositoryStatus> {
  return invoke('repository_status');
}

/**
 * Connect to an existing repository
 */
export async function connectRepository(
  config: RepositoryConnectRequest
): Promise<RepositoryStatus> {
  return invoke('repository_connect', { config });
}

/**
 * Disconnect from the current repository
 */
export async function disconnectRepository(): Promise<void> {
  return invoke('repository_disconnect');
}

// ============================================================================
// System Utilities
// ============================================================================

/**
 * Get system information (OS, arch, version)
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  return invoke('get_system_info');
}

/**
 * Get current username and hostname
 */
export async function getCurrentUser(): Promise<{ username: string; hostname: string }> {
  const [username, hostname] = await invoke<[string, string]>('get_current_user');
  return { username, hostname };
}

/**
 * Open folder picker dialog
 */
export async function selectFolder(defaultPath?: string): Promise<string | null> {
  return invoke('select_folder', { defaultPath });
}

/**
 * Open file picker dialog
 */
export async function selectFile(defaultPath?: string): Promise<string | null> {
  return invoke('select_file', { defaultPath });
}

/**
 * Create a new repository
 */
export async function createRepository(
  config: import('./types').RepositoryCreateRequest
): Promise<string> {
  return invoke('repository_create', { config });
}

/**
 * Check if repository exists
 */
export async function repositoryExists(storage: import('./types').StorageConfig): Promise<boolean> {
  return invoke('repository_exists', { storage });
}

/**
 * Get available algorithms for repository creation
 */
export async function getAlgorithms(): Promise<import('./types').AlgorithmsResponse> {
  return invoke('repository_get_algorithms');
}

/**
 * Update repository description
 */
export async function updateRepositoryDescription(description: string): Promise<void> {
  return invoke('repository_update_description', { description });
}

// ============================================================================
// Snapshot Sources
// ============================================================================

/**
 * List all snapshot sources
 */
export async function listSources(): Promise<import('./types').SourcesResponse> {
  return invoke('sources_list');
}

/**
 * Create a snapshot for a path
 */
export async function createSnapshot(
  path: string,
  userName?: string,
  host?: string
): Promise<import('./types').SourceInfo> {
  return await invoke<import('./types').SourceInfo>('snapshot_create', { path, userName, host });
}

/**
 * Cancel an ongoing snapshot
 */
export async function cancelSnapshot(userName: string, host: string, path: string): Promise<void> {
  return invoke('snapshot_cancel', { userName, host, path });
}

// ============================================================================
// Snapshot History
// ============================================================================

/**
 * List snapshots for a source
 */
export async function listSnapshots(
  userName: string,
  host: string,
  path: string,
  all = false
): Promise<import('./types').SnapshotsResponse> {
  return invoke('snapshots_list', { userName, host, path, all });
}

/**
 * Edit snapshot metadata (pins, description)
 */
export async function editSnapshot(request: import('./types').SnapshotEditRequest): Promise<void> {
  return invoke('snapshot_edit', { request });
}

/**
 * Delete snapshots
 */
export async function deleteSnapshots(manifestIDs: string[]): Promise<number> {
  return invoke('snapshot_delete', { manifestIDs });
}

// ============================================================================
// Snapshot Browsing & Restore
// ============================================================================

/**
 * Browse directory contents in a snapshot
 */
export async function browseObject(objectId: string): Promise<import('./types').DirectoryObject> {
  return invoke('object_browse', { objectId });
}

/**
 * Download a single file from a snapshot
 */
export async function downloadObject(
  objectId: string,
  filename: string,
  targetPath: string
): Promise<void> {
  return invoke('object_download', { objectId, filename, targetPath });
}

/**
 * Start a restore operation
 */
export async function restoreStart(request: import('./types').RestoreRequest): Promise<string> {
  return invoke('restore_start', { request });
}

/**
 * Mount a snapshot
 */
export async function mountSnapshot(root: string): Promise<string> {
  return invoke('mount_snapshot', { root });
}

/**
 * List all mounted snapshots
 */
export async function listMounts(): Promise<import('./types').MountsResponse> {
  return invoke('mounts_list');
}

/**
 * Unmount a snapshot
 */
export async function unmountSnapshot(objectId: string): Promise<void> {
  return invoke('mount_unmount', { objectId });
}

// ============================================================================
// Policies
// ============================================================================

/**
 * List all policies
 */
export async function listPolicies(): Promise<import('./types').PoliciesResponse> {
  return invoke('policies_list');
}

/**
 * Get policy for a specific target
 */
export async function getPolicy(
  userName?: string,
  host?: string,
  path?: string
): Promise<import('./types').PolicyResponse> {
  return invoke('policy_get', { userName, host, path });
}

/**
 * Resolve effective policy with inheritance
 */
export async function resolvePolicy(
  userName?: string,
  host?: string,
  path?: string,
  updates?: import('./types').PolicyDefinition
): Promise<import('./types').ResolvedPolicyResponse> {
  return invoke('policy_resolve', { userName, host, path, updates });
}

/**
 * Set/update policy
 */
export async function setPolicy(
  policy: import('./types').PolicyDefinition,
  userName?: string,
  host?: string,
  path?: string
): Promise<void> {
  return invoke('policy_set', { userName, host, path, policy });
}

/**
 * Delete policy (revert to inherited)
 */
export async function deletePolicy(userName?: string, host?: string, path?: string): Promise<void> {
  return invoke('policy_delete', { userName, host, path });
}

// ============================================================================
// Tasks
// ============================================================================

/**
 * List all tasks
 */
export async function listTasks(): Promise<import('./types').TasksResponse> {
  return invoke('tasks_list');
}

/**
 * Get task details
 */
export async function getTask(taskId: string): Promise<import('./types').TaskDetail> {
  return invoke('task_get', { taskId });
}

/**
 * Get task logs
 */
export async function getTaskLogs(taskId: string): Promise<string[]> {
  return invoke('task_logs', { taskId });
}

/**
 * Cancel a task
 */
export async function cancelTask(taskId: string): Promise<void> {
  return invoke('task_cancel', { taskId });
}

/**
 * Get task summary
 */
export async function getTasksSummary(): Promise<import('./types').TasksSummary> {
  return invoke('tasks_summary');
}

// ============================================================================
// Maintenance
// ============================================================================

/**
 * Get maintenance information
 */
export async function getMaintenanceInfo(): Promise<import('./types').MaintenanceInfo> {
  return invoke('maintenance_info');
}

/**
 * Run maintenance
 */
export async function runMaintenance(full = false, safety?: 'none' | 'full'): Promise<string> {
  return invoke('maintenance_run', { full, safety });
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get current user and hostname
 */
export async function getCurrentUserInfo(): Promise<import('./types').CurrentUserResponse> {
  return invoke('current_user_get');
}

/**
 * Resolve path to source
 */
export async function resolvePath(path: string): Promise<import('./types').SourceInfo> {
  return invoke('path_resolve', { path });
}

/**
 * Estimate snapshot size
 */
export async function estimateSnapshot(root: string, maxExamples?: number): Promise<string> {
  return invoke('estimate_snapshot', { root, maxExamples });
}

/**
 * Get UI preferences
 */
export async function getUIPreferences(): Promise<import('./types').UIPreferences> {
  return invoke('ui_preferences_get');
}

/**
 * Save UI preferences
 */
export async function saveUIPreferences(
  preferences: import('./types').UIPreferences
): Promise<void> {
  return invoke('ui_preferences_set', { preferences });
}

// ============================================================================
// Notifications
// ============================================================================

/**
 * List notification profiles
 */
export async function listNotificationProfiles(): Promise<
  import('./types').NotificationProfilesResponse
> {
  return invoke('notification_profiles_list');
}

/**
 * Create notification profile
 */
export async function createNotificationProfile(
  profile: import('./types').NotificationProfile
): Promise<void> {
  return invoke('notification_profile_create', { profile });
}

/**
 * Delete notification profile
 */
export async function deleteNotificationProfile(profileName: string): Promise<void> {
  return invoke('notification_profile_delete', { profileName });
}

/**
 * Test notification profile
 */
export async function testNotificationProfile(profileName: string): Promise<void> {
  return invoke('notification_profile_test', { profileName });
}

// ============================================================================
// WebSocket Connection
// ============================================================================

/**
 * Connect to Kopia server WebSocket for real-time updates
 */
export function connectWebSocket(
  onEvent: (event: import('./types').WebSocketEvent) => void,
  onError?: (error: Error) => void
): () => void {
  let ws: WebSocket | null = null;
  let reconnectTimeout: number | null = null;

  const connect = async () => {
    try {
      const serverStatus = await getKopiaServerStatus();
      if (!serverStatus.running || !serverStatus.serverUrl) {
        throw new Error('Kopia server not running');
      }

      const wsUrl = serverStatus.serverUrl.replace('http', 'ws') + '/api/v1/ws';
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as import('./types').WebSocketEvent;

          onEvent(parsed);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        if (onError) {
          onError(new Error('WebSocket connection error'));
        }
      };

      ws.onclose = () => {
        // Attempt to reconnect after 5 seconds
        reconnectTimeout = window.setTimeout(() => void connect(), 5000);
      };
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      if (onError && err instanceof Error) {
        onError(err);
      }
      // Retry after 5 seconds
      reconnectTimeout = window.setTimeout(() => void connect(), 5000);
    }
  };

  void connect();

  // Return cleanup function
  return () => {
    if (ws) {
      ws.close();
      ws = null;
    }
    if (reconnectTimeout !== null) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };
}

// ============================================================================
// Error Handling Utilities
// ============================================================================
// Error handling utilities are now in errors.ts and re-exported above
