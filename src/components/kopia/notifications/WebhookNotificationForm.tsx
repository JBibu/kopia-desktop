import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WebhookConfig } from '@/lib/kopia';
import { useProviderConfig } from '@/hooks';
import { useTranslation } from 'react-i18next';

interface WebhookNotificationFormProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function WebhookNotificationForm({ config, onChange }: WebhookNotificationFormProps) {
  const { t } = useTranslation();
  const webhookConfig = config as Partial<WebhookConfig>;
  const { handleChange: updateField } = useProviderConfig<WebhookConfig>(webhookConfig, onChange);

  return (
    <div className="space-y-4">
      {/* Endpoint URL */}
      <div className="space-y-2">
        <Label htmlFor="endpoint" className="required">
          {t('preferences.notificationProfiles.webhook.urlEndpoint')}
        </Label>
        <Input
          id="endpoint"
          value={webhookConfig.endpoint || ''}
          onChange={(e) => updateField('endpoint', e.target.value)}
          placeholder="https://your-webhook-endpoint.com/notifications"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          {t('preferences.notificationProfiles.webhook.endpointHelp')}
        </p>
      </div>

      {/* HTTP Method & Format */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="method" className="required">
            {t('preferences.notificationProfiles.webhook.httpMethod')}
          </Label>
          <Select
            value={webhookConfig.method || 'POST'}
            onValueChange={(value) => updateField('method', value as 'POST' | 'PUT')}
          >
            <SelectTrigger id="method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="format">{t('preferences.notificationProfiles.webhook.format')}</Label>
          <Select
            value={webhookConfig.format || 'txt'}
            onValueChange={(value) => updateField('format', value as 'txt' | 'html')}
          >
            <SelectTrigger id="format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="txt">
                {t('preferences.notificationProfiles.webhook.plainText')}
              </SelectItem>
              <SelectItem value="html">
                {t('preferences.notificationProfiles.webhook.html')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Additional Headers */}
      <div className="space-y-2">
        <Label htmlFor="headers">
          {t('preferences.notificationProfiles.webhook.additionalHeaders')}
        </Label>
        <Textarea
          id="headers"
          value={webhookConfig.headers || ''}
          onChange={(e) => updateField('headers', e.target.value)}
          placeholder="Authorization: Bearer your-token&#10;X-Custom-Header: value"
          rows={5}
        />
        <p className="text-xs text-muted-foreground">
          {t('preferences.notificationProfiles.webhook.headersHelp')}
        </p>
      </div>

      {/* Help Information */}
      <div className="border-t pt-4">
        <p className="text-sm text-muted-foreground">
          <strong>{t('preferences.notificationProfiles.webhook.requestFormat')}</strong>
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {t('preferences.notificationProfiles.webhook.requestFormatDesc', {
            method: webhookConfig.method || 'POST',
            format:
              webhookConfig.format === 'html'
                ? 'HTML'
                : t('preferences.notificationProfiles.webhook.plainText'),
          })}
        </p>
      </div>
    </div>
  );
}
