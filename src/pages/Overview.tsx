/**
 * Overview/Dashboard page
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKopiaServer, useRepository } from '@/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Database,
  Server,
  CheckCircle,
  XCircle,
  PlayCircle,
  FolderArchive,
  ListTodo,
  ArrowRight,
} from 'lucide-react';

export function Overview() {
  const navigate = useNavigate();
  const { serverStatus, isLoading: serverLoading, startServer } = useKopiaServer();
  const { status: repoStatus, isLoading: repoLoading } = useRepository();

  const isServerRunning = serverStatus?.running ?? false;
  const isRepoConnected = repoStatus?.connected ?? false;

  // Auto-start server if not running
  useEffect(() => {
    if (serverStatus && !serverStatus.running && !serverLoading) {
      void startServer();
    }
  }, [serverStatus, serverLoading, startServer]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Monitor your backup system status and manage your data protection
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Server Status Card */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-muted p-2">
                  <Server className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-base">Kopia Server</CardTitle>
              </div>
              {isServerRunning && (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  Active
                </Badge>
              )}
            </div>
            <CardDescription>Backend service status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {serverLoading ? (
              <div className="flex items-center gap-3 py-2">
                <Spinner className="h-5 w-5" />
                <span className="text-sm text-muted-foreground">Checking status...</span>
              </div>
            ) : isServerRunning ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="text-xl font-semibold">Online</p>
                    <p className="text-xs text-muted-foreground">Server is operational</p>
                  </div>
                </div>
                {serverStatus?.serverUrl && (
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs font-mono text-muted-foreground">
                      {serverStatus.serverUrl}
                    </p>
                  </div>
                )}
                {serverStatus?.uptime !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    Uptime:{' '}
                    <span className="font-medium">{Math.floor(serverStatus.uptime / 60)}</span>{' '}
                    minutes
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-destructive" />
                  <div>
                    <p className="text-xl font-semibold">Offline</p>
                    <p className="text-xs text-muted-foreground">Server is not running</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => void startServer()} className="w-full">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Start Server
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Repository Status Card */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-muted p-2">
                  <Database className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-base">Repository</CardTitle>
              </div>
              {isRepoConnected && (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  Connected
                </Badge>
              )}
            </div>
            <CardDescription>Backup storage connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {repoLoading ? (
              <div className="flex items-center gap-3 py-2">
                <Spinner className="h-5 w-5" />
                <span className="text-sm text-muted-foreground">Checking connection...</span>
              </div>
            ) : isRepoConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="text-xl font-semibold">Connected</p>
                    <p className="text-xs text-muted-foreground">Repository is accessible</p>
                  </div>
                </div>
                {repoStatus?.storage && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {repoStatus.storage}
                    </Badge>
                  </div>
                )}
                {repoStatus?.encryption && (
                  <p className="text-sm text-muted-foreground">
                    Encryption: <span className="font-mono text-xs">{repoStatus.encryption}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-destructive" />
                  <div>
                    <p className="text-xl font-semibold">Not Connected</p>
                    <p className="text-xs text-muted-foreground">Connect to a repository</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/repository')}
                  className="w-full"
                  disabled={!isServerRunning}
                >
                  <Database className="mr-2 h-4 w-4" />
                  Connect Repository
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {isServerRunning && isRepoConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common backup management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Button
                variant="outline"
                className="h-auto justify-start p-4"
                onClick={() => navigate('/snapshots')}
              >
                <div className="flex w-full items-center gap-3">
                  <div className="rounded-md bg-primary/10 p-2">
                    <FolderArchive className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">View Snapshots</p>
                    <p className="text-xs text-muted-foreground">Browse backup history</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start p-4"
                onClick={() => navigate('/policies')}
              >
                <div className="flex w-full items-center gap-3">
                  <div className="rounded-md bg-primary/10 p-2">
                    <ListTodo className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">Manage Policies</p>
                    <p className="text-xs text-muted-foreground">Configure backup rules</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
