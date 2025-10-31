/**
 * Custom hook for managing Kopia server lifecycle
 *
 * Now delegates to global Zustand store to eliminate redundant polling.
 */

import { useKopiaStore } from '@/stores/kopia';
import type { KopiaServerInfo, KopiaServerStatus } from '@/lib/kopia/client';

interface UseKopiaServerReturn {
  serverStatus: KopiaServerStatus | null;
  isLoading: boolean;
  error: string | null;
  startServer: () => Promise<KopiaServerInfo | null>;
  stopServer: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

/**
 * Hook for Kopia server lifecycle management.
 * Uses global Zustand store for state - no local polling.
 */
export function useKopiaServer(): UseKopiaServerReturn {
  // Subscribe to global store
  const serverStatus = useKopiaStore((state) => state.serverStatus);
  const isLoading = useKopiaStore((state) => state.isServerLoading);
  const error = useKopiaStore((state) => state.serverError);
  const startServer = useKopiaStore((state) => state.startServer);
  const stopServer = useKopiaStore((state) => state.stopServer);
  const refreshStatus = useKopiaStore((state) => state.refreshServerStatus);

  return {
    serverStatus,
    isLoading,
    error,
    startServer,
    stopServer,
    refreshStatus,
  };
}
