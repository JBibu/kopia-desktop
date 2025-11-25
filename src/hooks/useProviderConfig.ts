import { useCallback } from 'react';

/**
 * Generic hook for managing storage provider configuration changes.
 * Eliminates duplicated handleChange patterns across 6 storage provider components.
 *
 * @example
 * ```tsx
 * const { handleChange } = useProviderConfig(s3Config, onChange);
 *
 * <RequiredField
 *   label="Bucket"
 *   name="bucket"
 *   value={s3Config.bucket || ''}
 *   onChange={(value) => handleChange('bucket', value)}
 * />
 * ```
 */
export function useProviderConfig<T extends object>(
  config: Partial<T>,
  onChange: (config: Partial<T>) => void
) {
  const handleChange = useCallback(
    (field: keyof T, value: unknown) => {
      onChange({ ...config, [field]: value });
    },
    [config, onChange]
  );

  return { handleChange };
}
