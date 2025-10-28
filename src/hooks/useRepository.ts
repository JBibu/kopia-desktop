/**
 * Custom hook for managing repository connection state
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getRepositoryStatus,
  connectRepository,
  disconnectRepository,
  type RepositoryStatus,
  type RepositoryConnectRequest,
} from '@/lib/kopia/client';
import { getErrorMessage } from '@/lib/utils';

interface UseRepositoryReturn {
  status: RepositoryStatus | null;
  isLoading: boolean;
  error: string | null;
  connect: (request: RepositoryConnectRequest) => Promise<boolean>;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  isConnected: boolean;
}

export function useRepository(): UseRepositoryReturn {
  const [status, setStatus] = useState<RepositoryStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      setError(null);
      const repoStatus = await getRepositoryStatus();
      setStatus(repoStatus);
    } catch (err) {
      const message = getErrorMessage(err);
      // Don't set error for "not connected" - that's a valid state
      if (!message.includes('not running') && !message.includes('not connected')) {
        setError(message);
      }
      setStatus({
        connected: false,
        configFile: null,
        storage: null,
        hash: null,
        encryption: null,
      });
    }
  }, []);

  const connect = useCallback(async (request: RepositoryConnectRequest): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const repoStatus = await connectRepository(request);
      setStatus(repoStatus);
      return repoStatus.connected;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await disconnectRepository();
      await refreshStatus();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  // Check repository status on mount
  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  return {
    status,
    isLoading,
    error,
    connect,
    disconnect,
    refreshStatus,
    isConnected: status?.connected ?? false,
  };
}
