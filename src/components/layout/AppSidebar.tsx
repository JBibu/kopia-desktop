/**
 * Application sidebar - simplified version
 */

import { Link, useLocation } from 'react-router-dom';
import { Database, FolderArchive, Settings, ListTodo, Home } from 'lucide-react';
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
      {/* Navigation */}
      <nav className="flex-1 overflow-auto px-2 py-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  title={item.description}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t px-3 py-2.5">
        <p className="text-xs text-muted-foreground/70">
          v{import.meta.env.VITE_APP_VERSION || '0.1.0'}
        </p>
      </div>
    </div>
  );
}
