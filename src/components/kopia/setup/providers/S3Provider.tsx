import { RequiredField, OptionalField } from '../fields';
import type { ProviderFormProps } from '../types';
import type { S3StorageConfig } from '@/lib/kopia/types';

export function S3Provider({ config, onChange }: ProviderFormProps) {
  const s3Config = config as Partial<S3StorageConfig>;

  const handleChange = (field: keyof S3StorageConfig, value: string) => {
    onChange({ ...s3Config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <RequiredField
        label="Bucket"
        name="bucket"
        value={s3Config.bucket || ''}
        onChange={(v) => handleChange('bucket', v)}
        placeholder="my-backup-bucket"
        helpText="S3 bucket name"
        autoFocus
      />

      <OptionalField
        label="Endpoint"
        name="endpoint"
        value={s3Config.endpoint || ''}
        onChange={(v) => handleChange('endpoint', v)}
        placeholder="s3.amazonaws.com (leave empty for AWS)"
        helpText="Custom endpoint for S3-compatible storage (MinIO, Wasabi, etc.)"
      />

      <OptionalField
        label="Region"
        name="region"
        value={s3Config.region || ''}
        onChange={(v) => handleChange('region', v)}
        placeholder="us-east-1"
        helpText="AWS region (e.g., us-east-1, eu-west-1)"
      />

      <RequiredField
        label="Access Key ID"
        name="accessKeyID"
        value={s3Config.accessKeyID || ''}
        onChange={(v) => handleChange('accessKeyID', v)}
        placeholder="AKIAIOSFODNN7EXAMPLE"
        helpText="AWS access key ID"
      />

      <RequiredField
        label="Secret Access Key"
        name="secretAccessKey"
        value={s3Config.secretAccessKey || ''}
        onChange={(v) => handleChange('secretAccessKey', v)}
        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        type="password"
        helpText="AWS secret access key"
      />

      <OptionalField
        label="Session Token"
        name="sessionToken"
        value={s3Config.sessionToken || ''}
        onChange={(v) => handleChange('sessionToken', v)}
        placeholder="Optional temporary session token"
        helpText="For temporary credentials (STS)"
        type="password"
      />

      <OptionalField
        label="Prefix"
        name="prefix"
        value={s3Config.prefix || ''}
        onChange={(v) => handleChange('prefix', v)}
        placeholder="kopia/"
        helpText="Path prefix within bucket (optional)"
      />
    </div>
  );
}
