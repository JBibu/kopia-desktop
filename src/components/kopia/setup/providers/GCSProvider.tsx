import { useState } from 'react';
import { RequiredField, OptionalField, PathPickerField } from '../fields';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProviderFormProps } from '../types';
import type { GCSStorageConfig } from '@/lib/kopia/types';
import { useProviderConfig } from '@/hooks';

export function GCSProvider({ config, onChange }: ProviderFormProps) {
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
      <RequiredField
        label="Bucket"
        name="bucket"
        value={gcsConfig.bucket || ''}
        onChange={(v) => handleChange('bucket', v)}
        placeholder="my-backup-bucket"
        helpText="Google Cloud Storage bucket name"
        autoFocus
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Service Account Credentials</Label>
          <Button type="button" variant="ghost" size="sm" onClick={toggleCredentialsMode}>
            {useFile ? 'Use JSON directly' : 'Use credentials file'}
          </Button>
        </div>

        {useFile ? (
          <PathPickerField
            label=""
            name="credentialsFile"
            value={gcsConfig.credentialsFile || ''}
            onChange={(v) => handleChange('credentialsFile', v)}
            placeholder="/path/to/service-account-key.json"
            helpText="Path to service account JSON key file"
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
              Paste the service account JSON key contents
            </p>
          </div>
        )}
      </div>

      <OptionalField
        label="Prefix"
        name="prefix"
        value={gcsConfig.prefix || ''}
        onChange={(v) => handleChange('prefix', v)}
        placeholder="kopia/"
        helpText="Path prefix within bucket (optional)"
      />
    </div>
  );
}
