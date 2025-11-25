import { useState } from 'react';
import { FormField } from '@/components/kopia/setup/fields/FormField';
import { PathPickerField } from '@/components/kopia/setup/fields/PathPickerField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProviderFormProps } from '@/components/kopia/setup/types';
import type { GCSStorageConfig } from '@/lib/kopia/types';
import { useProviderConfig } from '@/hooks/useProviderConfig';
import { useTranslation } from 'react-i18next';

export function GCSProvider({ config, onChange }: ProviderFormProps) {
  const { t } = useTranslation();
  const gcsConfig = config as Partial<GCSStorageConfig>;
  const [useFile, setUseFile] = useState(!!gcsConfig.credentialsFile);
  const { handleChange } = useProviderConfig<GCSStorageConfig>(gcsConfig, onChange);

  const toggleCredentialsMode = () => {
    setUseFile(!useFile);
    // Clear the opposite field when switching modes
    if (useFile) {
      onChange({ ...gcsConfig, credentialsFile: undefined });
    } else {
      onChange({ ...gcsConfig, credentialsJSON: undefined });
    }
  };

  return (
    <div className="space-y-4">
      <FormField
        label={t('setup.fields.common.bucket')}
        name="bucket"
        value={gcsConfig.bucket || ''}
        onChange={(v) => handleChange('bucket', v)}
        placeholder="my-backup-bucket"
        helpText={t('setup.fields.gcs.bucketHelp')}
        required
        autoFocus
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('setup.fields.gcs.serviceAccount')}</Label>
          <Button type="button" variant="ghost" size="sm" onClick={toggleCredentialsMode}>
            {useFile ? t('setup.fields.gcs.useJSON') : t('setup.fields.gcs.useFile')}
          </Button>
        </div>

        {useFile ? (
          <PathPickerField
            label=""
            name="credentialsFile"
            value={gcsConfig.credentialsFile || ''}
            onChange={(v) => handleChange('credentialsFile', v)}
            placeholder="/path/to/service-account-key.json"
            helpText={t('setup.fields.gcs.credentialsFileHelp')}
            required
          />
        ) : (
          <div className="space-y-2">
            <Textarea
              value={gcsConfig.credentialsJSON || ''}
              onChange={(e) => handleChange('credentialsJSON', e.target.value)}
              placeholder='{"type": "service_account", "project_id": "...", ...}'
              className="font-mono text-xs"
              rows={6}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t('setup.fields.gcs.credentialsFileHelp')}
            </p>
          </div>
        )}
      </div>

      <FormField
        label={t('setup.fields.common.prefix')}
        name="prefix"
        value={gcsConfig.prefix || ''}
        onChange={(v) => handleChange('prefix', v)}
        placeholder="kopia/"
        helpText={t('setup.fields.gcs.prefixHelp')}
      />
    </div>
  );
}
