/**
 * Profile History page - View directories in a profile with stats
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FolderArchive,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  Clock,
  HardDrive,
  Pencil,
  Trash2,
} from 'lucide-react';
import { formatBytes, formatDistanceToNow } from '@/lib/utils';
import { useProfilesStore } from '@/stores';
import { usePreferencesStore } from '@/stores';
import { useSnapshots } from '@/hooks';
import { EmptyState } from '@/components/ui/empty-state';
import { CardStatItem } from '@/components/kopia/snapshots';
import { ProfileFormDialog } from '@/components/kopia/profiles';
import { toast } from 'sonner';

export function ProfileHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId: string }>();
  const byteFormat = usePreferencesStore((state) => state.byteFormat);

  const profile = useProfilesStore((state) => state.profiles.find((p) => p.id === profileId));
  const deleteProfile = useProfilesStore((state) => state.deleteProfile);
  const {
    snapshots: storeSnapshots,
    isLoading: isSnapshotsLoading,
    error: snapshotsError,
    refresh: refreshSnapshots,
    refreshSources,
  } = useSnapshots();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    // Refresh snapshots and sources when profileId changes
    void refreshSnapshots();
    void refreshSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  // Get snapshot stats for a directory
  const getDirectoryStats = (directory: string) => {
    const dirSnapshots = storeSnapshots.filter((s) => s.source?.path === directory);
    const snapshotCount = dirSnapshots.length;
    const totalSize = dirSnapshots.reduce((sum, s) => sum + (s.summary?.size || 0), 0);
    const sortedSnapshots = [...dirSnapshots].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    const lastSnapshot = sortedSnapshots[0];
    const lastSnapshotTime = lastSnapshot?.startTime || null;
    // Get source info from the most recent snapshot
    const userName = lastSnapshot?.source?.userName || '';
    const host = lastSnapshot?.source?.host || '';

    return { snapshotCount, totalSize, lastSnapshotTime, userName, host };
  };

  // Navigate to SnapshotHistory for a specific directory
  const handleDirectoryClick = (directory: string) => {
    const { userName, host } = getDirectoryStats(directory);
    const params = new URLSearchParams();
    if (userName) params.set('userName', userName);
    if (host) params.set('host', host);
    params.set('path', directory);
    void navigate(`/snapshots/history?${params.toString()}`);
  };

  const handleRefresh = async () => {
    await Promise.all([refreshSnapshots(), refreshSources()]);
  };

  const handleDeleteProfile = () => {
    if (profile) {
      deleteProfile(profile.id);
      toast.success(t('profiles.profileDeleted', { name: profile.name }));
      void navigate('/snapshots');
    }
  };

  if (!profile) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('profiles.profileNotFound')}</AlertDescription>
        </Alert>
        <Button onClick={() => void navigate('/snapshots')}>{t('profiles.backToProfiles')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/snapshots">{t('nav.snapshots')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{profile.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{profile.name}</h1>
          {profile.description && (
            <p className="text-sm text-muted-foreground">{profile.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            {t('common.edit')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            {t('common.delete')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRefresh()}
            disabled={isSnapshotsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSnapshotsLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {snapshotsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{snapshotsError}</AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {isSnapshotsLoading && storeSnapshots.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : profile.directories.length === 0 ? (
        <EmptyState
          icon={FolderArchive}
          title={t('profiles.noDirectories')}
          description={t('profiles.noDirectoriesDesc')}
        />
      ) : (
        /* Directory cards grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.directories.map((directory) => {
            const stats = getDirectoryStats(directory);
            return (
              <Card
                key={directory}
                className="hover:shadow-md hover:border-muted-foreground/20 transition-all duration-200 cursor-pointer group"
                onClick={() => handleDirectoryClick(directory)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-muted transition-colors">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-sm font-medium truncate flex-1">
                      {directory}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <CardStatItem
                      icon={FolderArchive}
                      label={t('snapshots.backups')}
                      value={stats.snapshotCount}
                    />
                    <CardStatItem
                      icon={HardDrive}
                      label={t('snapshots.size')}
                      value={formatBytes(stats.totalSize, 1, byteFormat)}
                    />
                  </div>
                  {stats.lastSnapshotTime && (
                    <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {t('snapshots.lastBackup')}{' '}
                        {formatDistanceToNow(new Date(stats.lastSnapshotTime))}
                      </span>
                    </div>
                  )}
                  {!stats.lastSnapshotTime && (
                    <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{t('snapshots.noSnapshots')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Profile Dialog */}
      <ProfileFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        profile={profile}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('profiles.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('profiles.deleteConfirmMessage', { name: profile.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProfile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('profiles.deleteProfile')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
