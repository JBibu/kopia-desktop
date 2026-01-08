/**
 * Kopia API types
 *
 * Based on KOPIA_API_SPEC.md
 * All types match the Kopia REST API v1 specification
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Source identifier for snapshots
 * Format: userName@host:path
 */
export interface SourceInfo {
  userName: string;
  host: string;
  path: string;
}

/**
 * Repository status information (matches serverapi.StatusResponse)
 * Combines StatusResponse + embedded repo.ClientOptions
 * See: internal/serverapi/serverapi.go:22-40, repo/local_config.go
 */
export interface RepositoryStatus {
  connected: boolean;
  configFile?: string;
  storage?: string;
  hash?: string;
  encryption?: string;
  splitter?: string;
  formatVersion?: number; // format.Version
  username?: string; // From ClientOptions
  hostname?: string; // From ClientOptions
  readonly?: boolean; // From ClientOptions
  apiServerURL?: string;
  initTaskID?: string;
  description?: string; // From ClientOptions
  ecc?: string;
  eccOverheadPercent?: number;
  supportsContentCompression?: boolean;
  maxPackSize?: number;
  enableActions?: boolean; // From ClientOptions
  formatBlobCacheDuration?: number; // From ClientOptions (time.Duration as number)
  permissiveCacheLoading?: boolean; // From ClientOptions - advanced feature
  throttlingLimits?: {
    // From ClientOptions (throttling.Limits) - advanced feature
    uploadBytesPerSecond?: number;
    downloadBytesPerSecond?: number;
  };
}

/**
 * Repository creation options
 */
export interface RepositoryCreateRequest {
  storage: StorageConfig;
  password: string;
  options?: {
    blockFormat?: {
      hash?: string;
      encryption?: string;
      splitter?: string;
      version?: string;
    };
    objectFormat?: {
      splitter?: string;
      minContentSize?: number;
      maxContentSize?: number;
    };
    retentionMode?: 'governance' | 'compliance';
    retentionPeriod?: string;
    ecc?: string;
    eccOverheadPercent?: number;
  };
  clientOptions?: {
    description?: string;
    username?: string;
    hostname?: string;
    readonly?: boolean;
  };
  /** Time in seconds to wait for repository sync after creation */
  syncWaitTime?: number;
}

// ============================================================================
// Snapshot Types
// ============================================================================

/**
 * Directory summary statistics (matches fs.DirectorySummary)
 * See: fs/entry.go
 */
export interface DirectorySummary {
  size: number; // TotalFileSize
  files: number; // TotalFileCount
  dirs: number; // TotalDirCount
  symlinks?: number; // TotalSymlinkCount
  maxTime?: string; // MaxModTime (RFC3339Nano format)
  incomplete?: string; // IncompleteReason - empty if complete
  numFailed?: number; // FatalErrorCount
  numIgnoredErrors?: number; // IgnoredErrorCount
  errors?: Array<{
    // FailedEntries
    path: string;
    error: string;
  }>;
}

/**
 * Root entry object
 */
export interface RootEntry {
  obj?: string;
  summ?: DirectorySummary;
}

/**
 * Snapshot metadata - represents BOTH serverapi.Snapshot AND snapshot.Manifest
 *
 * **IMPORTANT:** Different API endpoints return different field sets:
 *
 * 1. `/api/v1/snapshots` returns **serverapi.Snapshot**:
 *    - Has: `rootID` (string object ID), `summary`, `retention`, `pins`
 *    - Missing: `rootEntry`, `stats`, `source`, `tags`, `storageStats`
 *
 * 2. `SourceStatus.lastSnapshot` returns **snapshot.Manifest**:
 *    - Has: `rootEntry` (DirEntry object), `stats`, `source`, `tags`, `storageStats`, `pins`
 *    - Missing: `rootID` (uses rootEntry.obj instead), `summary`
 *    - Note: `retention` field has `json:"-"` tag in Go (not serialized in Manifest)
 *
 * This hybrid type safely handles both responses by making distinct fields optional.
 *
 * See: internal/serverapi/serverapi.go:167-178, snapshot/manifest.go:18-40
 */
