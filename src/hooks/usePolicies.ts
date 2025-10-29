/**
 * Custom hook for policy operations
 */

import { useState, useCallback } from 'react';
import * as kopia from '@/lib/kopia/client';
import type { PolicyDefinition, PolicyResponse } from '@/lib/kopia/types';
import { getErrorMessage } from '@/lib/kopia/errors';
import { toast } from 'sonner';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await kopia.listPolicies();
      setPolicies(response.policies || []);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(`Failed to fetch policies: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPolicy = useCallback(
    async (userName?: string, host?: string, path?: string): Promise<PolicyResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await kopia.getPolicy(userName, host, path);
        return result;
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(`Failed to fetch policy: ${message}`);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const setPolicy = useCallback(
    async (policy: PolicyDefinition, userName?: string, host?: string, path?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await kopia.setPolicy(policy, userName, host, path);
        toast.success('Policy saved successfully');
        await fetchPolicies();
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(`Failed to save policy: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchPolicies]
  );

  const deletePolicy = useCallback(
    async (userName?: string, host?: string, path?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await kopia.deletePolicy(userName, host, path);
        toast.success('Policy deleted successfully');
        await fetchPolicies();
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(`Failed to delete policy: ${message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchPolicies]
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
