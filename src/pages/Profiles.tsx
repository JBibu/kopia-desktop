/**
 * Profiles - Main backup management page (profile-centric)
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useSnapshots } from '@/hooks';
import { useProfilesStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { FolderArchive, RefreshCw, Plus, Search, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia';
import { ProfileFormDialog, ProfilesTable, ProfileCard } from '@/components/kopia/profiles';
import { PolicyEditDialog } from '@/components/kopia/policy';
import { PageHeader, type BreadcrumbItemType } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import type { BackupProfile, PolicyTarget } from '@/lib/kopia';

type ViewMode = 'grid' | 'list';

export function Profiles() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const profiles = useProfilesStore((state) => state.profiles);
  const toggleProfilePin = useProfilesStore((state) => state.togglePin);
  const createProfile = useProfilesStore((state) => state.createProfile);
  const deleteProfile = useProfilesStore((state) => state.deleteProfile);

  const {
    snapshots,
    isLoading: isSourcesLoading,
    refresh: refreshSnapshots,
    refreshSources,
    createSnapshot,
  } = useSnapshots();

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BackupProfile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<BackupProfile | null>(null);
  const [policyEditTarget, setPolicyEditTarget] = useState<PolicyTarget | null>(null);

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

  // Profile handlers
  const handleEditProfile = (profile: BackupProfile) => {
    setEditingProfile(profile);
    setIsProfileDialogOpen(true);
  };

  const handleDeleteProfile = (profile: BackupProfile) => {
    setDeletingProfile(profile);
  };

  const handleConfirmDelete = () => {
    if (deletingProfile) {
      deleteProfile(deletingProfile.id);
      toast.success(t('profiles.profileDeleted', { name: deletingProfile.name }));
      setDeletingProfile(null);
    }
  };

  const handleDuplicateProfile = (profile: BackupProfile) => {
    createProfile({
      name: `${profile.name} (${t('common.copy')})`,
      description: profile.description,
      directories: [...profile.directories],
      policyPreset: profile.policyPreset,
      customPolicy: profile.customPolicy,
      enabled: profile.enabled,
    });
    toast.success(t('profiles.profileDuplicated', { name: profile.name }));
  };

  const handleBackupProfile = async (profile: BackupProfile) => {
    try {
      for (const dir of profile.directories) {
        await createSnapshot(dir, true);
      }
      toast.success(t('profiles.backupAllStarted', { name: profile.name }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleProfileDialogClose = (open: boolean) => {
    setIsProfileDialogOpen(open);
    if (!open) {
      setEditingProfile(null);
    }
  };

  const handleEditCustomPolicy = (profile: BackupProfile) => {
    // For custom policy, we edit the global policy or create a path-specific one
    // For now, open policy editor for first directory in profile
    if (profile.directories.length > 0) {
      setPolicyEditTarget({ path: profile.directories[0] });
    }
  };

  // Sort and filter profiles (pinned first, then by order, then by creation date)
  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [profiles]);

  const filteredProfiles = sortedProfiles.filter((profile) => {
    if (!searchQuery) return true;
    return (
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.directories.some((dir) => dir.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const breadcrumbs: BreadcrumbItemType[] = [{ label: t('nav.profiles'), path: '/profiles' }];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('profiles.title')}
        subtitle={t('profiles.subtitle')}
        breadcrumbs={breadcrumbs}
        actions={
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
            <Button
              size="sm"
              onClick={() => {
                setEditingProfile(null);
                setIsProfileDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('profiles.createProfile')}
            </Button>
          </div>
        }
      />

      {/* Search and View Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('profiles.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isSourcesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filteredProfiles.length === 0 ? (
        <EmptyState
          icon={FolderArchive}
          title={searchQuery ? t('profiles.noResultsFound') : t('profiles.noProfilesFound')}
          description={
            searchQuery ? t('profiles.tryDifferentSearch') : t('profiles.createFirstProfile')
          }
          action={
            !searchQuery
              ? {
                  label: t('profiles.createProfile'),
                  onClick: () => {
                    setEditingProfile(null);
                    setIsProfileDialogOpen(true);
                  },
                  icon: Plus,
                }
              : undefined
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProfiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              snapshots={snapshots}
              onClick={() => void navigate(`/profiles/${profile.id}`)}
              onEdit={() => handleEditProfile(profile)}
              onDelete={() => handleDeleteProfile(profile)}
              onDuplicate={() => handleDuplicateProfile(profile)}
              onBackupNow={() => void handleBackupProfile(profile)}
              onTogglePin={() => toggleProfilePin(profile.id)}
              onEditPolicy={
                profile.policyPreset === 'CUSTOM'
                  ? () => handleEditCustomPolicy(profile)
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <ProfilesTable
          profiles={filteredProfiles}
          snapshots={snapshots}
          onEdit={handleEditProfile}
          onDelete={handleDeleteProfile}
          onDuplicate={handleDuplicateProfile}
          onBackupNow={(profile) => void handleBackupProfile(profile)}
          onTogglePin={toggleProfilePin}
          onRowClick={(profile) => void navigate(`/profiles/${profile.id}`)}
          onEditPolicy={handleEditCustomPolicy}
        />
      )}

      {/* Profile Create/Edit Dialog */}
      <ProfileFormDialog
        open={isProfileDialogOpen}
        onOpenChange={handleProfileDialogClose}
        profile={editingProfile || undefined}
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
      <AlertDialog
        open={!!deletingProfile}
        onOpenChange={(open: boolean) => !open && setDeletingProfile(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('profiles.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('profiles.deleteConfirmMessage', { name: deletingProfile?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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
