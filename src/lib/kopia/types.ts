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
