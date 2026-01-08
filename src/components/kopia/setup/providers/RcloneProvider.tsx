import { FormField, PathPickerField } from '../fields';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProviderFormProps } from '../types';
import type { RcloneStorageConfig } from '@/lib/kopia';
import { useProviderConfig } from '@/hooks';
import { useTranslation } from 'react-i18next';

export function RcloneProvider({ config, onChange }: ProviderFormProps) {
  const { t } = useTranslation();
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
      <FormField
        label={t('setup.fields.rclone.remotePath')}
        name="remotePath"
        value={rcloneConfig.remotePath || ''}
        onChange={(v) => handleChange('remotePath', v)}
        placeholder="myremote:backup/repository"
        helpText={t('setup.fields.rclone.remotePathHelp')}
        required
        autoFocus
      />

      <PathPickerField
        label={t('setup.fields.rclone.rcloneExecutable')}
        name="rcloneExe"
        value={rcloneConfig.rcloneExe || ''}
        onChange={(v) => handleChange('rcloneExe', v)}
        placeholder="/usr/bin/rclone"
        helpText={t('setup.fields.rclone.rcloneExecutableHelp')}
      />

      <div className="space-y-2">
        <Label htmlFor="rcloneArgs">
          {t('setup.fields.rclone.rcloneArguments')}{' '}
          <span className="text-muted-foreground">({t('common.optional')})</span>
        </Label>
        <Textarea
          id="rcloneArgs"
          value={argsAsString}
          onChange={(e) => handleArgsChange(e.target.value)}
          placeholder="--buffer-size=256M&#10;--transfers=4"
          className="font-mono text-xs"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          {t('setup.fields.rclone.rcloneArgumentsHelp')}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rcloneEnv">
          {t('setup.fields.rclone.environmentVariables')}{' '}
          <span className="text-muted-foreground">({t('common.optional')})</span>
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
          {t('setup.fields.rclone.environmentVariablesHelp')}
        </p>
      </div>
    </div>
  );
}
