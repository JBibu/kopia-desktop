import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useThemeStore } from './stores/theme';
import { AppLayout } from './components/layout/AppLayout';
import { Overview, Repository, Snapshots, Policies, Preferences } from './pages';
import './styles/globals.css';

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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Overview />} />
          <Route path="repository" element={<Repository />} />
          <Route path="snapshots" element={<Snapshots />} />
          <Route path="policies" element={<Policies />} />
          <Route path="preferences" element={<Preferences />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
