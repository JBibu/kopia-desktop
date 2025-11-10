/**
 * Snapshots page - Browse and manage snapshot sources
 *
 * This page displays a list of sources (user@host:/path combinations) that have snapshots.
 * Click on a source to view its snapshot history and manage individual snapshots.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useSnapshots } from '@/hooks/useSnapshots';
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
  FolderArchive,
  RefreshCw,
  Search,
  Calendar,
  HardDrive,
  AlertCircle,
  ChevronRight,
  XCircle,
  Plus,
} from 'lucide-react';
import type { SnapshotSource } from '@/lib/kopia/types';
import { cancelSnapshot } from '@/lib/kopia/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia/errors';
import { formatBytes, formatDateTime } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language';

export function Snapshots() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const { sources, isLoading, error, refreshAll } = useSnapshots();

  // Map language code to locale
  const locale = language === 'es' ? 'es-ES' : 'en-US';

  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = async () => {
    await refreshAll();
  };

  const handleViewSource = (source: SnapshotSource) => {
    const params = new URLSearchParams({
      userName: source.source.userName,
      host: source.source.host,
      path: source.source.path,
    });
    void navigate(`/snapshots/history?${params.toString()}`);
  };

  const handleCancelSnapshot = async (source: SnapshotSource, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click

    try {
      await cancelSnapshot(source.source.userName, source.source.host, source.source.path);
      toast.success(t('snapshots.snapshotCancelled'), {
        description: t('snapshots.snapshotCancelledDescription'),
      });
      // Refresh sources to show updated status
      await refreshAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const filteredSources = sources.filter((source) => {
    const sourceString = `${source.source.userName}@${source.source.host}:${source.source.path}`;
    return (
      searchQuery === '' ||
      sourceString.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.source.path.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('snapshots.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('snapshots.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void navigate('/snapshots/create')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('snapshots.createSnapshot')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRefresh()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('snapshots.sources')}</CardTitle>
              <CardDescription>
                {t('snapshots.sourcesFound', { count: filteredSources.length })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('snapshots.searchPlaceholder')}
                  className="pl-8 w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && sources.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderArchive className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('snapshots.noSourcesFound')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? t('snapshots.noSourcesMatch') : t('snapshots.createFirst')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('snapshots.path')}</TableHead>
                  <TableHead>{t('snapshots.owner')}</TableHead>
                  <TableHead>{t('snapshots.status')}</TableHead>
                  <TableHead>{t('snapshots.lastSnapshot')}</TableHead>
                  <TableHead className="text-right">{t('snapshots.size')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSources.map((source, idx) => (
                  <TableRow
                    key={idx}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewSource(source)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FolderArchive className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium truncate max-w-[300px]">
                          {source.source.path}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {source.source.userName}@{source.source.host}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          source.status === 'IDLE'
                            ? 'secondary'
                            : source.status === 'UPLOADING'
                              ? 'default'
                              : 'outline'
                        }
                      >
                        {source.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {source.lastSnapshot ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {formatDateTime(source.lastSnapshot.startTime, locale)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {t('snapshots.noSnapshots')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {source.lastSnapshot?.summary?.totalFileSize ? (
                        <div className="flex items-center justify-end gap-2">
                          <HardDrive className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {formatBytes(source.lastSnapshot.summary.totalFileSize)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {source.status === 'UPLOADING' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => void handleCancelSnapshot(source, e)}
                            title={t('snapshots.cancelSnapshot')}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewSource(source);
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
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
    </div>
  );
}
