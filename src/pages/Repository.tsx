/**
 * Repository management page
 */

import { useNavigate } from 'react-router-dom';
import { useRepository } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, CheckCircle, XCircle, Info, Settings } from 'lucide-react';
import { toast } from 'sonner';

export function Repository() {
  const navigate = useNavigate();
  const { status, isLoading, isConnected, disconnect } = useRepository();

  const handleDisconnect = async () => {
    await disconnect();
    toast.success('Disconnected from repository');
    // Redirect to setup after disconnect
    navigate('/setup');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Repository</h1>
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
              <div className="flex items-center gap-2 text-success">
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

      {/* Not Connected - Guide to Setup */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              No Repository Connected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                To connect to a repository or create a new one, please use the setup wizard.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/setup')} className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Go to Setup
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
