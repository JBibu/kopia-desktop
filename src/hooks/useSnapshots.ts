/**
 * Custom hook for snapshot operations
 */

import { useState, useCallback } from 'react';
import * as kopia from '@/lib/kopia/client';
import type { Snapshot, SnapshotSource } from '@/lib/kopia/types';
import { useAsyncOperation } from './useAsyncOperation';

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

export function useSnapshots(): UseSnapshotsReturn {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [sources, setSources] = useState<SnapshotSource[]>([]);
  const { isLoading, error, execute } = useAsyncOperation();

  const fetchSnapshots = useCallback(async () => {
    const response = await execute(() => kopia.listSnapshots('', '', ''), {
      errorContext: 'Failed to fetch snapshots',
    });
    if (response) {
      setSnapshots(response.snapshots || []);
    }
  }, [execute]);

  const fetchSources = useCallback(async () => {
    const response = await execute(() => kopia.listSources(), {
      errorContext: 'Failed to fetch sources',
    });
    if (response) {
      setSources(response.sources || []);
    }
  }, [execute]);

  const createSnapshot = useCallback(
    async (path: string) => {
      const result = await execute(() => kopia.createSnapshot(path), {
        errorContext: 'Failed to create snapshot',
        successMessage: 'Snapshot created successfully',
        onSuccess: () => void fetchSnapshots(),
      });
      if (!result) {
        throw new Error('Failed to create snapshot');
      }
    },
    [execute, fetchSnapshots]
  );

  const deleteSnapshots = useCallback(
    async (manifestIDs: string[]) => {
      const result = await execute(() => kopia.deleteSnapshots(manifestIDs), {
        errorContext: 'Failed to delete snapshot(s)',
        successMessage: 'Snapshot(s) deleted successfully',
        onSuccess: () => void fetchSnapshots(),
      });
      if (!result) {
        throw new Error('Failed to delete snapshot(s)');
      }
    },
    [execute, fetchSnapshots]
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchSnapshots(), fetchSources()]);
  }, [fetchSnapshots, fetchSources]);

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
