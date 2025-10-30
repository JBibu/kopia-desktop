import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';

interface AsyncOperationOptions {
  /**
   * Whether to show a toast notification on error
   * @default true
   */
  showToast?: boolean;

  /**
   * Context string to prepend to error messages (e.g., "Failed to create snapshot")
   */
  errorContext?: string;

  /**
   * Success message to show in toast notification
   */
  successMessage?: string;

  /**
   * Callback to execute on success
   */
  onSuccess?: () => void;

  /**
   * Callback to execute on error
   */
  onError?: (error: string) => void;
}

/**
 * Generic hook for handling async operations with loading, error states, and toast notifications.
 * Eliminates duplicated try-catch-finally patterns across data-fetching hooks.
 *
 * @example
 * ```tsx
 * const { isLoading, error, execute } = useAsyncOperation();
 *
 * const handleCreate = async () => {
 *   const result = await execute(
 *     () => createSnapshot(path),
 *     {
 *       errorContext: 'Failed to create snapshot',
 *       successMessage: 'Snapshot created successfully',
 *     }
 *   );
 *   if (result) {
 *     // Handle success
 *   }
 * };
 * ```
 */
export function useAsyncOperation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async <T>(
      operation: () => Promise<T>,
      options: AsyncOperationOptions = {}
    ): Promise<T | null> => {
      const { showToast = true, errorContext, successMessage, onSuccess, onError } = options;

      setIsLoading(true);
      setError(null);

      try {
        const result = await operation();

        if (successMessage) {
          toast.success(successMessage);
        }

        if (onSuccess) {
          onSuccess();
        }

        return result;
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);

        if (showToast) {
          const errorMessage = errorContext ? `${errorContext}: ${message}` : message;
          toast.error(errorMessage);
        }

        if (onError) {
          onError(message);
        }

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    error,
    execute,
    reset,
  };
}
