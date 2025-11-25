import { PathPickerField } from '@/components/kopia/setup/fields/PathPickerField';
import type { ProviderFormProps } from '@/components/kopia/setup/types';
import type { FilesystemStorageConfig } from '@/lib/kopia/types';
import { useTranslation } from 'react-i18next';

export function FilesystemProvider({ config, onChange }: ProviderFormProps) {
  const { t } = useTranslation();
  const fsConfig = config as Partial<FilesystemStorageConfig>;

  return (
    <div className="space-y-4">
      <PathPickerField
        label={t('setup.fields.filesystem.repositoryPath')}
        name="path"
        value={fsConfig.path || ''}
        onChange={(path) => onChange({ path })}
        placeholder="/path/to/repository"
        helpText={t('setup.fields.filesystem.repositoryPathHelp')}
        required
      />
    </div>
  );
}
