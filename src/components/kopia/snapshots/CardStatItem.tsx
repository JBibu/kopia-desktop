import type { LucideIcon } from 'lucide-react';

interface CardStatItemProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  className?: string;
}

/**
 * Reusable stat item for snapshot cards.
 * Displays an icon, label, and value in a compact format.
 */
export function CardStatItem({ icon: Icon, label, value, className }: CardStatItemProps) {
  return (
    <div className={`flex items-center gap-2 text-sm ${className ?? ''}`}>
      <div className="p-1 rounded bg-muted/30">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}
