/**
 * Application sidebar - simplified version
 */

import { Link, useLocation } from 'react-router-dom';
import { Database, FolderArchive, Settings, ListTodo, Home, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  description: string;
}

const navItems: NavItem[] = [
  { name: 'Overview', path: '/', icon: Home, description: 'System dashboard' },
  { name: 'Repository', path: '/repository', icon: Database, description: 'Storage connection' },
  { name: 'Snapshots', path: '/snapshots', icon: FolderArchive, description: 'Backup history' },
  { name: 'Policies', path: '/policies', icon: ListTodo, description: 'Backup rules' },
  { name: 'Preferences', path: '/preferences', icon: Settings, description: 'App settings' },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const location = useLocation();

  return (
    <div className="flex h-full w-full flex-col bg-card">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight">Kopia UI</h1>
            <p className="text-xs text-muted-foreground">Backup Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  title={item.description}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          Version {import.meta.env.VITE_APP_VERSION || '0.1.0'}
        </p>
      </div>
    </div>
  );
}