export interface Snapshot {
  id: string;
  // serverapi.Snapshot fields (from /api/v1/snapshots)
  rootID?: string; // Note: JSON field is "rootID" (capital ID), not camelCase
  summary?: SnapshotSummary; // fs.DirectorySummary
  retention?: string[]; // Only in serverapi.Snapshot (Manifest has `json:"-"` tag)
  // snapshot.Manifest fields (from SourceStatus.lastSnapshot)
  rootEntry?: RootEntry; // DirEntry object with obj and summ
  stats?: SnapshotStats; // snapshot.Stats
  source?: SourceInfo; // user@host:path
  tags?: Record<string, string>; // Custom tags
  storageStats?: StorageStats; // Storage usage statistics
  // Common fields (present in both)
  startTime: string; // RFC3339Nano format
  endTime?: string; // RFC3339Nano format
  description?: string;
  pins?: string[]; // Pin labels for retention
  incomplete?: string; // IncompleteReason - empty if complete, otherwise reason like "canceled"
}

/**
 * Snapshot statistics summary
 */
export interface SnapshotSummary {
  size?: number;
  files?: number;
  dirs?: number;
  symlinks?: number;
  errors?: number;
  errorCount?: number;
  ignoredErrorCount?: number;
  numFailed?: number;
  totalFileSize?: number;
  excludedFileCount?: number;
  excludedTotalFileSize?: number;
  excludedDirCount?: number;
}

/**
 * Snapshot statistics (matches snapshot.Stats)
 * See: snapshot/stats.go:10-37
 */
export interface SnapshotStats {
  totalSize: number;
  excludedTotalSize: number;
  fileCount: number;
  cachedFiles: number;
  nonCachedFiles: number;
  dirCount: number;
  excludedFileCount: number;
  excludedDirCount: number;
  ignoredErrorCount: number;
  errorCount: number;
}

/**
 * Storage statistics (matches snapshot.StorageStats)
 * See: snapshot/manifest.go:186-192
 */
export interface StorageStats {
  newData: StorageUsageDetails;
  runningTotal: StorageUsageDetails;
}

/**
 * Storage usage details (matches snapshot.StorageUsageDetails)
 * See: snapshot/manifest.go:194-219
 */
export interface StorageUsageDetails {
  objectBytes: number;
  originalContentBytes: number;
  packedContentBytes: number;
  fileObjects: number;
  dirObjects: number;
  contents: number;
}

/**
 * Upload counters (matches upload.Counters from Kopia)
 * See: snapshot/upload/upload_progress.go:169-201
 */
export interface UploadCounters {
  cachedBytes: number;
  hashedBytes: number;
  uploadedBytes: number;
  estimatedBytes: number;
  cachedFiles: number;
  hashedFiles: number;
  excludedFiles: number;
  excludedDirs: number;
  errors: number;
  ignoredErrors: number;
  estimatedFiles: number;
  directory: string;
  lastErrorPath: string;
  lastError: string;
}

/**
 * Snapshot source with status (matches serverapi.SourceStatus)
 * See: internal/serverapi/serverapi.go:54-62
 */
export interface SnapshotSource {
  source: SourceInfo;
  status: 'IDLE' | 'PENDING' | 'UPLOADING' | 'PAUSED' | 'FAILED';
  schedule: {
    // SchedulingPolicy fields
    intervalSeconds?: number;
    /** Times of day to run snapshots (array of {hour, min} objects) */
    timeOfDay?: TimeOfDay[];
    noParentTimeOfDay?: boolean;
    manual?: boolean;
    cron?: string[];
    runMissed?: boolean;
  };
  lastSnapshot?: Snapshot; // Full snapshot.Manifest
  nextSnapshotTime?: string;
  upload?: UploadCounters; // Matches upload.Counters
  currentTask?: string;
}

/**
 * Sources list response
 */
export interface SourcesResponse {
  localUsername: string;
  localHost: string;
  multiUser: boolean;
  sources: SnapshotSource[];
}

