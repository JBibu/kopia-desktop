import type { StorageConfig, StorageType } from '@/lib/kopia/types';

export interface ProviderFormProps {
  config: Partial<StorageConfig['config']>;
  onChange: (config: Partial<StorageConfig['config']>) => void;
  errors?: Record<string, string>;
}

export interface ProviderMetadata {
  id: StorageType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface SetupWizardState {
  step: 'provider' | 'config' | 'verify' | 'password';
  provider: StorageType | null;
  storageConfig: Partial<StorageConfig['config']>;
  mode: 'create' | 'connect' | null;
  password: string;
  confirmPassword: string;
  description: string;
  advancedOptions: {
    hash?: string;
    encryption?: string;
    splitter?: string;
    ecc?: string;
    eccOverheadPercent?: number;
    readonly?: boolean;
    customUsername?: string;
    customHostname?: string;
  };
}
