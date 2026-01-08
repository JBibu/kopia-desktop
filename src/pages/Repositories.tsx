/**
 * Repositories page - Manage multiple repository connections
 *
 * Allows users to:
 * - View all configured repositories
 * - Add new repositories
 * - Remove repositories
 * - Switch between repositories
 * - View repository status
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import {
  Database,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings,
  ArrowRightLeft,
} from 'lucide-react';
import { useRepositories, useCurrentRepository } from '@/hooks';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia';
import { useState } from 'react';
import type { RepositoryEntry } from '@/lib/kopia';
import { cn } from '@/lib/utils/cn';

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

export function Repositories() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { repositories, isLoading, setCurrentRepository, removeRepository } = useRepositories();
  const currentRepo = useCurrentRepository();
  const [repoToRemove, setRepoToRemove] = useState<RepositoryEntry | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleAddRepository = () => {
    void navigate('/setup?new=true');
  };

  const handleSwitchRepository = async (repoId: string) => {
    try {
      await setCurrentRepository(repoId);
      toast.success(t('repositories.switched'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleConfigureRepository = async (repoId: string) => {
    // First switch to this repository, then go to repository page
    try {
      await setCurrentRepository(repoId);
      void navigate('/repository');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('repositories.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('repositories.subtitle')}</p>
        </div>
        <Button onClick={handleAddRepository}>
          <Plus className="h-4 w-4 mr-2" />
          {t('repositories.addRepository')}
        </Button>
      </div>

      {/* Repository List */}
      {repositories.length === 0 ? (
        <EmptyState
          icon={Database}
          title={t('repositories.empty.title')}
          description={t('repositories.empty.description')}
          action={{
            label: t('repositories.addRepository'),
            onClick: handleAddRepository,
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
                  {/* Storage Info */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('repositories.storage')}</p>
                    <p className="text-sm font-mono truncate">{repo.storage || '-'}</p>
                  </div>

                  {/* Config File */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('repositories.configFile')}</p>
                    <p className="text-xs font-mono truncate text-muted-foreground">
                      {repo.configFile}
                    </p>
                  </div>

                  {/* Error Message */}
                  {repo.error && (
                    <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                      {repo.error}
                    </div>
                  )}

                  {/* Actions */}
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
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(!isCurrentRepo ? 'flex-none' : 'flex-1')}
                      onClick={() => void handleConfigureRepository(repo.id)}
                    >
                      <Settings className="h-3.5 w-3.5 mr-1.5" />
                      {t('repositories.configure')}
                    </Button>
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
            <Button variant="outline" onClick={() => setRepoToRemove(null)} disabled={isRemoving}>
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
    </div>
  );
}
