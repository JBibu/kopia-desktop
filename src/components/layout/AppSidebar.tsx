/**
 * Application sidebar - simplified version
 */

import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Database, FolderArchive, Settings, ListTodo, Home, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  nameKey: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { nameKey: 'nav.overview', path: '/', icon: Home },
  { nameKey: 'nav.repository', path: '/repository', icon: Database },
  { nameKey: 'nav.snapshots', path: '/snapshots', icon: FolderArchive },
  { nameKey: 'nav.policies', path: '/policies', icon: ListTodo },
  { nameKey: 'nav.tasks', path: '/tasks', icon: ListChecks },
  { nameKey: 'nav.preferences', path: '/preferences', icon: Settings },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { t } = useTranslation();
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
                    'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  title={t(item.nameKey)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t(item.nameKey)}</span>
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
