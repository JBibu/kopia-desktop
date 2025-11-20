/**
 * Mounts page - View and manage mounted snapshots
 *
 * This page displays all currently mounted snapshots and allows
 * users to unmount them or browse their file systems.
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Spinner } from '@/components/ui/spinner';
import { HardDrive, AlertCircle, Copy, HardDriveDownload, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia/errors';
import { useMounts } from '@/hooks/useMounts';

export function Mounts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mounts, isLoading, error, unmountSnapshot } = useMounts();

  const handleCopyPath = (path: string) => {
    void navigator.clipboard.writeText(path);
    toast.success(t('mounts.pathCopied'));
  };

  const handleUnmount = async (objectId: string) => {
    try {
      await unmountSnapshot(objectId);
      toast.success(t('mounts.unmountSuccess'));
    } catch (err) {
      toast.error(t('mounts.unmountFailed', { error: getErrorMessage(err) }));
    }
  };

  const handleBrowse = (objectId: string) => {
    // Navigate to snapshot browse page
    void navigate(`/snapshots/browse?oid=${objectId}&path=/&snapshotId=${objectId}`);
  };

  const mountsList = mounts?.items || [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{t('nav.mounts')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('mounts.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('mounts.subtitle')}</p>
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
          <CardTitle className="text-base">{t('mounts.mountedSnapshots')}</CardTitle>
          <CardDescription>
            {isLoading
              ? t('mounts.loading')
              : t('mounts.totalMounts', { count: mountsList.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : mountsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HardDrive className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('mounts.noMounts')}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t('mounts.noMountsDesc')}</p>
              <Button onClick={() => void navigate('/snapshots')}>
                {t('mounts.viewSnapshots')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('mounts.snapshotObject')}</TableHead>
                  <TableHead>{t('mounts.mountPath')}</TableHead>
                  <TableHead className="w-[150px]">{t('mounts.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mountsList.map((mount) => (
                  <TableRow key={mount.root}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        <code className="text-sm bg-muted px-2 py-1 rounded">{mount.root}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input readOnly value={mount.path} className="font-mono text-sm" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyPath(mount.path)}
                          title={t('mounts.copyPath')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBrowse(mount.root)}
                        >
                          <FolderOpen className="h-4 w-4 mr-2" />
                          {t('mounts.browse')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleUnmount(mount.root)}
                        >
                          <HardDriveDownload className="h-4 w-4 mr-2" />
                          {t('mounts.unmount')}
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
