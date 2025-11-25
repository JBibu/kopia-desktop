import { useState } from 'react';
import { FormField } from '@/components/kopia/setup/fields/FormField';
import { PathPickerField } from '@/components/kopia/setup/fields/PathPickerField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProviderFormProps } from '@/components/kopia/setup/types';
import type { SFTPStorageConfig } from '@/lib/kopia/types';
import { useProviderConfig } from '@/hooks/useProviderConfig';
import { useTranslation } from 'react-i18next';

export function SFTPProvider({ config, onChange }: ProviderFormProps) {
  const { t } = useTranslation();
  const sftpConfig = config as Partial<SFTPStorageConfig>;
  const [useKeyFile, setUseKeyFile] = useState(!!sftpConfig.keyfile);
  const { handleChange } = useProviderConfig<SFTPStorageConfig>(sftpConfig, onChange);

  const toggleAuthMode = () => {
    setUseKeyFile(!useKeyFile);
    // Clear the opposite field when switching modes
    if (useKeyFile) {
      onChange({ ...sftpConfig, keyfile: undefined, keyData: undefined });
    } else {
      onChange({ ...sftpConfig, password: undefined });
    }
  };

  return (
    <div className="space-y-4">
      <FormField
        label={t('setup.fields.common.host')}
        name="host"
        value={sftpConfig.host || ''}
        onChange={(v) => handleChange('host', v)}
        placeholder="sftp.example.com"
        helpText={t('setup.fields.sftp.hostHelp')}
        required
        autoFocus
      />

      <FormField
        label={t('setup.fields.common.port')}
        name="port"
        type="number"
        value={sftpConfig.port?.toString() || ''}
        onChange={(v) => handleChange('port', parseInt(v) || 22)}
        placeholder="22"
        helpText={t('setup.fields.sftp.portHelp')}
      />

      <FormField
        label={t('setup.fields.common.username')}
        name="username"
        value={sftpConfig.username || ''}
        onChange={(v) => handleChange('username', v)}
        placeholder="user"
        helpText={t('setup.fields.sftp.usernameHelp')}
        required
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('setup.fields.common.authentication')}</Label>
          <Button type="button" variant="ghost" size="sm" onClick={toggleAuthMode}>
            {useKeyFile ? t('setup.fields.common.usePassword') : t('setup.fields.common.useSSHKey')}
          </Button>
        </div>

        {useKeyFile ? (
          <>
            <PathPickerField
              label=""
              name="keyfile"
              value={sftpConfig.keyfile || ''}
              onChange={(v) => handleChange('keyfile', v)}
              placeholder="/home/user/.ssh/id_rsa"
              helpText={t('setup.fields.sftp.keyfileHelp')}
              required
            />
            <FormField
              label={t('setup.fields.sftp.keyPassphrase')}
              name="keyData"
              type="password"
              value={sftpConfig.keyData || ''}
              onChange={(v) => handleChange('keyData', v)}
              placeholder="Optional passphrase for encrypted key"
              helpText={t('setup.fields.sftp.keyPassphraseHelp')}
            />
          </>
        ) : (
          <FormField
            label={t('setup.fields.common.password')}
            name="password"
            type="password"
            value={sftpConfig.password || ''}
            onChange={(v) => handleChange('password', v)}
            placeholder="Your SFTP password"
            helpText={t('setup.fields.sftp.passwordHelp')}
            required
          />
        )}
      </div>

      <FormField
        label={t('setup.fields.common.path')}
        name="path"
        value={sftpConfig.path || ''}
        onChange={(v) => handleChange('path', v)}
        placeholder="/backup/repository"
        helpText={t('setup.fields.sftp.pathHelp')}
        required
      />

      <div className="space-y-2">
        <Label htmlFor="knownHostsFile">
          {t('setup.fields.sftp.knownHostsFile')} ({t('common.optional')})
        </Label>
        <Textarea
          id="knownHostsFile"
          value={sftpConfig.knownHostsFile || ''}
          onChange={(e) => handleChange('knownHostsFile', e.target.value)}
          placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ..."
          className="font-mono text-xs"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">{t('setup.fields.sftp.knownHostsFileHelp')}</p>
      </div>
    </div>
  );
}