/**
 * Snapshots list response
 */
export interface SnapshotsResponse {
  snapshots: Snapshot[];
  unfilteredCount: number;
  uniqueCount: number;
}

/**
 * Snapshot edit request
 */
export interface SnapshotEditRequest {
  snapshots: string[]; // API expects "snapshots", not "manifestIDs"
  description?: string;
  addPins?: string[];
  removePins?: string[];
}

/**
 * Snapshot delete request
 * See: internal/serverapi/serverapi.go (DeleteSnapshotsRequest)
 */
export interface SnapshotDeleteRequest {
  source: SourceInfo;
  snapshotManifestIds: string[];
  deleteSourceAndPolicy?: boolean;
}

// ============================================================================
// Directory & File Browsing Types
// ============================================================================

/**
 * Directory entry (file, folder, symlink, etc.)
 * See: fs/entry.go (DirEntry)
 */
export interface DirectoryEntry {
  name: string;
  type: 'f' | 'd' | 's' | 'c' | 'b' | 'p';
  mode: string; // Octal string like "0755" or "0644"
  size?: number; // Optional because some entries (e.g., directories) may not have size
  mtime: string;
  obj: string;
  summ?: {
    size: number;
    files: number;
    dirs: number;
    errors?: number;
    maxTime?: string;
  };
  linkTarget?: string;
  /** User ID (owner) of the entry */
  uid?: number;
  /** Group ID (owner group) of the entry */
  gid?: number;
}

/**
 * Directory object response
 */
export interface DirectoryObject {
  stream?: 'kopia:directory';
  entries: DirectoryEntry[];
}

/**
 * Restore request
 */
export interface RestoreRequest {
  root: string;
  fsOutput?: {
    targetPath: string;
    overwriteFiles?: boolean;
    overwriteDirectories?: boolean;
    overwriteSymlinks?: boolean;
    skipOwners?: boolean;
    skipPermissions?: boolean;
    skipTimes?: boolean;
    ignorePermissionErrors?: boolean;
    writeFilesAtomically?: boolean;
    writeSparseFiles?: boolean;
  };
  zipFile?: string;
  uncompressedZip?: boolean;
  tarFile?: string;
  options?: {
    incremental?: boolean;
    ignoreErrors?: boolean;
    restoreDirEntryAtDepth?: number;
    minSizeForPlaceholder?: number;
  };
}

/**
 * Mounts list response (matches serverapi.MountedSnapshots)
 */
export interface MountsResponse {
  items: Array<{
    root: string;
    path: string;
  }>;
}

// ============================================================================
// Policy Types
// ============================================================================

/**
 * Action definition for before/after hooks
 * Supports both script-based and command-based execution
 * See: snapshot/policy/actions_policy.go:22-33
 */
export interface ActionDefinition {
  /** Command executable path (alternative to script) */
  path?: string;
  /** Command arguments (used with path) */
  args?: string[];
  /** Inline script content (alternative to path/args) */
  script?: string;
  /** Timeout in seconds */
  timeout?: number;
  /** Execution mode: "essential", "optional", or "async" */
  mode?: 'essential' | 'optional' | 'async';
}

/**
 * Time of day for scheduling
 * See: snapshot/policy/scheduling_policy.go:19-46
 */
export interface TimeOfDay {
  hour: number;
  /** Note: JSON field is "min", not "minute" */
  min: number;
}

/**
 * Compression policy configuration
 * See: snapshot/policy/compression_policy.go:12-21
 */
export interface CompressionPolicy {
  compressorName?: string;
  minSize?: number;
  maxSize?: number;
  onlyCompress?: string[];
  /** Prevents inheriting onlyCompress list from parent policies */
  noParentOnlyCompress?: boolean;
  neverCompress?: string[];
  /** Prevents inheriting neverCompress list from parent policies */
  noParentNeverCompress?: boolean;
}

