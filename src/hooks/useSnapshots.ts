/**
 * Custom hook for snapshot operations
 *
 * Now delegates to global Zustand store to eliminate redundant state management.
 */

import { useKopiaStore } from '@/stores/kopia';
import type { Snapshot, SnapshotSource } from '@/lib/kopia/types';

interface UseSnapshotsReturn {
  snapshots: Snapshot[];
  sources: SnapshotSource[];
  localUsername?: string;
  localHost?: string;
  multiUser?: boolean;
  isLoading: boolean;
  error: string | null;
  fetchSnapshots: () => Promise<void>;
  fetchSources: () => Promise<void>;
  createSnapshot: (path: string) => Promise<void>;
  deleteSnapshots: (
    userName: string,
    host: string,
    path: string,
    manifestIDs: string[]
  ) => Promise<void>;
  refreshAll: () => Promise<void>;
}

/**
 * Hook for snapshot management.
 * Uses global Zustand store for state - no local state or polling.
 */
export function useSnapshots(): UseSnapshotsReturn {
  // Subscribe to global store
  const snapshots = useKopiaStore((state) => state.snapshots);
  const sourcesResponse = useKopiaStore((state) => state.sourcesResponse);
  const sources = sourcesResponse?.sources || [];
  const localUsername = sourcesResponse?.localUsername;
  const localHost = sourcesResponse?.localHost;
  const multiUser = sourcesResponse?.multiUser;
  const isLoading = useKopiaStore((state) => state.isSnapshotsLoading);
  const error = useKopiaStore((state) => state.snapshotsError);
  const fetchSnapshots = useKopiaStore((state) => state.refreshSnapshots);
  const fetchSources = useKopiaStore((state) => state.refreshSources);
  const createSnapshot = useKopiaStore((state) => state.createSnapshot);
  const deleteSnapshots = useKopiaStore((state) => state.deleteSnapshots);

  const refreshAll = async () => {
    await Promise.all([fetchSnapshots(), fetchSources()]);
  };

  return {
    snapshots,
    sources,
    localUsername,
    localHost,
    multiUser,
    isLoading,
    error,
    fetchSnapshots,
    fetchSources,
    createSnapshot,
    deleteSnapshots,
    refreshAll,
  };
}
