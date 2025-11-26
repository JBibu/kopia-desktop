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
} from './types';

// Re-export types for convenience
export type {
  RepositoryStatus,
  RepositoryConnectRequest,
  KopiaServerInfo,
  KopiaServerStatus,
  StorageType,
  StorageConfig,
} from './types';

// Re-export error handling utilities
export {
  KopiaError,
  KopiaErrorCode,
  OfficialKopiaAPIErrorCode,
  parseKopiaError,
  getErrorMessage,
  isNotConnectedError,
  isAuthenticationError,
  API_ERROR_CODE_MAPPING,
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

/**
 * Sync repository metadata with the storage backend
 *
 * This is useful when multiple clients are connected to the same repository
 * to ensure they all see the latest snapshots and policies.
 */
export async function syncRepository(): Promise<void> {
  return invoke('repository_sync');
}

// ============================================================================
// System Utilities
// ============================================================================

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
 * Update repository description
 *
 * Updates the human-readable description for the repository.
 * This helps identify the repository when managing multiple repositories.
 *
 * @param description - The new description for the repository
 */
export async function updateRepositoryDescription(description: string): Promise<void> {
  return invoke('repository_update_description', { description });
}

/**
 * Get repository throttling limits
 *
 * Returns the current bandwidth and operation throttling limits for the repository.
 */
export async function getThrottleLimits(): Promise<import('./types').ThrottleLimits> {
  return invoke('repository_get_throttle');
}

/**
 * Set repository throttling limits
 *
 * Sets bandwidth and operation throttling limits for the repository.
 * Pass 0 or undefined for a limit to disable throttling for that parameter.
 *
 * @param limits - The throttling limits to set
 */
export async function setThrottleLimits(limits: import('./types').ThrottleLimits): Promise<void> {
  return invoke('repository_set_throttle', { limits });
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
 * Create a snapshot source and optionally start a snapshot
 *
 * @param path - Path to snapshot
 * @param userName - Optional username (defaults to current user)
 * @param host - Optional hostname (defaults to current host)
 * @param createSnapshot - Whether to immediately start a snapshot (defaults to false)
 * @param policy - Optional policy override to apply to this snapshot
 */
export async function createSnapshot(
  path: string,
  userName?: string,
  host?: string,
  createSnapshot?: boolean,
  policy?: import('./types').PolicyDefinition
): Promise<import('./types').SourceInfo> {
  return await invoke<import('./types').SourceInfo>('snapshot_create', {
    path,
    userName,
    host,
    createSnapshot,
    policy,
  });
}

/**
 * Estimate snapshot size before creating it
 *
 * Returns a task ID that can be used to monitor the estimation progress.
 * The task will show estimates for bytes, files, directories, and errors.
 *
 * @param path - Path to estimate
 * @param maxExamplesPerBucket - Maximum examples per bucket (optional, defaults to 10)
 * @returns Task ID for the estimation task
 */
export async function estimateSnapshot(
  path: string,
  maxExamplesPerBucket?: number
): Promise<{ id: string }> {
  return await invoke('estimate_snapshot', {
    path,
    maxExamplesPerBucket: maxExamplesPerBucket || 10,
  });
}

/**
 * Start a snapshot upload for an existing source
 *
 * This triggers a snapshot on an existing source without creating a new source.
 * Use this when you want to manually trigger a backup on a source that already exists.
 *
 * @param userName - Username of the source owner
 * @param host - Hostname of the source
 * @param path - Path of the source
 */
export async function uploadSnapshot(userName: string, host: string, path: string): Promise<void> {
  return await invoke('snapshot_upload', {
    userName,
    host,
    path,
  });
}

/**
 * Cancel a running snapshot
 *
 * @param userName - Username of the source owner
 * @param host - Hostname of the source
 * @param path - Path of the source
 */
export async function cancelSnapshot(userName: string, host: string, path: string): Promise<void> {
  return await invoke('snapshot_cancel', {
    userName,
    host,
    path,
  });
}

/**
 * Pause a snapshot source
 *
 * Pauses the specified snapshot source, halting any running upload.
 *
 * @param userName - Username of the source owner
 * @param host - Hostname of the source
 * @param path - Path of the source
 */
export async function pauseSnapshot(
  userName: string,
  host: string,
  path: string
): Promise<import('./types').MultipleSourceActionResponse> {
  return await invoke('snapshot_pause', {
    userName,
    host,
    path,
  });
}

/**
 * Resume a paused snapshot source
 *
 * Resumes a previously paused snapshot source.
 *
 * @param userName - Username of the source owner
 * @param host - Hostname of the source
 * @param path - Path of the source
 */
export async function resumeSnapshot(
  userName: string,
  host: string,
  path: string
): Promise<import('./types').MultipleSourceActionResponse> {
  return await invoke('snapshot_resume', {
    userName,
    host,
    path,
  });
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
 *
 * Returns the full PolicyResponse including target and policy.
 * Use response.policy to access the PolicyDefinition.
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
