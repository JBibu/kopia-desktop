import { ProviderFields, type FieldDef } from '../fields';
import type { ProviderFormProps } from '../types';

const fields: FieldDef[] = [
  {
    name: 'url',
    labelKey: 'setup.fields.common.url',
    placeholder: 'https://webdav.example.com/backup',
    helpKey: 'setup.fields.webdav.urlHelp',
    required: true,
    autoFocus: true,
  },
  {
    name: 'username',
    labelKey: 'setup.fields.common.username',
    placeholder: 'user',
    helpKey: 'setup.fields.webdav.usernameHelp',
    required: true,
  },
  {
    name: 'password',
    labelKey: 'setup.fields.common.password',
    placeholder: 'Your WebDAV password',
    helpKey: 'setup.fields.webdav.passwordHelp',
    type: 'password',
    required: true,
  },
  {
    name: 'trustedServerCertificateFingerprint',
    labelKey: 'setup.fields.webdav.certificateFingerprint',
    placeholder: 'SHA256:...',
    helpKey: 'setup.fields.webdav.certificateFingerprintHelp',
  },
];

export function WebDAVProvider({ config, onChange }: ProviderFormProps) {
  return <ProviderFields config={config} onChange={onChange} fields={fields} />;
}
