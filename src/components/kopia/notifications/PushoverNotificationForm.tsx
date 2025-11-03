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

interface PushoverNotificationFormProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function PushoverNotificationForm({ config, onChange }: PushoverNotificationFormProps) {
  const pushoverConfig = config as Partial<PushoverConfig>;

  const updateField = <K extends keyof PushoverConfig>(field: K, value: PushoverConfig[K]) => {
    onChange({ ...pushoverConfig, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* App Token */}
      <div className="space-y-2">
        <Label htmlFor="app-token" className="required">
          Pushover App Token
        </Label>
        <Input
          id="app-token"
          value={pushoverConfig.appToken || ''}
          onChange={(e) => updateField('appToken', e.target.value)}
          placeholder="Enter your Pushover app token"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Create an app at{' '}
          <a
            href="https://pushover.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            pushover.net
          </a>{' '}
          to get your app token
        </p>
      </div>

      {/* User Key */}
      <div className="space-y-2">
        <Label htmlFor="user-key" className="required">
          Recipient User Key or Group Key
        </Label>
        <Input
          id="user-key"
          value={pushoverConfig.userKey || ''}
          onChange={(e) => updateField('userKey', e.target.value)}
          placeholder="Enter user key or group key"
        />
        <p className="text-xs text-muted-foreground">
          Found on your Pushover dashboard after logging in
        </p>
      </div>

      {/* Format */}
      <div className="space-y-2">
        <Label htmlFor="format">Format</Label>
        <Select
          value={pushoverConfig.format || 'txt'}
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

      {/* Help Information */}
      <div className="border-t pt-4">
        <p className="text-sm text-muted-foreground">
          <strong>Getting Started with Pushover:</strong>
        </p>
        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1 mt-2">
          <li>
            Sign up for a Pushover account at{' '}
            <a
              href="https://pushover.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              pushover.net
            </a>
          </li>
          <li>Install the Pushover mobile app on your device (iOS/Android)</li>
          <li>Create a new application in your Pushover dashboard to get an App Token</li>
          <li>Copy your User Key from the Pushover dashboard</li>
        </ol>
      </div>
    </div>
  );
}
