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
  RepositoryEntry,
} from './types';

// Re-export types for convenience
export type {
  RepositoryStatus,
  RepositoryConnectRequest,
  KopiaServerInfo,
  KopiaServerStatus,
  RepositoryEntry,
} from './types';

// Re-export error handling utilities
export {
  KopiaError,
  KopiaErrorCode,
  OfficialKopiaAPIErrorCode,
  parseKopiaError,
  getErrorMessage,
  isNotConnectedError,
  API_ERROR_CODE_MAPPING,
} from './errors';

// ============================================================================
// Multi-Repository Management
// ============================================================================

/**
 * List all repositories with their status
 */
export async function listRepositories(): Promise<RepositoryEntry[]> {
  return invoke('list_repositories');
}

/**
 * Add a new repository configuration
 * @param repoId - Optional specific repository ID, auto-generates if not provided
 * @returns The repository ID (provided or generated)
 */
export async function addRepository(repoId?: string): Promise<string> {
  return invoke('add_repository', { repoId });
}

/**
 * Remove a repository configuration
 * @param repoId - Repository identifier to remove
 */
export async function removeRepository(repoId: string): Promise<void> {
  return invoke('remove_repository', { repoId });
}

// ============================================================================
// Kopia Server Lifecycle
// ============================================================================

/**
 * Start the Kopia server process for a repository
 * @param repoId - Repository identifier
 */
export async function startKopiaServer(repoId: string): Promise<KopiaServerInfo> {
  return invoke('kopia_server_start', { repoId });
}

/**
 * Stop the Kopia server process for a repository
 * @param repoId - Repository identifier
 */
export async function stopKopiaServer(repoId: string): Promise<void> {
  return invoke('kopia_server_stop', { repoId });
}

/**
 * Get Kopia server status for a repository
 * @param repoId - Repository identifier
 */
export async function getKopiaServerStatus(repoId: string): Promise<KopiaServerStatus> {
  return invoke('kopia_server_status', { repoId });
}

// ============================================================================
// Repository Management
// ============================================================================

/**
 * Get repository status
 * @param repoId - Repository identifier
 */
export async function getRepositoryStatus(repoId: string): Promise<RepositoryStatus> {
  return invoke('repository_status', { repoId });
}

/**
 * Connect to an existing repository
 * @param repoId - Repository identifier
 * @param config - Repository connection configuration
 */
export async function connectRepository(
  repoId: string,
  config: RepositoryConnectRequest
): Promise<RepositoryStatus> {
  return invoke('repository_connect', { repoId, config });
}

/**
 * Disconnect from the current repository
 * @param repoId - Repository identifier
 */
