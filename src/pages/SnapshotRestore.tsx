/**
 * Snapshot Restore page - Restore files/directories from a snapshot
 *
 * This page allows users to restore snapshot contents to the filesystem,
 * with options for overwriting, permissions, and archive formats.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  FolderOpen,
  Download,
  FileArchive,
  AlertCircle,
  HardDrive,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import { restoreStart, browseObject } from '@/lib/kopia/client';
import { selectFolder } from '@/lib/kopia/client';
import type { RestoreRequest } from '@/lib/kopia/types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia/errors';
import { formatBytes } from '@/lib/utils';
import { useKopiaStore } from '@/stores/kopia';
import { usePreferencesStore } from '@/stores/preferences';
import { navigateBack } from '@/lib/utils/navigation';

type RestoreMode = 'filesystem' | 'zip' | 'tar';

export function SnapshotRestore() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const byteFormat = usePreferencesStore((state) => state.byteFormat);

  const snapshotId = searchParams.get('snapshotId') || '';
  const objectId = searchParams.get('oid') || '';
  const pathParam = searchParams.get('path') || '/';

  const [mode, setMode] = useState<RestoreMode>('filesystem');
  const [targetPath, setTargetPath] = useState('');
  const [zipFilePath, setZipFilePath] = useState('');
  const [tarFilePath, setTarFilePath] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreTaskId, setRestoreTaskId] = useState<string | null>(null);

  // Filesystem restore options
  const [overwriteFiles, setOverwriteFiles] = useState(false);
  const [overwriteDirectories, setOverwriteDirectories] = useState(false);
  const [overwriteSymlinks, setOverwriteSymlinks] = useState(false);
  const [skipOwners, setSkipOwners] = useState(false);
  const [skipPermissions, setSkipPermissions] = useState(false);
  const [skipTimes, setSkipTimes] = useState(false);
  const [ignorePermissionErrors, setIgnorePermissionErrors] = useState(true); // Critical: prevents chown errors
  const [writeFilesAtomically, setWriteFilesAtomically] = useState(false); // Matches official Kopia UI
  const [writeSparseFiles, setWriteSparseFiles] = useState(false);

  // General restore options
  const [ignoreErrors, setIgnoreErrors] = useState(false);
  const [incremental, setIncremental] = useState(false);
  const [uncompressedZip, setUncompressedZip] = useState(false);

  // Entry info
  const [estimatedSize, setEstimatedSize] = useState<number>(0);

  // Get tasks from store to show restore progress
  const tasks = useKopiaStore((state) => state.tasks);

  // Fetch entry info to display what we're restoring
  useEffect(() => {
    if (objectId) {
      browseObject(objectId)
        .then((response) => {
          if (response.entries && response.entries.length > 0) {
            // If browsing a directory, calculate total size
            const totalSize = response.entries.reduce((sum, entry) => {
              return sum + (entry.summ?.size || entry.size || 0);
            }, 0);
            setEstimatedSize(totalSize);
          }
        })
        .catch((err) => {
          // Silently fail - size estimation is optional
          if (import.meta.env.DEV) {
            console.error('Failed to fetch entry info:', err);
          }
        });
    }
  }, [objectId]);

  // Monitor restore task progress
  useEffect(() => {
    if (restoreTaskId && tasks.length > 0) {
      const restoreTask = tasks.find((task) => task.id === restoreTaskId);
      if (restoreTask) {
        if (restoreTask.status === 'SUCCESS') {
          toast.success(t('restore.restoreSuccess'));
          // Navigate to tasks page to see the completed task
          setTimeout(() => {
            void navigate('/tasks');
          }, 2000);
        } else if (restoreTask.status === 'FAILED') {
          toast.error(t('restore.restoreFailed', { error: restoreTask.errorMessage }));
        }
      }
    }
  }, [restoreTaskId, tasks, navigate, t]);

  const handleSelectFolder = async () => {
    try {
      const path = await selectFolder();
      if (path) {
        setTargetPath(path);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRestore = async () => {
    if (!objectId) {
      toast.error(t('restore.noObjectId'));
      return;
    }

    // Validate inputs based on mode
    if (mode === 'filesystem' && !targetPath) {
      toast.error(t('restore.selectTargetPath'));
      return;
    }

    if (mode === 'zip' && !zipFilePath) {
      toast.error(t('restore.enterZipPath'));
      return;
    }

    if (mode === 'tar' && !tarFilePath) {
      toast.error(t('restore.enterTarPath'));
      return;
    }

    try {
      setIsRestoring(true);

      const request: RestoreRequest = {
        root: objectId,
      };

      // Add mode-specific options
      if (mode === 'filesystem') {
        request.fsOutput = {
          targetPath,
          ...(overwriteFiles && { overwriteFiles }),
          ...(overwriteDirectories && { overwriteDirectories }),
          ...(overwriteSymlinks && { overwriteSymlinks }),
          ...(skipOwners && { skipOwners }),
          ...(skipPermissions && { skipPermissions }),
          ...(skipTimes && { skipTimes }),
          ...(ignorePermissionErrors && { ignorePermissionErrors }),
          ...(writeFilesAtomically && { writeFilesAtomically }),
          ...(writeSparseFiles && { writeSparseFiles }),
        };
      } else if (mode === 'zip') {
        request.zipFile = zipFilePath;
        if (uncompressedZip) {
          request.uncompressedZip = uncompressedZip;
        }
      } else if (mode === 'tar') {
        request.tarFile = tarFilePath;
      }

      // Always add options - CRITICAL to prevent shallow restore with placeholder files
      request.options = {
        incremental: incremental,
        ignoreErrors: ignoreErrors,
        restoreDirEntryAtDepth: 2147483647, // Max int32 - never use shallow restore
        minSizeForPlaceholder: 2147483647, // Max int32 - never create placeholder files
      };

      const taskId = await restoreStart(request);
      setRestoreTaskId(taskId);
      toast.success(t('restore.restoreStarted'));
    } catch (err) {
      toast.error(getErrorMessage(err));
      setIsRestoring(false);
    }
  };

  const handleBack = () => {
    navigateBack(navigate, '/snapshots');
  };

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
            <BreadcrumbPage>{t('restore.title')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('restore.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('restore.subtitle')}</p>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" />
            {t('restore.restoreInfo')}
          </CardTitle>
          <CardDescription>{t('restore.restoreInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t('restore.snapshotId')}:</span>
              <span className="ml-2 font-mono">{snapshotId}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('restore.path')}:</span>
              <span className="ml-2 font-mono">{pathParam}</span>
            </div>
            {estimatedSize > 0 && (
              <div>
                <span className="text-muted-foreground">{t('restore.estimatedSize')}:</span>
                <span className="ml-2">{formatBytes(estimatedSize, 2, byteFormat)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Restore Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            {t('restore.restoreOptions')}
          </CardTitle>
          <CardDescription>{t('restore.restoreOptionsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as RestoreMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="filesystem" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                {t('restore.filesystem')}
              </TabsTrigger>
              <TabsTrigger value="zip" className="flex items-center gap-2">
                <FileArchive className="h-4 w-4" />
                {t('restore.zip')}
              </TabsTrigger>
              <TabsTrigger value="tar" className="flex items-center gap-2">
                <FileArchive className="h-4 w-4" />
                {t('restore.tar')}
              </TabsTrigger>
            </TabsList>

            {/* Filesystem Restore */}
            <TabsContent value="filesystem" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="targetPath">{t('restore.targetPath')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="targetPath"
                      value={targetPath}
                      onChange={(e) => setTargetPath(e.target.value)}
                      placeholder={t('restore.targetPathPlaceholder')}
                      className="flex-1"
                    />
                    <Button onClick={() => void handleSelectFolder()} variant="outline">
                      <FolderOpen className="h-4 w-4 mr-2" />
                      {t('common.browse')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('restore.targetPathHelp')}</p>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">{t('restore.overwriteOptions')}</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="overwriteFiles"
                        checked={overwriteFiles}
                        onCheckedChange={(checked) => setOverwriteFiles(checked === true)}
                      />
                      <Label htmlFor="overwriteFiles" className="font-normal cursor-pointer">
                        {t('restore.overwriteFiles')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="overwriteDirectories"
                        checked={overwriteDirectories}
                        onCheckedChange={(checked) => setOverwriteDirectories(checked === true)}
                      />
                      <Label htmlFor="overwriteDirectories" className="font-normal cursor-pointer">
                        {t('restore.overwriteDirectories')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="overwriteSymlinks"
                        checked={overwriteSymlinks}
                        onCheckedChange={(checked) => setOverwriteSymlinks(checked === true)}
                      />
                      <Label htmlFor="overwriteSymlinks" className="font-normal cursor-pointer">
                        {t('restore.overwriteSymlinks')}
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">{t('restore.preserveOptions')}</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="skipOwners"
                        checked={skipOwners}
                        onCheckedChange={(checked) => setSkipOwners(checked === true)}
                      />
                      <Label htmlFor="skipOwners" className="font-normal cursor-pointer">
                        {t('restore.skipOwners')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="skipPermissions"
                        checked={skipPermissions}
                        onCheckedChange={(checked) => setSkipPermissions(checked === true)}
                      />
                      <Label htmlFor="skipPermissions" className="font-normal cursor-pointer">
                        {t('restore.skipPermissions')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="skipTimes"
                        checked={skipTimes}
                        onCheckedChange={(checked) => setSkipTimes(checked === true)}
                      />
                      <Label htmlFor="skipTimes" className="font-normal cursor-pointer">
                        {t('restore.skipTimes')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ignorePermissionErrors"
                        checked={ignorePermissionErrors}
                        onCheckedChange={(checked) => setIgnorePermissionErrors(checked === true)}
                      />
                      <Label
                        htmlFor="ignorePermissionErrors"
                        className="font-normal cursor-pointer"
                      >
                        {t('restore.ignorePermissionErrors')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="writeFilesAtomically"
                        checked={writeFilesAtomically}
                        onCheckedChange={(checked) => setWriteFilesAtomically(checked === true)}
                      />
                      <Label htmlFor="writeFilesAtomically" className="font-normal cursor-pointer">
                        {t('restore.writeFilesAtomically')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="writeSparseFiles"
                        checked={writeSparseFiles}
                        onCheckedChange={(checked) => setWriteSparseFiles(checked === true)}
                      />
                      <Label htmlFor="writeSparseFiles" className="font-normal cursor-pointer">
                        {t('restore.writeSparseFiles')}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ZIP Restore */}
            <TabsContent value="zip" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="zipFilePath">{t('restore.zipFilePath')}</Label>
                  <Input
                    id="zipFilePath"
                    value={zipFilePath}
                    onChange={(e) => setZipFilePath(e.target.value)}
                    placeholder={t('restore.zipFilePathPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">{t('restore.zipFilePathHelp')}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="uncompressedZip"
                    checked={uncompressedZip}
                    onCheckedChange={(checked) => setUncompressedZip(checked === true)}
                  />
                  <Label htmlFor="uncompressedZip" className="font-normal cursor-pointer">
                    {t('restore.uncompressedZip')}
                  </Label>
                </div>
              </div>
            </TabsContent>

            {/* TAR Restore */}
            <TabsContent value="tar" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tarFilePath">{t('restore.tarFilePath')}</Label>
                  <Input
                    id="tarFilePath"
                    value={tarFilePath}
                    onChange={(e) => setTarFilePath(e.target.value)}
                    placeholder={t('restore.tarFilePathPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">{t('restore.tarFilePathHelp')}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* General Options */}
          <div className="mt-6 space-y-3 border-t pt-6">
            <Label className="text-base">{t('restore.generalOptions')}</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ignoreErrors"
                  checked={ignoreErrors}
                  onCheckedChange={(checked) => setIgnoreErrors(checked === true)}
                />
                <Label htmlFor="ignoreErrors" className="font-normal cursor-pointer">
                  {t('restore.ignoreErrors')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="incremental"
                  checked={incremental}
                  onCheckedChange={(checked) => setIncremental(checked === true)}
                />
                <Label htmlFor="incremental" className="font-normal cursor-pointer">
                  {t('restore.incremental')}
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t('restore.warning')}</AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleBack} disabled={isRestoring}>
          {t('common.cancel')}
        </Button>
        <Button onClick={() => void handleRestore()} disabled={isRestoring}>
          {isRestoring ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              {t('restore.restoring')}
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {t('restore.startRestore')}
            </>
          )}
        </Button>
      </div>

      {/* Restore Progress */}
      {restoreTaskId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              {t('restore.restoreProgress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('restore.restoreProgressDesc')}{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => void navigate('/tasks')}>
                {t('restore.viewTasksPage')}
              </Button>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
