/**
 * ProfilesTable - Table view for backup profiles
 */

import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  PlayCircle,
  Pin,
  FolderOpen,
  Settings2,
} from 'lucide-react';
import type { BackupProfile, Snapshot } from '@/lib/kopia';
import { formatDistanceToNow } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { getPolicyPreset, type PolicyPresetId } from '@/lib/kopia/policy-presets';

interface ProfilesTableProps {
  profiles: BackupProfile[];
  snapshots: Snapshot[];
  onEdit: (profile: BackupProfile) => void;
  onDelete: (profile: BackupProfile) => void;
  onDuplicate: (profile: BackupProfile) => void;
  onBackupNow: (profile: BackupProfile) => void;
  onTogglePin: (profileId: string) => void;
  onRowClick: (profile: BackupProfile) => void;
  onEditPolicy?: (profile: BackupProfile) => void; // Optional: for editing custom policies
}

export function ProfilesTable({
  profiles,
  snapshots,
  onEdit,
  onDelete,
  onDuplicate,
  onBackupNow,
  onTogglePin,
  onRowClick,
  onEditPolicy,
}: ProfilesTableProps) {
  const { t } = useTranslation();

  // Get snapshot stats for a profile
  const getProfileStats = (profile: BackupProfile) => {
    const profileSnapshots = snapshots.filter((s) =>
      profile.directories.includes(s.source?.path || '')
    );
    const sortedSnapshots = [...profileSnapshots].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    const lastSnapshotTime = sortedSnapshots[0]?.startTime || null;

    return { lastSnapshotTime };
  };

  if (profiles.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title={t('profiles.noProfilesFound')}
        description={t('profiles.createFirstProfile')}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('profiles.name')}</TableHead>
          <TableHead className="hidden md:table-cell">{t('profiles.description')}</TableHead>
          <TableHead>{t('profiles.directories')}</TableHead>
          <TableHead className="hidden lg:table-cell">{t('profiles.schedule')}</TableHead>
          <TableHead className="hidden sm:table-cell">{t('snapshots.lastBackup')}</TableHead>
          <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {profiles.map((profile) => {
          const { lastSnapshotTime } = getProfileStats(profile);
          const presetId = (profile.policyPreset || 'CUSTOM') as PolicyPresetId;
          const preset = getPolicyPreset(presetId);
          const isCustom = presetId === 'CUSTOM';

          return (
            <TableRow
              key={profile.id}
              className="cursor-pointer"
              onClick={() => onRowClick(profile)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{profile.name}</span>
                  {profile.pinned && <Pin className="h-3 w-3 fill-current text-muted-foreground" />}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="text-muted-foreground text-sm line-clamp-1">
                  {profile.description || '-'}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {profile.directories.length}{' '}
                  {t('profiles.directoriesCount', { count: profile.directories.length })}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Badge variant={isCustom ? 'outline' : 'default'}>{t(preset.nameKey)}</Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {lastSnapshotTime ? (
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(lastSnapshotTime))}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t('snapshots.noSnapshots')}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(profile);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      {t('common.edit')}
                    </DropdownMenuItem>
                    {isCustom && onEditPolicy && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPolicy(profile);
                        }}
                      >
                        <Settings2 className="h-4 w-4 mr-2" />
                        {t('profiles.editCustomPolicy')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(profile);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {t('profiles.duplicateProfile')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(profile.id);
                      }}
                    >
                      <Pin className="h-4 w-4 mr-2" />
                      {profile.pinned ? t('common.unpin') : t('common.pin')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onBackupNow(profile);
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
                        onDelete(profile);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('profiles.deleteProfile')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
