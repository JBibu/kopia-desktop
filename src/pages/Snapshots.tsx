/**
 * Snapshots page - Browse and manage snapshot sources
 *
 * This page displays a list of sources (user@host:/path combinations) that have snapshots.
 * Click on a source to view its snapshot history and manage individual snapshots.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useSnapshots } from '@/hooks/useSnapshots';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  FolderArchive,
  RefreshCw,
  Plus,
  Search,
  Calendar,
  HardDrive,
  AlertCircle,
  FolderOpen,
  ChevronRight,
} from 'lucide-react';
import type { SnapshotSource } from '@/lib/kopia/types';
import { selectFolder } from '@/lib/kopia/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia/errors';

export function Snapshots() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sources, isLoading, error, createSnapshot, refreshAll } = useSnapshots();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createPath, setCreatePath] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleRefresh = async () => {
    await refreshAll();
  };

  const handleBrowseFolder = async () => {
    try {
      const folder = await selectFolder();
      if (folder) {
        setCreatePath(folder);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCreateSnapshot = async () => {
    if (!createPath.trim()) return;

    setIsCreating(true);
    try {
      await createSnapshot(createPath.trim());
      toast.success(t('snapshots.snapshotCreated'), {
        description: t('snapshots.snapshotCreatedDescription'),
      });
      setShowCreateDialog(false);
      setCreatePath('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewSource = (source: SnapshotSource) => {
    const params = new URLSearchParams({
      userName: source.source.userName,
      host: source.source.host,
      path: source.source.path,
    });
    void navigate(`/snapshots/history?${params.toString()}`);
  };

  const filteredSources = sources.filter((source) => {
    const sourceString = `${source.source.userName}@${source.source.host}:${source.source.path}`;
    return (
      searchQuery === '' ||
      sourceString.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.source.path.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('snapshots.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('snapshots.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRefresh()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('snapshots.createSnapshot')}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('snapshots.sources')}</CardTitle>
              <CardDescription>
                {t('snapshots.sourcesFound', { count: filteredSources.length })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('snapshots.searchPlaceholder')}
                  className="pl-8 w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && sources.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderArchive className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('snapshots.noSourcesFound')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? t('snapshots.noSourcesMatch') : t('snapshots.createFirst')}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('snapshots.createSnapshot')}
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('snapshots.path')}</TableHead>
                  <TableHead>{t('snapshots.owner')}</TableHead>
                  <TableHead>{t('snapshots.status')}</TableHead>
                  <TableHead>{t('snapshots.lastSnapshot')}</TableHead>
                  <TableHead className="text-right">{t('snapshots.size')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSources.map((source, idx) => (
                  <TableRow
                    key={idx}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewSource(source)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FolderArchive className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium truncate max-w-[300px]">
                          {source.source.path}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {source.source.userName}@{source.source.host}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          source.status === 'IDLE'
                            ? 'secondary'
                            : source.status === 'UPLOADING'
                              ? 'default'
                              : 'outline'
                        }
                      >
                        {source.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {source.lastSnapshot ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {formatDate(source.lastSnapshot.startTime)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {t('snapshots.noSnapshots')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {source.lastSnapshot?.stats.totalSize ? (
                        <div className="flex items-center justify-end gap-2">
                          <HardDrive className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {formatSize(source.lastSnapshot.stats.totalSize)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewSource(source);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Snapshot Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('snapshots.createSnapshot')}</DialogTitle>
            <DialogDescription>{t('snapshots.createDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="path">{t('snapshots.pathToBackup')}</Label>
              <div className="flex gap-2">
                <Input
                  id="path"
                  placeholder={t('snapshots.pathPlaceholder')}
                  value={createPath}
                  onChange={(e) => setCreatePath(e.target.value)}
                  disabled={isCreating}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleBrowseFolder()}
                  disabled={isCreating}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('snapshots.pathDescription')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void handleCreateSnapshot()}
              disabled={isCreating || !createPath.trim()}
            >
              {isCreating ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  {t('snapshots.creating')}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('snapshots.createSnapshot')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
