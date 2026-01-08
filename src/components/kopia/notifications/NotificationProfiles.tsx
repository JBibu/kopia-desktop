import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Copy, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  listNotificationProfiles,
  deleteNotificationProfile,
  testNotificationProfile,
} from '@/lib/kopia';
import { getErrorMessage } from '@/lib/kopia';
import type { NotificationProfile } from '@/lib/kopia';
import { getSeverityLabel } from '@/lib/kopia';
import { NotificationProfileDialog } from './NotificationProfileDialog';
import { useCurrentRepoId } from '@/hooks';

export function NotificationProfiles() {
  const { t } = useTranslation();
  const currentRepoId = useCurrentRepoId();
  const [profiles, setProfiles] = useState<NotificationProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<NotificationProfile | null>(null);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const hasLoadedRef = useRef(false);

  const loadProfiles = useCallback(async () => {
    if (!currentRepoId) {
      setProfiles([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listNotificationProfiles(currentRepoId);
      setProfiles(data);
      hasLoadedRef.current = true;
    } catch (error) {
      // Only show toast if this is a reload (not initial mount in strict mode)
      if (hasLoadedRef.current) {
        toast.error(t('preferences.notificationProfiles.loadFailed'), {
          description: getErrorMessage(error),
        });
      }
      hasLoadedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [t, currentRepoId]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const handleCreateNew = (methodType: 'email' | 'pushover' | 'webhook') => {
    const newProfileName = generateProfileName(methodType);
    setEditingProfile({
      profile: newProfileName,
      method: {
        type: methodType,
        config: {},
      },
      minSeverity: 0, // Report
    });
    setIsNewProfile(true);
    setDialogOpen(true);
  };

  const handleEdit = (profile: NotificationProfile) => {
    setEditingProfile(profile);
    setIsNewProfile(false);
    setDialogOpen(true);
  };

  const handleDuplicate = (profile: NotificationProfile) => {
    const newProfileName = generateProfileName(profile.method.type);
    setEditingProfile({
      ...profile,
      profile: newProfileName,
    });
    setIsNewProfile(true);
    setDialogOpen(true);
  };

  const handleDelete = async (profileName: string) => {
    if (!currentRepoId) return;
    if (!confirm(t('preferences.notificationProfiles.confirmDelete', { profileName }))) {
      return;
    }

    try {
      await deleteNotificationProfile(currentRepoId, profileName);
      toast.success(t('preferences.notificationProfiles.deleted'));
      await loadProfiles();
    } catch (error) {
      toast.error(t('preferences.notificationProfiles.deleteFailed'), {
        description: getErrorMessage(error),
      });
    }
  };

  const handleTest = async (profile: NotificationProfile) => {
    if (!currentRepoId) return;
    try {
      await testNotificationProfile(currentRepoId, profile);
      toast.success(t('preferences.notificationProfiles.testSent'), {
        description: t('preferences.notificationProfiles.testSentDesc'),
      });
    } catch (error) {
      toast.error(t('preferences.notificationProfiles.testFailed'), {
        description: getErrorMessage(error),
      });
    }
  };

  const handleDialogClose = (success: boolean) => {
    setDialogOpen(false);
    setEditingProfile(null);
    setIsNewProfile(false);
    if (success) {
      void loadProfiles();
    }
  };

  const generateProfileName = (methodType: string): string => {
    let i = 1;
    while (profiles.some((p) => p.profile === `${methodType}-${i}`)) {
      i++;
    }
    return `${methodType}-${i}`;
  };

  const getMethodLabel = (methodType: string): string => {
    const labels: Record<string, string> = {
      email: t('preferences.notificationProfiles.methods.email'),
      pushover: t('preferences.notificationProfiles.methods.pushover'),
      webhook: t('preferences.notificationProfiles.methods.webhook'),
    };
    return labels[methodType] || methodType;
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        {t('preferences.notificationProfiles.table.loading')}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {profiles.length === 0 ? (
          <div className="text-center py-8">
            <Badge variant="outline" className="mb-4">
              {t('preferences.notificationProfiles.table.important')}
            </Badge>
            <p className="text-sm text-muted-foreground mb-4">
              {t('preferences.notificationProfiles.table.noProfiles')}
              <br />
              {t('preferences.notificationProfiles.table.noProfilesHelp')}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('preferences.notificationProfiles.table.profile')}</TableHead>
                <TableHead>{t('preferences.notificationProfiles.table.method')}</TableHead>
                <TableHead>{t('preferences.notificationProfiles.table.minimumSeverity')}</TableHead>
                <TableHead className="text-right">
                  {t('preferences.notificationProfiles.table.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.profile}>
                  <TableCell className="font-medium">{profile.profile}</TableCell>
                  <TableCell>{getMethodLabel(profile.method.type)}</TableCell>
                  <TableCell>{getSeverityLabel(profile.minSeverity)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(profile)}>
                      {t('common.edit')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDuplicate(profile)}>
                      <Copy className="h-4 w-4 mr-1" />
                      {t('common.duplicate')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void handleTest(profile)}>
                      <Send className="h-4 w-4 mr-1" />
                      {t('common.test')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleDelete(profile.profile)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex gap-2">
          <Button onClick={() => handleCreateNew('email')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('preferences.notificationProfiles.addProfile.email')}
          </Button>
          <Button onClick={() => handleCreateNew('pushover')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('preferences.notificationProfiles.addProfile.pushover')}
          </Button>
          <Button onClick={() => handleCreateNew('webhook')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('preferences.notificationProfiles.addProfile.webhook')}
          </Button>
        </div>
      </div>

      {editingProfile && (
        <NotificationProfileDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          profile={editingProfile}
          isNew={isNewProfile}
        />
      )}
    </>
  );
}
