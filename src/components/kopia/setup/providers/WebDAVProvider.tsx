import { RequiredField, OptionalField } from '../fields';
import type { ProviderFormProps } from '../types';
import type { WebDAVStorageConfig } from '@/lib/kopia/types';
import { useProviderConfig } from '@/hooks';

export function WebDAVProvider({ config, onChange }: ProviderFormProps) {
  const webdavConfig = config as Partial<WebDAVStorageConfig>;
  const { handleChange } = useProviderConfig<WebDAVStorageConfig>(webdavConfig, onChange);

  return (
    <div className="space-y-4">
      <RequiredField
        label="URL"
        name="url"
        value={webdavConfig.url || ''}
        onChange={(v) => handleChange('url', v)}
        placeholder="https://webdav.example.com/backup"
        helpText="WebDAV server URL including path"
        autoFocus
      />

      <RequiredField
        label="Username"
        name="username"
        value={webdavConfig.username || ''}
        onChange={(v) => handleChange('username', v)}
        placeholder="user"
        helpText="WebDAV username"
      />

      <RequiredField
        label="Password"
        name="password"
        type="password"
        value={webdavConfig.password || ''}
        onChange={(v) => handleChange('password', v)}
        placeholder="Your WebDAV password"
        helpText="WebDAV password"
      />

      <OptionalField
        label="Certificate Fingerprint"
        name="trustedServerCertificateFingerprint"
        value={webdavConfig.trustedServerCertificateFingerprint || ''}
        onChange={(v) => handleChange('trustedServerCertificateFingerprint', v)}
        placeholder="SHA256:..."
        helpText="TLS certificate fingerprint for self-signed certificates (optional)"
      />
    </div>
  );
}
