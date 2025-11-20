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
  Pin,
  GripVertical,
} from 'lucide-react';
import { formatBytes, formatDistanceToNow } from '@/lib/utils';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia/errors';
import { usePreferencesStore } from '@/stores/preferences';
import { ProfileFormDialog } from '@/components/kopia/profiles/ProfileFormDialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BackupProfile } from '@/lib/kopia/types';

export function Snapshots() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const byteFormat = usePreferencesStore((state) => state.byteFormat);
  const sourcePreferences = usePreferencesStore((state) => state.sourcePreferences);
  const toggleSourcePin = usePreferencesStore((state) => state.toggleSourcePin);
  const reorderSources = usePreferencesStore((state) => state.reorderSources);

  const profiles = useProfilesStore((state) => state.profiles);
  const toggleProfilePin = useProfilesStore((state) => state.togglePin);
  const reorderProfiles = useProfilesStore((state) => state.reorderProfiles);

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
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);

  // Drag and drop sensors with activation constraint
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Helper: Get profile snapshot stats
  const getProfileStats = (profile: BackupProfile) => {
    const totalSnapshots = profile.directories.reduce((sum, dir) => sum + getSnapshotCount(dir), 0);
    const lastSnapshot = profile.directories
      .map(getLastSnapshotTime)
      .filter((t): t is string => t !== null)
      .sort()
      .reverse()[0];
    return { totalSnapshots, lastSnapshot };
  };

  // Helper: Generate source ID
  const getSourceId = (source: { source: { userName?: string; host?: string; path?: string } }) =>
    `${source.source.userName}@${source.source.host}:${source.source.path}`;

  // Sort and filter profiles (pinned first, then by order, then by creation date)
  const sortedProfiles = [...profiles].sort((a, b) => {
    // Pinned items first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    // Then by order
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;

    // Finally by creation date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filteredProfiles = sortedProfiles.filter((profile) => {
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

  // Sort individual sources (pinned first, then by order)
  const sortedSources = [...individualSources].sort((a, b) => {
    const aId = getSourceId(a);
    const bId = getSourceId(b);
    const aPref = sourcePreferences[aId];
    const bPref = sourcePreferences[bId];

    // Pinned items first
    if (aPref?.pinned && !bPref?.pinned) return -1;
    if (!aPref?.pinned && bPref?.pinned) return 1;

    // Then by order
    if (aPref?.order !== undefined && bPref?.order !== undefined) {
      return aPref.order - bPref.order;
    }
    if (aPref?.order !== undefined) return -1;
    if (bPref?.order !== undefined) return 1;

    return 0;
  });

  const filteredSources = sortedSources.filter(
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

  // Drag start handlers
  const handleProfileDragStart = (event: DragStartEvent) => {
    setActiveProfileId(event.active.id as string);
  };

  const handleSourceDragStart = (event: DragStartEvent) => {
    setActiveSourceId(event.active.id as string);
  };

  // Drag end handlers
  const handleProfileDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProfileId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = filteredProfiles.findIndex((p) => p.id === active.id);
    const newIndex = filteredProfiles.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...filteredProfiles];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderProfiles(reordered.map((p) => p.id));
  };

  const handleSourceDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSourceId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = filteredSources.findIndex((s) => getSourceId(s) === active.id);
    const newIndex = filteredSources.findIndex((s) => getSourceId(s) === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...filteredSources];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderSources(reordered.map(getSourceId));
  };

  // Get active dragging items
  const activeProfile = filteredProfiles.find((p) => p.id === activeProfileId);
  const activeSource = filteredSources.find((s) => getSourceId(s) === activeSourceId);

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

  // Static Profile Card (for drag overlay)
  const ProfileCard = ({ profile }: { profile: BackupProfile }) => {
    const { totalSnapshots, lastSnapshot } = getProfileStats(profile);

    return (
      <Card className="hover:bg-accent/50 transition-colors relative shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <FolderTree className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{profile.name}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Pin className={`h-3.5 w-3.5 ${profile.pinned ? 'fill-current text-primary' : ''}`} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {profile.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{profile.description}</p>
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
  };

  // Static Source Card (for drag overlay)
  const SourceCard = ({ source }: { source: (typeof filteredSources)[0] }) => {
    const sourceId = getSourceId(source);
    const snapshotCount = getSnapshotCount(source.source.path || '');
    const isPinned = sourcePreferences[sourceId]?.pinned;

    return (
      <Card className="hover:bg-accent/50 transition-colors shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2 min-w-0">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <Folder className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{source.source.path}</span>
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-current text-primary' : ''}`} />
              <StatusBadge status={source.status} />
            </div>
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
                {formatBytes(source.lastSnapshot.stats?.totalSize || 0, 2, byteFormat)}
              </span>
            )}
          </div>
          {source.lastSnapshot && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(source.lastSnapshot.startTime))}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  // Sortable Profile Card
  const SortableProfileCard = ({ profile }: { profile: (typeof profiles)[0] }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: profile.id,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
      visibility: isDragging ? ('hidden' as const) : ('visible' as const),
    };

    const { totalSnapshots, lastSnapshot } = getProfileStats(profile);

    return (
      <div ref={setNodeRef} style={style}>
        <Card className="hover:bg-accent/50 transition-colors relative">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing"
                  role="button"
                  aria-label={t('common.dragToReorder')}
                  tabIndex={0}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <FolderTree className="h-4 w-4 text-primary shrink-0" />
                <span
                  className="truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={() => void navigate(`/snapshots/${profile.id}/history`)}
                >
                  {profile.name}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleProfilePin(profile.id);
                  }}
                  aria-label={profile.pinned ? t('common.unpin') : t('common.pin')}
                  title={profile.pinned ? t('common.unpin') : t('common.pin')}
                >
                  <Pin
                    className={`h-3.5 w-3.5 ${profile.pinned ? 'fill-current text-primary' : ''}`}
                  />
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{profile.description}</p>
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
      </div>
    );
  };

  // Sortable Source Card
  const SortableSourceCard = ({ source }: { source: (typeof filteredSources)[0] }) => {
    const sourceId = getSourceId(source);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: sourceId,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
      visibility: isDragging ? ('hidden' as const) : ('visible' as const),
    };

    const snapshotCount = getSnapshotCount(source.source.path || '');
    const isPinned = sourcePreferences[sourceId]?.pinned;

    return (
      <div ref={setNodeRef} style={style}>
        <Card className="hover:bg-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2 min-w-0">
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing"
                  role="button"
                  aria-label={t('common.dragToReorder')}
                  tabIndex={0}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <Folder className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{source.source.path}</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSourcePin(sourceId);
                  }}
                  aria-label={isPinned ? t('common.unpin') : t('common.pin')}
                  title={isPinned ? t('common.unpin') : t('common.pin')}
                >
                  <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-current text-primary' : ''}`} />
                </Button>
                <StatusBadge status={source.status} />
              </div>
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
                  {formatBytes(source.lastSnapshot.stats?.totalSize || 0, 2, byteFormat)}
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
                {t('snapshots.next')}: {formatDistanceToNow(new Date(source.nextSnapshotTime))}
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
      </div>
    );
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleProfileDragStart}
                  onDragEnd={handleProfileDragEnd}
                >
                  <SortableContext
                    items={filteredProfiles.map((p) => p.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredProfiles.map((profile) => (
                        <SortableProfileCard key={profile.id} profile={profile} />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeProfile ? (
                      <div className="w-[320px]">
                        <ProfileCard profile={activeProfile} />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleSourceDragStart}
                  onDragEnd={handleSourceDragEnd}
                >
                  <SortableContext
                    items={filteredSources.map(getSourceId)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredSources.map((source) => (
                        <SortableSourceCard key={getSourceId(source)} source={source} />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeSource ? (
                      <div className="w-[320px]">
                        <SourceCard source={activeSource} />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
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
