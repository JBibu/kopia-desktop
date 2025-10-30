/**
 * Custom hook for policy operations
 */

import { useState, useCallback } from 'react';
import * as kopia from '@/lib/kopia/client';
import type { PolicyDefinition, PolicyResponse } from '@/lib/kopia/types';
import { useAsyncOperation } from './useAsyncOperation';

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

export function usePolicies(): UsePoliciesReturn {
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const { isLoading, error, execute } = useAsyncOperation();

  const fetchPolicies = useCallback(async () => {
    const response = await execute(() => kopia.listPolicies(), {
      errorContext: 'Failed to fetch policies',
    });
    if (response) {
      setPolicies(response.policies || []);
    }
  }, [execute]);

  const getPolicy = useCallback(
    async (userName?: string, host?: string, path?: string): Promise<PolicyResponse | null> => {
      return await execute(() => kopia.getPolicy(userName, host, path), {
        errorContext: 'Failed to fetch policy',
      });
    },
    [execute]
  );

  const setPolicy = useCallback(
    async (policy: PolicyDefinition, userName?: string, host?: string, path?: string) => {
      const result = await execute(() => kopia.setPolicy(policy, userName, host, path), {
        errorContext: 'Failed to save policy',
        successMessage: 'Policy saved successfully',
        onSuccess: () => void fetchPolicies(),
      });
      if (!result) {
        throw new Error('Failed to save policy');
      }
    },
    [execute, fetchPolicies]
  );

  const deletePolicy = useCallback(
    async (userName?: string, host?: string, path?: string) => {
      const result = await execute(() => kopia.deletePolicy(userName, host, path), {
        errorContext: 'Failed to delete policy',
        successMessage: 'Policy deleted successfully',
        onSuccess: () => void fetchPolicies(),
      });
      if (!result) {
        throw new Error('Failed to delete policy');
      }
    },
    [execute, fetchPolicies]
  );

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
