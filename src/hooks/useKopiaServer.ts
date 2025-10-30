/**
 * Custom hook for managing Kopia server lifecycle
 */

import { useCallback, useEffect, useState } from 'react';
import {
  startKopiaServer,
  stopKopiaServer,
  getKopiaServerStatus,
  type KopiaServerInfo,
  type KopiaServerStatus,
} from '@/lib/kopia/client';
import { useAsyncOperation } from './useAsyncOperation';

interface UseKopiaServerReturn {
  serverStatus: KopiaServerStatus | null;
  isLoading: boolean;
  error: string | null;
  startServer: () => Promise<KopiaServerInfo | null>;
  stopServer: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export function useKopiaServer(): UseKopiaServerReturn {
  const [serverStatus, setServerStatus] = useState<KopiaServerStatus | null>(null);
  const { isLoading, error, execute } = useAsyncOperation();

  const refreshStatus = useCallback(async () => {
    const status = await execute(() => getKopiaServerStatus(), {
      showToast: false, // Don't show toast for status checks
      onError: () => {
        setServerStatus({ running: false });
      },
    });
    if (status) {
      setServerStatus(status);
    }
  }, [execute]);

  const startServer = useCallback(async (): Promise<KopiaServerInfo | null> => {
    const info = await execute(
      async () => {
        const result = await startKopiaServer();
        await refreshStatus();
        return result;
      },
      { showToast: false } // Caller will handle success/error messaging
    );
    return info;
  }, [execute, refreshStatus]);

  const stopServer = useCallback(async (): Promise<void> => {
    await execute(
      async () => {
        await stopKopiaServer();
        await refreshStatus();
      },
      { showToast: false } // Caller will handle success/error messaging
    );
  }, [execute, refreshStatus]);

  // Check server status on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial data fetch on mount is a valid use case
    void refreshStatus();
  }, [refreshStatus]);

  return {
    serverStatus,
    isLoading,
    error,
    startServer,
    stopServer,
    refreshStatus,
  };
}
