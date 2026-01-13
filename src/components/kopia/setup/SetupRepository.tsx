import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useKopiaStore } from '@/stores';
import {
  createRepository,
  connectRepository,
  disconnectRepository,
  getRepositoryStatus,
} from '@/lib/kopia';
import { getErrorMessage, parseKopiaError, KopiaErrorCode } from '@/lib/kopia';
import type { StorageType, StorageConfig } from '@/lib/kopia';
import type { SetupWizardState } from './types';
import { ProviderSelection, ProviderConfig, StorageVerification, PasswordSetup } from './steps';

interface SetupRepositoryProps {
  /** If true, renders without outer card and centering (for embedding in tabs) */
  embedded?: boolean;
  /** Callback when connection is successful (for embedded mode) */
  onSuccess?: () => void;
}

export function SetupRepository({ embedded = false, onSuccess }: SetupRepositoryProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refreshStatus = useKopiaStore((state) => state.refreshRepositoryStatus);
  const refreshRepositories = useKopiaStore((state) => state.refreshRepositories);
  const setCurrentRepository = useKopiaStore((state) => state.setCurrentRepository);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if we're adding a new repository (vs configuring existing/first)
  // In embedded mode, always treat as adding new
  const isAddingNew = embedded || searchParams.get('new') === 'true';

  const [state, setState] = useState<SetupWizardState>({
    step: 'provider',
    provider: null,
    storageConfig: {},
    mode: null,
    repoId: null,
    password: '',
    confirmPassword: '',
    description: '',
    advancedOptions: {
      hash: 'BLAKE3-256',
      encryption: 'AES256-GCM-HMAC-SHA256',
      splitter: 'DYNAMIC-4M-BUZHASH',
    },
  });

  const handleProviderSelect = (provider: StorageType) => {
    setState((prev) => ({
      ...prev,
      step: 'config',
      provider,
      storageConfig: {},
    }));
  };

  const handleConfigChange = (config: Partial<StorageConfig['config']>) => {
    setState((prev) => ({
      ...prev,
      storageConfig: config,
    }));
  };

  const handleConfigNext = () => {
    setState((prev) => ({
      ...prev,
      step: 'verify',
    }));
  };

  const handleVerifyBack = () => {
    setState((prev) => ({
      ...prev,
      step: 'config',
    }));
  };

  const handleCreateNew = (repoId: string) => {
    setState((prev) => ({
      ...prev,
      step: 'password',
      mode: 'create',
      repoId,
    }));
  };

  const handleConnect = (repoId: string) => {
    setState((prev) => ({
      ...prev,
      step: 'password',
      mode: 'connect',
      repoId,
    }));
  };

  const handlePasswordBack = () => {
    setState((prev) => ({
      ...prev,
      step: 'verify',
      password: '',
      confirmPassword: '',
    }));
  };

  const handleSubmit = async () => {
    if (!state.provider || !state.mode || !state.repoId) return;

    setIsSubmitting(true);

    try {
      // Use the repo ID that was determined/created during the verification step
      const repoId = state.repoId;

      // For existing repos (not adding new), check if we need to disconnect first
      if (!isAddingNew) {
        try {
          const currentStatus = await getRepositoryStatus(repoId);

          if (currentStatus.connected) {
            try {
              await disconnectRepository(repoId);
              // Wait for disconnect to complete fully
              await new Promise((resolve) => setTimeout(resolve, 500));
            } catch {
              // If disconnect fails, we can't proceed - repository is in unknown state
              throw new Error(t('setup.toasts.disconnectFailed'));
            }
          }
        } catch {
          // If we can't get status, server might not be running - that's OK for setup
        }
      }

      // Prepare storage configuration
      // At this point, the wizard has validated all required fields,
      // so we can safely cast the partial config to the full type
      const storageConfig: StorageConfig = {
        type: state.provider,
        config: state.storageConfig as unknown as StorageConfig['config'],
      };

      // Create or connect to repository
      if (state.mode === 'create') {
        await createRepository(repoId, {
          storage: storageConfig,
          password: state.password,
          clientOptions: {
            description: state.description || undefined,
          },
          options: {
            blockFormat: {
              hash: state.advancedOptions.hash,
              encryption: state.advancedOptions.encryption,
              splitter: state.advancedOptions.splitter,
            },
          },
        });
      } else {
        await connectRepository(repoId, {
          storage: storageConfig,
          password: state.password,
        });
      }

      // Wait for connection to be ready with exponential backoff
      // Total attempts: 10, Total time: up to ~10 seconds
      let connected = false;
      const maxAttempts = 10;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const newStatus = await getRepositoryStatus(repoId);

        if (newStatus.connected) {
          connected = true;
          break;
        }

        // Don't wait after the last attempt
        if (attempt < maxAttempts - 1) {
          // Exponential backoff: 200ms, 400ms, 800ms, 1000ms (capped)
          const delay = Math.min(200 * Math.pow(2, attempt), 1000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      if (!connected) {
        throw new Error(t('setup.toasts.verificationFailed'));
      }

      // Connection verified - show success and navigate
      const successTitle =
        state.mode === 'create' ? t('setup.toasts.repoCreated') : t('setup.toasts.connected');
      const successDesc =
        state.mode === 'create'
          ? t('setup.toasts.repoCreatedDesc')
          : t('setup.toasts.connectedDesc');
      toast.success(successTitle, { description: successDesc });

      // Refresh repositories list and switch to the new/connected repo
      await refreshRepositories();
      await setCurrentRepository(repoId);
      await refreshStatus();

      // In embedded mode, call callback instead of navigating
      if (embedded && onSuccess) {
        onSuccess();
      } else if (!embedded) {
        void navigate('/', { replace: true });
      }
    } catch (error) {
      // Parse error for better user feedback
      const kopiaError = parseKopiaError(error);
      let userMessage = getErrorMessage(error);

      // Handle common error cases with user-friendly messages
      if (kopiaError.is(KopiaErrorCode.REPOSITORY_ALREADY_EXISTS)) {
        userMessage = t('setup.toasts.alreadyConnected');
      } else if (kopiaError.isAuthError()) {
        userMessage = t('setup.toasts.invalidPassword');
      } else if (kopiaError.is(KopiaErrorCode.REPOSITORY_NOT_CONNECTED)) {
        userMessage = t('setup.toasts.notInitialized');
      } else if (kopiaError.is(KopiaErrorCode.SERVER_NOT_RUNNING)) {
        userMessage = t('setup.toasts.serverUnavailable');
      }

      const errorTitle =
        state.mode === 'create' ? t('setup.toasts.createFailed') : t('setup.toasts.connectFailed');
      toast.error(errorTitle, { description: userMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProviderBack = () => {
    setState((prev) => ({
      ...prev,
      step: 'provider',
      storageConfig: {},
    }));
  };

  const content = (
    <>
      {state.step === 'provider' && <ProviderSelection onSelect={handleProviderSelect} />}

      {state.step === 'config' && state.provider && (
        <ProviderConfig
          provider={state.provider}
          config={state.storageConfig}
          onChange={handleConfigChange}
          onBack={handleProviderBack}
          onNext={handleConfigNext}
        />
      )}

      {state.step === 'verify' && state.provider && (
        <StorageVerification
          storageConfig={{
            type: state.provider,
            config: state.storageConfig as unknown as StorageConfig['config'],
          }}
          isAddingNew={isAddingNew}
          onBack={handleVerifyBack}
          onCreateNew={handleCreateNew}
          onConnect={handleConnect}
        />
      )}

      {state.step === 'password' && state.mode && (
        <PasswordSetup
          mode={state.mode}
          password={state.password}
          confirmPassword={state.confirmPassword}
          description={state.description}
          advancedOptions={state.advancedOptions}
          onPasswordChange={(password) => setState((prev) => ({ ...prev, password }))}
          onConfirmPasswordChange={(confirmPassword) =>
            setState((prev) => ({ ...prev, confirmPassword }))
          }
          onDescriptionChange={(description) => setState((prev) => ({ ...prev, description }))}
          onAdvancedOptionsChange={(advancedOptions) =>
            setState((prev) => ({ ...prev, advancedOptions }))
          }
          onBack={handlePasswordBack}
          onSubmit={() => void handleSubmit()}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );

  // In embedded mode, render content directly without wrapper
  if (embedded) {
    return <div className="w-full max-w-3xl mx-auto">{content}</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-full">
      <Card className="w-full max-w-3xl">
        <CardContent className="p-6">{content}</CardContent>
      </Card>
    </div>
  );
}
