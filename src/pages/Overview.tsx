/**
 * Overview/Dashboard page
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKopiaServer, useRepository } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Database, Server, CheckCircle, XCircle, PlayCircle } from 'lucide-react';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground">Kopia backup system status and quick actions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Server Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kopia Server</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {serverLoading ? (
                  <div className="flex items-center gap-2">
                    <Spinner />
                    <span className="text-sm">Checking...</span>
                  </div>
                ) : isServerRunning ? (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-lg font-semibold">Running</span>
                    </div>
                    {serverStatus?.serverUrl && (
                      <p className="text-xs text-muted-foreground">{serverStatus.serverUrl}</p>
                    )}
                    {serverStatus?.uptime !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        Uptime: {Math.floor(serverStatus.uptime / 60)} minutes
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="text-lg font-semibold">Stopped</span>
                    </div>
                    <Button size="sm" onClick={() => void startServer()} className="mt-2">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Start Server
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Repository Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repository</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {repoLoading ? (
                  <div className="flex items-center gap-2">
                    <Spinner />
                    <span className="text-sm">Checking...</span>
                  </div>
                ) : isRepoConnected ? (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-lg font-semibold">Connected</span>
                    </div>
                    {repoStatus?.storage && (
                      <Badge variant="secondary" className="mt-2">
                        {repoStatus.storage}
                      </Badge>
                    )}
                    {repoStatus?.encryption && (
                      <p className="text-xs text-muted-foreground">{repoStatus.encryption}</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="text-lg font-semibold">Not Connected</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate('/repository')}
                      className="mt-2"
                      disabled={!isServerRunning}
                    >
                      <Database className="mr-2 h-4 w-4" />
                      Connect Repository
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {isServerRunning && isRepoConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={() => navigate('/snapshots')}>View Snapshots</Button>
            <Button variant="outline" onClick={() => navigate('/policies')}>
              Manage Policies
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
