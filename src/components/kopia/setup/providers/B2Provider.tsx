import { RequiredField, OptionalField } from '../fields';
import type { ProviderFormProps } from '../types';
import type { B2StorageConfig } from '@/lib/kopia/types';

export function B2Provider({ config, onChange }: ProviderFormProps) {
  const b2Config = config as Partial<B2StorageConfig>;

  const handleChange = (field: keyof B2StorageConfig, value: string) => {
    onChange({ ...b2Config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <RequiredField
        label="Bucket"
        name="bucket"
        value={b2Config.bucket || ''}
        onChange={(v) => handleChange('bucket', v)}
        placeholder="my-backup-bucket"
        helpText="Backblaze B2 bucket name"
        autoFocus
      />

      <RequiredField
        label="Key ID"
        name="keyID"
        value={b2Config.keyID || ''}
        onChange={(v) => handleChange('keyID', v)}
        placeholder="0000000000000000000000001"
        helpText="Backblaze B2 application key ID"
      />

      <RequiredField
        label="Key"
        name="key"
        value={b2Config.key || ''}
        onChange={(v) => handleChange('key', v)}
        placeholder="K000000000000000000000000000000000000001"
        type="password"
        helpText="Backblaze B2 application key"
      />

      <OptionalField
        label="Prefix"
        name="prefix"
        value={b2Config.prefix || ''}
        onChange={(v) => handleChange('prefix', v)}
        placeholder="kopia/"
        helpText="Path prefix within bucket (optional)"
      />
    </div>
  );
}
