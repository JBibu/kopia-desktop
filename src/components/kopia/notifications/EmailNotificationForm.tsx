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

interface EmailNotificationFormProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function EmailNotificationForm({ config, onChange }: EmailNotificationFormProps) {
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
            SMTP Server
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
            SMTP Port
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
          <Label htmlFor="smtp-username">SMTP Username</Label>
          <Input
            id="smtp-username"
            value={emailConfig.smtpUsername || ''}
            onChange={(e) => updateField('smtpUsername', e.target.value)}
            placeholder="Typically your email address"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-password">SMTP Password</Label>
          <Input
            id="smtp-password"
            type="password"
            value={emailConfig.smtpPassword || ''}
            onChange={(e) => updateField('smtpPassword', e.target.value)}
            placeholder="SMTP password or app-specific password"
          />
        </div>
      </div>

      {/* SMTP Identity (optional) */}
      <div className="space-y-2">
        <Label htmlFor="smtp-identity">SMTP Identity (Optional)</Label>
        <Input
          id="smtp-identity"
          value={emailConfig.smtpIdentity || ''}
          onChange={(e) => updateField('smtpIdentity', e.target.value)}
          placeholder="Often empty"
        />
      </div>

      {/* Email Addresses */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="from" className="required">
            From Address
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
            To Address(es)
          </Label>
          <Input
            id="to"
            value={emailConfig.to || ''}
            onChange={(e) => updateField('to', e.target.value)}
            placeholder="recipient@example.com, other@example.com"
          />
          <p className="text-xs text-muted-foreground">Comma-separated for multiple recipients</p>
        </div>
      </div>

      {/* CC & Format */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cc">CC Address(es)</Label>
          <Input
            id="cc"
            value={emailConfig.cc || ''}
            onChange={(e) => updateField('cc', e.target.value)}
            placeholder="cc@example.com"
          />
          <p className="text-xs text-muted-foreground">Comma-separated for multiple recipients</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="format">Format</Label>
          <Select
            value={emailConfig.format || 'txt'}
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
    </div>
  );
}
