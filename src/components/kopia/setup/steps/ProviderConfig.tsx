import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { StorageType } from '@/lib/kopia/types';
import type { ProviderFormProps } from '../types';
import {
  FilesystemProvider,
  S3Provider,
  B2Provider,
  AzureProvider,
  GCSProvider,
  SFTPProvider,
  WebDAVProvider,
  RcloneProvider,
} from '../providers';

interface ProviderConfigProps extends ProviderFormProps {
  provider: StorageType;
  onBack: () => void;
  onNext: () => void;
}

const providerNames: Record<StorageType, string> = {
  filesystem: 'Local Filesystem',
  s3: 'Amazon S3',
  b2: 'Backblaze B2',
  azureBlob: 'Azure Blob Storage',
  gcs: 'Google Cloud Storage',
  sftp: 'SFTP',
  webdav: 'WebDAV',
  rclone: 'Rclone',
};

export function ProviderConfig({
  provider,
  config,
  onChange,
  onBack,
  onNext,
}: ProviderConfigProps) {
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
          <h2 className="text-2xl font-bold">Configure {providerNames[provider]}</h2>
          <p className="text-muted-foreground">Enter your storage configuration</p>
        </div>
      </div>

      <div className="space-y-4">{renderProvider()}</div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