/**
 * OS Snapshot Mode values for VSS
 * 0 = Never (don't use OS snapshots)
 * 1 = Always (require OS snapshots, fail if unavailable)
 * 2 = WhenAvailable (use if available, continue without if not)
 */
export type OSSnapshotMode = 0 | 1 | 2;

/**
 * LogDetail level values
 * Common values: 0 = None, 5 = Normal, 10 = Max
 * But API accepts any number, so we just use number.
 */
export type LogDetailLevel = number;

/**
 * Policy definition (complete specification)
 */
export interface PolicyDefinition {
  noParent?: boolean; // Prevents inheriting policy from parent
  retention?: {
    keepLatest?: number;
    keepHourly?: number;
    keepDaily?: number;
    keepWeekly?: number;
    keepMonthly?: number;
    keepAnnual?: number;
    ignoreIdenticalSnapshots?: boolean;
  };
  scheduling?: {
    intervalSeconds?: number;
    /** Times of day to run snapshots (array of {hour, min} objects) */
    timeOfDay?: TimeOfDay[];
    noParentTimeOfDay?: boolean;
    manual?: boolean;
    cron?: string[];
    runMissed?: boolean;
  };
  files?: {
    ignore?: string[];
    /** Note: JSON field is "ignoreDotFiles" (NOT camelCase "dotIgnoreFiles") */
    ignoreDotFiles?: string[];
    oneFileSystem?: boolean;
    noParentIgnore?: boolean;
    noParentDotFiles?: boolean;
    ignoreCacheDirs?: boolean;
    maxFileSize?: number;
  };
  compression?: CompressionPolicy;
  metadataCompression?: CompressionPolicy;
  splitter?: {
    /** Content splitting algorithm name */
    algorithm?: string;
  };
  actions?: {
    beforeSnapshotRoot?: ActionDefinition;
    afterSnapshotRoot?: ActionDefinition;
    beforeFolder?: ActionDefinition;
    afterFolder?: ActionDefinition;
  };
  osSnapshots?: {
    volumeShadowCopy?: {
      /** OSSnapshotMode: 0=Never, 1=Always, 2=WhenAvailable */
      enable?: OSSnapshotMode;
    };
  };
  errorHandling?: {
    ignoreFileErrors?: boolean;
    ignoreDirectoryErrors?: boolean;
    ignoreUnknownTypes?: boolean;
  };
  upload?: {
    maxParallelSnapshots?: number;
    maxParallelFileReads?: number;
    parallelUploadAboveSize?: number;
  };
  /** Logging policy - LogDetail levels: 0=None, 5=Normal, 10=Max */
  logging?: {
    directories?: {
      snapshotted?: LogDetailLevel;
      ignored?: LogDetailLevel;
    };
    entries?: {
      snapshotted?: LogDetailLevel;
      ignored?: LogDetailLevel;
      cacheHit?: LogDetailLevel;
      cacheMiss?: LogDetailLevel;
    };
  };
}

/**
 * Policy target (hierarchy level)
 */
export interface PolicyTarget {
  userName?: string;
  host?: string;
  path?: string;
}

/**
 * Policy with target
 */
export interface PolicyResponse {
  id?: string;
  target: PolicyTarget;
  policy: PolicyDefinition;
}

/**
 * Policies list response
 */
export interface PoliciesResponse {
  policies: PolicyResponse[];
}

/**
 * Resolved policy response
 *
 * Note: 'definition' contains SourceInfo objects showing WHERE each field was defined,
 * not the actual policy values. We don't use it in the UI, so it's typed as any.
 */
export interface ResolvedPolicyResponse {
  effective: PolicyDefinition;
  definition?: unknown; // Contains SourceInfo objects, not policy values
  defined?: PolicyDefinition;
  upcomingSnapshotTimes: string[];
  schedulingError?: string;
}

// ============================================================================
// Task Types
// ============================================================================

/**
 * Task status (matches uitask.Status)
 * See: internal/uitask/uitask.go:22-28
 */
export type TaskStatus = 'RUNNING' | 'CANCELING' | 'CANCELED' | 'SUCCESS' | 'FAILED';

