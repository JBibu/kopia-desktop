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
import { useAsyncOperation } from './useAsyncOperation';

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
  const { isLoading, error, execute } = useAsyncOperation();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const refreshStatus = useCallback(async () => {
    const repoStatus = await execute(() => getRepositoryStatus(), {
      showToast: false, // Don't show toast for status checks
      onError: (message) => {
        // Don't set error for "not connected" - that's a valid state
        if (!message.includes('not running') && !message.includes('not connected')) {
          // Error already set by useAsyncOperation
        }
        setStatus({
          connected: false,
          configFile: undefined,
          storage: undefined,
          hash: undefined,
          encryption: undefined,
        });
      },
    });
    if (repoStatus) {
      setStatus(repoStatus);
    }
    setIsInitialLoad(false);
  }, [execute]);

  const connect = useCallback(
    async (request: RepositoryConnectRequest): Promise<boolean> => {
      const repoStatus = await execute(
        () => connectRepository(request),
        { showToast: false } // Caller will handle success/error messaging
      );
      if (repoStatus) {
        setStatus(repoStatus);
        return repoStatus.connected;
      }
      return false;
    },
    [execute]
  );

  const disconnect = useCallback(async (): Promise<void> => {
    await execute(
      async () => {
        await disconnectRepository();
        await refreshStatus();
      },
      { showToast: false } // Caller will handle success/error messaging
    );
  }, [execute, refreshStatus]);

  // Check repository status on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial data fetch on mount is a valid use case
    void refreshStatus();
  }, [refreshStatus]);

  return {
    status,
    isLoading: isLoading || isInitialLoad,
    error,
    connect,
    disconnect,
    refreshStatus,
    isConnected: status?.connected ?? false,
  };
}
