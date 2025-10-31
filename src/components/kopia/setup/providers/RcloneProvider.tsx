import { RequiredField } from '../fields/RequiredField';
import { PathPickerField } from '../fields/PathPickerField';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProviderFormProps } from '../types';
import type { RcloneStorageConfig } from '@/lib/kopia/types';
import { useProviderConfig } from '@/hooks/useProviderConfig';

export function RcloneProvider({ config, onChange }: ProviderFormProps) {
  const rcloneConfig = config as Partial<RcloneStorageConfig>;
  const { handleChange } = useProviderConfig<RcloneStorageConfig>(rcloneConfig, onChange);

  // Convert array to string for textarea
  const argsAsString = Array.isArray(rcloneConfig.rcloneArgs)
    ? rcloneConfig.rcloneArgs.join('\n')
    : '';

  // Convert env object to string for textarea
  const envAsString = rcloneConfig.rcloneEnv
    ? Object.entries(rcloneConfig.rcloneEnv)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')
    : '';

  const handleArgsChange = (text: string) => {
    const args = text.split('\n').filter((line) => line.trim() !== '');
    handleChange('rcloneArgs', args);
  };

  const handleEnvChange = (text: string) => {
    const env: Record<string, string> = {};
    text.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    handleChange('rcloneEnv', env);
  };

  return (
    <div className="space-y-4">
      <RequiredField
        label="Remote Path"
        name="remotePath"
        value={rcloneConfig.remotePath || ''}
        onChange={(v) => handleChange('remotePath', v)}
        placeholder="myremote:backup/repository"
        helpText="Rclone remote path (remote:path format)"
        autoFocus
      />

      <PathPickerField
        label="Rclone Executable"
        name="rcloneExe"
        value={rcloneConfig.rcloneExe || ''}
        onChange={(v) => handleChange('rcloneExe', v)}
        placeholder="/usr/bin/rclone"
        helpText="Path to rclone binary (leave empty to use system rclone)"
      />

      <div className="space-y-2">
        <Label htmlFor="rcloneArgs">
          Rclone Arguments <span className="text-muted-foreground">(Optional)</span>
        </Label>
        <Textarea
          id="rcloneArgs"
          value={argsAsString}
          onChange={(e) => handleArgsChange(e.target.value)}
          placeholder="--buffer-size=256M&#10;--transfers=4"
          className="font-mono text-xs"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">Additional rclone arguments (one per line)</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rcloneEnv">
          Environment Variables <span className="text-muted-foreground">(Optional)</span>
        </Label>
        <Textarea
          id="rcloneEnv"
          value={envAsString}
          onChange={(e) => handleEnvChange(e.target.value)}
          placeholder="RCLONE_CONFIG=/path/to/config&#10;RCLONE_VERBOSE=1"
          className="font-mono text-xs"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Environment variables for rclone (KEY=value format, one per line)
        </p>
      </div>
    </div>
  );
}
