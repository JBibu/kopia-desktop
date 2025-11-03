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
 * Repository status information
 */
export interface RepositoryStatus {
  connected: boolean;
  configFile?: string;
  storage?: string;
  hash?: string;
  encryption?: string;
  splitter?: string;
  formatVersion?: number; // Changed from string to number to match API
  username?: string;
  hostname?: string;
  readonly?: boolean;
  apiServerURL?: string;
  initTaskID?: string;
  description?: string;
  ecc?: string;
  eccOverheadPercent?: number;
  supportsContentCompression?: boolean;
  maxPackSize?: number;
  enableActions?: boolean;
  formatBlobCacheDuration?: number;
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
 * Available algorithms for repository creation
 */
export interface AlgorithmsResponse {
  defaultHashAlgorithm: string;
  defaultEncryptionAlgorithm: string;
  defaultSplitterAlgorithm: string;
  hashAlgorithms: string[];
  encryptionAlgorithms: string[];
  splitterAlgorithms: string[];
  eccAlgorithms: string[];
}

// ============================================================================
// Snapshot Types
// ============================================================================

/**
 * Directory summary statistics
 */
export interface DirectorySummary {
  size: number;
  files: number;
  dirs: number;
  errors?: number;
  maxTime?: string;
}

/**
 * Root entry object
 */
export interface RootEntry {
  obj?: string;
  summ?: DirectorySummary;
}

/**
 * Snapshot metadata
 */
export interface Snapshot {
  id: string;
  rootID?: string;
  startTime: string;
  endTime?: string;
  description?: string;
  pins?: string[];
  retention?: string[];
  incomplete?: boolean;
  summary?: SnapshotSummary;
  rootEntry?: RootEntry;
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
 * Snapshot source with status
 */
export interface SnapshotSource {
  source: SourceInfo;
  status: 'IDLE' | 'PENDING' | 'UPLOADING' | 'PAUSED' | 'FAILED';
  upload?: {
    hashedFiles: number;
    hashedBytes: number;
    cachedFiles: number;
    cachedBytes: number;
    estimatedBytes?: number;
    directory?: string;
    uploadStartTime?: string;
  };
  lastSnapshot?: {
    startTime: string;
    endTime?: string;
    stats: {
      totalSize: number;
      totalFileCount: number;
      totalDirCount: number;
      errors?: number;
    };
    rootEntry?: string;
  };
  nextSnapshotTime?: string;
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
  mode: number;
  size: number;
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
  stream: 'kopia:directory';
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
  retention?: {
    keepLatest?: number;
    keepHourly?: number;
    keepDaily?: number;
    keepWeekly?: number;
    keepMonthly?: number;
    keepAnnual?: number;
  };
  scheduling?: {
    interval?: number;
    timesOfDay?: string[];
    manual?: boolean;
  };
  files?: {
    ignore?: string[];
    dotIgnoreFiles?: string[];
    scanOneFilesystem?: boolean;
    noParentIgnore?: boolean;
  };
  compression?: {
    compressorName?: string;
    minSize?: number;
    maxSize?: number;
    onlyCompress?: string[];
    neverCompress?: string[];
  };
  actions?: {
    beforeSnapshotRoot?: ActionDefinition;
    afterSnapshotRoot?: ActionDefinition;
    beforeFolder?: ActionDefinition;
    afterFolder?: ActionDefinition;
  };
  errorHandling?: {
    ignoreFileErrors?: boolean;
    ignoreDirectoryErrors?: boolean;
  };
  upload?: {
    maxParallelSnapshots?: number;
    maxParallelFileReads?: number;
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
 */
export interface ResolvedPolicyResponse {
  effective: PolicyDefinition;
  definition?: PolicyDefinition;
  defined?: PolicyDefinition;
  upcomingSnapshotTimes: string[];
  schedulingError?: string;
}

// ============================================================================
// Task Types
// ============================================================================

/**
 * Task status
 */
export type TaskStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELED';

/**
 * Task information
 */
export interface Task {
  id: string;
  kind: string;
  description: string;
  status: TaskStatus;
  startTime: string;
  endTime?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
}

/**
 * Task detail with counters and logs
 */
export interface TaskDetail extends Task {
  counters?: Record<string, number>;
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
 * Current user response
 */
export interface CurrentUserResponse {
  username: string;
  hostname: string;
}

/**
 * Path resolve request
 */
export interface PathResolveRequest {
  path: string;
}

/**
 * Estimate request
 */
export interface EstimateRequest {
  root: string;
  maxExamplesPerBucket?: number;
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

/**
 * Notification profile
 */
export interface NotificationProfile {
  profileName: string;
  method: 'email' | 'slack' | 'webhook';
  config: {
    smtpServer?: string;
    smtpPort?: number;
    smtpUsername?: string;
    toAddress?: string;
    webhookURL?: string;
    url?: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
  };
}

/**
 * Notification profiles list response
 */
export interface NotificationProfilesResponse {
  profiles: NotificationProfile[];
}

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
