import { useKopiaStore } from '@/stores/kopia';

export function useRepositoryStatus() {
  return {
    status: useKopiaStore((state) => state.repositoryStatus),
    isLoading: useKopiaStore((state) => state.isRepositoryLoading),
    error: useKopiaStore((state) => state.repositoryError),
    isConnected: useKopiaStore((state) => state.isRepoConnected()),
    isInitializing: useKopiaStore((state) => state.isRepoInitializing()),
    refresh: useKopiaStore((state) => state.refreshRepositoryStatus),
    disconnect: useKopiaStore((state) => state.disconnectRepo),
  };
}
