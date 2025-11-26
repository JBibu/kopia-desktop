/**
 * Repository management page
 */

import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useKopiaStore } from '@/stores/kopia';
import { cancelTask, updateRepositoryDescription } from '@/lib/kopia/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Settings, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia/errors';

export function Repository() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = useKopiaStore((state) => state.repositoryStatus);
  const isLoading = useKopiaStore((state) => state.isRepositoryLoading);
  const isConnected = useKopiaStore((state) => state.isRepoConnected());
  const isInitializing = useKopiaStore((state) => state.isRepoInitializing());
  const disconnect = useKopiaStore((state) => state.disconnectRepo);
  const refreshRepositoryStatus = useKopiaStore((state) => state.refreshRepositoryStatus);

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  const handleDisconnect = async () => {
    await disconnect();
    toast.success(t('repository.disconnectSuccess'));
    // Redirect to setup after disconnect
    void navigate('/setup');
  };

  const handleCancelInit = useCallback(async () => {
    if (status?.initTaskID) {
      try {
        await cancelTask(status.initTaskID);
        toast.success(t('repository.initCancelled'));
        void refreshRepositoryStatus();
      } catch {
        toast.error(t('repository.cancelFailed'));
      }
    }
  }, [status, refreshRepositoryStatus, t]);

  const handleSaveDescription = async () => {
    if (!editedDescription.trim()) {
      toast.error(t('repository.description.cannotBeEmpty'));
      return;
    }

    setIsSavingDescription(true);
    try {
      await updateRepositoryDescription(editedDescription.trim());
      await refreshRepositoryStatus();
      toast.success(t('repository.description.updateSuccess'));
      setIsEditingDescription(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingDescription(false);
    }
  };

  // Poll for status updates while initializing
  useEffect(() => {
    if (!isInitializing) return;

    const interval = setInterval(() => {
      void refreshRepositoryStatus();
    }, 1000);

    return () => clearInterval(interval);
  }, [isInitializing, refreshRepositoryStatus]);

  // Helper to get translated repository description
  const getRepositoryDescription = (): string => {
    if (!status?.description) {
      return t('repository.connectedToRepository');
    }

    // Parse Kopia's default description format: "Repository in <Provider>: <Path>"
    const match = status.description.match(/^Repository in (.+?): (.+)$/);
    if (match) {
      const [, provider, path] = match;
      return t('repository.repositoryIn', { provider, path });
    }

    // If it's a custom description or doesn't match the pattern, return as-is
    return status.description;
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
      {isLoading && !isConnected && !isInitializing ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : isInitializing ? (
        // Initializing state - show progress
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium">{t('repository.initializing')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('repository.initializingDescription')}
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => void handleCancelInit()}>
                {t('common.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !isConnected ? (
        <EmptyState
          icon={XCircle}
          title={t('common.notConnected')}
          description={t('repository.notConnectedDescription')}
          action={{
            label: t('repository.goToSetup'),
            onClick: () => void navigate('/setup'),
            icon: Settings,
          }}
        />
      ) : (
        status && (
          <>
            {/* Repository Status */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle className="h-6 w-6 text-success" />
                  <div className="flex-1">
                    {isEditingDescription ? (
                      <div className="flex gap-2">
                        <Input
                          value={editedDescription}
                          onChange={(e) => setEditedDescription(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleSaveDescription();
                            if (e.key === 'Escape') setIsEditingDescription(false);
                          }}
                          autoFocus
                          className="max-w-md"
                        />
                        <Button
                          size="sm"
                          onClick={() => void handleSaveDescription()}
                          disabled={isSavingDescription || !editedDescription.trim()}
                        >
                          {isSavingDescription ? <Spinner className="h-4 w-4" /> : t('common.save')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditingDescription(false)}
                          disabled={isSavingDescription}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium">{getRepositoryDescription()}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditedDescription(status?.description || '');
                            setIsEditingDescription(true);
                          }}
                          title={t('repository.description.clickToEdit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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
