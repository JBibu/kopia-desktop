import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useThemeStore } from './stores/theme';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Overview, Repository, Snapshots, Policies, Tasks, Preferences, Setup } from './pages';
import { useRepository } from './hooks';
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

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Setup route (standalone, no layout) */}
          <Route path="/setup" element={<Setup />} />

          {/* Main app routes (with layout) */}
          <Route path="/" element={<AppLayout />}>
            <Route
              index
              element={
                <ProtectedRoute>
                  <Overview />
                </ProtectedRoute>
              }
            />
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
