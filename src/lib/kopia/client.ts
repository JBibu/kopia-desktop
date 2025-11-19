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
  isAuthenticationError,
  getErrorMessage,
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
 * Open save file dialog
 *
 * Opens a native "Save As" dialog where the user can choose where to save a file
 * and optionally change the filename.
 *
 * @param defaultFilename - Optional default filename to suggest
 * @returns Path where the user wants to save the file, or null if cancelled
 */
export async function saveFile(defaultFilename?: string): Promise<string | null> {
  return invoke('save_file', { defaultFilename });
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
 *
 * @note Currently unused - snapshot cancellation UI is handled via task cancellation
 * This command may be used for dedicated snapshot-specific cancellation in the future
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
 *
 * @note Currently unused - planned for future snapshot management features
 */
export async function editSnapshot(request: import('./types').SnapshotEditRequest): Promise<void> {
  return invoke('snapshot_edit', { request });
}

/**
 * Delete snapshots (requires source information)
 */
export async function deleteSnapshots(
  userName: string,
  host: string,
  path: string,
  manifestIDs: string[]
): Promise<number> {
  return invoke('snapshot_delete', {
    userName,
    host,
    path,
    manifestIds: manifestIDs,
  });
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
 *
 * @note Currently unused - planned for restore/download features
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
 *
 * @note Currently unused - restore UI is planned for future release
 */
export async function restoreStart(request: import('./types').RestoreRequest): Promise<string> {
  return invoke('restore_start', { request });
}

/**
 * Mount a snapshot as a local filesystem
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
): Promise<import('./types').PolicyDefinition> {
  return invoke('policy_get', { userName, host, path });
}

/**
 * Resolve effective policy with inheritance
 */
/**
 * @note Currently unused - planned for advanced policy preview/validation features
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
 * @note The Kopia server does not expose a maintenance run endpoint in the API.
 * This function exists but will fail with 404. Maintenance must be scheduled via policies.
 */
export async function runMaintenance(full = false, safety?: 'none' | 'full'): Promise<string> {
  return invoke('maintenance_run', { full, safety });
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Resolve path to source
 */
export async function resolvePath(path: string): Promise<import('./types').SourceInfo> {
  return invoke('path_resolve', { path });
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
 * Test notification profile (send test notification)
 */
export async function testNotificationProfile(
  profile: import('./types').NotificationProfile
): Promise<void> {
  return invoke('notification_profile_test', { profile });
}

// ============================================================================
// WebSocket Connection
// ============================================================================

/**
 * Connect to Kopia WebSocket for real-time task updates
 */
export async function connectWebSocket(
  serverUrl: string,
  username: string,
  password: string
): Promise<void> {
  return invoke('websocket_connect', { serverUrl, username, password });
}

/**
 * Disconnect from Kopia WebSocket
 */
export async function disconnectWebSocket(): Promise<void> {
  return invoke('websocket_disconnect');
}

// ============================================================================
// Error Handling Utilities
// ============================================================================
// Error handling utilities are now in errors.ts and re-exported above

// ============================================================================
// UNUSED COMMANDS - Available but not currently used in UI
// ============================================================================
// The following commands are available in the backend but not actively used:
//
// 1. selectFile() - File picker for single file selection
//    Reason: Only folder picker (selectFolder) is needed for backup sources
//
// 2. updateRepositoryDescription() - Update repository metadata
//    Reason: Not exposed in UI yet, low priority feature
//
// 3. cancelSnapshot() - Cancel individual snapshot by ID
//    Reason: Task cancellation (cancelTask) is used instead for broader task management
//
// 4. editSnapshot() - Modify snapshot metadata (description, pins)
//    Reason: Pin management uses specialized API, description editing not prioritized
//
// 5. downloadObject() - Download files from snapshots
//    Reason: Mount + copy workflow preferred over direct download API
//
// 6. restoreStart() - Start file restore operation
//    Reason: Mount-based restore preferred for better user control
//
// 7. resolvePolicy() - Get fully resolved policy with inheritance
//    Reason: Policy editor works with direct policy values, not resolved
//
// 8. getTaskLogs() - Retrieve detailed task execution logs
//    Reason: No task log viewer UI implemented yet
//
// 9. UI preference commands - getUIPreferences/setUIPreferences
//    Reason: Zustand store handles all preferences with localStorage persistence
//
// 10. getWebSocketStatus() - Check WebSocket connection state
//     Reason: WebSocket status managed in Zustand store (isWebSocketConnected)
//
// These commands remain in the codebase for:
// - Future feature implementation
// - API completeness
// - Reference implementation
// - Potential advanced user workflows
