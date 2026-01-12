import { ProviderFields, type FieldDef } from '../fields';
import type { ProviderFormProps } from '../types';

const fields: FieldDef[] = [
  {
    name: 'path',
    labelKey: 'setup.fields.filesystem.repositoryPath',
    placeholder: '/path/to/repository',
    helpKey: 'setup.fields.filesystem.repositoryPathHelp',
    type: 'path',
    required: true,
  },
];

export function FilesystemProvider({ config, onChange }: ProviderFormProps) {
  return <ProviderFields config={config} onChange={onChange} fields={fields} />;
}
