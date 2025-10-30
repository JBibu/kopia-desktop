/**
 * Overview/Dashboard page
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useKopiaServer, useRepository } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';

export function Overview() {
  const navigate = useNavigate();
  const { serverStatus, isLoading: serverLoading, startServer } = useKopiaServer();
  const { status: repoStatus, isLoading: repoLoading } = useRepository();
  const hasTriedToStart = useRef(false);

  const isServerRunning = serverStatus?.running ?? false;
  const isRepoConnected = repoStatus?.connected ?? false;

  // Auto-start server if not running (only try once)
  useEffect(() => {
    if (!hasTriedToStart.current && serverStatus && !serverStatus.running && !serverLoading) {
      hasTriedToStart.current = true;
      void startServer();
    }
  }, [serverStatus, serverLoading, startServer]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Monitor your backup system status</p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Server Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" />
                Kopia Server
              </CardTitle>
              {isServerRunning && (
                <Badge className="bg-success text-success-foreground">Active</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {serverLoading ? (
              <div className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">Checking status...</span>
              </div>
            ) : isServerRunning ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Online</span>
                </div>
                {serverStatus?.uptime !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Uptime: {Math.floor(serverStatus.uptime / 60)}m
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Offline</span>
                </div>
                <Button size="sm" onClick={() => void startServer()} className="w-full">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Start Server
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Repository Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Repository
              </CardTitle>
              {isRepoConnected && (
                <Badge className="bg-success text-success-foreground">Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {repoLoading ? (
              <div className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">Checking connection...</span>
              </div>
            ) : isRepoConnected ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Connected</span>
                </div>
                {repoStatus?.storage && (
                  <Badge variant="secondary" className="text-xs">
                    {repoStatus.storage}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Not Connected</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    void navigate('/repository');
                  }}
                  className="w-full"
                  disabled={!isServerRunning}
                >
                  <Database className="mr-2 h-4 w-4" />
                  Connect
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
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                void navigate('/snapshots');
              }}
            >
              <FolderArchive className="mr-2 h-4 w-4" />
              View Snapshots
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                void navigate('/policies');
              }}
            >
              <ListTodo className="mr-2 h-4 w-4" />
              Manage Policies
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
