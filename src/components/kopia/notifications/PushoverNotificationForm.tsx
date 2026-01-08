import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PushoverConfig } from '@/lib/kopia/types';
import { useProviderConfig } from '@/hooks/useProviderConfig';
import { useTranslation } from 'react-i18next';

interface PushoverNotificationFormProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function PushoverNotificationForm({ config, onChange }: PushoverNotificationFormProps) {
  const { t } = useTranslation();
  const pushoverConfig = config as Partial<PushoverConfig>;
  const { handleChange: updateField } = useProviderConfig<PushoverConfig>(pushoverConfig, onChange);

  return (
    <div className="space-y-4">
      {/* App Token */}
      <div className="space-y-2">
        <Label htmlFor="app-token" className="required">
          {t('preferences.notificationProfiles.pushover.appToken')}
        </Label>
        <Input
          id="app-token"
          value={pushoverConfig.appToken || ''}
          onChange={(e) => updateField('appToken', e.target.value)}
          placeholder={t('preferences.notificationProfiles.pushover.appToken')}
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          {t('preferences.notificationProfiles.pushover.appTokenHelp')}
        </p>
      </div>

      {/* User Key */}
      <div className="space-y-2">
        <Label htmlFor="user-key" className="required">
          {t('preferences.notificationProfiles.pushover.userKey')}
        </Label>
        <Input
          id="user-key"
          value={pushoverConfig.userKey || ''}
          onChange={(e) => updateField('userKey', e.target.value)}
          placeholder={t('preferences.notificationProfiles.pushover.userKey')}
        />
        <p className="text-xs text-muted-foreground">
          {t('preferences.notificationProfiles.pushover.userKeyHelp')}
        </p>
      </div>

      {/* Format */}
      <div className="space-y-2">
        <Label htmlFor="format">{t('preferences.notificationProfiles.pushover.format')}</Label>
        <Select
          value={pushoverConfig.format || 'txt'}
          onValueChange={(value) => updateField('format', value as 'txt' | 'html')}
        >
          <SelectTrigger id="format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="txt">
              {t('preferences.notificationProfiles.pushover.plainText')}
            </SelectItem>
            <SelectItem value="html">
              {t('preferences.notificationProfiles.pushover.html')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Help Information */}
      <div className="border-t pt-4">
        <p className="text-sm text-muted-foreground">
          <strong>{t('preferences.notificationProfiles.pushover.gettingStarted')}</strong>
        </p>
        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1 mt-2">
          <li>{t('preferences.notificationProfiles.pushover.step1')}</li>
          <li>{t('preferences.notificationProfiles.pushover.step2')}</li>
          <li>{t('preferences.notificationProfiles.pushover.step3')}</li>
          <li>{t('preferences.notificationProfiles.pushover.step4')}</li>
        </ol>
      </div>
    </div>
  );
}
