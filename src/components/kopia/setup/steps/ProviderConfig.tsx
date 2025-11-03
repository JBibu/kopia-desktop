import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { StorageType } from '@/lib/kopia/types';
import type { ProviderFormProps } from '../types';
import { FilesystemProvider } from '../providers/FilesystemProvider';
import { S3Provider } from '../providers/S3Provider';
import { B2Provider } from '../providers/B2Provider';
import { AzureProvider } from '../providers/AzureProvider';
import { GCSProvider } from '../providers/GCSProvider';
import { SFTPProvider } from '../providers/SFTPProvider';
import { WebDAVProvider } from '../providers/WebDAVProvider';
import { RcloneProvider } from '../providers/RcloneProvider';

interface ProviderConfigProps extends ProviderFormProps {
  provider: StorageType;
  onBack: () => void;
  onNext: () => void;
}

const providerNameKeys: Record<StorageType, string> = {
  filesystem: 'setup.providers.filesystem',
  s3: 'setup.providers.s3',
  b2: 'setup.providers.b2',
  azureBlob: 'setup.providers.azureBlob',
  gcs: 'setup.providers.gcs',
  sftp: 'setup.providers.sftp',
  webdav: 'setup.providers.webdav',
  rclone: 'setup.providers.rclone',
};

export function ProviderConfig({
  provider,
  config,
  onChange,
  onBack,
  onNext,
}: ProviderConfigProps) {
  const { t } = useTranslation();

  const renderProvider = () => {
    const props: ProviderFormProps = { config, onChange };

    switch (provider) {
      case 'filesystem':
        return <FilesystemProvider {...props} />;
      case 's3':
        return <S3Provider {...props} />;
      case 'b2':
        return <B2Provider {...props} />;
      case 'azureBlob':
        return <AzureProvider {...props} />;
      case 'gcs':
        return <GCSProvider {...props} />;
      case 'sftp':
        return <SFTPProvider {...props} />;
      case 'webdav':
        return <WebDAVProvider {...props} />;
      case 'rclone':
        return <RcloneProvider {...props} />;
      default:
        return <div>Unsupported provider: {provider}</div>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">
            {t('setup.configureProvider', { provider: t(providerNameKeys[provider]) })}
          </h2>
          <p className="text-muted-foreground">{t('setup.enterStorageConfig')}</p>
        </div>
      </div>

      <div className="space-y-4">{renderProvider()}</div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          {t('setup.back')}
        </Button>
        <Button type="button" onClick={onNext}>
          {t('setup.next')}
        </Button>
      </div>
    </div>
  );
}
