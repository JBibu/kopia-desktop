/**
 * Snapshot Creation page
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useKopiaStore } from '@/stores/kopia';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, FolderOpen, Camera, Info, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia/errors';
import { selectFolder } from '@/lib/kopia/client';
import type { PolicyDefinition } from '@/lib/kopia/types';

export function SnapshotCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createSnapshot = useKopiaStore((state) => state.createSnapshot);
  const getPolicy = useKopiaStore((state) => state.getPolicy);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);

  const [path, setPath] = useState('');
  const [policy, setPolicy] = useState<PolicyDefinition | null>(null);

  // Load policy when path changes
  useEffect(() => {
    if (!path) {
      setPolicy(null);
      return;
    }

    const loadPolicy = async () => {
      setIsLoadingPolicy(true);
      try {
        const resolvedPolicy = await getPolicy();
        setPolicy(resolvedPolicy);
      } catch (err) {
        console.error('Failed to load policy:', err);
      } finally {
        setIsLoadingPolicy(false);
      }
    };

    void loadPolicy();
  }, [path, getPolicy]);

  const handleBrowseFolder = async () => {
    try {
      const selectedPath = await selectFolder();
      if (selectedPath) {
        setPath(selectedPath);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCreateSnapshot = async () => {
    if (!path.trim()) {
      toast.error(t('snapshotCreate.pathRequired'));
      return;
    }

    setIsCreating(true);
    try {
      await createSnapshot(path);
      toast.success(t('snapshotCreate.snapshotCreated'));
      void navigate('/snapshots');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => void navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('snapshotCreate.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('snapshotCreate.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('snapshotCreate.configuration')}</CardTitle>
              <CardDescription>{t('snapshotCreate.configurationDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Path selection */}
              <div className="space-y-2">
                <Label htmlFor="path">
                  {t('snapshotCreate.path')} <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="path"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder={t('snapshotCreate.pathPlaceholder')}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleBrowseFolder()}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Action buttons */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void navigate(-1)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleCreateSnapshot()}
                  disabled={isCreating || !path.trim()}
                >
                  {isCreating && <Spinner className="mr-2 h-4 w-4" />}
                  <Camera className="h-4 w-4 mr-2" />
                  {isCreating ? t('snapshotCreate.creating') : t('snapshotCreate.createSnapshot')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Policy info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                {t('snapshotCreate.policySettings')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPolicy ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="h-4 w-4" />
                  {t('common.loading')}
                </div>
              ) : policy ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium">{t('policies.retention')}</p>
                    <p className="text-muted-foreground">
                      {policy.retention?.keepLatest || 0} {t('policies.latest')}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="font-medium">{t('policies.compression')}</p>
                    <p className="text-muted-foreground">
                      {policy.compression?.compressorName || 'Default'}
                    </p>
                  </div>
                  {policy.scheduling?.intervalSeconds && (
                    <>
                      <Separator />
                      <div>
                        <p className="font-medium">{t('policies.schedule')}</p>
                        <p className="text-muted-foreground">
                          {Math.floor(policy.scheduling.intervalSeconds / 3600)}h
                        </p>
                      </div>
                    </>
                  )}
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => void navigate('/policies')}
                  >
                    {t('policies.editPolicies')}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('snapshotCreate.selectPathFirst')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {t('snapshotCreate.infoMessage')}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
