/**
 * Unified Snapshots page - Shows all backup sources (profiles + individual paths)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useKopiaStore } from '@/stores/kopia';
import { useProfilesStore } from '@/stores/profiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FolderArchive,
  RefreshCw,
  Plus,
  Search,
  Clock,
  HardDrive,
  Info,
  ChevronRight,
  FolderTree,
  Folder,
  PlayCircle,
  Calendar,
} from 'lucide-react';
import { formatBytes, formatDistanceToNow } from '@/lib/utils';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia/errors';
import { ProfileFormDialog } from '@/components/kopia/profiles/ProfileFormDialog';

export function Snapshots() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const profiles = useProfilesStore((state) => state.profiles);
  const sourcesResponse = useKopiaStore((state) => state.sourcesResponse);
  const sources = sourcesResponse?.sources || [];
  const snapshots = useKopiaStore((state) => state.snapshots);
  const isSourcesLoading = useKopiaStore((state) => state.isSnapshotsLoading);
  const refreshSources = useKopiaStore((state) => state.refreshSources);
  const refreshSnapshots = useKopiaStore((state) => state.refreshSnapshots);
  const createSnapshot = useKopiaStore((state) => state.createSnapshot);

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profiles' | 'sources'>('profiles');
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  useEffect(() => {
    void refreshSources();
    void refreshSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshSources(), refreshSnapshots()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSnapshotNow = async (path: string) => {
    try {
      await createSnapshot(path, true);
      toast.success(t('snapshots.snapshotStarted'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Get snapshot count for a path
  const getSnapshotCount = (path: string): number => {
    return snapshots.filter((s) => s.source?.path === path).length;
  };

  // Get last snapshot time for a path
  const getLastSnapshotTime = (path: string): string | null => {
    const pathSnapshots = snapshots
      .filter((s) => s.source?.path === path)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return pathSnapshots[0]?.startTime || null;
  };

  // Filter profiles
  const filteredProfiles = profiles.filter((profile) => {
    if (!searchQuery) return true;
    return (
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.directories.some((dir) => dir.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Filter sources (exclude paths that are in profiles)
  const profilePaths = profiles.flatMap((p) => p.directories);
  const individualSources = sources.filter((source: { source: { path?: string } }) => {
    return !profilePaths.includes(source.source.path || '');
  });

  const filteredSources = individualSources.filter(
    (source: { source: { path?: string; userName?: string; host?: string } }) => {
      if (!searchQuery) return true;
      const path = source.source.path || '';
      const userName = source.source.userName || '';
      const host = source.source.host || '';
      return (
        path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        host.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  );

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<
      string,
      { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }
    > = {
      IDLE: { variant: 'secondary', label: t('snapshots.idle') },
      PENDING: { variant: 'default', label: t('snapshots.pending') },
      UPLOADING: { variant: 'default', label: t('snapshots.uploading') },
      PAUSED: { variant: 'outline', label: t('snapshots.paused') },
      FAILED: { variant: 'destructive', label: t('snapshots.failed') },
    };
    const config = variants[status] || variants.IDLE;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('snapshots.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('snapshots.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsProfileDialogOpen(true)}>
            <FolderTree className="h-4 w-4 mr-2" />
            {t('profiles.createProfile')}
          </Button>
          <Button size="sm" onClick={() => void navigate('/snapshots/create')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('snapshots.newSnapshot')}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('snapshots.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="profiles">
            {t('snapshots.profiles')} ({filteredProfiles.length})
          </TabsTrigger>
          <TabsTrigger value="sources">
            {t('snapshots.individualSources')} ({filteredSources.length})
          </TabsTrigger>
        </TabsList>

        {isSourcesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <>
            {/* Profiles Tab */}
            <TabsContent value="profiles" className="space-y-3">
              {filteredProfiles.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>{t('snapshots.noProfilesFound')}</AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProfiles.map((profile) => {
                    const totalSnapshots = profile.directories.reduce(
                      (sum, dir) => sum + getSnapshotCount(dir),
                      0
                    );
                    const lastSnapshot = profile.directories
                      .map(getLastSnapshotTime)
                      .filter((t): t is string => t !== null)
                      .sort()
                      .reverse()[0];

                    return (
                      <Card
                        key={profile.id}
                        className="hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => void navigate(`/snapshots/${profile.id}/history`)}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <FolderTree className="h-4 w-4 text-primary" />
                              <span className="truncate">{profile.name}</span>
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {profile.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {profile.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Folder className="h-3 w-3" />
                              {profile.directories.length}
                            </span>
                            <span className="flex items-center gap-1">
                              <FolderArchive className="h-3 w-3" />
                              {totalSnapshots}
                            </span>
                          </div>
                          {lastSnapshot && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(lastSnapshot))}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Sources Tab */}
            <TabsContent value="sources" className="space-y-3">
              {filteredSources.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>{t('snapshots.noSourcesFound')}</AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredSources.map((source) => {
                    const snapshotCount = getSnapshotCount(source.source.path || '');
                    return (
                      <Card
                        key={source.source.path}
                        className="hover:bg-accent/50 transition-colors"
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span className="flex items-center gap-2 min-w-0">
                              <Folder className="h-4 w-4 text-primary shrink-0" />
                              <span className="truncate">{source.source.path}</span>
                            </span>
                            <StatusBadge status={source.status} />
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FolderArchive className="h-3 w-3" />
                              {snapshotCount} {t('snapshots.snapshots')}
                            </span>
                            {source.lastSnapshot && (
                              <span className="flex items-center gap-1">
                                <HardDrive className="h-3 w-3" />
                                {formatBytes(source.lastSnapshot.stats?.totalSize || 0)}
                              </span>
                            )}
                          </div>
                          {source.lastSnapshot && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(source.lastSnapshot.startTime))}
                            </p>
                          )}
                          {source.nextSnapshotTime && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {t('snapshots.next')}:{' '}
                              {formatDistanceToNow(new Date(source.nextSnapshotTime))}
                            </p>
                          )}
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() =>
                                void navigate(
                                  `/snapshots/history?userName=${source.source.userName}&host=${source.source.host}&path=${encodeURIComponent(source.source.path || '')}`
                                )
                              }
                            >
                              {t('snapshots.viewHistory')}
                            </Button>
                            {source.status === 'IDLE' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => void handleSnapshotNow(source.source.path || '')}
                              >
                                <PlayCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Profile Creation Dialog */}
      <ProfileFormDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
        profile={null}
      />
    </div>
  );
}
