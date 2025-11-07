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
import { CheckCircle, XCircle, Settings } from 'lucide-react';
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
      {isLoading && !isConnected ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8">
            <Spinner className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">{t('common.checking')}</span>
          </CardContent>
        </Card>
      ) : !isConnected ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('common.notConnected')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('repository.notConnectedDescription')}
            </p>
            <Button size="sm" onClick={() => void navigate('/setup')}>
              <Settings className="mr-2 h-4 w-4" />
              {t('repository.goToSetup')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        status && (
          <>
            {/* Repository Status */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle className="h-6 w-6 text-success" />
                  <div>
                    <h3 className="text-lg font-medium">
                      {status.description || t('repository.connectedToRepository')}
                    </h3>
                    {status.username && status.hostname && (
                      <p className="text-sm text-muted-foreground">
                        {status.username}@{status.hostname}
                        {status.readonly && <span> · {t('repository.readonly')}</span>}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Provider */}
                  {status.storage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('repository.provider')}
                      </span>
                      <Badge variant="secondary">{status.storage}</Badge>
                    </div>
                  )}

                  {/* Format Version */}
                  {status.formatVersion && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('repository.formatVersion')}
                      </span>
                      <span className="text-sm">{status.formatVersion}</span>
                    </div>
                  )}

                  {/* Config File */}
                  {status.configFile && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {t('repository.configFile')}
                      </span>
                      <code className="text-xs bg-muted px-2 py-1 rounded break-all text-right">
                        {status.configFile}
                      </code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Advanced Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('repository.advancedInformation')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {status.encryption && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('repository.encryptionAlgorithm')}
                    </span>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {status.encryption}
                    </code>
                  </div>
                )}
                {status.hash && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('repository.hashAlgorithm')}</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {status.hash}
                    </code>
                  </div>
                )}
                {status.splitter && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('repository.splitterAlgorithm')}
                    </span>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {status.splitter}
                    </code>
                  </div>
                )}
                {status.ecc !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('repository.errorCorrectionAlgorithm')}
                    </span>
                    <span className="text-xs">{status.ecc || t('repository.disabled')}</span>
                  </div>
                )}
                {status.eccOverheadPercent !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('repository.errorCorrectionOverhead')}
                    </span>
                    <span className="text-xs">
                      {status.eccOverheadPercent > 0
                        ? `${status.eccOverheadPercent}%`
                        : t('repository.disabled')}
                    </span>
                  </div>
                )}
                {status.supportsContentCompression !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('repository.internalCompression')}
                    </span>
                    <span className="text-xs">
                      {status.supportsContentCompression ? t('common.yes') : t('common.no')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )
      )}
    </div>
  );
}
