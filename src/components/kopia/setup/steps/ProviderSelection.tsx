import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive, Cloud, Database, Server, FolderTree, Globe } from 'lucide-react';
import type { StorageType } from '@/lib/kopia';

interface ProviderSelectionProps {
  onSelect: (provider: StorageType) => void;
}

interface ProviderOption {
  type: StorageType;
  nameKey: string;
  descKey: string;
  icon: typeof HardDrive;
}

const providers: ProviderOption[] = [
  {
    type: 'filesystem',
    nameKey: 'setup.providers.filesystem',
    descKey: 'setup.providers.filesystemDesc',
    icon: HardDrive,
  },
  {
    type: 's3',
    nameKey: 'setup.providers.s3',
    descKey: 'setup.providers.s3Desc',
    icon: Cloud,
  },
  {
    type: 'b2',
    nameKey: 'setup.providers.b2',
    descKey: 'setup.providers.b2Desc',
    icon: Database,
  },
  {
    type: 'azureBlob',
    nameKey: 'setup.providers.azureBlob',
    descKey: 'setup.providers.azureBlobDesc',
    icon: Cloud,
  },
  {
    type: 'gcs',
    nameKey: 'setup.providers.gcs',
    descKey: 'setup.providers.gcsDesc',
    icon: Cloud,
  },
  {
    type: 'sftp',
    nameKey: 'setup.providers.sftp',
    descKey: 'setup.providers.sftpDesc',
    icon: Server,
  },
  {
    type: 'webdav',
    nameKey: 'setup.providers.webdav',
    descKey: 'setup.providers.webdavDesc',
    icon: Globe,
  },
  {
    type: 'rclone',
    nameKey: 'setup.providers.rclone',
    descKey: 'setup.providers.rcloneDesc',
    icon: FolderTree,
  },
];

export function ProviderSelection({ onSelect }: ProviderSelectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{t('setup.chooseProvider')}</h2>
        <p className="text-muted-foreground">{t('setup.selectProviderMessage')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {providers.map((provider) => {
          const Icon = provider.icon;
          return (
            <Card
              key={provider.type}
              className="cursor-pointer transition-colors hover:border-primary"
              onClick={() => onSelect(provider.type)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t(provider.nameKey)}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{t(provider.descKey)}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
