import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { listen } from '@tauri-apps/api/event';
import { useThemeStore } from './stores/theme';
import { useLanguageStore } from './stores/language';
import { useFontSizeStore } from './stores/fontSize';
import { useKopiaStore } from './stores/kopia';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { WindowCloseHandler } from './components/layout/WindowCloseHandler';
import { Overview } from './pages/Overview';
import { Repository } from './pages/Repository';
import { SnapshotCreate } from './pages/SnapshotCreate';
import { SnapshotHistory } from './pages/SnapshotHistory';
import { SnapshotBrowse } from './pages/SnapshotBrowse';
import { SnapshotRestore } from './pages/SnapshotRestore';
import { Profiles } from './pages/Profiles';
import { ProfileHistory } from './pages/ProfileHistory';
import { Policies } from './pages/Policies';
import { PolicyEdit } from './pages/PolicyEdit';
import { Tasks } from './pages/Tasks';
import { Mounts } from './pages/Mounts';
import { Preferences } from './pages/Preferences';
import { Setup } from './pages/Setup';
import { NotFound } from './pages/NotFound';
import { useRepository } from './hooks/useRepository';
import { toast } from 'sonner';
import './lib/i18n/config';
import './styles/globals.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isConnected, isLoading } = useRepository();

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

interface AutoStartError {
  message: string;
  is_repo_error: boolean;
}

function AppEventListener(): null {
  const disconnectRepo = useKopiaStore((state) => state.disconnectRepo);

  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<AutoStartError>('server-autostart-failed', (event) => {
        const { is_repo_error } = event.payload;

        if (is_repo_error) {
          // Repository path error - automatically disconnect and show error
          toast.error('Repository Configuration Error', {
            description:
              'The configured repository location is not accessible. The repository has been disconnected. Please reconnect to a valid repository.',
            duration: 10000,
          });

          // Automatically disconnect the invalid repository
          void disconnectRepo().catch(() => {
            // Silent failure - user will see they're disconnected via UI state
            // Error already logged in disconnectRepo
          });
        } else {
          // Generic server start error
          toast.error('Server Start Failed', {
            description:
              'Failed to start Kopia server. You can try starting it manually from the UI.',
            duration: 8000,
          });
        }
      });

      return unlisten;
    };

    let unlistenFn: (() => void) | undefined;

    void setupListener().then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      unlistenFn?.();
    };
  }, [disconnectRepo]);

  return null;
}

function App(): React.JSX.Element {
  const theme = useThemeStore((state) => state.theme);
  const language = useLanguageStore((state) => state.language);
  const startPolling = useKopiaStore((state) => state.startPolling);
  const stopPolling = useKopiaStore((state) => state.stopPolling);

  // Initialize font size store (font size is applied automatically by the store)
  useFontSizeStore();

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
      <AppEventListener />
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
              path="profiles"
              element={
                <ProtectedRoute>
                  <Profiles />
                </ProtectedRoute>
              }
            />
            <Route
              path="profiles/:profileId/history"
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
