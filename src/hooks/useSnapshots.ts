/**
 * Custom hook for snapshot operations
 */

import { useState, useCallback } from 'react';
import * as kopia from '@/lib/kopia/client';
import type { Snapshot, SnapshotSource } from '@/lib/kopia/types';
import { getErrorMessage } from '@/lib/kopia/errors';
import { toast } from 'sonner';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use current user's snapshots - empty strings for all snapshots
      const response = await kopia.listSnapshots('', '', '');
      setSnapshots(response.snapshots || []);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(`Failed to fetch snapshots: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await kopia.listSources();
      setSources(response.sources || []);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(`Failed to fetch sources: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSnapshot = useCallback(
    async (path: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await kopia.createSnapshot(path);
        toast.success('Snapshot created successfully');
        await fetchSnapshots();
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(`Failed to create snapshot: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSnapshots]
  );

  const deleteSnapshots = useCallback(
    async (manifestIDs: string[]) => {
      setIsLoading(true);
      setError(null);
      try {
        await kopia.deleteSnapshots(manifestIDs);
        toast.success('Snapshot(s) deleted successfully');
        await fetchSnapshots();
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(`Failed to delete snapshot(s): ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSnapshots]
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
