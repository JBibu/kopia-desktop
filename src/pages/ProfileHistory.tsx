/**
 * Profile History page - View all snapshots for a profile's directories
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  FolderArchive,
  RefreshCw,
  Search,
  Calendar,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FolderOpen,
  RotateCcw,
  Pin,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatBytes, formatDateTime } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language';
import { useKopiaStore } from '@/stores/kopia';
import { useProfilesStore } from '@/stores/profiles';
import { navigateToSnapshotBrowse, navigateToSnapshotRestore } from '@/lib/utils/navigation';
import { PinDialog } from '@/components/kopia/snapshots/PinDialog';
import { RetentionTags } from '@/components/kopia/snapshots/RetentionTags';

export function ProfileHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId: string }>();
  const { language } = useLanguageStore();
  const locale = language === 'es' ? 'es-ES' : 'en-US';

  const profile = useProfilesStore((state) => state.profiles.find((p) => p.id === profileId));
  const refreshSnapshots = useKopiaStore((state) => state.refreshSnapshots);
  const refreshSources = useKopiaStore((state) => state.refreshSources);
  const isSnapshotsLoading = useKopiaStore((state) => state.isSnapshotsLoading);
  const snapshotsError = useKopiaStore((state) => state.snapshotsError);
  const storeSnapshots = useKopiaStore((state) => state.snapshots);

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pinDialogSnapshot, setPinDialogSnapshot] = useState<{
    id: string;
    pins: string[];
  } | null>(null);

  // Filter snapshots that belong to this profile's directories
  const profileSnapshots = storeSnapshots.filter((snapshot) => {
    if (!profile) return false;

    // Check if the snapshot's source path is in the profile's directories
    const snapshotPath = snapshot.source?.path;
    if (!snapshotPath) return false;

    return profile.directories.includes(snapshotPath);
  });

  const filteredSnapshots = profileSnapshots.filter((snapshot) => {
    return (
      searchQuery === '' ||
      snapshot.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snapshot.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snapshot.source?.path?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  useEffect(() => {
    // Refresh snapshots and sources when profileId changes
    void refreshSnapshots();
    void refreshSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshSnapshots(), refreshSources()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!profile) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('profiles.profileNotFound')}</AlertDescription>
        </Alert>
        <Button onClick={() => void navigate('/snapshots')}>{t('profiles.backToProfiles')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/snapshots">{t('nav.snapshots')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{profile.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('profiles.snapshotHistory')}</h1>
          <p className="text-sm text-muted-foreground">
            {profile.name}
            {profile.description && ` - ${profile.description}`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing || isSnapshotsLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing || isSnapshotsLoading ? 'animate-spin' : ''}`}
          />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Profile directories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('profiles.directories')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {profile.directories.map((directory, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{directory}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {snapshotsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{snapshotsError}</AlertDescription>
        </Alert>
      )}

      {/* Snapshots List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('snapshots.allSnapshots')}</CardTitle>
              <CardDescription>
                {t('snapshots.snapshotsFound', { count: filteredSnapshots.length })}
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('snapshots.searchSnapshotsPlaceholder')}
                className="pl-8 w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isSnapshotsLoading && filteredSnapshots.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : filteredSnapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderArchive className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('snapshots.noSnapshotsFound')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? t('snapshots.noSnapshotsMatch')
                  : t('profiles.noSnapshotsForProfile')}
              </p>
              <Button onClick={() => void navigate(`/snapshots/create?profileId=${profile.id}`)}>
                {t('profiles.createSnapshot')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('snapshots.status')}</TableHead>
                  <TableHead>{t('snapshots.directory')}</TableHead>
                  <TableHead>{t('snapshots.id')}</TableHead>
                  <TableHead>{t('snapshots.description')}</TableHead>
                  <TableHead>{t('snapshots.time')}</TableHead>
                  <TableHead className="text-right">{t('snapshots.size')}</TableHead>
                  <TableHead className="text-right">{t('snapshots.files')}</TableHead>
                  <TableHead>{t('snapshots.pins.pins')}</TableHead>
                  <TableHead>{t('snapshots.retention.retention')}</TableHead>
                  <TableHead className="w-[200px]">{t('snapshots.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSnapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell>
                      {snapshot.incomplete ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-mono">
                        {snapshot.source?.path || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {snapshot.id.slice(0, 12)}...
                    </TableCell>
                    <TableCell>
                      <span className="text-sm truncate max-w-[150px] block">
                        {snapshot.description || t('snapshots.noDescription')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {formatDateTime(snapshot.startTime, locale)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <HardDrive className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatBytes(snapshot.summary?.size || 0)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{snapshot.summary?.files || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      {snapshot.pins && snapshot.pins.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {snapshot.pins.map((pin) => (
                            <Badge key={pin} variant="secondary" className="gap-1">
                              <Pin className="h-3 w-3" />
                              {pin}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <RetentionTags retention={snapshot.retention} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!snapshot.rootID) {
                              toast.error(t('snapshots.cannotBrowse'), {
                                description: t('snapshots.cannotBrowseDesc'),
                              });
                              return;
                            }
                            navigateToSnapshotBrowse(
                              navigate,
                              snapshot.id,
                              snapshot.rootID,
                              snapshot.rootID,
                              '/'
                            );
                          }}
                          disabled={!snapshot.rootID}
                          title={
                            snapshot.rootID ? t('snapshots.browse') : t('snapshots.cannotBrowse')
                          }
                          aria-label={
                            snapshot.rootID ? t('snapshots.browse') : t('snapshots.cannotBrowse')
                          }
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!snapshot.rootID) {
                              toast.error(t('snapshots.cannotRestore'), {
                                description: t('snapshots.cannotRestoreDesc'),
                              });
                              return;
                            }
                            navigateToSnapshotRestore(navigate, snapshot.id, snapshot.rootID, '/');
                          }}
                          disabled={!snapshot.rootID}
                          title={
                            snapshot.rootID ? t('snapshots.restore') : t('snapshots.cannotRestore')
                          }
                          aria-label={
                            snapshot.rootID ? t('snapshots.restore') : t('snapshots.cannotRestore')
                          }
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPinDialogSnapshot({
                              id: snapshot.id,
                              pins: snapshot.pins || [],
                            })
                          }
                          title={t('snapshots.pins.managePins')}
                          aria-label={t('snapshots.pins.managePins')}
                        >
                          <Pin className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pin Management Dialog */}
      {pinDialogSnapshot && (
        <PinDialog
          open={!!pinDialogSnapshot}
          onOpenChange={(open) => !open && setPinDialogSnapshot(null)}
          snapshotId={pinDialogSnapshot.id}
          currentPins={pinDialogSnapshot.pins}
          onPinsUpdated={() => void refreshSnapshots()}
        />
      )}
    </div>
  );
}
