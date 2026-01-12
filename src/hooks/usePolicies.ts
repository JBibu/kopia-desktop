import { useKopiaStore } from '@/stores/kopia';

export function usePolicies() {
  return {
    policies: useKopiaStore((state) => state.policies),
    isLoading: useKopiaStore((state) => state.isPoliciesLoading),
    error: useKopiaStore((state) => state.policiesError),
    refresh: useKopiaStore((state) => state.refreshPolicies),
    getPolicy: useKopiaStore((state) => state.getPolicy),
  };
}
