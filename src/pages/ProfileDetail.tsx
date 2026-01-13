/**
 * ProfileDetail - View directories in a profile with stats
 * Shows all directories in a backup profile with their snapshot statistics
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FolderArchive,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  Clock,
  HardDrive,
  Pencil,
  Trash2,
  Play,
  MoreVertical,
  Copy,
  Pin,
  PinOff,
  Settings2,
} from 'lucide-react';
import { formatBytes, formatDistanceToNow } from '@/lib/utils';
import { useProfilesStore, usePreferencesStore } from '@/stores';
import { useSnapshots } from '@/hooks';
import { EmptyState } from '@/components/ui/empty-state';
import { CardStatItem } from '@/components/kopia/snapshots';
import { ProfileFormDialog } from '@/components/kopia/profiles';
import { PolicyEditDialog } from '@/components/kopia/policy';
import { PageHeader, type BreadcrumbItemType } from '@/components/layout/PageHeader';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia';
import type { PolicyTarget } from '@/lib/kopia';

export function ProfileDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId: string }>();
  const byteFormat = usePreferencesStore((state) => state.byteFormat);

  const profile = useProfilesStore((state) => state.profiles.find((p) => p.id === profileId));
  const deleteProfile = useProfilesStore((state) => state.deleteProfile);
  const toggleProfilePin = useProfilesStore((state) => state.togglePin);
  const createProfile = useProfilesStore((state) => state.createProfile);
  const {
    snapshots: storeSnapshots,
    isLoading: isSnapshotsLoading,
    error: snapshotsError,
    refresh: refreshSnapshots,
    refreshSources,
    createSnapshot,
  } = useSnapshots();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [policyEditTarget, setPolicyEditTarget] = useState<PolicyTarget | null>(null);

  useEffect(() => {
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
    const userName = lastSnapshot?.source?.userName || '';
    const host = lastSnapshot?.source?.host || '';

    return { snapshotCount, totalSize, lastSnapshotTime, userName, host };
  };

  // Navigate to DirectoryHistory for a specific directory
  const handleDirectoryClick = (directory: string) => {
    const { userName, host } = getDirectoryStats(directory);
    const params = new URLSearchParams();
    params.set('profileId', profileId || '');
    if (userName) params.set('userName', userName);
    if (host) params.set('host', host);
    params.set('path', directory);
    void navigate(`/profiles/${profileId}/history?${params.toString()}`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshSnapshots(), refreshSources()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBackupAll = async () => {
    if (!profile) return;
    try {
      for (const dir of profile.directories) {
        await createSnapshot(dir, true);
      }
      toast.success(t('profiles.backupAllStarted', { name: profile.name }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteProfile = () => {
    if (profile) {
      deleteProfile(profile.id);
      toast.success(t('profiles.profileDeleted', { name: profile.name }));
      void navigate('/profiles');
    }
  };

  const handleDuplicateProfile = () => {
    if (profile) {
      createProfile({
        name: `${profile.name} (${t('common.copy')})`,
        description: profile.description,
        directories: [...profile.directories],
        policyPreset: profile.policyPreset,
        customPolicy: profile.customPolicy,
        enabled: profile.enabled,
      });
      toast.success(t('profiles.profileDuplicated', { name: profile.name }));
    }
  };

  const handleTogglePin = () => {
    if (profile) {
      toggleProfilePin(profile.id);
      toast.success(
        profile.pinned
          ? t('profiles.unpinned', { name: profile.name })
          : t('profiles.pinned', { name: profile.name })
      );
    }
  };

  const handleEditPolicy = () => {
    if (profile && profile.directories.length > 0) {
      setPolicyEditTarget({ path: profile.directories[0] });
    }
  };

  // Calculate profile-wide stats
  const profileStats = useMemo(() => {
    if (!profile) return { totalSnapshots: 0, totalSize: 0 };
    let totalSnapshots = 0;
    let totalSize = 0;
    for (const dir of profile.directories) {
      const stats = getDirectoryStats(dir);
      totalSnapshots += stats.snapshotCount;
      totalSize += stats.totalSize;
    }
    return { totalSnapshots, totalSize };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, storeSnapshots]);

  if (!profile) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('profiles.profileNotFound')}</AlertDescription>
        </Alert>
        <Button onClick={() => void navigate('/profiles')}>{t('profiles.backToProfiles')}</Button>
      </div>
    );
  }

  const breadcrumbs: BreadcrumbItemType[] = [
    { label: t('nav.profiles'), path: '/profiles' },
    { label: profile.name },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile.name}
        subtitle={profile.description}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => void handleBackupAll()}>
              <Play className="h-4 w-4 mr-2" />
              {t('profiles.backupAll')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicateProfile}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('profiles.duplicate')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleTogglePin}>
                  {profile.pinned ? (
                    <>
                      <PinOff className="h-4 w-4 mr-2" />
                      {t('profiles.unpin')}
                    </>
                  ) : (
                    <>
                      <Pin className="h-4 w-4 mr-2" />
                      {t('profiles.pin')}
                    </>
                  )}
                </DropdownMenuItem>
                {profile.policyPreset === 'CUSTOM' && (
                  <DropdownMenuItem onClick={handleEditPolicy}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    {t('profiles.editPolicy')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Profile Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profile.directories.length}</p>
                <p className="text-sm text-muted-foreground">{t('profiles.directories')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FolderArchive className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profileStats.totalSnapshots}</p>
                <p className="text-sm text-muted-foreground">{t('snapshots.totalSnapshots')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <HardDrive className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatBytes(profileStats.totalSize, 1, byteFormat)}
                </p>
                <p className="text-sm text-muted-foreground">{t('snapshots.totalSize')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {snapshotsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{snapshotsError}</AlertDescription>
        </Alert>
      )}

      {/* Directory Cards */}
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

      {/* Policy Edit Dialog */}
      {policyEditTarget && (
        <PolicyEditDialog
          open={!!policyEditTarget}
          onOpenChange={(open) => !open && setPolicyEditTarget(null)}
          target={policyEditTarget}
          onSave={() => setPolicyEditTarget(null)}
        />
      )}

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
