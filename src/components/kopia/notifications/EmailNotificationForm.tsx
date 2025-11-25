import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EmailConfig } from '@/lib/kopia/types';
import { useTranslation } from 'react-i18next';

interface EmailNotificationFormProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function EmailNotificationForm({ config, onChange }: EmailNotificationFormProps) {
  const { t } = useTranslation();
  const emailConfig = config as Partial<EmailConfig>;

  const updateField = <K extends keyof EmailConfig>(field: K, value: EmailConfig[K]) => {
    onChange({ ...emailConfig, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* SMTP Server & Port */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="smtp-server" className="required">
            {t('preferences.notificationProfiles.email.smtpServer')}
          </Label>
          <Input
            id="smtp-server"
            value={emailConfig.smtpServer || ''}
            onChange={(e) => updateField('smtpServer', e.target.value)}
            placeholder="smtp.gmail.com"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-port" className="required">
            {t('preferences.notificationProfiles.email.smtpPort')}
          </Label>
          <Input
            id="smtp-port"
            type="number"
            value={emailConfig.smtpPort || 587}
            onChange={(e) => updateField('smtpPort', parseInt(e.target.value))}
          />
        </div>
      </div>

      {/* SMTP Authentication */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="smtp-username">
            {t('preferences.notificationProfiles.email.smtpUsername')}
          </Label>
          <Input
            id="smtp-username"
            value={emailConfig.smtpUsername || ''}
            onChange={(e) => updateField('smtpUsername', e.target.value)}
            placeholder={t('preferences.notificationProfiles.email.usernameHelp')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-password">
            {t('preferences.notificationProfiles.email.smtpPassword')}
          </Label>
          <Input
            id="smtp-password"
            type="password"
            value={emailConfig.smtpPassword || ''}
            onChange={(e) => updateField('smtpPassword', e.target.value)}
            placeholder={t('preferences.notificationProfiles.email.passwordHelp')}
          />
        </div>
      </div>

      {/* SMTP Identity (optional) */}
      <div className="space-y-2">
        <Label htmlFor="smtp-identity">
          {t('preferences.notificationProfiles.email.smtpIdentity')}
        </Label>
        <Input
          id="smtp-identity"
          value={emailConfig.smtpIdentity || ''}
          onChange={(e) => updateField('smtpIdentity', e.target.value)}
          placeholder={t('preferences.notificationProfiles.email.identityHelp')}
        />
      </div>

      {/* Email Addresses */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="from" className="required">
            {t('preferences.notificationProfiles.email.fromAddress')}
          </Label>
          <Input
            id="from"
            type="email"
            value={emailConfig.from || ''}
            onChange={(e) => updateField('from', e.target.value)}
            placeholder="sender@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to" className="required">
            {t('preferences.notificationProfiles.email.toAddress')}
          </Label>
          <Input
            id="to"
            value={emailConfig.to || ''}
            onChange={(e) => updateField('to', e.target.value)}
            placeholder="recipient@example.com, other@example.com"
          />
          <p className="text-xs text-muted-foreground">
            {t('preferences.notificationProfiles.email.toHelp')}
          </p>
        </div>
      </div>

      {/* CC & Format */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cc">{t('preferences.notificationProfiles.email.ccAddress')}</Label>
          <Input
            id="cc"
            value={emailConfig.cc || ''}
            onChange={(e) => updateField('cc', e.target.value)}
            placeholder="cc@example.com"
          />
          <p className="text-xs text-muted-foreground">
            {t('preferences.notificationProfiles.email.ccHelp')}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="format">{t('preferences.notificationProfiles.email.format')}</Label>
          <Select
            value={emailConfig.format || 'txt'}
            onValueChange={(value) => updateField('format', value as 'txt' | 'html')}
          >
            <SelectTrigger id="format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="txt">
                {t('preferences.notificationProfiles.email.plainText')}
              </SelectItem>
              <SelectItem value="html">
                {t('preferences.notificationProfiles.email.html')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
