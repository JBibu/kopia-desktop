/**
 * Repository page - Tabbed interface for repository management
 * Combines: Status, Connect/Create, and Switch repositories
 */

import { useEffect, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useRepositoryStatus, useTasks, useRepositories, useCurrentRepository } from '@/hooks';
import { useKopiaStore } from '@/stores';
import { updateRepositoryDescription } from '@/lib/kopia';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Pencil,
  Database,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia';
import type { RepositoryEntry } from '@/lib/kopia';
import { cn } from '@/lib/utils/cn';
import { PageHeader, type BreadcrumbItemType } from '@/components/layout/PageHeader';
import { SetupRepository } from '@/components/kopia/setup';

type RepositoryTab = 'status' | 'connect' | 'switch';

function getStatusBadge(repo: RepositoryEntry, t: (key: string) => string) {
  switch (repo.status) {
    case 'running':
      return (
        <Badge variant="default" className="bg-success text-success-foreground">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t('repositories.status.running')}
        </Badge>
      );
    case 'starting':
      return (
        <Badge variant="secondary">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          {t('repositories.status.starting')}
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          {t('repositories.status.error')}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <span className="h-2 w-2 rounded-full bg-muted-foreground mr-1.5" />
          {t('repositories.status.stopped')}
        </Badge>
      );
  }
}