export async function disconnectRepository(repoId: string): Promise<void> {
  return invoke('repository_disconnect', { repoId });
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
 * @param repoId - Repository identifier
 * @param config - Repository creation configuration
 */
export async function createRepository(
  repoId: string,
  config: import('./types').RepositoryCreateRequest
): Promise<string> {
  return invoke('repository_create', { repoId, config });
}

/**
 * Check if repository exists
 * @param repoId - Repository identifier
 * @param storage - Storage configuration to check
 */
export async function repositoryExists(
  repoId: string,
  storage: import('./types').StorageConfig
): Promise<boolean> {
  return invoke('repository_exists', { repoId, storage });
}

/**
 * Update repository description
 *
 * Updates the human-readable description for the repository.
 * This helps identify the repository when managing multiple repositories.
 *
 * @param repoId - Repository identifier
 * @param description - The new description for the repository
 */
export async function updateRepositoryDescription(
  repoId: string,
  description: string
): Promise<void> {
  return invoke('repository_update_description', { repoId, description });
}

// ============================================================================
// Snapshot Sources
// ============================================================================

/**
 * List all snapshot sources
 * @param repoId - Repository identifier
 */
export async function listSources(repoId: string): Promise<import('./types').SourcesResponse> {
  return invoke('sources_list', { repoId });
}

/**
 * Create a snapshot source and optionally start a snapshot
 *
 * @param repoId - Repository identifier
 * @param path - Path to snapshot
 * @param userName - Optional username (defaults to current user)
 * @param host - Optional hostname (defaults to current host)
 * @param createSnapshot - Whether to immediately start a snapshot (defaults to false)
 * @param policy - Optional policy override to apply to this snapshot
 */
export async function createSnapshot(
  repoId: string,
  path: string,
  userName?: string,
  host?: string,
  createSnapshot?: boolean,
  policy?: import('./types').PolicyDefinition
): Promise<import('./types').SourceInfo> {
  return await invoke<import('./types').SourceInfo>('snapshot_create', {
    repoId,
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
 * @param repoId - Repository identifier
 * @param path - Path to estimate
 * @param maxExamplesPerBucket - Maximum examples per bucket (optional, defaults to 10)
 * @returns Task ID for the estimation task
 */
export async function estimateSnapshot(
  repoId: string,
  path: string,
  maxExamplesPerBucket?: number
): Promise<{ id: string }> {
  return await invoke('estimate_snapshot', {
    repoId,
    path,
    maxExamplesPerBucket: maxExamplesPerBucket || 10,
  });
}

// ============================================================================
// Snapshot History
// ============================================================================

/**
 * List snapshots for a source
 * @param repoId - Repository identifier
 */
export async function listSnapshots(
  repoId: string,
  userName: string,
  host: string,
  path: string,
  all = false
): Promise<import('./types').SnapshotsResponse> {
  return invoke('snapshots_list', { repoId, userName, host, path, all });
}

/**
 * Edit snapshot metadata (pins, description)
 * @param repoId - Repository identifier
 */
export async function editSnapshot(
  repoId: string,
  request: import('./types').SnapshotEditRequest
): Promise<void> {
  return invoke('snapshot_edit', { repoId, request });
}

/**
 * Delete snapshots (requires source information)
 * @param repoId - Repository identifier
 */
export async function deleteSnapshots(
  repoId: string,
  userName: string,
  host: string,
  path: string,
  manifestIDs: string[]
): Promise<number> {
  return invoke('snapshot_delete', {
    repoId,
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
 * @param repoId - Repository identifier
 */
export async function browseObject(
  repoId: string,
  objectId: string
): Promise<import('./types').DirectoryObject> {
  return invoke('object_browse', { repoId, objectId });
}

/**
 * Download a single file from a snapshot
 * @param repoId - Repository identifier
 */
export async function downloadObject(
  repoId: string,
  objectId: string,
  filename: string,
  targetPath: string
): Promise<void> {
  return invoke('object_download', { repoId, objectId, filename, targetPath });
}

/**
 * Start a restore operation
 * @param repoId - Repository identifier
 */
export async function restoreStart(
  repoId: string,
  request: import('./types').RestoreRequest
): Promise<string> {
  return invoke('restore_start', { repoId, request });
}

/**
 * Mount a snapshot as a local filesystem
 * @param repoId - Repository identifier
 */
export async function mountSnapshot(repoId: string, root: string): Promise<string> {
  return invoke('mount_snapshot', { repoId, root });
}

/**
 * List all mounted snapshots
 * @param repoId - Repository identifier
 */
export async function listMounts(repoId: string): Promise<import('./types').MountsResponse> {
  return invoke('mounts_list', { repoId });
}

/**
 * Unmount a snapshot
 * @param repoId - Repository identifier
 */
export async function unmountSnapshot(repoId: string, objectId: string): Promise<void> {
  return invoke('mount_unmount', { repoId, objectId });
}

// ============================================================================
// Policies
// ============================================================================

/**
 * List all policies
 * @param repoId - Repository identifier
 */
export async function listPolicies(repoId: string): Promise<import('./types').PoliciesResponse> {
  return invoke('policies_list', { repoId });
}

/**
 * Get policy for a specific target
 *
 * Returns the full PolicyResponse including target and policy.
 * Use response.policy to access the PolicyDefinition.
 * @param repoId - Repository identifier
 */
export async function getPolicy(
  repoId: string,
  userName?: string,
  host?: string,
  path?: string
): Promise<import('./types').PolicyResponse> {
  return invoke('policy_get', { repoId, userName, host, path });
}

/**
 * Resolve effective policy with inheritance
 * @param repoId - Repository identifier
 */
export async function resolvePolicy(
  repoId: string,
  userName?: string,
  host?: string,
  path?: string,
  updates?: import('./types').PolicyDefinition
): Promise<import('./types').ResolvedPolicyResponse> {
  return invoke('policy_resolve', { repoId, userName, host, path, updates });
}

/**
 * Set/update policy
 * @param repoId - Repository identifier
 */
export async function setPolicy(
  repoId: string,
  policy: import('./types').PolicyDefinition,
  userName?: string,
  host?: string,
  path?: string
): Promise<void> {
  return invoke('policy_set', { repoId, userName, host, path, policy });
}

/**
 * Delete policy (revert to inherited)
 * @param repoId - Repository identifier
 */
export async function deletePolicy(
  repoId: string,
  userName?: string,
  host?: string,
  path?: string
): Promise<void> {
  return invoke('policy_delete', { repoId, userName, host, path });
}

// ============================================================================
// Tasks
// ============================================================================

/**
 * List all tasks
 * @param repoId - Repository identifier
 */
export async function listTasks(repoId: string): Promise<import('./types').TasksResponse> {
  return invoke('tasks_list', { repoId });
}

/**
 * Get task details
 * @param repoId - Repository identifier
 */
export async function getTask(
  repoId: string,
  taskId: string
): Promise<import('./types').TaskDetail> {
  return invoke('task_get', { repoId, taskId });
}

/**
 * Cancel a task
 * @param repoId - Repository identifier
 */
export async function cancelTask(repoId: string, taskId: string): Promise<void> {
  return invoke('task_cancel', { repoId, taskId });
}

/**
 * Get task summary
 * @param repoId - Repository identifier
 */
export async function getTasksSummary(repoId: string): Promise<import('./types').TasksSummary> {
  return invoke('tasks_summary', { repoId });
}

// ============================================================================
// Notifications
// ============================================================================

/**
 * List notification profiles
 * @param repoId - Repository identifier
 */
export async function listNotificationProfiles(
  repoId: string
): Promise<import('./types').NotificationProfilesResponse> {
  return invoke('notification_profiles_list', { repoId });
}

/**
 * Create notification profile
 * @param repoId - Repository identifier
 */
export async function createNotificationProfile(
  repoId: string,
  profile: import('./types').NotificationProfile
): Promise<void> {
  return invoke('notification_profile_create', { repoId, profile });
}

/**
 * Delete notification profile
 * @param repoId - Repository identifier
 */
export async function deleteNotificationProfile(
  repoId: string,
  profileName: string
): Promise<void> {
  return invoke('notification_profile_delete', { repoId, profileName });
}

/**
 * Test notification profile (send test notification)
 * @param repoId - Repository identifier
 */
export async function testNotificationProfile(
  repoId: string,
  profile: import('./types').NotificationProfile
): Promise<void> {
  return invoke('notification_profile_test', { repoId, profile });
}

// ============================================================================
// WebSocket Connection
// ============================================================================

/**
 * Connect to Kopia WebSocket for real-time task updates
 * @param repoId - Repository identifier
 */
export async function connectWebSocket(
  repoId: string,
  serverUrl: string,
  username: string,
  password: string
): Promise<void> {
  return invoke('websocket_connect', { repoId, serverUrl, username, password });
}

/**
 * Disconnect from Kopia WebSocket
 * @param repoId - Repository identifier
 */
export async function disconnectWebSocket(repoId: string): Promise<void> {
  return invoke('websocket_disconnect', { repoId });
}
