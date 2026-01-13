/**
 * Repository Selector - Dropdown to switch between repositories
 *
 * Shows current repository with status indicator and allows
 * switching between connected repositories or adding new ones.
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Database, ChevronDown, Plus, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useRepositories, useCurrentRepository } from '@/hooks';
import { cn } from '@/lib/utils/cn';
import type { RepositoryEntry } from '@/lib/kopia';

interface RepositorySelectorProps {
  className?: string;
  collapsed?: boolean;
}

function getStatusIcon(repo: RepositoryEntry) {
  switch (repo.status) {
    case 'running':
      return <span className="h-2 w-2 rounded-full bg-success" />;
    case 'starting':
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    case 'error':
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    default:
      return <span className="h-2 w-2 rounded-full bg-muted-foreground" />;
  }
}

export function RepositorySelector({ className, collapsed }: RepositorySelectorProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { repositories, setCurrentRepository } = useRepositories();
  const currentRepo = useCurrentRepository();

  const handleSelectRepository = (repoId: string) => {
    void setCurrentRepository(repoId);
  };

  const handleAddRepository = () => {
    void navigate('/repository?tab=connect');
  };

  const handleManageRepositories = () => {
    void navigate('/repository?tab=switch');
  };

  // If collapsed, show only icon
  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={cn('h-9 w-9', className)}>
            <Database className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <RepositorySelectorContent
            repositories={repositories}
            currentRepo={currentRepo}
            onSelect={handleSelectRepository}
            onAdd={handleAddRepository}
            onManage={handleManageRepositories}
            t={t}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'h-auto w-full justify-between px-2 py-1.5 text-left font-normal',
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Database className="h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {currentRepo?.displayName || t('repositories.noRepository')}
              </p>
              {currentRepo && (
                <p className="text-xs text-muted-foreground truncate">{currentRepo.storage}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {currentRepo && getStatusIcon(currentRepo)}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <RepositorySelectorContent
          repositories={repositories}
          currentRepo={currentRepo}
          onSelect={handleSelectRepository}
          onAdd={handleAddRepository}
          onManage={handleManageRepositories}
          t={t}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface RepositorySelectorContentProps {
  repositories: RepositoryEntry[];
  currentRepo: RepositoryEntry | null;
  onSelect: (repoId: string) => void;
  onAdd: () => void;
  onManage: () => void;
  t: (key: string) => string;
}

function RepositorySelectorContent({
  repositories,
  currentRepo,
  onSelect,
  onAdd,
  onManage,
  t,
}: RepositorySelectorContentProps) {
  return (
    <>
      <DropdownMenuLabel>{t('repositories.selectRepository')}</DropdownMenuLabel>
      <DropdownMenuSeparator />

      {repositories.length === 0 ? (
        <div className="px-2 py-3 text-sm text-muted-foreground text-center">
          {t('repositories.noRepositories')}
        </div>
      ) : (
        repositories.map((repo) => (
          <DropdownMenuItem
            key={repo.id}
            onClick={() => onSelect(repo.id)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {getStatusIcon(repo)}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{repo.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{repo.storage}</p>
              </div>
            </div>
            {currentRepo?.id === repo.id && <Check className="h-4 w-4 shrink-0" />}
          </DropdownMenuItem>
        ))
      )}

      <DropdownMenuSeparator />

      <DropdownMenuItem onClick={onAdd} className="cursor-pointer">
        <Plus className="h-4 w-4 mr-2" />
        {t('repositories.addRepository')}
      </DropdownMenuItem>

      <DropdownMenuItem onClick={onManage} className="cursor-pointer">
        <Database className="h-4 w-4 mr-2" />
        {t('repositories.manageRepositories')}
      </DropdownMenuItem>
    </>
  );
}
