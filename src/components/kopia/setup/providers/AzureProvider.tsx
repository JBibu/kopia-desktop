import { RequiredField, OptionalField } from '../fields';
import type { ProviderFormProps } from '../types';
import type { AzureStorageConfig } from '@/lib/kopia/types';

export function AzureProvider({ config, onChange }: ProviderFormProps) {
  const azureConfig = config as Partial<AzureStorageConfig>;

  const handleChange = (field: keyof AzureStorageConfig, value: string) => {
    onChange({ ...azureConfig, [field]: value });
  };

  return (
    <div className="space-y-4">
      <RequiredField
        label="Container"
        name="container"
        value={azureConfig.container || ''}
        onChange={(v) => handleChange('container', v)}
        placeholder="my-backup-container"
        helpText="Azure Blob Storage container name"
        autoFocus
      />

      <RequiredField
        label="Storage Account"
        name="storageAccount"
        value={azureConfig.storageAccount || ''}
        onChange={(v) => handleChange('storageAccount', v)}
        placeholder="mystorageaccount"
        helpText="Azure storage account name"
      />

      <RequiredField
        label="Storage Key"
        name="storageKey"
        value={azureConfig.storageKey || ''}
        onChange={(v) => handleChange('storageKey', v)}
        placeholder="Your storage account key"
        type="password"
        helpText="Azure storage account access key"
      />

      <OptionalField
        label="Storage Domain"
        name="storageDomain"
        value={azureConfig.storageDomain || ''}
        onChange={(v) => handleChange('storageDomain', v)}
        placeholder="blob.core.windows.net"
        helpText="Azure storage domain (leave empty for default)"
      />

      <OptionalField
        label="Prefix"
        name="prefix"
        value={azureConfig.prefix || ''}
        onChange={(v) => handleChange('prefix', v)}
        placeholder="kopia/"
        helpText="Path prefix within container (optional)"
      />
    </div>
  );
}
