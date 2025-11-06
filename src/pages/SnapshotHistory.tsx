/**
 * Snapshot History page - View and manage snapshots for a specific source
 *
 * This page shows all snapshots for a given user@host:/path source.
 * Users can delete individual snapshots or the entire source with all its snapshots.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Spinner } from '@/components/ui/spinner';
import {
  FolderArchive,
  RefreshCw,
  Search,
  Trash2,
  Calendar,
  HardDrive,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Plus,
} from 'lucide-react';
import type { Snapshot } from '@/lib/kopia/types';
import { listSnapshots, deleteSnapshots, createSnapshot } from '@/lib/kopia/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia/errors';

export function SnapshotHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const userName = searchParams.get('userName') || '';
  const host = searchParams.get('host') || '';
  const path = searchParams.get('path') || '';

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSnapshots, setSelectedSnapshots] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [showAllSnapshots, setShowAllSnapshots] = useState(false);

  const fetchSnapshots = async () => {
    if (!userName || !host || !path) {
      setError(t('snapshots.missingSourceParameters'));
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await listSnapshots(userName, host, path, showAllSnapshots);
      setSnapshots(response.snapshots || []);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, host, path, showAllSnapshots]);

  const handleRefresh = async () => {
    await fetchSnapshots();
  };

  const handleSelectAll = () => {
    if (selectedSnapshots.size === filteredSnapshots.length) {
      setSelectedSnapshots(new Set());
    } else {
      setSelectedSnapshots(new Set(filteredSnapshots.map((s) => s.id)));
    }
  };

  const handleToggleSnapshot = (snapshotId: string) => {
    const newSelected = new Set(selectedSnapshots);
    if (newSelected.has(snapshotId)) {
      newSelected.delete(snapshotId);
    } else {
      newSelected.add(snapshotId);
    }
    setSelectedSnapshots(newSelected);
  };

  const handleDeleteSnapshots = async () => {
    if (selectedSnapshots.size === 0) return;

    setIsDeleting(true);
    try {
      await deleteSnapshots(Array.from(selectedSnapshots));
      toast.success(
        t('snapshots.snapshotsDeleted', {
          count: selectedSnapshots.size,
        })
      );
      setSelectedSnapshots(new Set());
      setShowDeleteDialog(false);
      await fetchSnapshots();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSnapshotNow = async () => {
    if (!path) return;

    setIsCreatingSnapshot(true);
    try {
      await createSnapshot(path, userName, host);
      toast.success(t('snapshots.snapshotCreated'), {
        description: t('snapshots.snapshotCreatedDescription'),
      });
      // Refresh after a short delay to allow the snapshot to be registered
      setTimeout(() => {
        void fetchSnapshots();
      }, 2000);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const filteredSnapshots = snapshots.filter((snapshot) => {
    return (
      searchQuery === '' ||
      snapshot.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snapshot.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return `0 ${t('common.units.bytes')}`;
    const k = 1024;
    const sizes = [
      t('common.units.bytes'),
      t('common.units.kilobytes'),
      t('common.units.megabytes'),
      t('common.units.gigabytes'),
      t('common.units.terabytes'),
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const sourceLabel = `${userName}@${host}:${path}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void navigate('/snapshots')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{t('snapshots.snapshotHistory')}</h1>
          </div>
          <p className="text-sm text-muted-foreground pl-10">{sourceLabel}</p>
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
          <Button
            size="sm"
            onClick={() => void handleSnapshotNow()}
            disabled={isCreatingSnapshot || isLoading}
          >
            {isCreatingSnapshot ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                {t('snapshots.creating')}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {t('snapshots.snapshotNow')}
              </>
            )}
          </Button>
          {selectedSnapshots.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('snapshots.deleteSelected', { count: selectedSnapshots.size })}
            </Button>
          )}
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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('snapshots.allSnapshots')}</CardTitle>
              <CardDescription>
                {t('snapshots.snapshotsFound', { count: filteredSnapshots.length })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showAll"
                  checked={showAllSnapshots}
                  onCheckedChange={(checked) => setShowAllSnapshots(!!checked)}
                />
                <label htmlFor="showAll" className="text-sm cursor-pointer">
                  {t('snapshots.showAllIncludingHidden')}
                </label>
              </div>
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
              <h3 className="text-lg font-medium mb-2">{t('snapshots.noSnapshotsFound')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? t('snapshots.noSnapshotsMatch')
                  : t('snapshots.noSnapshotsForSource')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        selectedSnapshots.size === filteredSnapshots.length &&
                        filteredSnapshots.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>{t('snapshots.status')}</TableHead>
                  <TableHead>{t('snapshots.id')}</TableHead>
                  <TableHead>{t('snapshots.description')}</TableHead>
                  <TableHead>{t('snapshots.time')}</TableHead>
                  <TableHead className="text-right">{t('snapshots.size')}</TableHead>
                  <TableHead className="text-right">{t('snapshots.files')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSnapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSnapshots.has(snapshot.id)}
                        onCheckedChange={() => handleToggleSnapshot(snapshot.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {snapshot.incomplete ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {snapshot.id.slice(0, 16)}...
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Snapshots Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('snapshots.deleteSnapshots')}</DialogTitle>
            <DialogDescription>
              {t('snapshots.confirmDeleteMultiple', { count: selectedSnapshots.size })}{' '}
              {t('snapshots.deleteWarning')}
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t('snapshots.deleteWarningDetail')}</AlertDescription>
          </Alert>
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
              onClick={() => void handleDeleteSnapshots()}
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
                  {t('snapshots.deleteSnapshots')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
