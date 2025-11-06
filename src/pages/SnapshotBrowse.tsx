/**
 * Snapshot Browse page - Browse files and directories within a snapshot
 *
 * This page allows users to navigate through snapshot contents,
 * view file/directory details, and download individual files.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  ArrowLeft,
  Folder,
  File,
  Download,
  HardDrive,
  Calendar,
  AlertCircle,
  Home,
  ChevronRight,
} from 'lucide-react';
import type { DirectoryEntry } from '@/lib/kopia/types';
import { browseObject } from '@/lib/kopia/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia/errors';
import { formatBytes, formatDateTime } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language';

export function SnapshotBrowse() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguageStore();

  // Map language code to locale
  const locale = language === 'es' ? 'es-ES' : 'en-US';

  const snapshotId = searchParams.get('snapshotId') || '';
  const objectId = searchParams.get('oid') || '';
  const pathParam = searchParams.get('path') || '/';

  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse the path parameter into breadcrumb segments
  useEffect(() => {
    if (pathParam === '/') {
      setCurrentPath([]);
    } else {
      setCurrentPath(pathParam.split('/').filter(Boolean));
    }
  }, [pathParam]);

  const fetchDirectory = async (oid: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await browseObject(oid);
      setEntries(response.entries || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (objectId) {
      void fetchDirectory(objectId);
    } else {
      setError('No object ID provided');
      setIsLoading(false);
    }
  }, [objectId]);

  const handleNavigateToEntry = (entry: DirectoryEntry) => {
    if (entry.type === 'd') {
      // Navigate to directory
      const newPath = [...currentPath, entry.name].join('/');
      setSearchParams({
        snapshotId,
        oid: entry.obj,
        path: `/${newPath}`,
      });
    } else {
      // For files, show download option
      toast.info('File download will be implemented in a future update');
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Navigate to root
      const rootOid = searchParams.get('rootOid') || objectId;
      setSearchParams({
        snapshotId,
        oid: rootOid,
        path: '/',
      });
    } else {
      // Navigate to specific path segment
      // Note: We can't easily navigate up without storing the parent OID
      // This would require enhanced breadcrumb tracking
      toast.info('Navigate up by using the back button for now');
    }
  };

  const handleBack = () => {
    void navigate(-1);
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'd':
        return <Folder className="h-4 w-4 text-blue-500" />;
      case 'f':
        return <File className="h-4 w-4 text-gray-500" />;
      case 's':
        return <File className="h-4 w-4 text-purple-500" />;
      default:
        return <File className="h-4 w-4 text-gray-400" />;
    }
  };

  const getFileTypeName = (type: string) => {
    switch (type) {
      case 'd':
        return t('browse.directory');
      case 'f':
        return t('browse.file');
      case 's':
        return t('browse.symlink');
      case 'c':
        return t('browse.charDevice');
      case 'b':
        return t('browse.blockDevice');
      case 'p':
        return t('browse.pipe');
      default:
        return t('browse.unknown');
    }
  };

  const sortedEntries = [...entries].sort((a, b) => {
    // Directories first
    if (a.type === 'd' && b.type !== 'd') return -1;
    if (a.type !== 'd' && b.type === 'd') return 1;
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{t('browse.title')}</h1>
          </div>
          <div className="pl-10">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => handleBreadcrumbClick(-1)}
              >
                <Home className="h-3 w-3" />
              </Button>
              {currentPath.map((segment, index) => (
                <div key={index} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-sm"
                    onClick={() => handleBreadcrumbClick(index)}
                  >
                    {segment}
                  </Button>
                </div>
              ))}
            </div>
          </div>
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
              <CardTitle className="text-base">{t('browse.contents')}</CardTitle>
              <CardDescription>
                {t('browse.itemsFound', { count: sortedEntries.length })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderArchive className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('browse.emptyDirectory')}</h3>
              <p className="text-sm text-muted-foreground">{t('browse.emptyDirectoryDesc')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>{t('browse.name')}</TableHead>
                  <TableHead>{t('browse.type')}</TableHead>
                  <TableHead className="text-right">{t('browse.size')}</TableHead>
                  <TableHead>{t('browse.modified')}</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.map((entry) => (
                  <TableRow
                    key={entry.obj}
                    className={entry.type === 'd' ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={() => entry.type === 'd' && handleNavigateToEntry(entry)}
                  >
                    <TableCell>{getFileTypeIcon(entry.type)}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span
                          className={entry.type === 'd' ? 'text-blue-600 dark:text-blue-400' : ''}
                        >
                          {entry.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getFileTypeName(entry.type)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.type === 'd' ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-muted-foreground">
                            {entry.summ?.files || 0} {t('browse.files')}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <HardDrive className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{formatBytes(entry.size ?? 0)}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatDateTime(entry.mtime, locale)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.type === 'f' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToEntry(entry);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
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
