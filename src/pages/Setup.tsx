/**
 * Initial setup screen for when repository is not configured
 */

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { SetupRepository } from '@/components/kopia/setup';
import { useKopiaStore } from '@/stores';

export function Setup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isConnected = useKopiaStore((state) => state.isRepoConnected());
  const isLoading = useKopiaStore((state) => state.isRepositoryLoading);

  // Check if user is adding a new repository (vs initial setup)
  const isAddingNew = searchParams.get('new') === 'true';

  // Redirect to home if already connected AND not adding a new repository
  // This handles the case where user manually navigates to /setup while connected
  useEffect(() => {
    if (!isLoading && isConnected && !isAddingNew) {
      void navigate('/', { replace: true });
    }
  }, [isConnected, isLoading, isAddingNew, navigate]);

  // Show nothing while checking connection status (unless adding new)
  if (isLoading && !isAddingNew) {
    return null;
  }

  // If already connected and not adding new, show nothing (redirect will happen via useEffect)
  if (isConnected && !isAddingNew) {
    return null;
  }

  return <SetupRepository />;
}
