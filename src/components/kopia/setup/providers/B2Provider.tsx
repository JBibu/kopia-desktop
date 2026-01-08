import { ProviderFields, type FieldDef } from '../fields/ProviderFields';
import type { ProviderFormProps } from '../types';

const fields: FieldDef[] = [
  {
    name: 'bucket',
    labelKey: 'setup.fields.common.bucket',
    placeholder: 'my-backup-bucket',
    helpKey: 'setup.fields.b2.bucketHelp',
    required: true,
    autoFocus: true,
  },
  {
    name: 'keyID',
    labelKey: 'setup.fields.b2.keyID',
    placeholder: '0000000000000000000000001',
    helpKey: 'setup.fields.b2.keyIDHelp',
    required: true,
  },
  {
    name: 'key',
    labelKey: 'setup.fields.b2.key',
    placeholder: 'K000000000000000000000000000000000000001',
    helpKey: 'setup.fields.b2.keyHelp',
    type: 'password',
    required: true,
  },
  {
    name: 'prefix',
    labelKey: 'setup.fields.common.prefix',
    placeholder: 'kopia/',
    helpKey: 'setup.fields.b2.prefixHelp',
  },
];

export function B2Provider({ config, onChange }: ProviderFormProps) {
  return <ProviderFields config={config} onChange={onChange} fields={fields} />;
}
