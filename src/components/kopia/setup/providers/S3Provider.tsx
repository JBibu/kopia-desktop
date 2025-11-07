import { RequiredField } from '@/components/kopia/setup/fields/RequiredField';
import { OptionalField } from '@/components/kopia/setup/fields/OptionalField';
import type { ProviderFormProps } from '@/components/kopia/setup/types';
import type { S3StorageConfig } from '@/lib/kopia/types';
import { useProviderConfig } from '@/hooks/useProviderConfig';
import { useTranslation } from 'react-i18next';

export function S3Provider({ config, onChange }: ProviderFormProps) {
  const { t } = useTranslation();
  const s3Config = config as Partial<S3StorageConfig>;
  const { handleChange } = useProviderConfig<S3StorageConfig>(s3Config, onChange);

  return (
    <div className="space-y-4">
      <RequiredField
        label={t('setup.fields.common.bucket')}
        name="bucket"
        value={s3Config.bucket || ''}
        onChange={(v) => handleChange('bucket', v)}
        placeholder="my-backup-bucket"
        helpText={t('setup.fields.s3.bucketHelp')}
        autoFocus
      />

      <OptionalField
        label={t('setup.fields.s3.endpoint')}
        name="endpoint"
        value={s3Config.endpoint || ''}
        onChange={(v) => handleChange('endpoint', v)}
        placeholder="s3.amazonaws.com (leave empty for AWS)"
        helpText={t('setup.fields.s3.endpointHelp')}
      />

      <OptionalField
        label={t('setup.fields.s3.region')}
        name="region"
        value={s3Config.region || ''}
        onChange={(v) => handleChange('region', v)}
        placeholder="us-east-1"
        helpText={t('setup.fields.s3.regionHelp')}
      />

      <RequiredField
        label={t('setup.fields.s3.accessKeyID')}
        name="accessKeyID"
        value={s3Config.accessKeyID || ''}
        onChange={(v) => handleChange('accessKeyID', v)}
        placeholder="AKIAIOSFODNN7EXAMPLE"
        helpText={t('setup.fields.s3.accessKeyIDHelp')}
      />

      <RequiredField
        label={t('setup.fields.s3.secretAccessKey')}
        name="secretAccessKey"
        value={s3Config.secretAccessKey || ''}
        onChange={(v) => handleChange('secretAccessKey', v)}
        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        type="password"
        helpText={t('setup.fields.s3.secretAccessKeyHelp')}
      />

      <OptionalField
        label={t('setup.fields.s3.sessionToken')}
        name="sessionToken"
        value={s3Config.sessionToken || ''}
        onChange={(v) => handleChange('sessionToken', v)}
        placeholder="Optional temporary session token"
        helpText={t('setup.fields.s3.sessionTokenHelp')}
        type="password"
      />

      <OptionalField
        label={t('setup.fields.common.prefix')}
        name="prefix"
        value={s3Config.prefix || ''}
        onChange={(v) => handleChange('prefix', v)}
        placeholder="kopia/"
        helpText={t('setup.fields.s3.prefixHelp')}
      />
    </div>
  );
}
