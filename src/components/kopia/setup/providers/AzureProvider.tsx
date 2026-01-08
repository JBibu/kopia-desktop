import { ProviderFields, type FieldDef } from '../fields';
import type { ProviderFormProps } from '../types';

const fields: FieldDef[] = [
  {
    name: 'container',
    labelKey: 'setup.fields.azure.container',
    placeholder: 'my-backup-container',
    helpKey: 'setup.fields.azure.containerHelp',
    required: true,
    autoFocus: true,
  },
  {
    name: 'storageAccount',
    labelKey: 'setup.fields.azure.storageAccount',
    placeholder: 'mystorageaccount',
    helpKey: 'setup.fields.azure.storageAccountHelp',
    required: true,
  },
  {
    name: 'storageKey',
    labelKey: 'setup.fields.azure.storageKey',
    placeholder: 'Your storage account key',
    helpKey: 'setup.fields.azure.storageKeyHelp',
    type: 'password',
    required: true,
  },
  {
    name: 'storageDomain',
    labelKey: 'setup.fields.azure.storageDomain',
    placeholder: 'blob.core.windows.net',
    helpKey: 'setup.fields.azure.storageDomainHelp',
  },
  {
    name: 'prefix',
    labelKey: 'setup.fields.common.prefix',
    placeholder: 'kopia/',
    helpKey: 'setup.fields.azure.prefixHelp',
  },
];

export function AzureProvider({ config, onChange }: ProviderFormProps) {
  return <ProviderFields config={config} onChange={onChange} fields={fields} />;
}
