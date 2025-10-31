/**
 * Snapshots page - Browse and manage backup snapshots
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  Trash2,
  Download,
  Calendar,
  HardDrive,
  AlertCircle,
} from 'lucide-react';
import type { Snapshot } from '@/lib/kopia/types';

export function Snapshots() {
  const { t } = useTranslation();
  const { snapshots, sources, isLoading, error, createSnapshot, deleteSnapshots, refreshAll } =
    useSnapshots();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [createPath, setCreatePath] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRefresh = async () => {
    await refreshAll();
  };

  const handleCreateSnapshot = async () => {
    if (!createPath.trim()) return;

    setIsCreating(true);
    try {
      await createSnapshot(createPath.trim());
      setShowCreateDialog(false);
      setCreatePath('');
    } catch {
      // Error is handled by the hook
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSnapshot = async () => {
    if (!selectedSnapshot) return;

    setIsDeleting(true);
    try {
      await deleteSnapshots([selectedSnapshot.id]);
      setShowDeleteDialog(false);
      setSelectedSnapshot(null);
    } catch {
      // Error is handled by the hook
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSnapshots = snapshots.filter((snapshot) => {
    const matchesSearch =
      searchQuery === '' ||
      snapshot.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snapshot.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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

      {/* Sources Summary */}
      {sources.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {sources.slice(0, 3).map((source, idx) => {
            const sourceKey = `${source.source.userName}@${source.source.host}:${source.source.path}`;
            return (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <FolderArchive className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{sourceKey}</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('common.status')}</span>
                    <Badge variant={source.status === 'IDLE' ? 'secondary' : 'default'}>
                      {source.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('snapshots.allSnapshots')}</CardTitle>
              <CardDescription>
                {t('snapshots.snapshotsFound', { count: filteredSnapshots.length })}
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
          {isLoading && snapshots.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : filteredSnapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderArchive className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('snapshots.noSnapshotsFound')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? t('snapshots.noSnapshotsMatch') : t('snapshots.createFirst')}
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
                  <TableHead>{t('snapshots.id')}</TableHead>
                  <TableHead>{t('snapshots.description')}</TableHead>
                  <TableHead>{t('snapshots.time')}</TableHead>
                  <TableHead className="text-right">{t('snapshots.size')}</TableHead>
                  <TableHead className="text-right">{t('snapshots.files')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSnapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell className="font-mono text-xs">
                      {snapshot.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <span className="text-sm truncate max-w-[200px] block">
                        {snapshot.description || t('snapshots.noDescription')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatDate(snapshot.startTime)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <HardDrive className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatSize(snapshot.summary?.size || 0)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{snapshot.summary?.files || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSnapshot(snapshot);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
              <Input
                id="path"
                placeholder={t('snapshots.pathPlaceholder')}
                value={createPath}
                onChange={(e) => setCreatePath(e.target.value)}
                disabled={isCreating}
              />
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

      {/* Delete Snapshot Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('snapshots.deleteSnapshot')}</DialogTitle>
            <DialogDescription>
              {t('snapshots.confirmDelete')} {t('snapshots.deleteWarning')}
            </DialogDescription>
          </DialogHeader>
          {selectedSnapshot && (
            <div className="space-y-2 py-4">
              <div className="text-sm">
                <span className="font-medium">{t('snapshots.id')}:</span> {selectedSnapshot.id}
              </div>
              <div className="text-sm">
                <span className="font-medium">{t('snapshots.description')}:</span>{' '}
                {selectedSnapshot.description || t('snapshots.noDescription')}
              </div>
              <div className="text-sm">
                <span className="font-medium">{t('snapshots.time')}:</span>{' '}
                {formatDate(selectedSnapshot.startTime)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteSnapshot()}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  {t('snapshots.deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('snapshots.deleteSnapshot')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
