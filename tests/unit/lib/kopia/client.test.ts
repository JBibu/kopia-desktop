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
          path: '/backup/repo',
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
          path: '/backup/repo',
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
      expect(parseKopiaError(error)).toBe('Server not running');
    });

    it('parses Error object', () => {
      const error = new Error('Connection failed');
      expect(parseKopiaError(error)).toBe('Connection failed');
    });

    it('handles unknown error types', () => {
      const error = { unknown: 'type' };
      expect(parseKopiaError(error)).toBe('Unknown error occurred');
    });
  });

  describe('isServerNotRunningError', () => {
    it('detects server not running error', () => {
      expect(isServerNotRunningError('Kopia server is not running')).toBe(true);
      expect(isServerNotRunningError('Server not available')).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isServerNotRunningError('Invalid password')).toBe(false);
      expect(isServerNotRunningError('Connection timeout')).toBe(false);
    });
  });

  describe('isNotConnectedError', () => {
    it('detects not connected error', () => {
      expect(isNotConnectedError('Repository not connected')).toBe(true);
      expect(isNotConnectedError('Connected: false')).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isNotConnectedError('Invalid password')).toBe(false);
    });
  });

  describe('isInvalidPasswordError', () => {
    it('detects invalid password error', () => {
      expect(isInvalidPasswordError('Invalid password')).toBe(true);
      expect(isInvalidPasswordError('Authentication failed')).toBe(true);
      expect(isInvalidPasswordError('INVALID PASSWORD')).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isInvalidPasswordError('Server not running')).toBe(false);
      expect(isInvalidPasswordError('Connection timeout')).toBe(false);
    });
  });
});