export function RepositoryPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine initial tab from URL params
  const getInitialTab = (): RepositoryTab => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'connect' || tabParam === 'switch' || tabParam === 'status') {
      return tabParam;
    }
    return 'status';
  };

  const [activeTab, setActiveTab] = useState<RepositoryTab>(getInitialTab);

  const {
    status,
    isLoading: isStatusLoading,
    isConnected,
    isInitializing,
    disconnect,
    refresh: refreshRepositoryStatus,
  } = useRepositoryStatus();
  const { cancelTask } = useTasks();
  const currentRepoId = useKopiaStore((state) => state.currentRepoId);

  const {
    repositories,
    isLoading: isReposLoading,
    setCurrentRepository,
    removeRepository,
  } = useRepositories();
  const currentRepo = useCurrentRepository();

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [repoToRemove, setRepoToRemove] = useState<RepositoryEntry | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Update URL when tab changes
  const handleTabChange = (tab: RepositoryTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast.success(t('repository.disconnectSuccess'));
    handleTabChange('connect');
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
  }, [status, refreshRepositoryStatus, t, cancelTask]);

  const handleSaveDescription = async () => {
    if (!editedDescription.trim()) {
      toast.error(t('repository.description.cannotBeEmpty'));
      return;
    }

    if (!currentRepoId) {
      toast.error(t('repository.noRepositorySelected'));
      return;
    }

    setIsSavingDescription(true);
    try {
      await updateRepositoryDescription(currentRepoId, editedDescription.trim());
      await refreshRepositoryStatus();
      toast.success(t('repository.description.updateSuccess'));
      setIsEditingDescription(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleSwitchRepository = async (repoId: string) => {
    try {
      await setCurrentRepository(repoId);
      toast.success(t('repositories.switched'));
      handleTabChange('status');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRemoveRepository = async () => {
    if (!repoToRemove) return;

    setIsRemoving(true);
    try {
      await removeRepository(repoToRemove.id);
      toast.success(t('repositories.removed'));
      setRepoToRemove(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsRemoving(false);
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

  // Auto-switch to connect tab if not connected
  useEffect(() => {
    if (!isStatusLoading && !isConnected && activeTab === 'status') {
      handleTabChange('connect');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStatusLoading, isConnected]);

  const getRepositoryDescription = (): string => {
    if (!status?.description) {
      return t('repository.connectedToRepository');
    }

    const match = status.description.match(/^Repository in (.+?): (.+)$/);
    if (match) {
      const [, provider, path] = match;
      return t('repository.repositoryIn', { provider, path });
    }

    return status.description;
  };

  const breadcrumbs: BreadcrumbItemType[] = [{ label: t('nav.repository') }];

  const tabs = {
    value: activeTab,
    onChange: (value: string) => handleTabChange(value as RepositoryTab),
    items: [
      { value: 'status', label: t('repository.tabs.status') },
      { value: 'connect', label: t('repository.tabs.connect') },
      { value: 'switch', label: t('repository.tabs.switch') },
    ],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('repository.title')}
        subtitle={t('repository.subtitle')}
        breadcrumbs={breadcrumbs}
        tabs={tabs}
        actions={
          activeTab === 'status' && isConnected ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleDisconnect()}
              disabled={isStatusLoading}
            >
              {t('common.disconnect')}
            </Button>
          ) : activeTab === 'switch' ? (
            <Button onClick={() => handleTabChange('connect')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('repositories.addRepository')}
            </Button>
          ) : undefined
        }
      />

      {/* Status Tab */}
      {activeTab === 'status' && (
        <>
          {isStatusLoading && !isConnected && !isInitializing ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : isInitializing ? (
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
                label: t('repository.tabs.connect'),
                onClick: () => handleTabChange('connect'),
                icon: Database,
              }}
            />
          ) : (
            status && (
              <>
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
                              {isSavingDescription ? (
                                <Spinner className="h-4 w-4" />
                              ) : (
                                t('common.save')
                              )}
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
                      {status.storage && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t('repository.provider')}
                          </span>
                          <Badge variant="secondary">{status.storage}</Badge>
                        </div>
                      )}

                      {status.formatVersion && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t('repository.formatVersion')}
                          </span>
                          <span className="text-sm">{status.formatVersion}</span>
                        </div>
                      )}

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

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {t('repository.advancedInformation')}
                    </CardTitle>
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
                </Card>
              </>
            )
          )}
        </>
      )}

      {/* Connect Tab */}
      {activeTab === 'connect' && (
        <SetupRepository embedded onSuccess={() => handleTabChange('status')} />
      )}

      {/* Switch Tab */}
      {activeTab === 'switch' && (
        <>
          {isReposLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : repositories.length === 0 ? (
            <EmptyState
              icon={Database}
              title={t('repositories.empty.title')}
              description={t('repositories.empty.description')}
              action={{
                label: t('repositories.addRepository'),
                onClick: () => handleTabChange('connect'),
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {repositories.map((repo) => {
                const isCurrentRepo = currentRepo?.id === repo.id;

                return (
                  <Card
                    key={repo.id}
                    className={cn('relative', isCurrentRepo && 'ring-2 ring-primary')}
                  >
                    {isCurrentRepo && (
                      <div className="absolute -top-2 left-4">
                        <Badge variant="default" className="text-xs">
                          {t('repositories.current')}
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base truncate">{repo.displayName}</CardTitle>
                          <CardDescription className="text-xs truncate">{repo.id}</CardDescription>
                        </div>
                        {getStatusBadge(repo, t)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t('repositories.storage')}</p>
                        <p className="text-sm font-mono truncate">{repo.storage || '-'}</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {t('repositories.configFile')}
                        </p>
                        <p className="text-xs font-mono truncate text-muted-foreground">
                          {repo.configFile}
                        </p>
                      </div>

                      {repo.error && (
                        <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                          {repo.error}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {!isCurrentRepo && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => void handleSwitchRepository(repo.id)}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                            {t('repositories.switch')}
                          </Button>
                        )}
                        {isCurrentRepo && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleTabChange('status')}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            {t('repository.tabs.status')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-none text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setRepoToRemove(repo)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Remove Confirmation Dialog */}
          <Dialog open={!!repoToRemove} onOpenChange={(open) => !open && setRepoToRemove(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('repositories.removeConfirm.title')}</DialogTitle>
                <DialogDescription>
                  {t('repositories.removeConfirm.description', {
                    name: repoToRemove?.displayName,
                  })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setRepoToRemove(null)}
                  disabled={isRemoving}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void handleRemoveRepository()}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2" />
                      {t('repositories.removing')}
                    </>
                  ) : (
                    t('repositories.remove')
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
