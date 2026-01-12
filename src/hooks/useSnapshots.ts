import { useKopiaStore } from '@/stores/kopia';

export function useSnapshots() {
  return {
    snapshots: useKopiaStore((state) => state.snapshots),
    sources: useKopiaStore((state) => state.sourcesResponse),
    isLoading: useKopiaStore((state) => state.isSnapshotsLoading),
    error: useKopiaStore((state) => state.snapshotsError),
    refresh: useKopiaStore((state) => state.refreshSnapshots),
    refreshSources: useKopiaStore((state) => state.refreshSources),
    createSnapshot: useKopiaStore((state) => state.createSnapshot),
    deleteSnapshots: useKopiaStore((state) => state.deleteSnapshots),
    fetchSnapshotsForSource: useKopiaStore((state) => state.fetchSnapshotsForSource),
  };
}
