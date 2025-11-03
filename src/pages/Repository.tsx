/**
 * Repository management page
 */

import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useRepository } from '@/hooks/useRepository';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Database, CheckCircle, XCircle, Settings, Shield, HardDrive } from 'lucide-react';
import { toast } from 'sonner';

export function Repository() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { status, isLoading, isConnected, disconnect } = useRepository();

  const handleDisconnect = async () => {
    await disconnect();
    toast.success(t('repository.disconnectSuccess'));
    // Redirect to setup after disconnect
    void navigate('/setup');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('repository.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('repository.subtitle')}</p>
        </div>
        {isConnected && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleDisconnect()}
            disabled={isLoading}
          >
            {t('common.disconnect')}
          </Button>
        )}
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              {t('repository.connectionStatus')}
            </CardTitle>
            {isConnected && (
              <Badge className="bg-success text-success-foreground">{t('common.connected')}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && !isConnected ? (
            <div className="flex items-center gap-2">
              <Spinner className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">{t('common.checking')}</span>
            </div>
          ) : isConnected && status ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="h-4 w-4" />
                <span className="text-2xl font-bold">{t('common.connected')}</span>
              </div>
              {status.username && status.hostname && (
                <p className="text-xs text-muted-foreground">
                  {status.username}@{status.hostname}
                  {status.readonly && <span> · Read-only</span>}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-4 w-4" />
                <span className="text-2xl font-bold">{t('common.notConnected')}</span>
              </div>
              <Button size="sm" onClick={() => void navigate('/setup')} className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                {t('repository.goToSetup')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repository Details */}
      {isConnected && status && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Storage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {status.storage && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="secondary">{status.storage}</Badge>
                </div>
              )}
              {status.configFile && (
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Location</span>
                  <code className="text-xs bg-muted px-2 py-1.5 rounded break-all">
                    {status.configFile}
                  </code>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {status.encryption && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Encryption</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {status.encryption}
                  </code>
                </div>
              )}
              {status.hash && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Hash</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {status.hash}
                  </code>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
