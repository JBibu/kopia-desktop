import { FormField } from '@/components/kopia/setup/fields/FormField';
import type { ProviderFormProps } from '@/components/kopia/setup/types';
import type { B2StorageConfig } from '@/lib/kopia/types';
import { useProviderConfig } from '@/hooks/useProviderConfig';
import { useTranslation } from 'react-i18next';

export function B2Provider({ config, onChange }: ProviderFormProps) {
  const { t } = useTranslation();
  const b2Config = config as Partial<B2StorageConfig>;
  const { handleChange } = useProviderConfig<B2StorageConfig>(b2Config, onChange);

  return (
    <div className="space-y-4">
      <FormField
        label={t('setup.fields.common.bucket')}
        name="bucket"
        value={b2Config.bucket || ''}
        onChange={(v) => handleChange('bucket', v)}
        placeholder="my-backup-bucket"
        helpText={t('setup.fields.b2.bucketHelp')}
        required
        autoFocus
      />

      <FormField
        label={t('setup.fields.b2.keyID')}
        name="keyID"
        value={b2Config.keyID || ''}
        onChange={(v) => handleChange('keyID', v)}
        placeholder="0000000000000000000000001"
        helpText={t('setup.fields.b2.keyIDHelp')}
        required
      />

      <FormField
        label={t('setup.fields.b2.key')}
        name="key"
        value={b2Config.key || ''}
        onChange={(v) => handleChange('key', v)}
        placeholder="K000000000000000000000000000000000000001"
        type="password"
        helpText={t('setup.fields.b2.keyHelp')}
        required
      />

      <FormField
        label={t('setup.fields.common.prefix')}
        name="prefix"
        value={b2Config.prefix || ''}
        onChange={(v) => handleChange('prefix', v)}
        placeholder="kopia/"
        helpText={t('setup.fields.b2.prefixHelp')}
      />
    </div>
  );
}
