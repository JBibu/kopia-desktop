import { ProviderFields, type FieldDef } from '../fields/ProviderFields';
import type { ProviderFormProps } from '../types';

const fields: FieldDef[] = [
  {
    name: 'bucket',
    labelKey: 'setup.fields.common.bucket',
    placeholder: 'my-backup-bucket',
    helpKey: 'setup.fields.s3.bucketHelp',
    required: true,
    autoFocus: true,
  },
  {
    name: 'endpoint',
    labelKey: 'setup.fields.s3.endpoint',
    placeholder: 's3.amazonaws.com (leave empty for AWS)',
    helpKey: 'setup.fields.s3.endpointHelp',
  },
  {
    name: 'region',
    labelKey: 'setup.fields.s3.region',
    placeholder: 'us-east-1',
    helpKey: 'setup.fields.s3.regionHelp',
  },
  {
    name: 'accessKeyID',
    labelKey: 'setup.fields.s3.accessKeyID',
    placeholder: 'AKIAIOSFODNN7EXAMPLE',
    helpKey: 'setup.fields.s3.accessKeyIDHelp',
    required: true,
  },
  {
    name: 'secretAccessKey',
    labelKey: 'setup.fields.s3.secretAccessKey',
    placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    helpKey: 'setup.fields.s3.secretAccessKeyHelp',
    type: 'password',
    required: true,
  },
  {
    name: 'sessionToken',
    labelKey: 'setup.fields.s3.sessionToken',
    placeholder: 'Optional temporary session token',
    helpKey: 'setup.fields.s3.sessionTokenHelp',
    type: 'password',
  },
  {
    name: 'prefix',
    labelKey: 'setup.fields.common.prefix',
    placeholder: 'kopia/',
    helpKey: 'setup.fields.s3.prefixHelp',
  },
];

export function S3Provider({ config, onChange }: ProviderFormProps) {
  return <ProviderFields config={config} onChange={onChange} fields={fields} />;
}
