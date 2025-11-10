import { RequiredField } from '@/components/kopia/setup/fields/RequiredField';
import { OptionalField } from '@/components/kopia/setup/fields/OptionalField';
import type { ProviderFormProps } from '@/components/kopia/setup/types';
import type { WebDAVStorageConfig } from '@/lib/kopia/types';
import { useProviderConfig } from '@/hooks/useProviderConfig';
import { useTranslation } from 'react-i18next';

export function WebDAVProvider({ config, onChange }: ProviderFormProps) {
  const { t } = useTranslation();
  const webdavConfig = config as Partial<WebDAVStorageConfig>;
  const { handleChange } = useProviderConfig<WebDAVStorageConfig>(webdavConfig, onChange);

  return (
    <div className="space-y-4">
      <RequiredField
        label={t('setup.fields.common.url')}
        name="url"
        value={webdavConfig.url || ''}
        onChange={(v) => handleChange('url', v)}
        placeholder="https://webdav.example.com/backup"
        helpText={t('setup.fields.webdav.urlHelp')}
        autoFocus
      />

      <RequiredField
        label={t('setup.fields.common.username')}
        name="username"
        value={webdavConfig.username || ''}
        onChange={(v) => handleChange('username', v)}
        placeholder="user"
        helpText={t('setup.fields.webdav.usernameHelp')}
      />

      <RequiredField
        label={t('setup.fields.common.password')}
        name="password"
        type="password"
        value={webdavConfig.password || ''}
        onChange={(v) => handleChange('password', v)}
        placeholder="Your WebDAV password"
        helpText={t('setup.fields.webdav.passwordHelp')}
      />

      <OptionalField
        label={t('setup.fields.webdav.certificateFingerprint')}
        name="trustedServerCertificateFingerprint"
        value={webdavConfig.trustedServerCertificateFingerprint || ''}
        onChange={(v) => handleChange('trustedServerCertificateFingerprint', v)}
        placeholder="SHA256:..."
        helpText={t('setup.fields.webdav.certificateFingerprintHelp')}
      />
    </div>
  );
}