/**
 * Task information (matches uitask.Info)
 * See: internal/uitask/uitask.go:52-66
 * Note: progressInfo and counters can be empty/null in practice
 */
export interface Task {
  id: string;
  startTime: string;
  endTime?: string;
  kind: string;
  description: string;
  status: TaskStatus;
  progressInfo?: string; // Can be empty
  errorMessage?: string;
  counters?: Record<string, CounterValue>; // Can be null when map is nil in Go
}

/**
 * Counter level for task counters
 * Empty string means normal, others indicate different severity levels
 */
export type CounterLevel = '' | 'notice' | 'warning' | 'error';

/**
 * CounterValue describes the counter value reported by task with optional units for presentation.
 * See: internal/uitask/uitask_counter.go:4-10
 */
export interface CounterValue {
  value: number;
  units?: string;
  level?: CounterLevel;
}

/**
 * Task detail with logs
 */
export interface TaskDetail extends Task {
  logs?: string[];
}

/**
 * Tasks list response
 */
export interface TasksResponse {
  tasks: Task[];
}

/**
 * Task summary
 */
export interface TasksSummary {
  running: number;
  success: number;
  failed: number;
  canceled: number;
}

// ============================================================================
// Backup Profile Types
// ============================================================================

/**
 * Backup Profile - contains directories to backup with shared policy
 *
 * A profile groups multiple directories that should be backed up together
 * with the same policy configuration.
 */
