import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { repositoryExists } from '@/lib/kopia/client';
import { getErrorMessage } from '@/lib/kopia/errors';
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
  const { t } = useTranslation();
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
      setError(getErrorMessage(err));
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
          {status === 'exists' && (
            <Button type="button" onClick={onConnect}>
              {t('setup.connect')}
            </Button>
          )}

          {status === 'not-exists' && (
            <Button type="button" onClick={onCreateNew}>
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
