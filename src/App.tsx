import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router';
import { usePreferencesStore } from './stores/preferences';
import { useKopiaStore } from './stores/kopia';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { WindowCloseHandler } from './components/layout/WindowCloseHandler';
import { Dashboard } from './pages/Dashboard';
import { Profiles } from './pages/Profiles';
import { ProfileDetail } from './pages/ProfileDetail';
import { DirectoryHistory } from './pages/DirectoryHistory';
import { SnapshotBrowse } from './pages/SnapshotBrowse';
import { SnapshotRestore } from './pages/SnapshotRestore';
import { RepositoryPage } from './pages/RepositoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { Tasks } from './pages/Tasks';
import { NotFound } from './pages/NotFound';
import Onboarding from './pages/Onboarding';
import './lib/i18n/config';
import './styles/globals.css';

/** Component that handles first-run onboarding detection */
function OnboardingGuard() {
  const hasCompletedOnboarding = usePreferencesStore((state) => state.hasCompletedOnboarding);
  const isConnected = useKopiaStore((state) => state.isRepoConnected());
  const isLoading = useKopiaStore((state) => state.isRepositoryLoading);

  if (isLoading) {
    return null;
  }

  // If user hasn't completed onboarding AND no repository is connected, show onboarding
  if (!hasCompletedOnboarding && !isConnected) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

/** Layout component that protects child routes - redirects to repository if not connected */
function ProtectedLayout() {
  const isConnected = useKopiaStore((state) => state.isRepoConnected());
  const isLoading = useKopiaStore((state) => state.isRepositoryLoading);

  if (isLoading) {
    return null;
  }

  if (!isConnected) {
    return <Navigate to="/repository?tab=connect" replace />;
  }

  return <Outlet />;
}

function App(): React.JSX.Element {
  const theme = usePreferencesStore((state) => state.theme);
  const language = usePreferencesStore((state) => state.language);

  // Initialize preferences store (applies persisted font size on hydration)
  usePreferencesStore();

  // Initialize global Kopia state polling on mount/unmount
  // Using getState() to avoid unnecessary dependency tracking - Zustand functions are stable
  useEffect(() => {
    const { startPolling, stopPolling } = useKopiaStore.getState();
    startPolling();
    return () => stopPolling();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <ErrorBoundary>
      <WindowCloseHandler />
      <BrowserRouter>
        <Routes>
          {/* Onboarding route (full-screen, outside AppLayout) */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Main app routes with OnboardingGuard */}
          <Route element={<OnboardingGuard />}>
            <Route path="/" element={<AppLayout />}>
              {/* Public routes (no auth required) */}
              <Route path="repository" element={<RepositoryPage />} />
              <Route path="settings" element={<SettingsPage />} />

              {/* Protected routes (require connected repository) */}
              <Route element={<ProtectedLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="profiles" element={<Profiles />} />
                <Route path="profiles/:profileId" element={<ProfileDetail />} />
                <Route path="profiles/:profileId/history" element={<DirectoryHistory />} />
                <Route path="snapshots/browse" element={<SnapshotBrowse />} />
                <Route path="snapshots/restore" element={<SnapshotRestore />} />
                <Route path="tasks" element={<Tasks />} />
              </Route>

              {/* Legacy redirects for old routes */}
              <Route path="snapshots" element={<Navigate to="/profiles" replace />} />
              <Route path="preferences" element={<Navigate to="/settings" replace />} />
              <Route path="policies" element={<Navigate to="/settings?tab=policies" replace />} />
              <Route path="mounts" element={<Navigate to="/settings?tab=mounts" replace />} />
              <Route path="setup" element={<Navigate to="/repository?tab=connect" replace />} />
              <Route
                path="repositories"
                element={<Navigate to="/repository?tab=switch" replace />}
              />

              {/* 404 Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
