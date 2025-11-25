import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { usePreferencesStore } from './stores/preferences';
import { useKopiaStore } from './stores/kopia';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { WindowCloseHandler } from './components/layout/WindowCloseHandler';
import { Overview } from './pages/Overview';
import { Repository } from './pages/Repository';
import { Snapshots } from './pages/Snapshots';
import { SnapshotCreate } from './pages/SnapshotCreate';
import { SnapshotHistory } from './pages/SnapshotHistory';
import { SnapshotBrowse } from './pages/SnapshotBrowse';
import { SnapshotRestore } from './pages/SnapshotRestore';
import { ProfileHistory } from './pages/ProfileHistory';
import { Policies } from './pages/Policies';
import { PolicyEdit } from './pages/PolicyEdit';
import { Tasks } from './pages/Tasks';
import { Mounts } from './pages/Mounts';
import { Preferences } from './pages/Preferences';
import { Setup } from './pages/Setup';
import { NotFound } from './pages/NotFound';
import './lib/i18n/config';
import './styles/globals.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isConnected = useKopiaStore((state) => state.isRepoConnected());
  const isLoading = useKopiaStore((state) => state.isRepositoryLoading);

  // While checking connection status, show nothing (AppLayout will handle loading state)
  if (isLoading) {
    return null;
  }

  // If not connected, redirect to setup
  if (!isConnected) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}

function App(): React.JSX.Element {
  const theme = usePreferencesStore((state) => state.theme);
  const language = usePreferencesStore((state) => state.language);
  const startPolling = useKopiaStore((state) => state.startPolling);
  const stopPolling = useKopiaStore((state) => state.stopPolling);

  // Initialize preferences store (applies persisted font size on hydration)
  usePreferencesStore();

  // Initialize global Kopia state polling
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

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
          {/* All app routes (with layout) */}
          <Route path="/" element={<AppLayout />}>
            <Route
              index
              element={
                <ProtectedRoute>
                  <Overview />
                </ProtectedRoute>
              }
            />
            <Route path="setup" element={<Setup />} />
            <Route path="repository" element={<Repository />} />
            <Route
              path="snapshots"
              element={
                <ProtectedRoute>
                  <Snapshots />
                </ProtectedRoute>
              }
            />
            <Route
              path="snapshots/:profileId/history"
              element={
                <ProtectedRoute>
                  <ProfileHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="snapshots/create"
              element={
                <ProtectedRoute>
                  <SnapshotCreate />
                </ProtectedRoute>
              }
            />
            <Route
              path="snapshots/history"
              element={
                <ProtectedRoute>
                  <SnapshotHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="snapshots/browse"
              element={
                <ProtectedRoute>
                  <SnapshotBrowse />
                </ProtectedRoute>
              }
            />
            <Route
              path="snapshots/restore"
              element={
                <ProtectedRoute>
                  <SnapshotRestore />
                </ProtectedRoute>
              }
            />
            <Route
              path="policies"
              element={
                <ProtectedRoute>
                  <Policies />
                </ProtectedRoute>
              }
            />
            <Route
              path="policies/edit"
              element={
                <ProtectedRoute>
                  <PolicyEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="tasks"
              element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="mounts"
              element={
                <ProtectedRoute>
                  <Mounts />
                </ProtectedRoute>
              }
            />
            <Route path="preferences" element={<Preferences />} />
            {/* 404 Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
