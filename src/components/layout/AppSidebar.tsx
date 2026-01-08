/**
 * Application sidebar - simplified version
 */

import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Database,
  Settings,
  ListTodo,
  Home,
  ListChecks,
  HardDrive,
  FolderArchive,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { StatusIndicator } from './StatusIndicator';
import { useKopiaStore } from '@/stores';
import { Progress } from '@/components/ui/progress';
import { RepositorySelector } from '@/components/kopia';
import type { Task } from '@/lib/kopia';

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
  { nameKey: 'nav.mounts', path: '/mounts', icon: HardDrive },
  { nameKey: 'nav.preferences', path: '/preferences', icon: Settings },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const tasks = useKopiaStore((state) => state.tasks);

  // Get running tasks
  const runningTasks = tasks.filter((task) => task.status === 'RUNNING');

  // Calculate progress for a task
  const getTaskProgress = (task: Task): number | null => {
    if (!task.counters) return null;

    const { processed_bytes, estimated_bytes, processed_files, estimated_files } = task.counters;

    // Prefer byte-based progress
    if (
      processed_bytes?.value !== undefined &&
      estimated_bytes?.value !== undefined &&
      estimated_bytes.value > 0
    ) {
      return Math.min(100, (processed_bytes.value / estimated_bytes.value) * 100);
    }

    // Fallback to file-based progress
    if (
      processed_files?.value !== undefined &&
      estimated_files?.value !== undefined &&
      estimated_files.value > 0
    ) {
      return Math.min(100, (processed_files.value / estimated_files.value) * 100);
    }

    return null;
  };

  return (
    <div className="flex h-full w-full flex-col bg-card">
      {/* Repository Selector */}
      <div className="border-b px-2 py-2">
        <RepositorySelector />
      </div>

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

      {/* Running Tasks Progress */}
      {runningTasks.length > 0 && (
        <div className="border-t px-3 py-2.5 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            {t('tasks.running')} ({runningTasks.length})
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {runningTasks.map((task) => {
              const progress = getTaskProgress(task);
              return (
                <div key={task.id} className="space-y-1">
                  <div className="text-xs text-muted-foreground truncate">{task.description}</div>
                  {progress !== null ? (
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                  ) : (
                    <Progress value={0} className="h-1.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <StatusIndicator />

      {/* Footer */}
      <div className="border-t px-3 py-2.5">
        <p className="text-xs text-muted-foreground/70">
          v{import.meta.env.VITE_APP_VERSION || '0.1.0'}
        </p>
      </div>
    </div>
  );
}
