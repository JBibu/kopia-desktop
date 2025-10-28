/**
 * Kopia API types
 */

export interface RepositoryStatus {
  connected: boolean;
  configFile: string | null;
  storage: string | null;
  hash: string | null;
  encryption: string | null;
}

export interface Snapshot {
  id: string;
  source: string;
  startTime: string;
  endTime: string;
  incomplete: boolean;
  rootEntry: {
    name: string;
    type: string;
    size: number;
    summ?: {
      size: number;
      files: number;
      dirs: number;
      errors: number;
    };
  };
}

export interface SnapshotSource {
  source: string;
  host: string;
  userName: string;
  path: string;
  lastSnapshotTime?: string;
  lastSnapshotSize?: number;
}

export interface Task {
  id: string;
  kind: string;
  status: 'running' | 'success' | 'failed' | 'canceled';
  description: string;
  startTime: string;
  endTime?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
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

export interface StorageConfig {
  type: StorageType;

  // Filesystem
  path?: string;

  // S3
  bucket?: string;
  endpoint?: string;
  accessKeyID?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  region?: string;

  // GCS
  credentialsFile?: string;

  // Azure
  container?: string;
  storageAccount?: string;
  storageKey?: string;

  // B2
  keyID?: string;
  key?: string;

  // SFTP
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  keyfile?: string;
  knownHostsFile?: string;

  // WebDAV
  url?: string;
}

export interface RepositoryConnectRequest {
  storage: StorageConfig;
  password: string;
  token?: string;
}

// ============================================================================
// System Types
// ============================================================================

export interface SystemInfo {
  os: string;
  arch: string;
  version: string;
}
