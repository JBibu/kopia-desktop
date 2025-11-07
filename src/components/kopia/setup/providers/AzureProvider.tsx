import { RequiredField } from '@/components/kopia/setup/fields/RequiredField';
import { OptionalField } from '@/components/kopia/setup/fields/OptionalField';
import type { ProviderFormProps } from '@/components/kopia/setup/types';
import type { AzureStorageConfig } from '@/lib/kopia/types';
import { useProviderConfig } from '@/hooks/useProviderConfig';
import { useTranslation } from 'react-i18next';

export function AzureProvider({ config, onChange }: ProviderFormProps) {
  const { t } = useTranslation();
  const azureConfig = config as Partial<AzureStorageConfig>;
  const { handleChange } = useProviderConfig<AzureStorageConfig>(azureConfig, onChange);

  return (
    <div className="space-y-4">
      <RequiredField
        label={t('setup.fields.azure.container')}
        name="container"
        value={azureConfig.container || ''}
        onChange={(v) => handleChange('container', v)}
        placeholder="my-backup-container"
        helpText={t('setup.fields.azure.containerHelp')}
        autoFocus
      />

      <RequiredField
        label={t('setup.fields.azure.storageAccount')}
        name="storageAccount"
        value={azureConfig.storageAccount || ''}
        onChange={(v) => handleChange('storageAccount', v)}
        placeholder="mystorageaccount"
        helpText={t('setup.fields.azure.storageAccountHelp')}
      />

      <RequiredField
        label={t('setup.fields.azure.storageKey')}
        name="storageKey"
        value={azureConfig.storageKey || ''}
        onChange={(v) => handleChange('storageKey', v)}
        placeholder="Your storage account key"
        type="password"
        helpText={t('setup.fields.azure.storageKeyHelp')}
      />

      <OptionalField
        label={t('setup.fields.azure.storageDomain')}
        name="storageDomain"
        value={azureConfig.storageDomain || ''}
        onChange={(v) => handleChange('storageDomain', v)}
        placeholder="blob.core.windows.net"
        helpText={t('setup.fields.azure.storageDomainHelp')}
      />

      <OptionalField
        label={t('setup.fields.common.prefix')}
        name="prefix"
        value={azureConfig.prefix || ''}
        onChange={(v) => handleChange('prefix', v)}
        placeholder="kopia/"
        helpText={t('setup.fields.azure.prefixHelp')}
      />
    </div>
  );
}
