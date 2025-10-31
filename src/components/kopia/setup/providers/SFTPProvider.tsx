import { useState } from 'react';
import { RequiredField } from '../fields/RequiredField';
import { OptionalField } from '../fields/OptionalField';
import { PathPickerField } from '../fields/PathPickerField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProviderFormProps } from '../types';
import type { SFTPStorageConfig } from '@/lib/kopia/types';
import { useProviderConfig } from '@/hooks/useProviderConfig';

export function SFTPProvider({ config, onChange }: ProviderFormProps) {
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
      <RequiredField
        label="Host"
        name="host"
        value={sftpConfig.host || ''}
        onChange={(v) => handleChange('host', v)}
        placeholder="sftp.example.com"
        helpText="SFTP server hostname or IP address"
        autoFocus
      />

      <OptionalField
        label="Port"
        name="port"
        type="number"
        value={sftpConfig.port?.toString() || ''}
        onChange={(v) => handleChange('port', parseInt(v) || 22)}
        placeholder="22"
        helpText="SFTP server port (default: 22)"
      />

      <RequiredField
        label="Username"
        name="username"
        value={sftpConfig.username || ''}
        onChange={(v) => handleChange('username', v)}
        placeholder="user"
        helpText="SFTP username"
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Authentication</Label>
          <Button type="button" variant="ghost" size="sm" onClick={toggleAuthMode}>
            {useKeyFile ? 'Use password' : 'Use SSH key'}
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
              helpText="Path to SSH private key file"
              required
            />
            <OptionalField
              label="Key Passphrase"
              name="keyData"
              type="password"
              value={sftpConfig.keyData || ''}
              onChange={(v) => handleChange('keyData', v)}
              placeholder="Optional passphrase for encrypted key"
              helpText="Leave empty if key is not encrypted"
            />
          </>
        ) : (
          <RequiredField
            label="Password"
            name="password"
            type="password"
            value={sftpConfig.password || ''}
            onChange={(v) => handleChange('password', v)}
            placeholder="Your SFTP password"
            helpText="SFTP user password"
          />
        )}
      </div>

      <RequiredField
        label="Path"
        name="path"
        value={sftpConfig.path || ''}
        onChange={(v) => handleChange('path', v)}
        placeholder="/backup/repository"
        helpText="Remote path on SFTP server"
      />

      <div className="space-y-2">
        <Label htmlFor="knownHostsFile">Known Hosts File (Optional)</Label>
        <Textarea
          id="knownHostsFile"
          value={sftpConfig.knownHostsFile || ''}
          onChange={(e) => handleChange('knownHostsFile', e.target.value)}
          placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ..."
          className="font-mono text-xs"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          SSH known_hosts entries for server verification (optional but recommended)
        </p>
      </div>
    </div>
  );
}
