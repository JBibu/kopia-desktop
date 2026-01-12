import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router';
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
import { TaskDetail } from './pages/TaskDetail';
import { Mounts } from './pages/Mounts';
import { Preferences } from './pages/Preferences';
import { Setup } from './pages/Setup';
import { Repositories } from './pages/Repositories';
import { NotFound } from './pages/NotFound';
import './lib/i18n/config';
import './styles/globals.css';

/** Layout component that protects child routes - redirects to setup if not connected */
function ProtectedLayout() {
  const isConnected = useKopiaStore((state) => state.isRepoConnected());
  const isLoading = useKopiaStore((state) => state.isRepositoryLoading);

  if (isLoading) {
    return null;
  }

  if (!isConnected) {
    return <Navigate to="/setup" replace />;
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
          <Route path="/" element={<AppLayout />}>
            {/* Public routes (no auth required) */}
            <Route path="setup" element={<Setup />} />
            <Route path="repository" element={<Repository />} />
            <Route path="preferences" element={<Preferences />} />
            <Route path="repositories" element={<Repositories />} />

            {/* Protected routes (require connected repository) */}
            <Route element={<ProtectedLayout />}>
              <Route index element={<Overview />} />
              <Route path="snapshots" element={<Snapshots />} />
              <Route path="snapshots/:profileId/history" element={<ProfileHistory />} />
              <Route path="snapshots/create" element={<SnapshotCreate />} />
              <Route path="snapshots/history" element={<SnapshotHistory />} />
              <Route path="snapshots/browse" element={<SnapshotBrowse />} />
              <Route path="snapshots/restore" element={<SnapshotRestore />} />
              <Route path="policies" element={<Policies />} />
              <Route path="policies/edit" element={<PolicyEdit />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="tasks/:taskId" element={<TaskDetail />} />
              <Route path="mounts" element={<Mounts />} />
            </Route>

            {/* 404 Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
