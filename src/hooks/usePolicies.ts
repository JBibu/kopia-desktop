/**
 * Custom hook for policy operations
 *
 * Now delegates to global Zustand store to eliminate redundant state management.
 */

import { useKopiaStore } from '@/stores/kopia';
import type { PolicyDefinition, PolicyResponse } from '@/lib/kopia/types';

interface UsePoliciesReturn {
  policies: PolicyResponse[];
  isLoading: boolean;
  error: string | null;
  fetchPolicies: () => Promise<void>;
  getPolicy: (userName?: string, host?: string, path?: string) => Promise<PolicyResponse | null>;
  setPolicy: (
    policy: PolicyDefinition,
    userName?: string,
    host?: string,
    path?: string
  ) => Promise<void>;
  deletePolicy: (userName?: string, host?: string, path?: string) => Promise<void>;
}

/**
 * Hook for policy management.
 * Uses global Zustand store for state - no local state or polling.
 */
export function usePolicies(): UsePoliciesReturn {
  // Subscribe to global store
  const policies = useKopiaStore((state) => state.policies);
  const isLoading = useKopiaStore((state) => state.isPoliciesLoading);
  const error = useKopiaStore((state) => state.policiesError);
  const fetchPolicies = useKopiaStore((state) => state.refreshPolicies);
  const getPolicy = useKopiaStore((state) => state.getPolicy);
  const setPolicy = useKopiaStore((state) => state.setPolicy);
  const deletePolicy = useKopiaStore((state) => state.deletePolicy);

  return {
    policies,
    isLoading,
    error,
    fetchPolicies,
    getPolicy,
    setPolicy,
    deletePolicy,
  };
}
