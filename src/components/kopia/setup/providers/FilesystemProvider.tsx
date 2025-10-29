import { PathPickerField } from '../fields/PathPickerField';
import type { ProviderFormProps } from '../types';
import type { FilesystemStorageConfig } from '@/lib/kopia/types';

export function FilesystemProvider({ config, onChange }: ProviderFormProps) {
  const fsConfig = config as Partial<FilesystemStorageConfig>;

  return (
    <div className="space-y-4">
      <PathPickerField
        label="Repository Path"
        name="path"
        value={fsConfig.path || ''}
        onChange={(path) => onChange({ path })}
        placeholder="/path/to/repository"
        helpText="Local directory where repository files will be stored"
        required
      />
    </div>
  );
}
