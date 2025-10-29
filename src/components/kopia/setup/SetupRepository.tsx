import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createRepository, connectRepository } from '@/lib/kopia/client';
import type { StorageType, StorageConfig } from '@/lib/kopia/types';
import type { SetupWizardState } from './types';
import { ProviderSelection, ProviderConfig, StorageVerification, PasswordSetup } from './steps';

export function SetupRepository() {
  const navigate = useNavigate();
  const { toast } = useToast();
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
      const storageConfig: StorageConfig = {
        type: state.provider,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        config: state.storageConfig as any, // Type assertion needed due to partial config
      };

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
        toast({
          title: 'Repository created',
          description: 'Your backup repository has been created successfully.',
        });
      } else {
        await connectRepository({
          storage: storageConfig,
          password: state.password,
        });
        toast({
          title: 'Connected',
          description: 'Successfully connected to repository.',
        });
      }

      // Navigate to overview page after successful setup
      navigate('/');
    } catch (error) {
      toast({
        title: state.mode === 'create' ? 'Failed to create repository' : 'Failed to connect',
        description: error instanceof Error ? error.message : String(error),
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
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
