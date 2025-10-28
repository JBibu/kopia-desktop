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
import { Separator } from '@/components/ui/separator';
import { Database, CheckCircle, XCircle, AlertCircle, Shield, HardDrive, Key } from 'lucide-react';
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
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Repository Management</h2>
        <p className="text-muted-foreground">
          Connect to your backup storage and manage repository settings
        </p>
      </div>

      {/* Status Card */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-muted p-2">
              <Database className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Connection Status</CardTitle>
              <CardDescription>Current repository connection state</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && !isConnected ? (
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
              <Spinner className="h-5 w-5" />
              <span className="text-sm">Checking repository status...</span>
            </div>
          ) : isConnected && status ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-green-500/10 p-4">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-semibold">Connected</p>
                  <p className="text-xs text-muted-foreground">Repository is accessible</p>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border bg-card p-4">
                <p className="text-sm font-medium">Repository Details</p>
                <Separator />
                <div className="space-y-2">
                  {status.storage && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">Storage Type</span>
                      <Badge variant="secondary" className="font-mono">
                        {status.storage}
                      </Badge>
                    </div>
                  )}
                  {status.encryption && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">Encryption</span>
                      <span className="font-mono text-xs">{status.encryption}</span>
                    </div>
                  )}
                  {status.hash && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">Hash Algorithm</span>
                      <span className="font-mono text-xs">{status.hash}</span>
                    </div>
                  )}
                  {status.configFile && (
                    <div className="flex flex-col gap-1 py-1">
                      <span className="text-sm text-muted-foreground">Configuration</span>
                      <code className="rounded bg-muted px-2 py-1 text-xs">
                        {status.configFile}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={() => void handleDisconnect()}
                disabled={isLoading}
                className="w-full"
              >
                Disconnect from Repository
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4">
              <XCircle className="h-6 w-6 text-destructive" />
              <div>
                <p className="font-semibold">Not Connected</p>
                <p className="text-xs text-muted-foreground">No active repository connection</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Form */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Connect to Repository</CardTitle>
                <CardDescription>
                  Enter your repository credentials to establish a connection
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleConnect(e)} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="storage-type" className="text-sm font-medium">
                    Storage Type
                  </Label>
                  <Select
                    value={storageType}
                    onValueChange={(value) => setStorageType(value as StorageType)}
                  >
                    <SelectTrigger id="storage-type" className="h-10">
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
                  <p className="text-xs text-muted-foreground">
                    Select where your backup data is stored
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="path" className="flex items-center gap-2 text-sm font-medium">
                    <HardDrive className="h-4 w-4" />
                    Repository Path
                    <span className="text-destructive">*</span>
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
                    className="h-10 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Full path to your repository location
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
                    <Key className="h-4 w-4" />
                    Repository Password
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter repository password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10"
                  />
                  <Alert className="mt-2">
                    <Shield className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Warning:</strong> There is NO way to recover your repository password.
                      Store it securely!
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full h-10">
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Connecting to repository...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Connect to Repository
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
