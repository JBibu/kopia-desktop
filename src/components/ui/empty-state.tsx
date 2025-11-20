import { LucideIcon } from 'lucide-react';
import { Button } from './button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

/**
 * Reusable empty state component for displaying "no data" states
 * with an icon, title, optional description, and optional action button.
 *
 * @example
 * <EmptyState
 *   icon={FolderArchive}
 *   title="No snapshots found"
 *   description="Create your first snapshot to get started"
 *   action={{
 *     label: "Create Snapshot",
 *     onClick: () => navigate('/snapshots/create'),
 *     icon: Plus
 *   }}
 * />
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 text-center ${className || ''}`}
    >
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-4 max-w-md">{description}</p>}
      {action && (
        <Button onClick={action.onClick}>
          {action.icon && <action.icon className="mr-2 h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
