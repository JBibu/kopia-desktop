import { useState, useEffect } from 'react';
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
  getErrorMessage,
} from '@/lib/kopia/client';
import type { NotificationProfile } from '@/lib/kopia/types';
import { SeverityLabels } from '@/lib/kopia/types';
import { NotificationProfileDialog } from './NotificationProfileDialog';

export function NotificationProfiles() {
  const [profiles, setProfiles] = useState<NotificationProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<NotificationProfile | null>(null);
  const [isNewProfile, setIsNewProfile] = useState(false);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await listNotificationProfiles();
      setProfiles(data);
    } catch (error) {
      toast.error('Failed to load notification profiles', {
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfiles();
  }, []);

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
    if (!confirm(`Are you sure you want to delete the profile "${profileName}"?`)) {
      return;
    }

    try {
      await deleteNotificationProfile(profileName);
      toast.success('Notification profile deleted');
      await loadProfiles();
    } catch (error) {
      toast.error('Failed to delete notification profile', {
        description: getErrorMessage(error),
      });
    }
  };

  const handleTest = async (profile: NotificationProfile) => {
    try {
      await testNotificationProfile(profile);
      toast.success('Test notification sent', {
        description: 'Please check your notification destination to verify receipt.',
      });
    } catch (error) {
      toast.error('Failed to send test notification', {
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
      email: 'E-mail',
      pushover: 'Pushover',
      webhook: 'Webhook',
    };
    return labels[methodType] || methodType;
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading notification profiles...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        {profiles.length === 0 ? (
          <div className="text-center py-8">
            <Badge variant="outline" className="mb-4">
              Important
            </Badge>
            <p className="text-sm text-muted-foreground mb-4">
              You don't have any notification profiles defined.
              <br />
              Click the button below to add a new profile to receive notifications from Kopia.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profile</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Minimum Severity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.profile}>
                  <TableCell className="font-medium">{profile.profile}</TableCell>
                  <TableCell>{getMethodLabel(profile.method.type)}</TableCell>
                  <TableCell>{SeverityLabels[profile.minSeverity]}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(profile)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDuplicate(profile)}>
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void handleTest(profile)}>
                      <Send className="h-4 w-4 mr-1" />
                      Test
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
            Add Email Profile
          </Button>
          <Button onClick={() => handleCreateNew('pushover')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Pushover Profile
          </Button>
          <Button onClick={() => handleCreateNew('webhook')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Webhook Profile
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
