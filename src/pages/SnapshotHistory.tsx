/**
 * Snapshot History page - View and manage snapshots for a specific source
 *
 * This page shows all snapshots for a given user@host:/path source.
 * Users can delete individual snapshots or the entire source with all its snapshots.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { listen } from '@tauri-apps/api/event';
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
  FolderOpen,
  RotateCcw,
} from 'lucide-react';
import type { Snapshot } from '@/lib/kopia/types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia/errors';
import { formatBytes, formatDateTime } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language';
import { useKopiaStore } from '@/stores/kopia';

export function SnapshotHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguageStore();

  // Map language code to locale
  const locale = language === 'es' ? 'es-ES' : 'en-US';

  const userName = searchParams.get('userName') || '';
  const host = searchParams.get('host') || '';
  const path = searchParams.get('path') || '';

  // Use store for snapshot operations
  const fetchSnapshotsForSource = useKopiaStore((state) => state.fetchSnapshotsForSource);
  const storeCreateSnapshot = useKopiaStore((state) => state.createSnapshot);
  const storeDeleteSnapshots = useKopiaStore((state) => state.deleteSnapshots);
  const isSnapshotsLoading = useKopiaStore((state) => state.isSnapshotsLoading);
  const snapshotsError = useKopiaStore((state) => state.snapshotsError);

  // Local state for this page
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSnapshots, setSelectedSnapshots] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [showAllSnapshots, setShowAllSnapshots] = useState(false);

  const fetchSnapshots = async () => {
    if (!userName || !host || !path) {
      return;
    }

    try {
      const fetchedSnapshots = await fetchSnapshotsForSource(
        userName,
        host,
        path,
        showAllSnapshots
      );
      setSnapshots(fetchedSnapshots);
    } catch (err) {
      // Error is already handled by the store
      console.error(t('snapshots.errors.fetchFailed'), err);
    }
  };

  useEffect(() => {
    void fetchSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, host, path, showAllSnapshots]);

  // Listen for WebSocket events to auto-refresh
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen('kopia-ws-event', (event) => {
        const data = event.payload as { type?: string };

        // Refresh snapshots when snapshot-related events occur
        if (data.type === 'snapshot-progress' || data.type === 'task-progress') {
          void fetchSnapshots();
        }
      });

      return unlisten;
    };

    const listenerPromise = setupListener();

    return () => {
      void listenerPromise.then((unlisten) => unlisten());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, host, path]);

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
    if (selectedSnapshots.size === 0 || !userName || !host || !path) return;

    const idsToDelete = Array.from(selectedSnapshots);

    setIsDeleting(true);
    try {
      await storeDeleteSnapshots(userName, host, path, idsToDelete);
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
      await storeCreateSnapshot(path);
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
            disabled={isSnapshotsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSnapshotsLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSnapshotNow()}
            disabled={isCreatingSnapshot || isSnapshotsLoading}
          >
            {isCreatingSnapshot ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                {t('snapshots.creating')}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {t('snapshots.createSnapshotNow')}
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
      {snapshotsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{snapshotsError}</AlertDescription>
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
                  placeholder={t('snapshots.searchSnapshotsPlaceholder')}
                  className="pl-8 w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isSnapshotsLoading && snapshots.length === 0 ? (
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
                  <TableHead className="w-[100px]">{t('snapshots.actions')}</TableHead>
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
                        <span className="text-sm">
                          {formatDateTime(snapshot.startTime, locale)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <HardDrive className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatBytes(snapshot.summary?.size || 0)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{snapshot.summary?.files || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!snapshot.rootID) {
                              toast.error(t('snapshots.cannotBrowse'), {
                                description: t('snapshots.cannotBrowseDesc'),
                              });
                              return;
                            }
                            void navigate(
                              `/snapshots/browse?snapshotId=${encodeURIComponent(snapshot.id)}&oid=${encodeURIComponent(snapshot.rootID)}&rootOid=${encodeURIComponent(snapshot.rootID)}&path=/`
                            );
                          }}
                          disabled={!snapshot.rootID}
                          title={
                            snapshot.rootID ? t('snapshots.browse') : t('snapshots.cannotBrowse')
                          }
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!snapshot.rootID) {
                              toast.error(t('snapshots.cannotRestore'), {
                                description: t('snapshots.cannotRestoreDesc'),
                              });
                              return;
                            }
                            void navigate(
                              `/snapshots/restore?snapshotId=${encodeURIComponent(snapshot.id)}&oid=${encodeURIComponent(snapshot.rootID)}&path=/`
                            );
                          }}
                          disabled={!snapshot.rootID}
                          title={
                            snapshot.rootID ? t('snapshots.restore') : t('snapshots.cannotRestore')
                          }
                        >
                          <RotateCcw className="h-4 w-4" />
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
