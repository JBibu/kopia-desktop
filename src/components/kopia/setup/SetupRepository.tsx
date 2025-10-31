import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRepository } from '@/hooks/useRepository';
import {
  createRepository,
  connectRepository,
  disconnectRepository,
  getRepositoryStatus,
} from '@/lib/kopia/client';
import type { StorageType, StorageConfig } from '@/lib/kopia/types';
import type { SetupWizardState } from './types';
import { ProviderSelection } from './steps/ProviderSelection';
import { ProviderConfig } from './steps/ProviderConfig';
import { StorageVerification } from './steps/StorageVerification';
import { PasswordSetup } from './steps/PasswordSetup';

export function SetupRepository() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshStatus } = useRepository();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [state, setState] = useState<SetupWizardState>({
    step: 'provider',
    provider: null,
    storageConfig: {},
    mode: null,
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

  const handleCreateNew = () => {
    setState((prev) => ({
      ...prev,
      step: 'password',
      mode: 'create',
    }));
  };

  const handleConnect = () => {
    setState((prev) => ({
      ...prev,
      step: 'password',
      mode: 'connect',
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
    if (!state.provider || !state.mode) return;

    setIsSubmitting(true);

    try {
      // Ensure we're disconnected from any existing repository before connecting to a new one
      const currentStatus = await getRepositoryStatus();

      if (currentStatus.connected) {
        try {
          await disconnectRepository();
          // Wait for disconnect to complete fully
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch {
          // If disconnect fails, we can't proceed - repository is in unknown state
          throw new Error(
            'Failed to disconnect from existing repository. Please try restarting the application.'
          );
        }
      }

      // Prepare storage configuration
      const storageConfig: StorageConfig = {
        type: state.provider,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        config: state.storageConfig as any, // Type assertion needed due to partial config
      };

      // Create or connect to repository
      if (state.mode === 'create') {
        await createRepository({
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
        await connectRepository({
          storage: storageConfig,
          password: state.password,
        });
      }

      // Wait for connection to be ready with exponential backoff
      // Total attempts: 10, Total time: up to ~10 seconds
      let connected = false;
      const maxAttempts = 10;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const newStatus = await getRepositoryStatus();

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
        throw new Error(
          'Repository operation completed but connection could not be verified. Please check the repository status.'
        );
      }

      // Connection verified - show success and navigate
      toast({
        title: state.mode === 'create' ? 'Repository created' : 'Connected',
        description:
          state.mode === 'create'
            ? 'Your backup repository has been created successfully.'
            : 'Successfully connected to repository.',
      });

      await refreshStatus();
      void navigate('/', { replace: true });
    } catch (error) {
      // Parse error message for better user feedback
      const errorMessage = error instanceof Error ? error.message : String(error);
      let userMessage = errorMessage;

      // Handle common error cases with user-friendly messages
      if (errorMessage.includes('ALREADY_CONNECTED')) {
        // This should be rare now since we auto-disconnect, but handle it gracefully
        userMessage =
          'Repository is still connected. Please restart the application and try again.';
      } else if (errorMessage.includes('INVALID_PASSWORD')) {
        userMessage = 'Invalid password. Please check your password and try again.';
      } else if (errorMessage.includes('NOT_INITIALIZED')) {
        userMessage =
          'No repository found at this location. Please create a new repository instead.';
      } else if (
        errorMessage.includes('connection refused') ||
        errorMessage.includes('ECONNREFUSED')
      ) {
        userMessage = 'Cannot connect to Kopia server. Please restart the application.';
      } else if (errorMessage.includes('Failed to disconnect')) {
        userMessage = errorMessage; // Use the specific disconnect error message
      }

      toast({
        title: state.mode === 'create' ? 'Failed to create repository' : 'Failed to connect',
        description: userMessage,
        variant: 'destructive',
      });
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

  return (
    <div className="flex items-center justify-center min-h-full py-8">
      <Card className="w-full max-w-3xl">
        <CardContent className="p-6">
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
                config: state.storageConfig as any, // Type assertion needed due to partial config
              }}
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
        </CardContent>
      </Card>
    </div>
  );
}
