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
}

/**
 * Algorithm option from Kopia API
 */
export interface AlgorithmOption {
  id: string;
  deprecated?: boolean;
}

/**
 * Available algorithms for repository creation
 */
export interface AlgorithmsResponse {
  defaultHash: string;
  defaultEncryption: string;
  defaultSplitter: string;
  defaultEcc?: string;
  hash: AlgorithmOption[];
  encryption: AlgorithmOption[];
  splitter: AlgorithmOption[];
  ecc?: AlgorithmOption[];
  compression?: AlgorithmOption[];
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
    timeOfDay?: string[];
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
 * Snapshot estimation request
 *
 * Used to start an estimation task that calculates the size and statistics
 * of a potential snapshot before actually creating it.
 */
export interface EstimateRequest {
  /** The root path to estimate */
  root: string;
  /** Optional limit for examples per bucket */
  maxExamplesPerBucket?: number;
}

/**
 * Snapshot estimation response
 *
 * Returns a task ID that can be polled to get the actual estimation results
 * (file count, size, errors, etc.) via the Tasks API.
 */
export interface EstimateResponse {
  /** Task ID to poll for estimation results using getTask() */
  id: string;
}

// ============================================================================
// Directory & File Browsing Types
// ============================================================================

/**
 * Directory entry (file, folder, symlink, etc.)
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
    writeFilesAtomically?: boolean;
  };
  zipFile?: string;
  uncompressedZip?: boolean;
  tarFile?: string;
  options?: {
    incremental?: boolean;
    ignoreErrors?: boolean;
    restoreDirEntryAtDepth?: number;
  };
}

/**
 * Mount response
 */
export interface MountResponse {
  path: string;
}

/**
 * Mounts list response
 */
export interface MountsResponse {
  mounts: Array<{
    root: string;
    path: string;
  }>;
}

// ============================================================================
// Policy Types
// ============================================================================

/**
 * Action definition for before/after hooks
 */
export interface ActionDefinition {
  script: string;
  timeout: number;
  mode: 'essential' | 'optional' | 'async';
}

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
    timeOfDay?: string[];
    noParentTimeOfDay?: boolean;
    manual?: boolean;
    cron?: string[];
    runMissed?: boolean;
  };
  files?: {
    ignore?: string[];
    dotIgnoreFiles?: string[];
    oneFileSystem?: boolean;
    noParentIgnore?: boolean;
    noParentDotFiles?: boolean;
    ignoreCacheDirs?: boolean;
    maxFileSize?: number;
  };
  compression?: {
    compressorName?: string;
    minSize?: number;
    maxSize?: number;
    onlyCompress?: string[];
    neverCompress?: string[];
  };
  metadataCompression?: {
    compressorName?: string;
    minSize?: number;
    maxSize?: number;
    onlyCompress?: string[];
    neverCompress?: string[];
  };
  splitter?: {
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
      enable?: number;
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
  logging?: {
    directories?: {
      snapshotted?: number | { minSize?: number; maxSize?: number };
      ignored?: number | { minSize?: number; maxSize?: number };
    };
    entries?: {
      snapshotted?: number | { minSize?: number; maxSize?: number };
      ignored?: number | { minSize?: number; maxSize?: number };
      cacheHit?: number | { minSize?: number; maxSize?: number };
      cacheMiss?: number | { minSize?: number; maxSize?: number };
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
 * CounterValue describes the counter value reported by task with optional units for presentation.
 * See: internal/uitask/uitask_counter.go:4-10
 */
export interface CounterValue {
  value: number;
  units?: string;
  level?: string; // "", "notice", "warning" or "error"
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
// Maintenance Types
// ============================================================================

/**
 * Maintenance information
 */
export interface MaintenanceInfo {
  lastRun?: string;
  nextRun?: string;
  schedule: {
    quick?: {
      interval: string;
    };
    full?: {
      interval: string;
    };
  };
  stats?: {
    blobCount: number;
    totalBlobSize: number;
  };
}

/**
 * Maintenance run request
 */
export interface MaintenanceRunRequest {
  full?: boolean;
  safety?: 'none' | 'full';
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Path resolve request
 */
export interface PathResolveRequest {
  path: string;
}

/**
 * UI preferences
 */
export interface UIPreferences {
  theme?: 'light' | 'dark' | 'system';
  pageSize?: 10 | 20 | 30 | 40 | 50 | 100;
  defaultSnapshotViewAll?: boolean;
  bytesStringBase2?: boolean;
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

export const SeverityLabels: Record<NotificationSeverity, string> = {
  [-100]: 'Verbose',
  [-10]: 'Success',
  [0]: 'Report',
  [10]: 'Warning',
  [20]: 'Error',
};

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
    hashed_files: number;
    hashed_bytes: number;
    cached_files: number;
    cached_bytes: number;
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
// Error Types
// ============================================================================

/**
 * API error response
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

export interface KopiaServerConfig {
  serverUrl: string;
  port: number;
  password: string;
  tlsCert?: string;
}

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
}

// ============================================================================
// System Types
// ============================================================================

export interface SystemInfo {
  os: string;
  arch: string;
  version: string;
}
