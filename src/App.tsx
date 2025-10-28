import { useEffect } from 'react';
import { useThemeStore } from './stores/theme';
import './styles/globals.css';

function App() {
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold mb-4">Kopia UI</h1>
        <p className="text-muted-foreground">
          Modern Desktop UI for Kopia Backup - Foundation Ready
        </p>
        <div className="mt-8 p-4 border rounded-lg bg-card">
          <h2 className="text-2xl font-semibold mb-2">Project Initialized ✓</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>TypeScript with strict mode</li>
            <li>Tailwind CSS with theming support</li>
            <li>i18n configuration (EN/ES)</li>
            <li>Zustand stores</li>
            <li>Zod validation schemas</li>
            <li>Testing setup ready</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
