/**
 * Snapshots page - Browse and manage backup snapshots
 */

import { useEffect, useState } from 'react';
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
  const { snapshots, sources, isLoading, error, createSnapshot, deleteSnapshots, refreshAll } =
    useSnapshots();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [createPath, setCreatePath] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

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
          <h1 className="text-3xl font-bold tracking-tight">Snapshots</h1>
          <p className="text-sm text-muted-foreground">Browse and manage your backup snapshots</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRefresh()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Snapshot
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
                    <span className="text-muted-foreground">Status</span>
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
              <CardTitle>All Snapshots</CardTitle>
              <CardDescription>
                {filteredSnapshots.length} snapshot{filteredSnapshots.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search snapshots..."
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
              <h3 className="text-lg font-semibold mb-2">No Snapshots Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? 'No snapshots match your search criteria'
                  : 'Create your first backup snapshot to get started'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Snapshot
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">Files</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        {snapshot.description || 'No description'}
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
            <DialogTitle>Create Snapshot</DialogTitle>
            <DialogDescription>
              Create a new backup snapshot of a directory or file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="path">Path to Backup</Label>
              <Input
                id="path"
                placeholder="/path/to/backup"
                value={createPath}
                onChange={(e) => setCreatePath(e.target.value)}
                disabled={isCreating}
              />
              <p className="text-xs text-muted-foreground">
                Enter the full path to the directory or file you want to backup
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateSnapshot()}
              disabled={isCreating || !createPath.trim()}
            >
              {isCreating ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Snapshot
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
            <DialogTitle>Delete Snapshot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this snapshot? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedSnapshot && (
            <div className="space-y-2 py-4">
              <div className="text-sm">
                <span className="font-medium">ID:</span> {selectedSnapshot.id}
              </div>
              <div className="text-sm">
                <span className="font-medium">Description:</span>{' '}
                {selectedSnapshot.description || 'No description'}
              </div>
              <div className="text-sm">
                <span className="font-medium">Time:</span> {formatDate(selectedSnapshot.startTime)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteSnapshot()}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Snapshot
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
