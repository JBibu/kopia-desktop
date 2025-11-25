/**
 * Initial setup screen for when repository is not configured
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { SetupRepository } from '@/components/kopia/setup/SetupRepository';
import { useKopiaStore } from '@/stores/kopia';

export function Setup() {
  const navigate = useNavigate();
  const isConnected = useKopiaStore((state) => state.isRepoConnected());
  const isLoading = useKopiaStore((state) => state.isRepositoryLoading);

  // Redirect to home if already connected
  // This handles the case where user manually navigates to /setup while connected
  useEffect(() => {
    if (!isLoading && isConnected) {
      void navigate('/', { replace: true });
    }
  }, [isConnected, isLoading, navigate]);

  // Show nothing while checking connection status
  if (isLoading) {
    return null;
  }

  // If already connected, show nothing (redirect will happen via useEffect)
  if (isConnected) {
    return null;
  }

  return <SetupRepository />;
}
