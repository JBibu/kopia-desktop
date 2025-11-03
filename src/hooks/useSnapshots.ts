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
  isLoading: boolean;
  error: string | null;
  fetchSnapshots: () => Promise<void>;
  fetchSources: () => Promise<void>;
  createSnapshot: (path: string) => Promise<void>;
  deleteSnapshots: (manifestIDs: string[]) => Promise<void>;
  refreshAll: () => Promise<void>;
}

/**
 * Hook for snapshot management.
 * Uses global Zustand store for state - no local state or polling.
 */
export function useSnapshots(): UseSnapshotsReturn {
  // Subscribe to global store
  const snapshots = useKopiaStore((state) => state.snapshots);
  const sources = useKopiaStore((state) => state.sources);
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
    isLoading,
    error,
    fetchSnapshots,
    fetchSources,
    createSnapshot,
    deleteSnapshots,
    refreshAll,
  };
}
