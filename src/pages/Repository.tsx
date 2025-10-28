/**
 * Repository management page
 */

import { useState } from 'react';
import { useRepository } from '@/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { StorageType } from '@/lib/kopia/types';

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
        <h1 className="text-3xl font-bold">Repository</h1>
        <p className="text-muted-foreground">Connect to or manage your Kopia backup repository</p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Repository Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && !isConnected ? (
            <div className="flex items-center gap-2">
              <Spinner />
              <span>Checking repository status...</span>
            </div>
          ) : isConnected && status ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-lg font-semibold">Connected</span>
              </div>

              <div className="grid gap-2 text-sm">
                {status.storage && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Storage Type:</span>
                    <Badge variant="secondary">{status.storage}</Badge>
                  </div>
                )}
                {status.encryption && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Encryption:</span>
                    <span className="font-mono text-xs">{status.encryption}</span>
                  </div>
                )}
                {status.hash && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Hash:</span>
                    <span className="font-mono text-xs">{status.hash}</span>
                  </div>
                )}
                {status.configFile && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Config File:</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {status.configFile}
                    </span>
                  </div>
                )}
              </div>

              <Button
                variant="destructive"
                onClick={() => void handleDisconnect()}
                disabled={isLoading}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-lg font-semibold">Not Connected</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Form */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Connect to Repository</CardTitle>
            <CardDescription>Enter your repository details to connect</CardDescription>
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
                <Label htmlFor="storage-type">Storage Type</Label>
                <Select
                  value={storageType}
                  onValueChange={(value) => setStorageType(value as StorageType)}
                >
                  <SelectTrigger id="storage-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filesystem">Filesystem</SelectItem>
                    <SelectItem value="s3">Amazon S3</SelectItem>
                    <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                    <SelectItem value="azureBlob">Azure Blob</SelectItem>
                    <SelectItem value="b2">Backblaze B2</SelectItem>
                    <SelectItem value="sftp">SFTP</SelectItem>
                    <SelectItem value="webdav">WebDAV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="path">
                  Repository Path
                  <span className="text-destructive"> *</span>
                </Label>
                <Input
                  id="path"
                  type="text"
                  placeholder="/backup/kopia-repository"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Repository Password
                  <span className="text-destructive"> *</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter repository password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Spinner className="mr-2" />
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
