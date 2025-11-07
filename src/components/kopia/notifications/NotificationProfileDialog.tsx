import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  createNotificationProfile,
  testNotificationProfile,
  getErrorMessage,
} from '@/lib/kopia/client';
import type { NotificationProfile, NotificationSeverity } from '@/lib/kopia/types';
import { getSeverityLabel, NotificationSeverities } from '@/lib/kopia/types';
import { EmailNotificationForm } from './EmailNotificationForm';
import { PushoverNotificationForm } from './PushoverNotificationForm';
import { WebhookNotificationForm } from './WebhookNotificationForm';

interface NotificationProfileDialogProps {
  open: boolean;
  onClose: (success: boolean) => void;
  profile: NotificationProfile;
  isNew: boolean;
}

export function NotificationProfileDialog({
  open,
  onClose,
  profile: initialProfile,
  isNew,
}: NotificationProfileDialogProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<NotificationProfile>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(initialProfile);
    setValidationError(null);
  }, [initialProfile, open]);

  const handleSave = async () => {
    setValidationError(null);

    // Validate profile name
    if (!profile.profile.trim()) {
      setValidationError(t('preferences.notificationProfiles.profileNameRequired'));
      return;
    }

    try {
      setSaving(true);
      await createNotificationProfile(profile);
      toast.success(
        isNew
          ? t('preferences.notificationProfiles.created')
          : t('preferences.notificationProfiles.updated')
      );
      onClose(true);
    } catch (error) {
      toast.error(t('preferences.notificationProfiles.saveFailed'), {
        description: getErrorMessage(error),
      });
      setValidationError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setValidationError(null);

    try {
      setTesting(true);
      await testNotificationProfile(profile);
      toast.success(t('preferences.notificationProfiles.testSent'), {
        description: t('preferences.notificationProfiles.testSentDesc'),
      });
    } catch (error) {
      toast.error(t('preferences.notificationProfiles.testFailed'), {
        description: getErrorMessage(error),
      });
      setValidationError(getErrorMessage(error));
    } finally {
      setTesting(false);
    }
  };

  const updateConfig = (config: Record<string, unknown>) => {
    setProfile({
      ...profile,
      method: {
        ...profile.method,
        config,
      },
    });
  };

  const severityOptions = Object.entries(NotificationSeverities).map(([_key, value]) => ({
    value: value.toString(),
    label: getSeverityLabel(value),
  }));

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew
              ? t('preferences.notificationProfiles.dialog.newTitle')
              : t('preferences.notificationProfiles.dialog.editTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('preferences.notificationProfiles.dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Profile Name */}
          <div className="space-y-2">
            <Label htmlFor="profile-name" className="required">
              {t('preferences.notificationProfiles.dialog.profileName')}
            </Label>
            <Input
              id="profile-name"
              value={profile.profile}
              onChange={(e) => setProfile({ ...profile, profile: e.target.value })}
              placeholder={t('preferences.notificationProfiles.dialog.profileNamePlaceholder')}
              disabled={!isNew}
            />
            <p className="text-sm text-muted-foreground">
              {t('preferences.notificationProfiles.dialog.profileNameHelp')}
            </p>
          </div>

          {/* Minimum Severity */}
          <div className="space-y-2">
            <Label htmlFor="min-severity" className="required">
              {t('preferences.notificationProfiles.dialog.minimumSeverity')}
            </Label>
            <Select
              value={profile.minSeverity.toString()}
              onValueChange={(value) =>
                setProfile({ ...profile, minSeverity: parseInt(value) as NotificationSeverity })
              }
            >
              <SelectTrigger id="min-severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {severityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {t('preferences.notificationProfiles.dialog.minimumSeverityHelp')}
            </p>
          </div>

          {/* Method-specific configuration */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-4">
              {profile.method.type === 'email' &&
                t('preferences.notificationProfiles.dialog.emailConfiguration')}
              {profile.method.type === 'pushover' &&
                t('preferences.notificationProfiles.dialog.pushoverConfiguration')}
              {profile.method.type === 'webhook' &&
                t('preferences.notificationProfiles.dialog.webhookConfiguration')}
            </h3>

            {profile.method.type === 'email' && (
              <EmailNotificationForm
                config={profile.method.config as Record<string, unknown>}
                onChange={updateConfig}
              />
            )}

            {profile.method.type === 'pushover' && (
              <PushoverNotificationForm
                config={profile.method.config as Record<string, unknown>}
                onChange={updateConfig}
              />
            )}

            {profile.method.type === 'webhook' && (
              <WebhookNotificationForm
                config={profile.method.config as Record<string, unknown>}
                onChange={updateConfig}
              />
            )}
          </div>

          {validationError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
              {validationError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={saving || testing}>
            {t('preferences.notificationProfiles.dialog.cancel')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void handleTest()}
            disabled={saving || testing}
          >
            {testing
              ? t('preferences.notificationProfiles.dialog.sending')
              : t('preferences.notificationProfiles.dialog.sendTest')}
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || testing}>
            {saving
              ? t('preferences.notificationProfiles.dialog.saving')
              : isNew
                ? t('preferences.notificationProfiles.dialog.createProfile')
                : t('preferences.notificationProfiles.dialog.updateProfile')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
