import { useState, useEffect } from 'react';
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
import { SeverityLabels, NotificationSeverities } from '@/lib/kopia/types';
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
      setValidationError('Profile name is required');
      return;
    }

    try {
      setSaving(true);
      await createNotificationProfile(profile);
      toast.success(isNew ? 'Notification profile created' : 'Notification profile updated');
      onClose(true);
    } catch (error) {
      toast.error('Failed to save notification profile', {
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
      toast.success('Test notification sent', {
        description: 'Please check your notification destination to verify receipt.',
      });
    } catch (error) {
      toast.error('Failed to send test notification', {
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
    label: SeverityLabels[value],
  }));

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? 'New Notification Profile' : 'Edit Notification Profile'}
          </DialogTitle>
          <DialogDescription>
            Configure how and when Kopia should send notifications for this profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Profile Name */}
          <div className="space-y-2">
            <Label htmlFor="profile-name" className="required">
              Profile Name
            </Label>
            <Input
              id="profile-name"
              value={profile.profile}
              onChange={(e) => setProfile({ ...profile, profile: e.target.value })}
              placeholder="Enter profile name"
              disabled={!isNew}
            />
            <p className="text-sm text-muted-foreground">
              Unique name for this notification profile
            </p>
          </div>

          {/* Minimum Severity */}
          <div className="space-y-2">
            <Label htmlFor="min-severity" className="required">
              Minimum Severity
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
              Minimum severity required to trigger notifications using this profile
            </p>
          </div>

          {/* Method-specific configuration */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-4">
              {profile.method.type === 'email' && 'Email Configuration'}
              {profile.method.type === 'pushover' && 'Pushover Configuration'}
              {profile.method.type === 'webhook' && 'Webhook Configuration'}
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
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => void handleTest()}
            disabled={saving || testing}
          >
            {testing ? 'Sending...' : 'Send Test Notification'}
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || testing}>
            {saving ? 'Saving...' : isNew ? 'Create Profile' : 'Update Profile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