export interface BackupProfile {
  id: string; // UUID
  name: string;
  description?: string;
  directories: string[]; // List of directory paths to backup
  policy?: PolicyDefinition; // Policy override to apply to all directories in this profile
  enabled: boolean;
  pinned?: boolean; // Whether this profile is pinned
  order?: number; // Custom order for sorting
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationSeverity = -100 | -10 | 0 | 10 | 20;

export const NotificationSeverities = {
  VERBOSE: -100 as NotificationSeverity,
  SUCCESS: -10 as NotificationSeverity,
  REPORT: 0 as NotificationSeverity,
  WARNING: 10 as NotificationSeverity,
  ERROR: 20 as NotificationSeverity,
} as const;

import i18n from '@/lib/i18n/config';

const severityLabels: Record<NotificationSeverity, string> = {
  [-100]: 'verbose',
  [-10]: 'success',
  [0]: 'report',
  [10]: 'warning',
  [20]: 'error',
};

/**
 * Get translated severity label
 */
export function getSeverityLabel(severity: NotificationSeverity): string {
  return i18n.t(`preferences.notificationProfiles.severity.${severityLabels[severity]}`);
}

/**
 * Notification method configuration
 */
export interface NotificationMethod {
  type: 'email' | 'pushover' | 'webhook';
  config: EmailConfig | PushoverConfig | WebhookConfig | Record<string, unknown>;
}

/**
 * Email notification configuration
 */
export interface EmailConfig {
  smtpServer: string;
  smtpPort: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpIdentity?: string;
  from: string;
  to: string;
  cc?: string;
  format: 'txt' | 'html';
}

/**
 * Pushover notification configuration
 */
export interface PushoverConfig {
  appToken: string;
  userKey: string;
  format: 'txt' | 'html';
}

/**
 * Webhook notification configuration
 */
export interface WebhookConfig {
  endpoint: string;
  method: 'POST' | 'PUT';
  headers?: string; // Multi-line string, one header per line
  format: 'txt' | 'html';
}

/**
 * Notification profile
 */
export interface NotificationProfile {
  profile: string;
  method: NotificationMethod;
  minSeverity: NotificationSeverity;
}

/**
 * Notification profiles list response (just an array)
 */
export type NotificationProfilesResponse = NotificationProfile[];

// ============================================================================
// WebSocket Event Types
// ============================================================================

/**
 * Task progress WebSocket event
 */
export interface TaskProgressEvent {
  type: 'task-progress';
  taskID: string;
  status: TaskStatus;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  counters: {
    hashedFiles: number;
    hashedBytes: number;
    cachedFiles: number;
    cachedBytes: number;
  };
}

/**
 * Snapshot progress WebSocket event
 */
export interface SnapshotProgressEvent {
  type: 'snapshot-progress';
  source: SourceInfo;
  status: 'UPLOADING' | 'IDLE' | 'FAILED';
  upload: {
    hashedFiles: number;
    hashedBytes: number;
    estimatedBytes?: number;
    directory: string;
  };
}

/**
 * Error WebSocket event
 */
export interface ErrorEvent {
  type: 'error';
  message: string;
  details?: string;
}

/**
 * General notification WebSocket event
 */
export interface NotificationEvent {
  type: 'notification';
  level: 'info' | 'warning' | 'error';
  message: string;
}

/**
 * Union type for all WebSocket events
 */
export type WebSocketEvent =
  | TaskProgressEvent
  | SnapshotProgressEvent
  | ErrorEvent
  | NotificationEvent;

// ============================================================================
// Kopia Server Lifecycle Types
// ============================================================================

export interface KopiaServerInfo {
  serverUrl: string;
  port: number;
  password: string;
  pid: number;
}

export interface KopiaServerStatus {
  running: boolean;
  serverUrl?: string;
  port?: number;
  uptime?: number;
}

/**
 * Repository entry from multi-repo management
 * Represents a repository configuration with its current status
 */
export interface RepositoryEntry {
  /** Unique identifier (derived from config filename) */
  id: string;
  /** Display name (from repo description or storage type) */
  displayName: string;
  /** Full path to config file */
  configFile: string;
  /** Server status: "starting", "running", "stopped", "error" */
  status: 'starting' | 'running' | 'stopped' | 'error';
  /** Whether repository is connected */
  connected: boolean;
  /** Storage type (filesystem, s3, b2, etc.) */
  storage?: string;
  /** Error message if status is "error" */
  error?: string;
}

// ============================================================================
// Storage Configuration Types
// ============================================================================

export type StorageType =
  | 'filesystem'
  | 's3'
  | 'gcs'
  | 'azureBlob'
  | 'b2'
  | 'sftp'
  | 'webdav'
  | 'rclone';

// Storage-type specific configuration objects
export interface FilesystemStorageConfig {
  path: string;
}

export interface S3StorageConfig {
  bucket: string;
  endpoint?: string;
  accessKeyID?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  region?: string;
  prefix?: string;
}

export interface GCSStorageConfig {
  bucket: string;
  credentialsFile?: string;
  credentialsJSON?: string;
  prefix?: string;
}

export interface AzureStorageConfig {
  container: string;
  storageAccount: string;
  storageKey?: string;
  storageDomain?: string;
  prefix?: string;
}

export interface B2StorageConfig {
  bucket: string;
  keyID: string;
  key: string;
  prefix?: string;
}

export interface SFTPStorageConfig {
  path: string;
  host: string;
  port?: number;
  username: string;
  password?: string;
  keyfile?: string;
  keyData?: string;
  knownHostsFile?: string;
  knownHostsData?: string;
}

export interface WebDAVStorageConfig {
  url: string;
  username?: string;
  password?: string;
  trustedServerCertificateFingerprint?: string;
}

export interface RcloneStorageConfig {
  remotePath: string;
  rcloneExe?: string;
  rcloneArgs?: string[];
  rcloneEnv?: Record<string, string>;
}

// Main storage configuration structure that matches Kopia API
export interface StorageConfig {
  type: StorageType;
  config:
    | FilesystemStorageConfig
    | S3StorageConfig
    | GCSStorageConfig
    | AzureStorageConfig
    | B2StorageConfig
    | SFTPStorageConfig
    | WebDAVStorageConfig
    | RcloneStorageConfig;
}

export interface RepositoryConnectRequest {
  storage: StorageConfig;
  password: string;
  token?: string;
  clientOptions?: {
    description?: string;
    username?: string;
    hostname?: string;
    readonly?: boolean;
  };
  /** Time in seconds to wait for repository sync after connection */
  syncWaitTime?: number;
}
