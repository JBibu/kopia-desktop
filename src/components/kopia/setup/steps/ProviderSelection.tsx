import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive, Cloud, Database, Server, FolderTree, Globe } from 'lucide-react';
import type { StorageType } from '@/lib/kopia/types';

interface ProviderSelectionProps {
  onSelect: (provider: StorageType) => void;
}

interface ProviderOption {
  type: StorageType;
  name: string;
  description: string;
  icon: typeof HardDrive;
}

const providers: ProviderOption[] = [
  {
    type: 'filesystem',
    name: 'Local Filesystem',
    description: 'Store backups on a local or network-mounted drive',
    icon: HardDrive,
  },
  {
    type: 's3',
    name: 'Amazon S3',
    description: 'AWS S3 or S3-compatible storage (MinIO, Wasabi, etc.)',
    icon: Cloud,
  },
  {
    type: 'b2',
    name: 'Backblaze B2',
    description: 'Affordable cloud storage from Backblaze',
    icon: Database,
  },
  {
    type: 'azureBlob',
    name: 'Azure Blob Storage',
    description: 'Microsoft Azure Blob Storage',
    icon: Cloud,
  },
  {
    type: 'gcs',
    name: 'Google Cloud Storage',
    description: 'Google Cloud Storage buckets',
    icon: Cloud,
  },
  {
    type: 'sftp',
    name: 'SFTP',
    description: 'SSH File Transfer Protocol server',
    icon: Server,
  },
  {
    type: 'webdav',
    name: 'WebDAV',
    description: 'WebDAV-compatible server',
    icon: Globe,
  },
  {
    type: 'rclone',
    name: 'Rclone',
    description: 'Use rclone for any supported backend',
    icon: FolderTree,
  },
];

export function ProviderSelection({ onSelect }: ProviderSelectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Choose Storage Provider</h2>
        <p className="text-muted-foreground">Select where you want to store your backups</p>
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
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{provider.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
