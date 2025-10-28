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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      setError(null);
      const status = await getKopiaServerStatus();
      setServerStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setServerStatus({ running: false });
    }
  }, []);

  const startServer = useCallback(async (): Promise<KopiaServerInfo | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const info = await startKopiaServer();
      await refreshStatus();
      return info;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  const stopServer = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await stopKopiaServer();
      await refreshStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  // Check server status on mount
  useEffect(() => {
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
