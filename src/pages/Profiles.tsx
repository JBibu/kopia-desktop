/**
 * Backup Profiles page - Manage backup profiles
 *
 * Profiles contain directories to backup with shared policy configuration.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useProfilesStore } from '@/stores/profiles';
import { useKopiaStore } from '@/stores/kopia';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { FolderTree, Plus, Edit, Trash2, Camera, FolderOpen, History } from 'lucide-react';
import type { BackupProfile } from '@/lib/kopia/types';
import { ProfileFormDialog } from '@/components/kopia/profiles/ProfileFormDialog';
import { formatDateTime } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language';
import { toast } from 'sonner';
import { navigateToProfileHistory, navigateToSnapshotCreate } from '@/lib/utils/navigation';

export function Profiles() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const locale = language === 'es' ? 'es-ES' : 'en-US';

  const profiles = useProfilesStore((state) => state.profiles);
  const deleteProfile = useProfilesStore((state) => state.deleteProfile);
  const toggleProfile = useProfilesStore((state) => state.toggleProfile);
  const policies = useKopiaStore((state) => state.policies);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BackupProfile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<BackupProfile | null>(null);

  const handleCreateProfile = () => {
    setEditingProfile(null);
    setIsFormOpen(true);
  };

  const handleEditProfile = (profile: BackupProfile) => {
    setEditingProfile(profile);
    setIsFormOpen(true);
  };

  const handleDeleteProfile = (profile: BackupProfile) => {
    setDeletingProfile(profile);
  };

  const confirmDelete = () => {
    if (deletingProfile) {
      deleteProfile(deletingProfile.id);
      toast.success(t('profiles.profileDeleted', { name: deletingProfile.name }));
      setDeletingProfile(null);
    }
  };

  const handleToggleProfile = (profile: BackupProfile) => {
    toggleProfile(profile.id);
    toast.success(
      profile.enabled
        ? t('profiles.profileDisabled', { name: profile.name })
        : t('profiles.profileEnabled', { name: profile.name })
    );
  };

  const handleCreateSnapshot = (profile: BackupProfile) => {
    navigateToSnapshotCreate(navigate, profile.id);
  };

  const handleViewHistory = (profile: BackupProfile) => {
    if (profile.directories.length === 0) {
      toast.error(t('profiles.noDirectoriesToView'));
      return;
    }

    navigateToProfileHistory(navigate, profile.id);
  };

  const getPolicyName = (policyId?: string): string | null => {
    if (!policyId) return null;
    const policy = policies.find((p) => p.id === policyId);
    if (!policy) return null;
    const { userName, host, path } = policy.target;
    return `${userName || '*'}@${host || '*'}:${path || '*'}`;
  };

  const totalDirectories = profiles.reduce((sum, p) => sum + p.directories.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('profiles.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('profiles.subtitle')}</p>
        </div>
        <Button size="sm" onClick={handleCreateProfile}>
          <Plus className="h-4 w-4 mr-2" />
          {t('profiles.createProfile')}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-muted-foreground" />
              {t('profiles.totalProfiles')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profiles.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-muted-foreground" />
              {t('profiles.enabledProfiles')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profiles.filter((p) => p.enabled).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              {t('profiles.totalDirectories')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDirectories}</div>
          </CardContent>
        </Card>
      </div>

      {/* Profiles List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('profiles.profilesList')}</CardTitle>
          <CardDescription>
            {t('profiles.profilesFound', { count: profiles.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('profiles.noProfilesFound')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('profiles.createFirstProfile')}
              </p>
              <Button onClick={handleCreateProfile}>
                <Plus className="h-4 w-4 mr-2" />
                {t('profiles.createProfile')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('profiles.name')}</TableHead>
                  <TableHead>{t('profiles.directories')}</TableHead>
                  <TableHead>{t('profiles.policy')}</TableHead>
                  <TableHead>{t('profiles.status')}</TableHead>
                  <TableHead>{t('profiles.lastUpdated')}</TableHead>
                  <TableHead className="w-[150px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{profile.name}</div>
                        {profile.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {profile.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {profile.directories.length}{' '}
                        {profile.directories.length === 1
                          ? t('profiles.directoriesCount', { count: 1 })
                          : t('profiles.directoriesCount', { count: profile.directories.length })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {profile.policyId ? (
                        <span className="text-xs font-mono text-muted-foreground">
                          {getPolicyName(profile.policyId) || t('profiles.unknownPolicy')}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t('profiles.noPolicy')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={profile.enabled}
                          onCheckedChange={() => handleToggleProfile(profile)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {profile.enabled ? t('profiles.enabled') : t('profiles.disabled')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(profile.updatedAt, locale)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHistory(profile)}
                          disabled={profile.directories.length === 0}
                          title={t('profiles.viewHistory')}
                          aria-label={t('profiles.viewHistory')}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCreateSnapshot(profile)}
                          disabled={!profile.enabled || profile.directories.length === 0}
                          title={t('profiles.createSnapshot')}
                          aria-label={t('profiles.createSnapshot')}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProfile(profile)}
                          title={t('common.edit')}
                          aria-label={t('common.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProfile(profile)}
                          title={t('common.delete')}
                          aria-label={t('common.delete')}
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

      {/* Profile Form Dialog */}
      <ProfileFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} profile={editingProfile} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProfile} onOpenChange={() => setDeletingProfile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('profiles.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('profiles.deleteConfirmMessage', { name: deletingProfile?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
