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
import type { WebhookConfig } from '@/lib/kopia/types';

interface WebhookNotificationFormProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function WebhookNotificationForm({ config, onChange }: WebhookNotificationFormProps) {
  const webhookConfig = config as Partial<WebhookConfig>;

  const updateField = <K extends keyof WebhookConfig>(field: K, value: WebhookConfig[K]) => {
    onChange({ ...webhookConfig, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Endpoint URL */}
      <div className="space-y-2">
        <Label htmlFor="endpoint" className="required">
          URL Endpoint
        </Label>
        <Input
          id="endpoint"
          value={webhookConfig.endpoint || ''}
          onChange={(e) => updateField('endpoint', e.target.value)}
          placeholder="https://your-webhook-endpoint.com/notifications"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          The URL where notification data will be sent
        </p>
      </div>

      {/* HTTP Method & Format */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="method" className="required">
            HTTP Method
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
          <Label htmlFor="format">Format</Label>
          <Select
            value={webhookConfig.format || 'txt'}
            onValueChange={(value) => updateField('format', value as 'txt' | 'html')}
          >
            <SelectTrigger id="format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="txt">Plain Text</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Additional Headers */}
      <div className="space-y-2">
        <Label htmlFor="headers">Additional Headers (Optional)</Label>
        <Textarea
          id="headers"
          value={webhookConfig.headers || ''}
          onChange={(e) => updateField('headers', e.target.value)}
          placeholder="Authorization: Bearer your-token&#10;X-Custom-Header: value"
          rows={5}
        />
        <p className="text-xs text-muted-foreground">
          Enter one header per line in the format "Header-Name: value"
        </p>
      </div>

      {/* Help Information */}
      <div className="border-t pt-4">
        <p className="text-sm text-muted-foreground">
          <strong>Webhook Request Format:</strong>
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Kopia will send a {webhookConfig.method || 'POST'} request to your endpoint with the
          notification content in the request body. The content will be formatted as{' '}
          {webhookConfig.format === 'html' ? 'HTML' : 'plain text'}.
        </p>
      </div>
    </div>
  );
}
