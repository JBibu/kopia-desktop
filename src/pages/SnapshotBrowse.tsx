/**
 * Snapshot Browse page - Browse files and directories within a snapshot
 *
 * This page allows users to navigate through snapshot contents,
 * view file/directory details, and download individual files.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FolderArchive,
  Folder,
  File,
  Download,
  HardDrive,
  Calendar,
  AlertCircle,
  RotateCcw,
  HardDriveDownload,
  HardDriveUpload,
  Copy,
  FolderOpen,
  FileArchive,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { DirectoryEntry } from '@/lib/kopia/types';
import {
  browseObject,
  downloadObject,
  saveFile,
  selectFolder,
  restoreStart,
} from '@/lib/kopia/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia/errors';
import { formatBytes, formatDateTime } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language';
import { usePreferencesStore } from '@/stores/preferences';
import { useKopiaStore } from '@/stores/kopia';

export function SnapshotBrowse() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguageStore();
  const byteFormat = usePreferencesStore((state) => state.byteFormat);
  const getMountForObject = useKopiaStore((state) => state.getMountForObject);
  const mountSnapshot = useKopiaStore((state) => state.mountSnapshot);
  const unmountSnapshot = useKopiaStore((state) => state.unmountSnapshot);
  const isMountLoading = useKopiaStore((state) => state.isMountsLoading);

  // Map language code to locale
  const locale = language === 'es' ? 'es-ES' : 'en-US';

  const snapshotId = searchParams.get('snapshotId') || '';
  const objectId = searchParams.get('oid') || '';
  const pathParam = searchParams.get('path') || '/';

  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());

  // Check if current object is mounted
  const mountedPath = getMountForObject(objectId);

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
      setError(t('browse.noObjectId'));
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }
  };

  const handleDownloadFile = async (entry: DirectoryEntry) => {
    if (entry.type !== 'f') {
      toast.error(t('browse.cannotDownloadDirectory'));
      return;
    }

    try {
      // Mark file as downloading
      setDownloadingFiles((prev) => new Set(prev).add(entry.obj));

      // Get download location from user with save dialog
      const targetPath = await saveFile(entry.name);
      if (!targetPath) {
        // User cancelled
        setDownloadingFiles((prev) => {
          const next = new Set(prev);
          next.delete(entry.obj);
          return next;
        });
        return;
      }

      // Download the file
      await downloadObject(entry.obj, entry.name, targetPath);

      toast.success(t('browse.downloadSuccess', { filename: entry.name }));
    } catch (err) {
      toast.error(t('browse.downloadFailed', { error: getErrorMessage(err) }));
    } finally {
      setDownloadingFiles((prev) => {
        const next = new Set(prev);
        next.delete(entry.obj);
        return next;
      });
    }
  };

  const handleDownloadFolderAsFilesystem = async (entry: DirectoryEntry) => {
    try {
      setDownloadingFiles((prev) => new Set(prev).add(entry.obj));

      // Get download location from user (parent directory)
      const parentPath = await selectFolder();

      if (!parentPath) {
        setDownloadingFiles((prev) => {
          const next = new Set(prev);
          next.delete(entry.obj);
          return next;
        });
        return;
      }

      // Create a subdirectory with the folder name
      // This ensures we don't overwrite an existing non-empty directory
      // User selects /home/user/Desktop -> contents go to /home/user/Desktop/foldername
      const targetPath = `${parentPath}/${entry.name}`;

      // Start restore operation
      const taskId = await restoreStart({
        root: entry.obj,
        fsOutput: {
          targetPath,
          overwriteFiles: false,
          overwriteDirectories: false,
          ignorePermissionErrors: true,
        },
        options: {
          incremental: false,
          ignoreErrors: false,
          restoreDirEntryAtDepth: 2147483647, // Max int32 - never use shallow restore
          minSizeForPlaceholder: 2147483647, // Max int32 - never create placeholder files
        },
      });

      toast.success(
        t('browse.downloadFolderStarted', {
          foldername: entry.name,
          taskId,
        })
      );
    } catch (err) {
      toast.error(t('browse.downloadFailed', { error: getErrorMessage(err) }));
    } finally {
      setDownloadingFiles((prev) => {
        const next = new Set(prev);
        next.delete(entry.obj);
        return next;
      });
    }
  };

  const handleDownloadFolderAsZip = async (entry: DirectoryEntry) => {
    try {
      setDownloadingFiles((prev) => new Set(prev).add(entry.obj));

      // Get save location with .zip extension
      const defaultFilename = `${entry.name}.zip`;
      const targetPath = await saveFile(defaultFilename);
      if (!targetPath) {
        setDownloadingFiles((prev) => {
          const next = new Set(prev);
          next.delete(entry.obj);
          return next;
        });
        return;
      }

      // Start restore operation as ZIP
      const taskId = await restoreStart({
        root: entry.obj,
        zipFile: targetPath,
        uncompressedZip: false,
      });

      toast.success(
        t('browse.downloadFolderStarted', {
          foldername: entry.name,
          taskId,
        })
      );
    } catch (err) {
      toast.error(t('browse.downloadFailed', { error: getErrorMessage(err) }));
    } finally {
      setDownloadingFiles((prev) => {
        const next = new Set(prev);
        next.delete(entry.obj);
        return next;
      });
    }
  };

  const handleDownloadFolderAsTar = async (entry: DirectoryEntry) => {
    try {
      setDownloadingFiles((prev) => new Set(prev).add(entry.obj));

      // Get save location with .tar extension
      const defaultFilename = `${entry.name}.tar`;
      const targetPath = await saveFile(defaultFilename);
      if (!targetPath) {
        setDownloadingFiles((prev) => {
          const next = new Set(prev);
          next.delete(entry.obj);
          return next;
        });
        return;
      }

      // Start restore operation as TAR
      const taskId = await restoreStart({
        root: entry.obj,
        tarFile: targetPath,
      });

      toast.success(
        t('browse.downloadFolderStarted', {
          foldername: entry.name,
          taskId,
        })
      );
    } catch (err) {
      toast.error(t('browse.downloadFailed', { error: getErrorMessage(err) }));
    } finally {
      setDownloadingFiles((prev) => {
        const next = new Set(prev);
        next.delete(entry.obj);
        return next;
      });
    }
  };

  const handleRestore = () => {
    // Navigate to restore page with current context
    void navigate(
      `/snapshots/restore?snapshotId=${snapshotId}&oid=${objectId}&path=${encodeURIComponent(pathParam)}`
    );
  };

  const handleMount = async () => {
    try {
      const path = await mountSnapshot(objectId);
      if (path) {
        toast.success(t('browse.mountSuccess', { path }));
      }
    } catch (err) {
      toast.error(t('browse.mountFailed', { error: getErrorMessage(err) }));
    }
  };

  const handleUnmount = async () => {
    try {
      await unmountSnapshot(objectId);
      toast.success(t('browse.unmountSuccess'));
    } catch (err) {
      toast.error(t('browse.unmountFailed', { error: getErrorMessage(err) }));
    }
  };

  const handleCopyPath = () => {
    if (mountedPath) {
      void navigator.clipboard.writeText(mountedPath);
      toast.success(t('browse.pathCopied'));
    }
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
            <BreadcrumbPage>{t('browse.title')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('browse.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {currentPath.length === 0 ? '/' : `/${currentPath.join('/')}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRestore}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('browse.restore')}
          </Button>
        </div>
      </div>

      {/* Mount Controls */}
      {mountedPath ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <HardDriveUpload className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium">{t('browse.mounted')}</span>
                <Input readOnly value={mountedPath} className="flex-1 font-mono text-sm" />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPath}
                title={t('browse.copyPath')}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleUnmount()}
                disabled={isMountLoading}
              >
                {isMountLoading ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <HardDriveDownload className="h-4 w-4 mr-2" />
                )}
                {t('browse.unmount')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('browse.notMounted')}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleMount()}
                disabled={isMountLoading}
              >
                {isMountLoading ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <HardDriveUpload className="h-4 w-4 mr-2" />
                )}
                {t('browse.mountAsLocal')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
            <EmptyState
              icon={FolderArchive}
              title={t('browse.emptyDirectory')}
              description={t('browse.emptyDirectoryDesc')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>{t('browse.name')}</TableHead>
                  <TableHead>{t('browse.type')}</TableHead>
                  <TableHead className="text-right">{t('browse.size')}</TableHead>
                  <TableHead>{t('browse.modified')}</TableHead>
                  <TableHead className="w-[120px]">{t('snapshots.actions')}</TableHead>
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
                          <span className="text-sm">
                            {formatBytes(entry.size ?? 0, 2, byteFormat)}
                          </span>
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
                      <div className="flex items-center justify-center">
                        {entry.type === 'f' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={downloadingFiles.has(entry.obj)}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDownloadFile(entry);
                            }}
                            title={t('browse.download')}
                          >
                            {downloadingFiles.has(entry.obj) ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        ) : entry.type === 'd' ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={downloadingFiles.has(entry.obj)}
                                onClick={(e) => e.stopPropagation()}
                                title={t('browse.downloadFolder')}
                              >
                                {downloadingFiles.has(entry.obj) ? (
                                  <Spinner className="h-4 w-4" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDownloadFolderAsFilesystem(entry);
                                }}
                              >
                                <Folder className="mr-2 h-4 w-4" />
                                {t('browse.downloadAsFolder')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDownloadFolderAsZip(entry);
                                }}
                              >
                                <FileArchive className="mr-2 h-4 w-4" />
                                {t('browse.downloadAsZip')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDownloadFolderAsTar(entry);
                                }}
                              >
                                <FileArchive className="mr-2 h-4 w-4" />
                                {t('browse.downloadAsTar')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
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
