/**
 * Frontend Unit Tests for Kopia API Client Wrappers
 *
 * IMPORTANT: These tests only verify TypeScript wrapper functions that call `invoke()`.
 * They do NOT test actual Kopia binary integration - those are tested in Rust integration tests.
 *
 * Test Scope:
 * - TypeScript function signatures and type safety
 * - Error handling and parsing logic
 * - Helper functions (isServerNotRunningError, etc.)
 *
 * For actual Kopia API integration testing, see:
 * - src-tauri/src/kopia_api_integration_tests.rs (10 tests with real Kopia binary)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  // Server lifecycle
  startKopiaServer,
  stopKopiaServer,
  getKopiaServerStatus,
  // Repository management
  getRepositoryStatus,
  connectRepository,
  disconnectRepository,
  createRepository,
  repositoryExists,
  getAlgorithms,
  // Snapshot sources
  listSources,
  createSnapshot,
  cancelSnapshot,
  // Snapshot history
  listSnapshots,
  editSnapshot,
  deleteSnapshots,
  // Browsing & restore
  browseObject,
  downloadObject,
  restoreStart,
  mountSnapshot,
  listMounts,
  unmountSnapshot,
  // Policies
  listPolicies,
  getPolicy,
  resolvePolicy,
  setPolicy,
  deletePolicy,
  // Tasks
  listTasks,
  getTask,
  cancelTask,
  getTasksSummary,
  // Maintenance
  getMaintenanceInfo,
  runMaintenance,
  // Utilities
  resolvePath,
  // Notifications
  listNotificationProfiles,
  createNotificationProfile,
  deleteNotificationProfile,
  testNotificationProfile,
  // WebSocket
  connectWebSocket,
  disconnectWebSocket,
  // System
  getCurrentUser,
  getSystemInfo,
  selectFolder,
  saveFile,
  // Error handling
  parseKopiaError,
  isServerNotRunningError,
  isNotConnectedError,
  isAuthenticationError,
} from '@/lib/kopia/client';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe('Kopia Client - Server Lifecycle', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('startKopiaServer', () => {
    it('calls kopia_server_start command', async () => {
      const mockServerInfo = {
        serverUrl: 'http://localhost:51515',
        port: 51515,
        password: 'test-password',
        pid: 12345,
      };
      mockInvoke.mockResolvedValue(mockServerInfo);

      const result = await startKopiaServer();

      expect(mockInvoke).toHaveBeenCalledWith('kopia_server_start');
      expect(result).toEqual(mockServerInfo);
    });

    it('throws error when start fails', async () => {
      mockInvoke.mockRejectedValue('Failed to start server');

      await expect(startKopiaServer()).rejects.toThrow();
    });
  });

  describe('stopKopiaServer', () => {
    it('calls kopia_server_stop command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await stopKopiaServer();

      expect(mockInvoke).toHaveBeenCalledWith('kopia_server_stop');
    });
  });

  describe('getKopiaServerStatus', () => {
    it('returns server status when running', async () => {
      const mockStatus = {
        running: true,
        serverUrl: 'http://localhost:51515',
        port: 51515,
        uptime: 3600,
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const result = await getKopiaServerStatus();

      expect(mockInvoke).toHaveBeenCalledWith('kopia_server_status');
      expect(result).toEqual(mockStatus);
    });

    it('returns status when not running', async () => {
      const mockStatus = {
        running: false,
        serverUrl: undefined,
        port: undefined,
        uptime: undefined,
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const result = await getKopiaServerStatus();

      expect(result.running).toBe(false);
    });
  });
});

describe('Kopia Client - Repository Management', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('getRepositoryStatus', () => {
    it('returns repository status when connected', async () => {
      const mockStatus = {
        connected: true,
        configFile: '/home/user/.config/kopia/repository.config',
        storage: 'filesystem',
        hash: 'BLAKE2B-256-128',
        encryption: 'AES256-GCM-HMAC-SHA256',
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const result = await getRepositoryStatus();

      expect(mockInvoke).toHaveBeenCalledWith('repository_status');
      expect(result).toEqual(mockStatus);
    });

    it('handles not connected status', async () => {
      const mockStatus = {
        connected: false,
        configFile: null,
        storage: null,
        hash: null,
        encryption: null,
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const result = await getRepositoryStatus();

      expect(result.connected).toBe(false);
    });
  });

  describe('connectRepository', () => {
    it('connects to filesystem repository', async () => {
      const config = {
        storage: {
          type: 'filesystem' as const,
          config: {
            path: '/backup/repo',
          },
        },
        password: 'SecurePass123',
      };
      const mockStatus = {
        connected: true,
        configFile: '/home/user/.config/kopia/repository.config',
        storage: 'filesystem',
        hash: 'BLAKE2B-256-128',
        encryption: 'AES256-GCM-HMAC-SHA256',
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const result = await connectRepository(config);

      expect(mockInvoke).toHaveBeenCalledWith('repository_connect', { config });
      expect(result.connected).toBe(true);
    });

    it('throws error on invalid password', async () => {
      const config = {
        storage: {
          type: 'filesystem' as const,
          config: {
            path: '/backup/repo',
          },
        },
        password: 'wrong-password',
      };
      mockInvoke.mockRejectedValue('INVALID_PASSWORD: Authentication failed');

      await expect(connectRepository(config)).rejects.toThrow();
    });
  });

  describe('disconnectRepository', () => {
    it('disconnects from repository', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await disconnectRepository();

      expect(mockInvoke).toHaveBeenCalledWith('repository_disconnect');
    });
  });
});

describe('Kopia Client - System Utilities', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('getCurrentUser', () => {
    it('returns current username and hostname', async () => {
      mockInvoke.mockResolvedValue(['javi', 'laptop']);

      const result = await getCurrentUser();

      expect(mockInvoke).toHaveBeenCalledWith('get_current_user');
      expect(result).toEqual({
        username: 'javi',
        hostname: 'laptop',
      });
    });
  });
});

describe('Kopia Client - Error Handling', () => {
  describe('parseKopiaError', () => {
    it('parses string error', () => {
      const error = 'Server not running';
      const result = parseKopiaError(error);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Server not running');
    });

    it('parses Error object', () => {
      const error = new Error('Connection failed');
      const result = parseKopiaError(error);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Connection failed');
    });

    it('handles unknown error types', () => {
      const error = { unknown: 'type' };
      const result = parseKopiaError(error);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unknown error');
    });
  });

  describe('isServerNotRunningError', () => {
    it('detects server not running error', () => {
      const serverNotRunningError = {
        type: 'SERVER_NOT_RUNNING',
        data: { message: 'Server is not running' },
      };
      const httpRequestFailed = {
        type: 'HTTP_REQUEST_FAILED',
        data: { message: 'Connection refused', status_code: 0 },
      };
      expect(isServerNotRunningError(serverNotRunningError)).toBe(true);
      expect(isServerNotRunningError(httpRequestFailed)).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isServerNotRunningError(new Error('Invalid password'))).toBe(false);
      expect(isServerNotRunningError(new Error('Connection timeout'))).toBe(false);
    });
  });

  describe('isNotConnectedError', () => {
    it('detects not connected error', () => {
      const error = {
        type: 'REPOSITORY_NOT_CONNECTED',
        data: { message: 'Repository not connected' },
      };
      expect(isNotConnectedError(error)).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isNotConnectedError('Invalid password')).toBe(false);
      expect(isNotConnectedError({ type: 'OTHER_ERROR', data: { message: 'Other error' } })).toBe(
        false
      );
    });
  });

  describe('isAuthenticationError', () => {
    it('detects authentication failure error', () => {
      const authError = {
        type: 'AUTHENTICATION_FAILED',
        data: { message: 'Authentication failed' },
      };
      expect(isAuthenticationError(authError)).toBe(true);
    });

    it('detects unauthorized error', () => {
      const unauthorizedError = {
        type: 'UNAUTHORIZED',
        data: { resource: 'repository' },
      };
      expect(isAuthenticationError(unauthorizedError)).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isAuthenticationError(new Error('Server not running'))).toBe(false);
      expect(isAuthenticationError(new Error('Connection timeout'))).toBe(false);
    });
  });
});

describe('Kopia Client - Repository Creation', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('createRepository', () => {
    it('creates filesystem repository with all options', async () => {
      const config = {
        storage: {
          type: 'filesystem' as const,
          config: { path: '/backup/repo' },
        },
        password: 'SecurePass123',
        options: {
          blockFormat: {
            hash: 'BLAKE2B-256-128',
            encryption: 'AES256-GCM-HMAC-SHA256',
          },
        },
        clientOptions: {
          description: 'Test Repository',
          username: 'javi',
          hostname: 'laptop',
        },
      };
      mockInvoke.mockResolvedValue('Repository created successfully');

      const result = await createRepository(config);

      expect(mockInvoke).toHaveBeenCalledWith('repository_create', { config });
      expect(result).toBe('Repository created successfully');
    });

    it('creates S3 repository', async () => {
      const config = {
        storage: {
          type: 's3' as const,
          config: {
            bucket: 'my-backup-bucket',
            endpoint: 's3.amazonaws.com',
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          },
        },
        password: 'SecurePass123',
      };
      mockInvoke.mockResolvedValue('Repository created successfully');

      await createRepository(config);

      expect(mockInvoke).toHaveBeenCalledWith('repository_create', { config });
    });
  });

  describe('repositoryExists', () => {
    it('returns true when repository exists', async () => {
      const storage = {
        type: 'filesystem' as const,
        config: { path: '/backup/repo' },
      };
      mockInvoke.mockResolvedValue(true);

      const result = await repositoryExists(storage);

      expect(mockInvoke).toHaveBeenCalledWith('repository_exists', { storage });
      expect(result).toBe(true);
    });

    it('returns false when repository does not exist', async () => {
      const storage = {
        type: 'filesystem' as const,
        config: { path: '/nonexistent/repo' },
      };
      mockInvoke.mockResolvedValue(false);

      const result = await repositoryExists(storage);

      expect(result).toBe(false);
    });
  });

  describe('getAlgorithms', () => {
    it('returns available algorithms', async () => {
      const mockAlgorithms = {
        defaultHash: 'BLAKE2B-256-128',
        defaultEncryption: 'AES256-GCM-HMAC-SHA256',
        defaultSplitter: 'DYNAMIC-4M-BUZHASH',
        hash: [
          { id: 'BLAKE2B-256-128', deprecated: false },
          { id: 'BLAKE3-256-128', deprecated: false },
        ],
        encryption: [
          { id: 'AES256-GCM-HMAC-SHA256', deprecated: false },
          { id: 'CHACHA20-POLY1305-HMAC-SHA256', deprecated: false },
        ],
        splitter: [
          { id: 'DYNAMIC-4M-BUZHASH', deprecated: false },
          { id: 'FIXED-4M', deprecated: false },
        ],
      };
      mockInvoke.mockResolvedValue(mockAlgorithms);

      const result = await getAlgorithms();

      expect(mockInvoke).toHaveBeenCalledWith('repository_get_algorithms');
      expect(result.defaultHash).toBe('BLAKE2B-256-128');
      expect(result.hash).toHaveLength(2);
    });
  });
});

describe('Kopia Client - Snapshot Sources', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('listSources', () => {
    it('returns list of snapshot sources', async () => {
      const mockSources = {
        localUsername: 'javi',
        localHost: 'laptop',
        multiUser: false,
        sources: [
          {
            source: { userName: 'javi', host: 'laptop', path: '/home/javi/documents' },
            status: 'IDLE' as const,
            schedule: { manual: true },
            lastSnapshot: {
              id: 'snapshot123',
              startTime: '2025-01-01T12:00:00Z',
              endTime: '2025-01-01T12:05:00Z',
            },
          },
        ],
      };
      mockInvoke.mockResolvedValue(mockSources);

      const result = await listSources();

      expect(mockInvoke).toHaveBeenCalledWith('sources_list');
      expect(result.sources).toHaveLength(1);
      expect(result.localUsername).toBe('javi');
    });
  });

  describe('createSnapshot', () => {
    it('creates snapshot with default user/host', async () => {
      const mockSource = {
        userName: 'javi',
        host: 'laptop',
        path: '/home/javi/documents',
      };
      mockInvoke.mockResolvedValue(mockSource);

      const result = await createSnapshot('/home/javi/documents');

      expect(mockInvoke).toHaveBeenCalledWith('snapshot_create', {
        path: '/home/javi/documents',
        userName: undefined,
        host: undefined,
      });
      expect(result.path).toBe('/home/javi/documents');
    });

    it('creates snapshot with custom user/host', async () => {
      const mockSource = {
        userName: 'custom',
        host: 'server',
        path: '/data',
      };
      mockInvoke.mockResolvedValue(mockSource);

      await createSnapshot('/data', 'custom', 'server');

      expect(mockInvoke).toHaveBeenCalledWith('snapshot_create', {
        path: '/data',
        userName: 'custom',
        host: 'server',
      });
    });
  });

  describe('cancelSnapshot', () => {
    it('cancels ongoing snapshot', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await cancelSnapshot('javi', 'laptop', '/home/javi/documents');

      expect(mockInvoke).toHaveBeenCalledWith('snapshot_cancel', {
        userName: 'javi',
        host: 'laptop',
        path: '/home/javi/documents',
      });
    });
  });
});

describe('Kopia Client - Snapshot History', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('listSnapshots', () => {
    it('lists snapshots for a source', async () => {
      const mockSnapshots = {
        snapshots: [
          {
            id: 'snapshot1',
            startTime: '2025-01-01T12:00:00Z',
            endTime: '2025-01-01T12:05:00Z',
          },
          {
            id: 'snapshot2',
            startTime: '2025-01-02T12:00:00Z',
            endTime: '2025-01-02T12:05:00Z',
          },
        ],
        unfilteredCount: 2,
        uniqueCount: 2,
      };
      mockInvoke.mockResolvedValue(mockSnapshots);

      const result = await listSnapshots('javi', 'laptop', '/home/javi/documents');

      expect(mockInvoke).toHaveBeenCalledWith('snapshots_list', {
        userName: 'javi',
        host: 'laptop',
        path: '/home/javi/documents',
        all: false,
      });
      expect(result.snapshots).toHaveLength(2);
    });

    it('lists all snapshots including deleted', async () => {
      mockInvoke.mockResolvedValue({ snapshots: [], unfilteredCount: 0, uniqueCount: 0 });

      await listSnapshots('javi', 'laptop', '/home/javi/documents', true);

      expect(mockInvoke).toHaveBeenCalledWith('snapshots_list', {
        userName: 'javi',
        host: 'laptop',
        path: '/home/javi/documents',
        all: true,
      });
    });
  });

  describe('editSnapshot', () => {
    it('edits snapshot metadata', async () => {
      const request = {
        snapshots: ['snapshot1'],
        description: 'Updated description',
        addPins: ['important'],
      };
      mockInvoke.mockResolvedValue(undefined);

      await editSnapshot(request);

      expect(mockInvoke).toHaveBeenCalledWith('snapshot_edit', { request });
    });
  });

  describe('deleteSnapshots', () => {
    it('deletes multiple snapshots', async () => {
      mockInvoke.mockResolvedValue(2);

      const result = await deleteSnapshots('javi', 'laptop', '/home/javi/documents', [
        'snapshot1',
        'snapshot2',
      ]);

      expect(mockInvoke).toHaveBeenCalledWith('snapshot_delete', {
        userName: 'javi',
        host: 'laptop',
        path: '/home/javi/documents',
        manifestIds: ['snapshot1', 'snapshot2'],
      });
      expect(result).toBe(2);
    });
  });
});

describe('Kopia Client - Browsing & Restore', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('browseObject', () => {
    it('browses directory contents', async () => {
      const mockDirectory = {
        name: 'documents',
        obj: 'kobj123',
        mode: '0755',
        mtime: '2025-01-01T12:00:00Z',
        size: 4096,
        isDir: true,
        entries: [
          { name: 'file1.txt', obj: 'kobj456', size: 1024, isDir: false },
          { name: 'file2.txt', obj: 'kobj789', size: 2048, isDir: false },
        ],
      };
      mockInvoke.mockResolvedValue(mockDirectory);

      const result = await browseObject('kobj123');

      expect(mockInvoke).toHaveBeenCalledWith('object_browse', { objectId: 'kobj123' });
      expect(result.entries).toHaveLength(2);
    });
  });

  describe('downloadObject', () => {
    it('downloads a file', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await downloadObject('kobj456', 'file1.txt', '/tmp/download');

      expect(mockInvoke).toHaveBeenCalledWith('object_download', {
        objectId: 'kobj456',
        filename: 'file1.txt',
        targetPath: '/tmp/download',
      });
    });
  });

  describe('restoreStart', () => {
    it('starts restore operation', async () => {
      const request = {
        root: 'kobj123',
        target: '/tmp/restore',
        overwrite: false,
      };
      mockInvoke.mockResolvedValue('task123');

      const result = await restoreStart(request);

      expect(mockInvoke).toHaveBeenCalledWith('restore_start', { request });
      expect(result).toBe('task123');
    });
  });

  describe('mountSnapshot', () => {
    it('mounts a snapshot', async () => {
      mockInvoke.mockResolvedValue('/mnt/kopia/snapshot123');

      const result = await mountSnapshot('kobj123');

      expect(mockInvoke).toHaveBeenCalledWith('mount_snapshot', { root: 'kobj123' });
      expect(result).toBe('/mnt/kopia/snapshot123');
    });
  });

  describe('listMounts', () => {
    it('lists all mounted snapshots', async () => {
      const mockMounts = {
        items: [
          { root: 'kobj123', path: '/mnt/kopia/snapshot1' },
          { root: 'kobj456', path: '/mnt/kopia/snapshot2' },
        ],
      };
      mockInvoke.mockResolvedValue(mockMounts);

      const result = await listMounts();

      expect(mockInvoke).toHaveBeenCalledWith('mounts_list');
      expect(result.items).toHaveLength(2);
    });
  });

  describe('unmountSnapshot', () => {
    it('unmounts a snapshot', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await unmountSnapshot('kobj123');

      expect(mockInvoke).toHaveBeenCalledWith('mount_unmount', { objectId: 'kobj123' });
    });
  });
});

describe('Kopia Client - Policies', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('listPolicies', () => {
    it('lists all policies', async () => {
      const mockPolicies = {
        policies: [
          { target: { userName: 'javi', host: 'laptop', path: '/home/javi' } },
          { target: { userName: '*', host: '*', path: '*' } },
        ],
      };
      mockInvoke.mockResolvedValue(mockPolicies);

      const result = await listPolicies();

      expect(mockInvoke).toHaveBeenCalledWith('policies_list');
      expect(result.policies).toHaveLength(2);
    });
  });

  describe('getPolicy', () => {
    it('gets policy for specific target', async () => {
      const mockPolicy = {
        retention: { keepLatest: 10, keepDaily: 7 },
        files: { ignore: ['*.tmp', '*.log'] },
      };
      mockInvoke.mockResolvedValue(mockPolicy);

      const result = await getPolicy('javi', 'laptop', '/home/javi');

      expect(mockInvoke).toHaveBeenCalledWith('policy_get', {
        userName: 'javi',
        host: 'laptop',
        path: '/home/javi',
      });
      expect(result.retention?.keepLatest).toBe(10);
    });

    it('gets global policy', async () => {
      const mockPolicy = {
        retention: { keepLatest: 5 },
      };
      mockInvoke.mockResolvedValue(mockPolicy);

      await getPolicy();

      expect(mockInvoke).toHaveBeenCalledWith('policy_get', {
        userName: undefined,
        host: undefined,
        path: undefined,
      });
    });
  });

  describe('resolvePolicy', () => {
    it('resolves effective policy with inheritance', async () => {
      const mockResolved = {
        effective: { retention: { keepLatest: 10 } },
        definition: { retention: { keepLatest: 10 } },
      };
      mockInvoke.mockResolvedValue(mockResolved);

      const result = await resolvePolicy('javi', 'laptop', '/home/javi');

      expect(mockInvoke).toHaveBeenCalledWith('policy_resolve', {
        userName: 'javi',
        host: 'laptop',
        path: '/home/javi',
        updates: undefined,
      });
      expect(result.effective.retention?.keepLatest).toBe(10);
    });
  });

  describe('setPolicy', () => {
    it('sets policy for target', async () => {
      const policy = {
        retention: { keepLatest: 15, keepDaily: 30 },
        files: { ignore: ['*.tmp'] },
      };
      mockInvoke.mockResolvedValue(undefined);

      await setPolicy(policy, 'javi', 'laptop', '/home/javi');

      expect(mockInvoke).toHaveBeenCalledWith('policy_set', {
        userName: 'javi',
        host: 'laptop',
        path: '/home/javi',
        policy,
      });
    });
  });

  describe('deletePolicy', () => {
    it('deletes policy for target', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await deletePolicy('javi', 'laptop', '/home/javi');

      expect(mockInvoke).toHaveBeenCalledWith('policy_delete', {
        userName: 'javi',
        host: 'laptop',
        path: '/home/javi',
      });
    });
  });
});

describe('Kopia Client - Tasks', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('listTasks', () => {
    it('lists all tasks', async () => {
      const mockTasks = {
        tasks: [
          { id: 'task1', kind: 'snapshot', status: 'RUNNING' },
          { id: 'task2', kind: 'restore', status: 'SUCCESS' },
        ],
      };
      mockInvoke.mockResolvedValue(mockTasks);

      const result = await listTasks();

      expect(mockInvoke).toHaveBeenCalledWith('tasks_list');
      expect(result.tasks).toHaveLength(2);
    });
  });

  describe('getTask', () => {
    it('gets task details', async () => {
      const mockTask = {
        id: 'task1',
        kind: 'snapshot',
        status: 'RUNNING',
        counters: { Bytes: 1024000, Files: 100 },
      };
      mockInvoke.mockResolvedValue(mockTask);

      const result = await getTask('task1');

      expect(mockInvoke).toHaveBeenCalledWith('task_get', { taskId: 'task1' });
      expect(result.status).toBe('RUNNING');
    });
  });

  describe('cancelTask', () => {
    it('cancels a task', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await cancelTask('task1');

      expect(mockInvoke).toHaveBeenCalledWith('task_cancel', { taskId: 'task1' });
    });
  });

  describe('getTasksSummary', () => {
    it('gets tasks summary', async () => {
      const mockSummary = {
        running: 2,
        failed: 1,
        idle: 5,
      };
      mockInvoke.mockResolvedValue(mockSummary);

      const result = await getTasksSummary();

      expect(mockInvoke).toHaveBeenCalledWith('tasks_summary');
      expect(result.running).toBe(2);
    });
  });
});

describe('Kopia Client - Maintenance', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('getMaintenanceInfo', () => {
    it('gets maintenance information', async () => {
      const mockInfo = {
        lastRun: '2025-01-01T00:00:00Z',
        nextRun: '2025-01-02T00:00:00Z',
        schedule: { quick: { interval: '24h' }, full: { interval: '168h' } },
      };
      mockInvoke.mockResolvedValue(mockInfo);

      const result = await getMaintenanceInfo();

      expect(mockInvoke).toHaveBeenCalledWith('maintenance_info');
      expect(result.lastRun).toBeDefined();
    });
  });

  describe('runMaintenance', () => {
    it('runs quick maintenance', async () => {
      mockInvoke.mockResolvedValue('task123');

      const result = await runMaintenance(false);

      expect(mockInvoke).toHaveBeenCalledWith('maintenance_run', {
        full: false,
        safety: undefined,
      });
      expect(result).toBe('task123');
    });

    it('runs full maintenance with safety', async () => {
      mockInvoke.mockResolvedValue('task456');

      await runMaintenance(true, 'full');

      expect(mockInvoke).toHaveBeenCalledWith('maintenance_run', {
        full: true,
        safety: 'full',
      });
    });
  });
});

describe('Kopia Client - Utilities', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('resolvePath', () => {
    it('resolves path to source', async () => {
      const mockSource = {
        userName: 'javi',
        host: 'laptop',
        path: '/home/javi/documents',
      };
      mockInvoke.mockResolvedValue(mockSource);

      const result = await resolvePath('/home/javi/documents');

      expect(mockInvoke).toHaveBeenCalledWith('path_resolve', { path: '/home/javi/documents' });
      expect(result.userName).toBe('javi');
    });
  });
});

describe('Kopia Client - Notifications', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('listNotificationProfiles', () => {
    it('lists notification profiles', async () => {
      const mockProfiles = [
        {
          profile: 'email-alerts',
          method: {
            type: 'pushover' as const,
            config: { appToken: 'token', userKey: 'key', format: 'txt' as const },
          },
          minSeverity: 20 as const, // ERROR
        },
        {
          profile: 'slack-alerts',
          method: {
            type: 'webhook' as const,
            config: {
              endpoint: 'https://slack.com',
              method: 'POST' as const,
              format: 'txt' as const,
            },
          },
          minSeverity: 10 as const, // WARNING
        },
      ];
      mockInvoke.mockResolvedValue(mockProfiles);

      const result = await listNotificationProfiles();

      expect(mockInvoke).toHaveBeenCalledWith('notification_profiles_list');
      expect(result).toHaveLength(2);
    });
  });

  describe('createNotificationProfile', () => {
    it('creates notification profile', async () => {
      const profile = {
        profile: 'email-alerts',
        method: {
          type: 'pushover' as const,
          config: { appToken: 'token', userKey: 'key', format: 'txt' as const },
        },
        minSeverity: 20 as const, // ERROR
      };
      mockInvoke.mockResolvedValue(undefined);

      await createNotificationProfile(profile);

      expect(mockInvoke).toHaveBeenCalledWith('notification_profile_create', { profile });
    });
  });

  describe('deleteNotificationProfile', () => {
    it('deletes notification profile', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await deleteNotificationProfile('email-alerts');

      expect(mockInvoke).toHaveBeenCalledWith('notification_profile_delete', {
        profileName: 'email-alerts',
      });
    });
  });

  describe('testNotificationProfile', () => {
    it('tests notification profile', async () => {
      const profile = {
        profile: 'email-alerts',
        method: {
          type: 'pushover' as const,
          config: { appToken: 'token', userKey: 'key', format: 'txt' as const },
        },
        minSeverity: 20 as const, // ERROR
      };
      mockInvoke.mockResolvedValue(undefined);

      await testNotificationProfile(profile);

      expect(mockInvoke).toHaveBeenCalledWith('notification_profile_test', { profile });
    });
  });
});

describe('Kopia Client - WebSocket', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('connectWebSocket', () => {
    it('connects to WebSocket', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await connectWebSocket('https://localhost:51515', 'kopia', 'password123');

      expect(mockInvoke).toHaveBeenCalledWith('websocket_connect', {
        serverUrl: 'https://localhost:51515',
        username: 'kopia',
        password: 'password123',
      });
    });
  });

  describe('disconnectWebSocket', () => {
    it('disconnects from WebSocket', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await disconnectWebSocket();

      expect(mockInvoke).toHaveBeenCalledWith('websocket_disconnect');
    });
  });
});

describe('Kopia Client - System Utilities', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('getSystemInfo', () => {
    it('returns system information', async () => {
      const mockInfo = {
        os: 'Linux',
        arch: 'x86_64',
        version: '6.17.7',
        hostname: 'laptop',
      };
      mockInvoke.mockResolvedValue(mockInfo);

      const result = await getSystemInfo();

      expect(mockInvoke).toHaveBeenCalledWith('get_system_info');
      expect(result.os).toBe('Linux');
    });
  });

  describe('selectFolder', () => {
    it('opens folder picker with default path', async () => {
      mockInvoke.mockResolvedValue('/home/javi/documents');

      const result = await selectFolder('/home/javi');

      expect(mockInvoke).toHaveBeenCalledWith('select_folder', { defaultPath: '/home/javi' });
      expect(result).toBe('/home/javi/documents');
    });

    it('returns null when cancelled', async () => {
      mockInvoke.mockResolvedValue(null);

      const result = await selectFolder();

      expect(result).toBeNull();
    });
  });

  describe('saveFile', () => {
    it('opens save dialog with default filename', async () => {
      mockInvoke.mockResolvedValue('/home/javi/backup.kopia');

      const result = await saveFile('backup.kopia');

      expect(mockInvoke).toHaveBeenCalledWith('save_file', { defaultFilename: 'backup.kopia' });
      expect(result).toBe('/home/javi/backup.kopia');
    });

    it('returns null when cancelled', async () => {
      mockInvoke.mockResolvedValue(null);

      const result = await saveFile();

      expect(result).toBeNull();
    });
  });
});
