/**
 * Hook to get current repository ID from the store
 *
 * Provides convenient access to the current repository ID
 * and throws an error if no repository is selected (for use in components
 * that require a repository to be selected).
 */

import { useKopiaStore } from '@/stores/kopia';

/**
 * Get the current repository ID from the store
 * @returns The current repository ID or null if no repository is selected
 */
export function useCurrentRepoId(): string | null {
  return useKopiaStore((state) => state.currentRepoId);
}

/**
 * Get the current repository entry from the store
 * @returns The current repository entry or null if no repository is selected
 */
export function useCurrentRepository() {
  return useKopiaStore((state) => state.getCurrentRepository());
}

/**
 * Get all repositories from the store
 */
export function useRepositories() {
  const repositories = useKopiaStore((state) => state.repositories);
  const isLoading = useKopiaStore((state) => state.isRepositoriesLoading);
  const error = useKopiaStore((state) => state.repositoriesError);
  const refresh = useKopiaStore((state) => state.refreshRepositories);
  const setCurrentRepository = useKopiaStore((state) => state.setCurrentRepository);
  const addRepository = useKopiaStore((state) => state.addRepository);
  const removeRepository = useKopiaStore((state) => state.removeRepository);

  return {
    repositories,
    isLoading,
    error,
    refresh,
    setCurrentRepository,
    addRepository,
    removeRepository,
  };
}
