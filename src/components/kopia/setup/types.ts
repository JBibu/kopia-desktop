import type { StorageType } from '@/lib/kopia/types';

/**
 * Partial storage config used during the wizard steps
 * This is a Record type since we're building it step-by-step
 */
export type PartialStorageConfig = Record<string, unknown>;

export interface ProviderFormProps {
  config: PartialStorageConfig;
  onChange: (config: PartialStorageConfig) => void;
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
  storageConfig: PartialStorageConfig;
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
