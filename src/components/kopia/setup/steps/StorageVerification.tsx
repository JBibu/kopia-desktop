import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { repositoryExists, addRepository, startKopiaServer } from '@/lib/kopia';
import { getErrorMessage, parseKopiaError, KopiaErrorCode } from '@/lib/kopia';
import type { StorageConfig } from '@/lib/kopia';
import { useCurrentRepoId } from '@/hooks';

interface StorageVerificationProps {
  storageConfig: StorageConfig;
  isAddingNew?: boolean;
  onBack: () => void;
  onCreateNew: (repoId: string) => void;
  onConnect: (repoId: string) => void;
}

type VerificationStatus = 'checking' | 'exists' | 'not-exists' | 'error';

export function StorageVerification({
  storageConfig,
  isAddingNew = false,
  onBack,
  onCreateNew,
  onConnect,
}: StorageVerificationProps) {
  const { t } = useTranslation();
  const currentRepoId = useCurrentRepoId();
  const [status, setStatus] = useState<VerificationStatus>('checking');
  const [error, setError] = useState<string | null>(null);
  const [repoIdToUse, setRepoIdToUse] = useState<string | null>(null);
  const hasChecked = useRef(false);

  const checkRepository = async () => {
    setStatus('checking');
    setError(null);
    setRepoIdToUse(null); // Reset to prevent stale state

    try {
      let repoId: string;

      if (isAddingNew) {
        // For new repositories, we need to create the repo entry first
        // This starts the server so we can check if storage has existing repo
        repoId = await addRepository();
        setRepoIdToUse(repoId);
      } else {
        // For existing repos, use current repo ID or fall back to 'repository' (default)
        repoId = currentRepoId || 'repository';
        setRepoIdToUse(repoId);
      }

      // Ensure server is running for the repo (handles both new and existing cases)
      // startKopiaServer will return early if already running
      try {
        await startKopiaServer(repoId);
        // Small delay to ensure server is fully initialized
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (serverErr) {
        // If server is already running, that's fine - continue with the check
        const kopiaError = parseKopiaError(serverErr);
        if (!kopiaError.is(KopiaErrorCode.SERVER_ALREADY_RUNNING)) {
          throw serverErr;
        }
      }

      const exists = await repositoryExists(repoId, storageConfig);
      setStatus(exists ? 'exists' : 'not-exists');
    } catch (err) {
      // Show error in Alert component only - don't propagate to avoid duplicate toasts
      setStatus('error');
      setError(getErrorMessage(err));
    }
  };

  // Run verification once on mount
  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;
    void checkRepository();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <h2 className="text-2xl font-bold">{t('setup.verifyStorage')}</h2>
          <p className="text-muted-foreground">{t('setup.checkingRepoStatus')}</p>
        </div>
      </div>

      <div className="space-y-4">
        {status === 'checking' && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>{t('setup.checking')}</AlertDescription>
          </Alert>
        )}

        {status === 'exists' && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription>{t('setup.repoFound')}</AlertDescription>
          </Alert>
        )}

        {status === 'not-exists' && (
          <Alert>
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertDescription>{t('setup.noRepoFound')}</AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('setup.checkFailed')}: {error}
              <Button type="button" variant="link" size="sm" className="ml-2" onClick={handleRetry}>
                {t('setup.tryAgain')}
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-between gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          {t('setup.back')}
        </Button>

        <div className="flex gap-2">
          {status === 'exists' && repoIdToUse && (
            <Button type="button" onClick={() => onConnect(repoIdToUse)}>
              {t('setup.connect')}
            </Button>
          )}

          {status === 'not-exists' && repoIdToUse && (
            <Button type="button" onClick={() => onCreateNew(repoIdToUse)}>
              {t('setup.createNew')}
            </Button>
          )}

          {status === 'error' && (
            <Button type="button" variant="outline" onClick={handleRetry}>
              {t('setup.tryAgain')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
