/**
 * Repository management page
 */

import { useState } from 'react';
import { useRepository } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Database, CheckCircle, XCircle, AlertCircle, Shield, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import type { StorageType } from '@/lib/kopia/types';

const storageOptions = [
  { value: 'filesystem', label: 'Local Filesystem', icon: HardDrive },
  { value: 's3', label: 'Amazon S3', icon: Database },
  { value: 'gcs', label: 'Google Cloud Storage', icon: Database },
  { value: 'azureBlob', label: 'Azure Blob Storage', icon: Database },
  { value: 'b2', label: 'Backblaze B2', icon: Database },
  { value: 'sftp', label: 'SFTP', icon: Database },
  { value: 'webdav', label: 'WebDAV', icon: Database },
];

export function Repository() {
  const { status, isLoading, error, connect, disconnect, isConnected } = useRepository();

  const [storageType, setStorageType] = useState<StorageType>('filesystem');
  const [path, setPath] = useState('');
  const [password, setPassword] = useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!path || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    const success = await connect({
      storage: {
        type: storageType,
        path,
      },
      password,
    });

    if (success) {
      toast.success('Successfully connected to repository');
      setPassword(''); // Clear password
    } else {
      toast.error(error || 'Failed to connect to repository');
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast.success('Disconnected from repository');
    setPath('');
    setPassword('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Repository</h1>
        <p className="text-sm text-muted-foreground">Connect to your backup storage</p>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && !isConnected ? (
            <div className="flex items-center gap-2">
              <Spinner className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Checking...</span>
            </div>
          ) : isConnected && status ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Connected</span>
              </div>

              {status.storage && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Storage</span>
                  <Badge variant="secondary">{status.storage}</Badge>
                </div>
              )}
              {status.encryption && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Encryption</span>
                  <code className="text-xs">{status.encryption}</code>
                </div>
              )}

              <Button
                variant="destructive"
                onClick={() => void handleDisconnect()}
                disabled={isLoading}
                size="sm"
                className="w-full"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Not Connected</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Form */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connect Repository</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleConnect(e)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="storage-type" className="text-sm">
                  Storage Type
                </Label>
                <Select
                  value={storageType}
                  onValueChange={(value) => setStorageType(value as StorageType)}
                >
                  <SelectTrigger id="storage-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {storageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="path" className="text-sm">
                  Repository Path <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="path"
                  type="text"
                  placeholder={
                    storageType === 'filesystem'
                      ? '/backup/kopia-repository'
                      : 's3://bucket-name/path'
                  }
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  required
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter repository password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Warning:</strong> Password recovery is impossible. Store it securely!
                  </AlertDescription>
                </Alert>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Connect
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
