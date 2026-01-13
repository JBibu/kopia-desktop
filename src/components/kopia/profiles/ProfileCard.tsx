/**
 * ProfileCard - Card view for a backup profile
 * Used on Dashboard and Profiles pages
 */

import { useTranslation } from 'react-i18next';
import {
  FolderArchive,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  PlayCircle,
  Pin,
  Clock,
  HardDrive,
  Settings2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BackupProfile, Snapshot } from '@/lib/kopia';
import { formatDistanceToNow, formatBytes } from '@/lib/utils';
import { getPolicyPreset, type PolicyPresetId } from '@/lib/kopia/policy-presets';
import { cn } from '@/lib/utils/cn';

interface ProfileCardProps {
  profile: BackupProfile;
  snapshots: Snapshot[];
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBackupNow: () => void;
  onTogglePin: () => void;
  onEditPolicy?: () => void;
  /** Compact mode for dashboard display */
  compact?: boolean;
}

export function ProfileCard({
  profile,
  snapshots,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
  onBackupNow,
  onTogglePin,
  onEditPolicy,
  compact = false,
}: ProfileCardProps) {
  const { t } = useTranslation();

  // Calculate stats for this profile
  const profileSnapshots = snapshots.filter((s) =>
    profile.directories.includes(s.source?.path || '')
  );
  const sortedSnapshots = [...profileSnapshots].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
  const lastSnapshotTime = sortedSnapshots[0]?.startTime || null;
  const totalSize = profileSnapshots.reduce((sum, s) => sum + (s.summary?.size || 0), 0);

  const presetId = (profile.policyPreset || 'CUSTOM') as PolicyPresetId;
  const preset = getPolicyPreset(presetId);
  const isCustom = presetId === 'CUSTOM';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
        compact ? 'h-full' : ''
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FolderArchive className="h-4 w-4 shrink-0 text-muted-foreground" />
            <CardTitle className="text-base font-semibold truncate">{profile.name}</CardTitle>
            {profile.pinned && (
              <Pin className="h-3 w-3 shrink-0 fill-current text-muted-foreground" />
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                {t('common.edit')}
              </DropdownMenuItem>
              {isCustom && onEditPolicy && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditPolicy();
                  }}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  {t('profiles.editCustomPolicy')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                {t('profiles.duplicateProfile')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin();
                }}
              >
                <Pin className="h-4 w-4 mr-2" />
                {profile.pinned ? t('common.unpin') : t('common.pin')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onBackupNow();
                }}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {t('profiles.backupNow')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('profiles.deleteProfile')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {profile.description && !compact && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{profile.description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Stats row */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              {profile.directories.length}{' '}
              {t('profiles.directoriesCount', { count: profile.directories.length })}
            </Badge>
            <Badge variant={isCustom ? 'outline' : 'default'} className="text-xs">
              {t(preset.nameKey)}
            </Badge>
          </div>

          {/* Details */}
          {!compact && (
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {lastSnapshotTime ? (
                  <span>{formatDistanceToNow(new Date(lastSnapshotTime))}</span>
                ) : (
                  <span>{t('snapshots.noSnapshots')}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <HardDrive className="h-3 w-3" />
                <span>{formatBytes(totalSize)}</span>
              </div>
            </div>
          )}

          {/* Quick action button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onBackupNow();
            }}
          >
            <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
            {t('profiles.backupNow')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
