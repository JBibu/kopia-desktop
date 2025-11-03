/**
 * Repository management page
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useRepository } from '@/hooks/useRepository';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Database,
  CheckCircle,
  XCircle,
  Settings,
  Shield,
  HardDrive,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

export function Repository() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { status, isLoading, isConnected, disconnect } = useRepository();
  const [showAdvanced, setShowAdvanced] = useState(false);

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
            <h3 className="text-lg font-semibold mb-2">{t('common.notConnected')}</h3>
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
            {/* Connected Status Card */}
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-success" />
                  <div>
                    <h3 className="text-lg font-semibold">
                      {t('repository.connectedToRepository')}
                    </h3>
                    {status.username && status.hostname && (
                      <p className="text-sm text-muted-foreground">
                        {status.username}@{status.hostname}
                        {status.readonly && <span> · {t('repository.readonly')}</span>}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Essential Information */}
            <Card>
              <CardContent className="py-6">
                <div className="space-y-4">
                  {/* Provider */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <HardDrive className="h-4 w-4" />
                      <span>{t('repository.provider')}</span>
                    </div>
                    {status.storage ? (
                      <Badge variant="secondary">{status.storage}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>

                  {/* Config File */}
                  {status.configFile && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Database className="h-4 w-4" />
                        <span>{t('repository.configFile')}</span>
                      </div>
                      <code className="text-xs bg-muted px-2 py-1.5 rounded break-all ml-6">
                        {status.configFile}
                      </code>
                    </div>
                  )}

                  {/* Format Version */}
                  {status.formatVersion && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('repository.formatVersion')}
                      </span>
                      <span className="text-sm font-medium">{status.formatVersion}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Advanced Information */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <Card>
                <CardHeader>
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {t('repository.advancedInformation')}
                    </CardTitle>
                    {showAdvanced ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
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
                        <span className="text-muted-foreground">
                          {t('repository.hashAlgorithm')}
                        </span>
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
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </>
        )
      )}
    </div>
  );
}
