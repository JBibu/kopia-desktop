/**
 * Snapshot Browse page - Browse files and directories within a snapshot
 *
 * This page allows users to navigate through snapshot contents,
 * view file/directory details, and download individual files.
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
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
import { PageHeader, type BreadcrumbItemType } from '@/components/layout/PageHeader';
import type { DirectoryEntry } from '@/lib/kopia';
import { browseObject, downloadObject, saveFile, selectFolder, restoreStart } from '@/lib/kopia';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia';
import { formatBytes, formatDateTime } from '@/lib/utils';
import { usePreferencesStore, useProfilesStore } from '@/stores';
import { useCurrentRepoId, useMounts, useSnapshots } from '@/hooks';

export function SnapshotBrowse() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const locale = usePreferencesStore((state) => state.getLocale());
  const byteFormat = usePreferencesStore((state) => state.byteFormat);
  const {
    getMountForObject,
    mount: mountSnapshot,
    unmount: unmountSnapshot,
    isLoading: isMountLoading,
  } = useMounts();
  const currentRepoId = useCurrentRepoId();
  const { snapshots } = useSnapshots();

  const snapshotId = searchParams.get('snapshotId') || '';
  const objectId = searchParams.get('oid') || '';
  const rootOid = searchParams.get('rootOid') || objectId;
  const pathParam = searchParams.get('path') || '/';
  const profileId = searchParams.get('profileId') || '';
  const sourcePath = searchParams.get('sourcePath') || '';

  const profile = useProfilesStore((state) => state.profiles.find((p) => p.id === profileId));

  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());

  const mountedPath = getMountForObject(objectId);

  // Get snapshot info for display
  const snapshotInfo = useMemo(() => {
    return snapshots.find((s) => s.id === snapshotId);
  }, [snapshots, snapshotId]);

  useEffect(() => {
    if (pathParam === '/') {
      setCurrentPath([]);
    } else {
      setCurrentPath(pathParam.split('/').filter(Boolean));
    }
  }, [pathParam]);

  const fetchDirectory = async (oid: string) => {
    if (!currentRepoId) {
      setError(t('browse.noRepositorySelected'));
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const response = await browseObject(currentRepoId, oid);
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
      const newPath = [...currentPath, entry.name].join('/');
      const params = new URLSearchParams({
        snapshotId,
        oid: entry.obj,
        rootOid,
        path: `/${newPath}`,
      });
      if (profileId) params.set('profileId', profileId);
      if (sourcePath) params.set('sourcePath', sourcePath);
      setSearchParams(params);
    }
  };

  const handleNavigateToPathSegment = (index: number) => {
    if (index === -1) {
      // Navigate to snapshot root
      const params = new URLSearchParams({
        snapshotId,
        oid: rootOid,
        rootOid,
        path: '/',
      });
      if (profileId) params.set('profileId', profileId);
      if (sourcePath) params.set('sourcePath', sourcePath);
      setSearchParams(params);
    } else {
      // Navigate to specific folder level using browser back
      const stepsBack = currentPath.length - index - 1;
      if (stepsBack > 0) {
        void navigate(-stepsBack);
      }
    }
  };

  const handleDownloadFile = async (entry: DirectoryEntry) => {
    if (entry.type !== 'f') {
      toast.error(t('browse.cannotDownloadDirectory'));
      return;
    }

    try {
      setDownloadingFiles((prev) => new Set(prev).add(entry.obj));

      const targetPath = await saveFile(entry.name);
      if (!targetPath) {
        setDownloadingFiles((prev) => {
          const next = new Set(prev);
          next.delete(entry.obj);
          return next;
        });
        return;
      }

      if (!currentRepoId) {
        toast.error(t('browse.noRepositorySelected'));
        return;
      }
      await downloadObject(currentRepoId, entry.obj, entry.name, targetPath);

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

      const parentPath = await selectFolder();
      if (!parentPath) {
        setDownloadingFiles((prev) => {
          const next = new Set(prev);
          next.delete(entry.obj);
          return next;
        });
        return;
      }

      const targetPath = `${parentPath}/${entry.name}`;

      if (!currentRepoId) {
        toast.error(t('browse.noRepositorySelected'));
        return;
      }

      const taskId = await restoreStart(currentRepoId, {
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
          restoreDirEntryAtDepth: 2147483647,
          minSizeForPlaceholder: 2147483647,
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

      if (!currentRepoId) {
        toast.error(t('browse.noRepositorySelected'));
        return;
      }

      const taskId = await restoreStart(currentRepoId, {
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

      if (!currentRepoId) {
        toast.error(t('browse.noRepositorySelected'));
        return;
      }

      const taskId = await restoreStart(currentRepoId, {
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
    if (a.type === 'd' && b.type !== 'd') return -1;
    if (a.type !== 'd' && b.type === 'd') return 1;
    return a.name.localeCompare(b.name);
  });

  // Build breadcrumbs with profile context
  const breadcrumbs: BreadcrumbItemType[] = useMemo(() => {
    const crumbs: BreadcrumbItemType[] = [{ label: t('nav.profiles'), path: '/profiles' }];

    if (profile && profileId) {
      crumbs.push({ label: profile.name, path: `/profiles/${profileId}` });
    }

    if (sourcePath) {
      const dirName = sourcePath.split('/').filter(Boolean).pop() || sourcePath;
      const sourceParams = new URLSearchParams();
      if (snapshotInfo?.source) {
        sourceParams.set('userName', snapshotInfo.source.userName || '');
        sourceParams.set('host', snapshotInfo.source.host || '');
        sourceParams.set('path', sourcePath);
      }
      crumbs.push({
        label: dirName,
        path: profileId ? `/profiles/${profileId}/history?${sourceParams.toString()}` : undefined,
      });
    }

    // Add snapshot time as breadcrumb
    if (snapshotInfo) {
      crumbs.push({
        label: formatDateTime(snapshotInfo.startTime, locale),
        onClick: () => handleNavigateToPathSegment(-1),
      });
    }

    // Add path segments
    currentPath.forEach((segment, index) => {
      if (index === currentPath.length - 1) {
        crumbs.push({ label: segment });
      } else {
        crumbs.push({
          label: segment,
          onClick: () => handleNavigateToPathSegment(index),
        });
      }
    });

    return crumbs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, profileId, sourcePath, snapshotInfo, currentPath, locale, t]);

  // Title for current location
  const pageTitle =
    currentPath.length > 0
      ? currentPath[currentPath.length - 1]
      : snapshotInfo
        ? formatDateTime(snapshotInfo.startTime, locale)
        : t('browse.title');

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        subtitle={pathParam === '/' ? t('browse.snapshotRoot') : pathParam}
        breadcrumbs={breadcrumbs}
        showBack={currentPath.length > 0}
        onBack={() => void navigate(-1)}
        actions={
          <Button onClick={handleRestore}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('browse.restore')}
          </Button>
        }
      />

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
