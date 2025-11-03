import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useThemeStore } from './stores/theme';
import { useLanguageStore } from './stores/language';
import { useFontSizeStore } from './stores/fontSize';
import { useKopiaStore } from './stores/kopia';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Overview } from './pages/Overview';
import { Repository } from './pages/Repository';
import { Snapshots } from './pages/Snapshots';
import { SnapshotHistory } from './pages/SnapshotHistory';
import { Policies } from './pages/Policies';
import { Tasks } from './pages/Tasks';
import { Preferences } from './pages/Preferences';
import { Setup } from './pages/Setup';
import { useRepository } from './hooks/useRepository';
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
              path="snapshots/history"
              element={
                <ProtectedRoute>
                  <SnapshotHistory />
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
              path="tasks"
              element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              }
            />
            <Route path="preferences" element={<Preferences />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
