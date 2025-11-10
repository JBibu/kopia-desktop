import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  startKopiaServer,
  stopKopiaServer,
  getKopiaServerStatus,
  getRepositoryStatus,
  connectRepository,
  disconnectRepository,
  getCurrentUser,
  parseKopiaError,
  isServerNotRunningError,
  isNotConnectedError,
  isInvalidPasswordError,
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
      const connectionRefusedError = {
        type: 'CONNECTION_REFUSED',
        data: { message: 'Connection refused' },
      };
      expect(isServerNotRunningError(serverNotRunningError)).toBe(true);
      expect(isServerNotRunningError(connectionRefusedError)).toBe(true);
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

  describe('isInvalidPasswordError', () => {
    it('detects invalid password error', () => {
      const invalidPasswordError = {
        type: 'INVALID_PASSWORD',
        data: { message: 'Invalid password' },
      };
      expect(isInvalidPasswordError(invalidPasswordError)).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isInvalidPasswordError(new Error('Server not running'))).toBe(false);
      expect(isInvalidPasswordError(new Error('Connection timeout'))).toBe(false);
    });
  });
});
