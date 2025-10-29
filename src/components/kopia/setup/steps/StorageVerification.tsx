import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { repositoryExists } from '@/lib/kopia/client';
import type { StorageConfig } from '@/lib/kopia/types';

interface StorageVerificationProps {
  storageConfig: StorageConfig;
  onBack: () => void;
  onCreateNew: () => void;
  onConnect: () => void;
}

type VerificationStatus = 'checking' | 'exists' | 'not-exists' | 'error';

export function StorageVerification({
  storageConfig,
  onBack,
  onCreateNew,
  onConnect,
}: StorageVerificationProps) {
  const [status, setStatus] = useState<VerificationStatus>('checking');
  const [error, setError] = useState<string | null>(null);

  const checkRepository = useCallback(async () => {
    setStatus('checking');
    setError(null);

    try {
      const exists = await repositoryExists(storageConfig);
      setStatus(exists ? 'exists' : 'not-exists');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [storageConfig]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkRepository();
  }, [checkRepository]);

  const handleRetry = () => {
    void checkRepository();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Verify Storage</h2>
          <p className="text-muted-foreground">Checking repository status</p>
        </div>
      </div>

      <div className="space-y-4">
        {status === 'checking' && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Checking if a Kopia repository exists at this location...
            </AlertDescription>
          </Alert>
        )}

        {status === 'exists' && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription>
              A Kopia repository was found at this location. You can connect to it with your
              password.
            </AlertDescription>
          </Alert>
        )}

        {status === 'not-exists' && (
          <Alert>
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertDescription>
              No Kopia repository found at this location. You can create a new repository here.
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to check repository: {error}
              <Button type="button" variant="link" size="sm" className="ml-2" onClick={handleRetry}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-between gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>

        <div className="flex gap-2">
          {status === 'exists' && (
            <Button type="button" onClick={onConnect}>
              Connect to Repository
            </Button>
          )}

          {status === 'not-exists' && (
            <Button type="button" onClick={onCreateNew}>
              Create New Repository
            </Button>
          )}

          {status === 'error' && (
            <Button type="button" variant="outline" onClick={handleRetry}>
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
