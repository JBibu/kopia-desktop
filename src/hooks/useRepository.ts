/**
 * Custom hook for managing repository connection state
 *
 * Now delegates to global Zustand store to eliminate redundant polling.
 */

import { useKopiaStore } from '@/stores/kopia';
import type { RepositoryStatus, RepositoryConnectRequest } from '@/lib/kopia/client';

interface UseRepositoryReturn {
  status: RepositoryStatus | null;
  isLoading: boolean;
  error: string | null;
  connect: (request: RepositoryConnectRequest) => Promise<boolean>;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  isConnected: boolean;
}

/**
 * Hook for repository connection management.
 * Uses global Zustand store for state - no local polling.
 */
export function useRepository(): UseRepositoryReturn {
  // Subscribe to global store
  const status = useKopiaStore((state) => state.repositoryStatus);
  const isLoading = useKopiaStore((state) => state.isRepositoryLoading);
  const error = useKopiaStore((state) => state.repositoryError);
  const connect = useKopiaStore((state) => state.connectRepo);
  const disconnect = useKopiaStore((state) => state.disconnectRepo);
  const refreshStatus = useKopiaStore((state) => state.refreshRepositoryStatus);
  const isConnected = useKopiaStore((state) => state.isRepoConnected());

  return {
    status,
    isLoading,
    error,
    connect,
    disconnect,
    refreshStatus,
    isConnected,
  };
}
