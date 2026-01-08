/**
 * Snapshot Creation page
 *
 * Features:
 * - Path selection with folder picker
 * - Optional policy override for custom retention/scheduling
 * - Preview of inherited policy settings
 * - Immediate snapshot or source-only creation
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useKopiaStore } from '@/stores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { FolderOpen, Camera, Info, Settings, Sliders, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia';
import { selectFolder, estimateSnapshot } from '@/lib/kopia';
import type { PolicyDefinition } from '@/lib/kopia';
import { SnapshotEstimationResults } from '@/components/kopia/snapshots';
import { useCurrentRepoId } from '@/hooks';

export function SnapshotCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createSnapshot = useKopiaStore((state) => state.createSnapshot);
  const getPolicy = useKopiaStore((state) => state.getPolicy);
  const currentRepoId = useCurrentRepoId();

  // Loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);

  // Form state
  const [path, setPath] = useState('');
  const [startSnapshot, setStartSnapshot] = useState(false);

  // Policy state
  const [policy, setPolicy] = useState<PolicyDefinition | null>(null);
  const [policyOverride, setPolicyOverride] = useState<PolicyDefinition>({});
  const [usePolicyOverride, setUsePolicyOverride] = useState(false);

  // Estimation state
  const [estimationTaskId, setEstimationTaskId] = useState<string | null>(null);
  const [showEstimation, setShowEstimation] = useState(false);

  // Load inherited policy when path changes (for preview only)
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
        // Silently fail - policy preview is optional
        if (import.meta.env.DEV) {
          console.error(t('snapshotCreate.errors.policyLoadFailed'), err);
        }
      } finally {
        setIsLoadingPolicy(false);
      }
    };

    void loadPolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleEstimate = async () => {
    if (!path.trim()) {
      toast.error(t('snapshotCreate.pathRequired'));
      return;
    }

    if (!currentRepoId) {
      toast.error(t('common.noRepositorySelected'));
      return;
    }

    try {
      const result = await estimateSnapshot(currentRepoId, path);
      setEstimationTaskId(result.id);
      setShowEstimation(true);
      toast.success(t('snapshots.estimation.started'));
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
      // Build clean policy object with only defined values
      let policyToSend: PolicyDefinition | undefined = undefined;

      if (usePolicyOverride) {
        const cleanPolicy: PolicyDefinition = {};

        // Add retention section if any values are set
        if (
          policyOverride.retention?.keepLatest !== undefined ||
          policyOverride.retention?.keepDaily !== undefined
        ) {
          cleanPolicy.retention = {
            keepLatest: policyOverride.retention.keepLatest,
            keepDaily: policyOverride.retention.keepDaily,
          };
        }

        // Add scheduling section if any values are set
        if (policyOverride.scheduling?.intervalSeconds !== undefined) {
          cleanPolicy.scheduling = {
            intervalSeconds: policyOverride.scheduling.intervalSeconds,
          };
        }

        // Only send policy if at least one section has values
        if (Object.keys(cleanPolicy).length > 0) {
          policyToSend = cleanPolicy;
        }
      }

      await createSnapshot(path, startSnapshot, policyToSend);

      toast.success(
        startSnapshot ? t('snapshotCreate.snapshotCreated') : t('snapshotCreate.sourceCreated')
      );

      void navigate('/snapshots');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const updateRetention = (field: 'keepLatest' | 'keepDaily', value: number | undefined) => {
    setPolicyOverride({
      ...policyOverride,
      retention: {
        ...policyOverride.retention,
        [field]: value,
      },
    });
  };

  const updateScheduling = (field: 'intervalSeconds', value: number | undefined) => {
    setPolicyOverride({
      ...policyOverride,
      scheduling: {
        ...policyOverride.scheduling,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('snapshotCreate.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('snapshotCreate.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('snapshotCreate.configuration')}</CardTitle>
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
                    size="icon"
                    onClick={() => void handleBrowseFolder()}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Start snapshot checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="startSnapshot"
                  checked={startSnapshot}
                  onCheckedChange={(checked) => setStartSnapshot(checked === true)}
                />
                <Label htmlFor="startSnapshot" className="text-sm font-normal cursor-pointer">
                  {t('snapshotCreate.startSnapshotNow')}
                </Label>
              </div>

              <Separator />

              {/* Policy Override Section */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="policy-override" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {t('snapshotCreate.policyOverride', 'Custom Policy Settings')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({t('common.optional', 'Optional')})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {/* Enable checkbox */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="usePolicyOverride"
                          checked={usePolicyOverride}
                          onCheckedChange={(checked) => setUsePolicyOverride(checked === true)}
                        />
                        <Label
                          htmlFor="usePolicyOverride"
                          className="text-sm font-normal cursor-pointer"
                        >
                          {t(
                            'snapshotCreate.enablePolicyOverride',
                            'Apply custom policy to this snapshot'
                          )}
                        </Label>
                      </div>

                      {/* Info alert */}
                      {usePolicyOverride && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {t(
                              'snapshotCreate.policyOverrideInfo',
                              'Set specific policy values to override defaults. Leave fields empty to use inherited values.'
                            )}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Policy fields */}
                      {usePolicyOverride && (
                        <div className="space-y-4 pt-2">
                          {/* Retention Settings */}
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">
                              {t('policies.retention', 'Retention')}
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label
                                  htmlFor="keepLatest"
                                  className="text-xs text-muted-foreground"
                                >
                                  {t('policies.keepLatest', 'Keep Latest')}
                                </Label>
                                <Input
                                  id="keepLatest"
                                  type="number"
                                  min="0"
                                  placeholder={t('policies.keepLatestPlaceholder', '10')}
                                  value={policyOverride.retention?.keepLatest ?? ''}
                                  onChange={(e) =>
                                    updateRetention(
                                      'keepLatest',
                                      e.target.value ? parseInt(e.target.value) : undefined
                                    )
                                  }
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label
                                  htmlFor="keepDaily"
                                  className="text-xs text-muted-foreground"
                                >
                                  {t('policies.keepDaily', 'Keep Daily')}
                                </Label>
                                <Input
                                  id="keepDaily"
                                  type="number"
                                  min="0"
                                  placeholder={t('policies.keepDailyPlaceholder', '7')}
                                  value={policyOverride.retention?.keepDaily ?? ''}
                                  onChange={(e) =>
                                    updateRetention(
                                      'keepDaily',
                                      e.target.value ? parseInt(e.target.value) : undefined
                                    )
                                  }
                                  className="h-9"
                                />
                              </div>
                            </div>
                          </div>

                          <Separator />

                          {/* Scheduling */}
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">
                              {t('policies.scheduling', 'Scheduling')}
                            </Label>
                            <div className="space-y-1.5">
                              <Label
                                htmlFor="intervalSeconds"
                                className="text-xs text-muted-foreground"
                              >
                                {t('policies.intervalSeconds', 'Interval (seconds)')}
                              </Label>
                              <Input
                                id="intervalSeconds"
                                type="number"
                                min="0"
                                placeholder={t('policies.intervalSecondsPlaceholder', '3600')}
                                value={policyOverride.scheduling?.intervalSeconds ?? ''}
                                onChange={(e) =>
                                  updateScheduling(
                                    'intervalSeconds',
                                    e.target.value ? parseInt(e.target.value) : undefined
                                  )
                                }
                                className="h-9"
                              />
                              <p className="text-xs text-muted-foreground">
                                {t(
                                  'policies.intervalSecondsHelp',
                                  'Time between automatic snapshots'
                                )}
                              </p>
                            </div>
                          </div>

                          <Separator />

                          {/* Link to full editor */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => void navigate('/policies')}
                          >
                            {t('snapshotCreate.fullPolicyEditor', 'Open Full Policy Editor')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => void navigate(-1)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleEstimate()}
                  disabled={isCreating || !path.trim()}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {t('snapshots.estimate')}
                </Button>
                <Button
                  onClick={() => void handleCreateSnapshot()}
                  disabled={isCreating || !path.trim()}
                >
                  {isCreating ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      {t('snapshotCreate.creating')}
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      {startSnapshot
                        ? t('snapshotCreate.createSnapshot')
                        : t('snapshotCreate.createSource')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Policy Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                {t('snapshotCreate.policySettings', 'Inherited Policy')}
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
                  {/* Retention */}
                  <div>
                    <p className="font-medium text-xs uppercase text-muted-foreground mb-1">
                      {t('policies.retention')}
                    </p>
                    <p className="text-foreground">
                      {policy.retention?.keepLatest
                        ? `${policy.retention.keepLatest} ${t('policies.latest', 'latest')}`
                        : t('policies.notSet', 'Not set')}
                    </p>
                  </div>

                  <Separator />

                  {/* Compression */}
                  <div>
                    <p className="font-medium text-xs uppercase text-muted-foreground mb-1">
                      {t('policies.compression')}
                    </p>
                    <p className="text-foreground">
                      {policy.compression?.compressorName ||
                        t('snapshotCreate.defaultCompressor', 'Default')}
                    </p>
                  </div>

                  {/* Scheduling (if set) */}
                  {policy.scheduling?.intervalSeconds && (
                    <>
                      <Separator />
                      <div>
                        <p className="font-medium text-xs uppercase text-muted-foreground mb-1">
                          {t('policies.schedule')}
                        </p>
                        <p className="text-foreground">
                          {t('policies.every', 'Every')}{' '}
                          {Math.floor(policy.scheduling.intervalSeconds / 3600)}{' '}
                          {t('time.hours', 'hours')}
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
                    {t('policies.editPolicies', 'Edit Policies')}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('snapshotCreate.selectPathFirst', 'Select a path to see policy settings')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {t(
                'snapshotCreate.infoMessage',
                'Snapshots capture the current state of your files. Policies control retention and scheduling.'
              )}
            </AlertDescription>
          </Alert>

          {/* Estimation Results */}
          {showEstimation && estimationTaskId && (
            <SnapshotEstimationResults
              taskId={estimationTaskId}
              onClose={() => {
                setShowEstimation(false);
                setEstimationTaskId(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
