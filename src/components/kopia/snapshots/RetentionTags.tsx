/**
 * Retention Tags Component - Display retention policy tags for snapshots
 *
 * Shows visual badges for snapshots protected by retention policies
 * (latest-N, hourly-N, daily-N, weekly-N, monthly-N, yearly-N, annual-N)
 */

import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, CalendarDays } from 'lucide-react';

interface RetentionTagsProps {
  retention?: string[];
  className?: string;
}

const getRetentionIcon = (tag: string) => {
  if (tag.startsWith('latest')) return Clock;
  if (tag.startsWith('hourly') || tag.startsWith('daily')) return Clock;
  if (tag.startsWith('weekly') || tag.startsWith('monthly')) return Calendar;
  if (tag.startsWith('yearly') || tag.startsWith('annual')) return CalendarDays;
  return Calendar;
};

const getRetentionVariant = (tag: string): 'default' | 'secondary' | 'outline' => {
  if (tag.startsWith('latest')) return 'default';
  if (tag.startsWith('hourly') || tag.startsWith('daily')) return 'secondary';
  return 'outline';
};

export function RetentionTags({ retention, className }: RetentionTagsProps) {
  if (!retention || retention.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className || ''}`}>
      {retention.map((tag) => {
        const Icon = getRetentionIcon(tag);
        const variant = getRetentionVariant(tag);

        return (
          <Badge key={tag} variant={variant} className="gap-1 text-xs">
            <Icon className="h-3 w-3" />
            {tag}
          </Badge>
        );
      })}
    </div>
  );
}
