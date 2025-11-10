/**
 * Custom hook for snapshot mounting
 *
 * Delegates to global Zustand store for centralized mount state management.
 * Mounts are automatically refreshed via polling (30-second interval).
 */

import { useKopiaStore } from '@/stores/kopia';
import type { MountsResponse } from '@/lib/kopia/types';

interface UseMountsReturn {
  mounts: MountsResponse | null;
  isLoading: boolean;
  error: string | null;
  refreshMounts: () => Promise<void>;
  mountSnapshot: (root: string) => Promise<string | null>;
  unmountSnapshot: (objectId: string) => Promise<void>;
  getMountForObject: (objectId: string) => string | null;
}

/**
 * Hook for snapshot mounting.
 * Uses global Zustand store for state - no local state or polling.
 * Mounts are automatically updated via centralized polling.
 */
export function useMounts(): UseMountsReturn {
  // Subscribe to global store
  const mounts = useKopiaStore((state) => state.mounts);
  const isLoading = useKopiaStore((state) => state.isMountsLoading);
  const error = useKopiaStore((state) => state.mountsError);
  const refreshMounts = useKopiaStore((state) => state.refreshMounts);
  const mountSnapshot = useKopiaStore((state) => state.mountSnapshot);
  const unmountSnapshot = useKopiaStore((state) => state.unmountSnapshot);
  const getMountForObject = useKopiaStore((state) => state.getMountForObject);

  return {
    mounts,
    isLoading,
    error,
    refreshMounts,
    mountSnapshot,
    unmountSnapshot,
    getMountForObject,
  };
}
