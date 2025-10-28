/**
 * Sidebar navigation component
 */

import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Database, FolderArchive, Settings, ListTodo, Home } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Overview', path: '/', icon: Home },
  { name: 'Repository', path: '/repository', icon: Database },
  { name: 'Snapshots', path: '/snapshots', icon: FolderArchive },
  { name: 'Policies', path: '/policies', icon: ListTodo },
  { name: 'Preferences', path: '/preferences', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo/Title */}
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">Kopia UI</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          Kopia UI v{import.meta.env.VITE_APP_VERSION || '0.1.0'}
        </p>
      </div>
    </aside>
  );
}
