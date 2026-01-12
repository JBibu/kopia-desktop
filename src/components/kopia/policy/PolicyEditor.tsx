/**
 * PolicyEditor - Comprehensive policy editing component
 *
 * Features:
 * - Edit all policy fields (retention, scheduling, files, compression, actions, etc.)
 * - Show inherited vs defined values
 * - Real-time policy resolution preview
 * - Preview upcoming snapshot times
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Spinner } from '@/components/ui/spinner';
import {
  Calendar,
  Timer,
  Archive,
  FileX,
  AlertCircle,
  Info,
  Save,
  Trash2,
  Clock,
  Upload,
  Play,
  ScrollText,
  Monitor,
  Scissors,
} from 'lucide-react';
import type { PolicyDefinition, PolicyTarget, ResolvedPolicyResponse } from '@/lib/kopia';
import {
  PolicyNumberField,
  PolicyTextField,
  PolicyBooleanField,
  PolicyArrayField,
  PolicyTimeOfDayField,
  PolicySelectField,
} from './PolicyFields';
import { getPolicy, setPolicy as setPolicyClient, deletePolicy, resolvePolicy } from '@/lib/kopia';
import { toast } from 'sonner';
import {
  getErrorMessage,
  parseKopiaError,
  KopiaErrorCode,
  OfficialKopiaAPIErrorCode,
} from '@/lib/kopia';
import { formatDateTime } from '@/lib/utils';
import { usePreferencesStore } from '@/stores';
import { useCurrentRepoId } from '@/hooks';

interface PolicyEditorProps {
  target: PolicyTarget;
  onClose?: () => void;
  onSave?: () => void;
}

export function PolicyEditor({ target, onClose, onSave }: PolicyEditorProps) {
  const { t } = useTranslation();
  const locale = usePreferencesStore((state) => state.getLocale());
  const currentRepoId = useCurrentRepoId();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current policy being edited
  const [policy, setPolicy] = useState<PolicyDefinition>({});

  // Resolved policy (shows effective values with inheritance)
  const [resolvedPolicy, setResolvedPolicy] = useState<ResolvedPolicyResponse | null>(null);

  // Whether this is a new policy or editing existing
  const [isNew, setIsNew] = useState(false);

  // Fetch the policy
  useEffect(() => {
    const fetchData = async () => {
      if (!currentRepoId) {
        setError(t('common.noRepositorySelected'));
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await getPolicy(currentRepoId, target.userName, target.host, target.path);
        // Extract just the policy definition from the response
        setPolicy(response.policy || {});
        setIsNew(false);
      } catch (err: unknown) {
        // Policy not found - this is a new policy (expected for new policies)
        // Use parseKopiaError for language-independent error code checking
        const kopiaError = parseKopiaError(err);

        // Treat NOT_FOUND, HTTP failures, and parse errors as new policy scenarios
        // This is expected behavior when creating a new policy
        const isNotFoundError =
          kopiaError.is(KopiaErrorCode.NOT_FOUND) ||
          kopiaError.is(KopiaErrorCode.POLICY_NOT_FOUND) ||
          kopiaError.is(KopiaErrorCode.HTTP_REQUEST_FAILED) ||
          kopiaError.is(KopiaErrorCode.RESPONSE_PARSE_ERROR) ||
          kopiaError.is(OfficialKopiaAPIErrorCode.NOT_FOUND);

        if (isNotFoundError) {
          setPolicy({});
          setIsNew(true);
        } else {
          // Only set error for actual failures (not missing policies)
          if (import.meta.env.DEV) {
            console.error('Error fetching policy:', kopiaError.getUserMessage(), err);
          }
          setError(kopiaError.getUserMessage());
        }
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [target, currentRepoId, t]);

  // Resolve policy in real-time to show effective values
  useEffect(() => {
    const doResolve = async () => {
      if (!currentRepoId) return;
      try {
        // Always call resolve without updates parameter to get the effective policy
        // This avoids serialization issues and still shows inherited values
        const resolved = await resolvePolicy(
          currentRepoId,
          target.userName,
          target.host,
          target.path
        );
        setResolvedPolicy(resolved);
      } catch (err) {
        // Log the full error for debugging in development
        if (import.meta.env.DEV) {
          console.error('Policy resolution failed:', err);
          console.error('Error message:', getErrorMessage(err));
          console.error('Target:', target);
        }
        // Silently fail - resolution is optional and enhances UX but isn't required
        // Common scenarios where this fails:
        // - Server not running
        // - Policy target doesn't exist yet (new policy)
        // - Network error
        // User can still edit and save policies without resolution preview
      }
    };

    void doResolve();
  }, [target, currentRepoId]); // Only depend on target, not policy, to avoid constant re-resolution

  const handleSave = async () => {
    if (!currentRepoId) {
      toast.error(t('common.noRepositorySelected'));
      return;
    }
    setIsSaving(true);
    try {
      await setPolicyClient(currentRepoId, policy, target.userName, target.host, target.path);
      toast.success(t('policies.policySaved'), {
        description: t('policies.policySavedDescription'),
      });
      onSave?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentRepoId) {
      toast.error(t('common.noRepositorySelected'));
      return;
    }
    if (!confirm(t('policies.confirmDelete'))) return;

    setIsDeleting(true);
    try {
      await deletePolicy(currentRepoId, target.userName, target.host, target.path);
      toast.success(t('policies.policyDeleted'), {
        description: t('policies.policyDeletedDescription'),
      });
      onSave?.();
      onClose?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to update nested policy fields
  const updatePolicy = (section: keyof PolicyDefinition, field: string, value: unknown) => {
    setPolicy((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, unknown>),
        [field]: value,
      },
    }));
  };

  // Check if a value is defined in this policy (not inherited)
  const isDefined = (section: keyof PolicyDefinition, field: string): boolean => {
    const sectionData = policy[section] as Record<string, unknown> | undefined;
    return sectionData !== undefined && field in sectionData;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const targetStr = target.path
    ? `${target.userName}@${target.host}:${target.path}`
    : target.userName
      ? `${target.userName}@${target.host}/*`
      : target.host
        ? `@${target.host}/*/*`
        : '*/*/*';

  // Check if this is the global policy
  const isGlobalPolicy = !target.userName && !target.host && !target.path;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">
          {isNew ? t('policies.createPolicy') : t('policies.editPolicy')}
        </h2>
        <p className="text-sm text-muted-foreground">{targetStr}</p>
      </div>

      {/* Global Policy Warning */}
      {isGlobalPolicy && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('policies.globalPolicyWarning')}</AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {isGlobalPolicy ? (
            <>
              {t('policies.globalEditorInfo')}
              <br />
              <span className="text-xs text-muted-foreground">
                {t('policies.globalInheritanceInfo')}
              </span>
            </>
          ) : (
            <>
              {t('policies.editorInfo')}
              <br />
              <span className="text-xs text-muted-foreground">{t('policies.inheritanceInfo')}</span>
            </>
          )}
        </AlertDescription>
      </Alert>

      {/* Upcoming Snapshots */}
      {resolvedPolicy?.upcomingSnapshotTimes && resolvedPolicy.upcomingSnapshotTimes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('policies.upcomingSnapshots')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {resolvedPolicy.upcomingSnapshotTimes.slice(0, 5).map((time, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>{formatDateTime(time, locale)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policy Sections */}
      <Accordion type="multiple" defaultValue={['retention', 'scheduling']} className="w-full">
        {/* Retention Policy */}
        <AccordionItem value="retention">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {t('policies.retentionPolicy')}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <PolicyNumberField
                label={t('policies.keepLatest')}
                value={policy.retention?.keepLatest}
                onChange={(val) => updatePolicy('retention', 'keepLatest', val)}
                isDefined={isDefined('retention', 'keepLatest')}
                effectiveValue={resolvedPolicy?.effective.retention?.keepLatest}
              />
              <PolicyNumberField
                label={t('policies.keepHourly')}
                value={policy.retention?.keepHourly}
                onChange={(val) => updatePolicy('retention', 'keepHourly', val)}
                isDefined={isDefined('retention', 'keepHourly')}
                effectiveValue={resolvedPolicy?.effective.retention?.keepHourly}
              />
              <PolicyNumberField
                label={t('policies.keepDaily')}
                value={policy.retention?.keepDaily}
                onChange={(val) => updatePolicy('retention', 'keepDaily', val)}
                isDefined={isDefined('retention', 'keepDaily')}
                effectiveValue={resolvedPolicy?.effective.retention?.keepDaily}
              />
              <PolicyNumberField
                label={t('policies.keepWeekly')}
                value={policy.retention?.keepWeekly}
                onChange={(val) => updatePolicy('retention', 'keepWeekly', val)}
                isDefined={isDefined('retention', 'keepWeekly')}
                effectiveValue={resolvedPolicy?.effective.retention?.keepWeekly}
              />
              <PolicyNumberField
                label={t('policies.keepMonthly')}
                value={policy.retention?.keepMonthly}
                onChange={(val) => updatePolicy('retention', 'keepMonthly', val)}
                isDefined={isDefined('retention', 'keepMonthly')}
                effectiveValue={resolvedPolicy?.effective.retention?.keepMonthly}
              />
              <PolicyNumberField
                label={t('policies.keepAnnual')}
                value={policy.retention?.keepAnnual}
                onChange={(val) => updatePolicy('retention', 'keepAnnual', val)}
                isDefined={isDefined('retention', 'keepAnnual')}
                effectiveValue={resolvedPolicy?.effective.retention?.keepAnnual}
              />
              <PolicyBooleanField
                label={t('policies.ignoreIdenticalSnapshots')}
                value={policy.retention?.ignoreIdenticalSnapshots}
                onChange={(val) => updatePolicy('retention', 'ignoreIdenticalSnapshots', val)}
                isDefined={isDefined('retention', 'ignoreIdenticalSnapshots')}
                effectiveValue={resolvedPolicy?.effective.retention?.ignoreIdenticalSnapshots}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Scheduling Policy */}
        <AccordionItem value="scheduling">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              {t('policies.schedulingPolicy')}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <PolicyNumberField
                label={t('policies.intervalSeconds')}
                value={policy.scheduling?.intervalSeconds}
                onChange={(val) => updatePolicy('scheduling', 'intervalSeconds', val)}
                isDefined={isDefined('scheduling', 'intervalSeconds')}
                effectiveValue={resolvedPolicy?.effective.scheduling?.intervalSeconds}
                help={t('policies.intervalSecondsHelp')}
              />
              <PolicyTimeOfDayField
                label={t('policies.timeOfDay')}
                value={policy.scheduling?.timeOfDay}
                onChange={(val) => updatePolicy('scheduling', 'timeOfDay', val)}
                isDefined={isDefined('scheduling', 'timeOfDay')}
                effectiveValue={resolvedPolicy?.effective.scheduling?.timeOfDay}
                placeholder="e.g., 09:00, 17:00"
                help={t('policies.timeOfDayHelp')}
              />
              <PolicyBooleanField
                label={t('policies.noParentTimeOfDay')}
                value={policy.scheduling?.noParentTimeOfDay}
                onChange={(val) => updatePolicy('scheduling', 'noParentTimeOfDay', val)}
                isDefined={isDefined('scheduling', 'noParentTimeOfDay')}
                effectiveValue={resolvedPolicy?.effective.scheduling?.noParentTimeOfDay}
                help={t('policies.noParentTimeOfDayHelp')}
              />
              <PolicyArrayField
                label={t('policies.cron')}
                value={policy.scheduling?.cron}
                onChange={(val) => updatePolicy('scheduling', 'cron', val)}
                isDefined={isDefined('scheduling', 'cron')}
                effectiveValue={resolvedPolicy?.effective.scheduling?.cron}
                placeholder="e.g., 0 2 * * *"
                help={t('policies.cronHelp')}
              />
              <PolicyBooleanField
                label={t('policies.manual')}
                value={policy.scheduling?.manual}
                onChange={(val) => updatePolicy('scheduling', 'manual', val)}
                isDefined={isDefined('scheduling', 'manual')}
                effectiveValue={resolvedPolicy?.effective.scheduling?.manual}
                help={t('policies.manualHelp')}
              />
              <PolicyBooleanField
                label={t('policies.runMissed')}
                value={policy.scheduling?.runMissed}
                onChange={(val) => updatePolicy('scheduling', 'runMissed', val)}
                isDefined={isDefined('scheduling', 'runMissed')}
                effectiveValue={resolvedPolicy?.effective.scheduling?.runMissed}
                help={t('policies.runMissedHelp')}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Files Policy */}
        <AccordionItem value="files">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <FileX className="h-4 w-4 text-muted-foreground" />
              {t('policies.filesPolicy')}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <PolicyArrayField
                label={t('policies.ignoreRules')}
                value={policy.files?.ignore}
                onChange={(val) => updatePolicy('files', 'ignore', val)}
                isDefined={isDefined('files', 'ignore')}
                effectiveValue={resolvedPolicy?.effective.files?.ignore}
                placeholder={t('policies.ignoreRulesPlaceholder')}
                help={t('policies.ignoreRulesHelp')}
              />
              <PolicyArrayField
                label={t('policies.dotIgnoreFiles')}
                value={policy.files?.ignoreDotFiles}
                onChange={(val) => updatePolicy('files', 'ignoreDotFiles', val)}
                isDefined={isDefined('files', 'ignoreDotFiles')}
                effectiveValue={resolvedPolicy?.effective.files?.ignoreDotFiles}
                placeholder="e.g., .kopiaignore, .gitignore"
                help={t('policies.dotIgnoreFilesHelp')}
              />
              <PolicyBooleanField
                label={t('policies.noParentIgnore')}
                value={policy.files?.noParentIgnore}
                onChange={(val) => updatePolicy('files', 'noParentIgnore', val)}
                isDefined={isDefined('files', 'noParentIgnore')}
                effectiveValue={resolvedPolicy?.effective.files?.noParentIgnore}
                help={t('policies.noParentIgnoreHelp')}
              />
              <PolicyBooleanField
                label={t('policies.noParentDotFiles')}
                value={policy.files?.noParentDotFiles}
                onChange={(val) => updatePolicy('files', 'noParentDotFiles', val)}
                isDefined={isDefined('files', 'noParentDotFiles')}
                effectiveValue={resolvedPolicy?.effective.files?.noParentDotFiles}
                help={t('policies.noParentDotFilesHelp')}
              />
              <PolicyBooleanField
                label={t('policies.oneFileSystem')}
                value={policy.files?.oneFileSystem}
                onChange={(val) => updatePolicy('files', 'oneFileSystem', val)}
                isDefined={isDefined('files', 'oneFileSystem')}
                effectiveValue={resolvedPolicy?.effective.files?.oneFileSystem}
                help={t('policies.oneFileSystemHelp')}
              />
              <PolicyBooleanField
                label={t('policies.ignoreCacheDirs')}
                value={policy.files?.ignoreCacheDirs}
                onChange={(val) => updatePolicy('files', 'ignoreCacheDirs', val)}
                isDefined={isDefined('files', 'ignoreCacheDirs')}
                effectiveValue={resolvedPolicy?.effective.files?.ignoreCacheDirs}
                help={t('policies.ignoreCacheDirsHelp')}
              />
              <PolicyNumberField
                label={t('policies.maxFileSize')}
                value={policy.files?.maxFileSize}
                onChange={(val) => updatePolicy('files', 'maxFileSize', val)}
                isDefined={isDefined('files', 'maxFileSize')}
                effectiveValue={resolvedPolicy?.effective.files?.maxFileSize}
                help={t('policies.maxFileSizeHelp')}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Compression Policy */}
        <AccordionItem value="compression">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-muted-foreground" />
              {t('policies.compressionPolicy')}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <PolicyTextField
                label={t('policies.compressorName')}
                value={policy.compression?.compressorName}
                onChange={(val) => updatePolicy('compression', 'compressorName', val)}
                isDefined={isDefined('compression', 'compressorName')}
                effectiveValue={resolvedPolicy?.effective.compression?.compressorName}
                placeholder="e.g., gzip, zstd, s2-default"
                help={t('policies.compressorNameHelp')}
              />
              <PolicyNumberField
                label={t('policies.minSize')}
                value={policy.compression?.minSize}
                onChange={(val) => updatePolicy('compression', 'minSize', val)}
                isDefined={isDefined('compression', 'minSize')}
                effectiveValue={resolvedPolicy?.effective.compression?.minSize}
                help={t('policies.compressionMinSizeHelp')}
              />
              <PolicyNumberField
                label={t('policies.maxSize')}
                value={policy.compression?.maxSize}
                onChange={(val) => updatePolicy('compression', 'maxSize', val)}
                isDefined={isDefined('compression', 'maxSize')}
                effectiveValue={resolvedPolicy?.effective.compression?.maxSize}
                help={t('policies.compressionMaxSizeHelp')}
              />
              <PolicyArrayField
                label={t('policies.onlyCompress')}
                value={policy.compression?.onlyCompress}
                onChange={(val) => updatePolicy('compression', 'onlyCompress', val)}
                isDefined={isDefined('compression', 'onlyCompress')}
                effectiveValue={resolvedPolicy?.effective.compression?.onlyCompress}
                placeholder="e.g., .txt, .log, .json"
                help={t('policies.onlyCompressHelp')}
              />
              <PolicyBooleanField
                label={t('policies.noParentOnlyCompress')}
                value={policy.compression?.noParentOnlyCompress}
                onChange={(val) => updatePolicy('compression', 'noParentOnlyCompress', val)}
                isDefined={isDefined('compression', 'noParentOnlyCompress')}
                effectiveValue={resolvedPolicy?.effective.compression?.noParentOnlyCompress}
                help={t('policies.noParentOnlyCompressHelp')}
              />
              <PolicyArrayField
                label={t('policies.neverCompress')}
                value={policy.compression?.neverCompress}
                onChange={(val) => updatePolicy('compression', 'neverCompress', val)}
                isDefined={isDefined('compression', 'neverCompress')}
                effectiveValue={resolvedPolicy?.effective.compression?.neverCompress}
                placeholder="e.g., .jpg, .mp4, .zip"
                help={t('policies.neverCompressHelp')}
              />
              <PolicyBooleanField
                label={t('policies.noParentNeverCompress')}
                value={policy.compression?.noParentNeverCompress}
                onChange={(val) => updatePolicy('compression', 'noParentNeverCompress', val)}
                isDefined={isDefined('compression', 'noParentNeverCompress')}
                effectiveValue={resolvedPolicy?.effective.compression?.noParentNeverCompress}
                help={t('policies.noParentNeverCompressHelp')}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Error Handling Policy */}
        <AccordionItem value="errorHandling">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              {t('policies.errorHandlingPolicy')}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <PolicyBooleanField
                label={t('policies.ignoreFileErrors')}
                value={policy.errorHandling?.ignoreFileErrors}
                onChange={(val) => updatePolicy('errorHandling', 'ignoreFileErrors', val)}
                isDefined={isDefined('errorHandling', 'ignoreFileErrors')}
                effectiveValue={resolvedPolicy?.effective.errorHandling?.ignoreFileErrors}
                help={t('policies.ignoreFileErrorsHelp')}
              />
              <PolicyBooleanField
                label={t('policies.ignoreDirectoryErrors')}
                value={policy.errorHandling?.ignoreDirectoryErrors}
                onChange={(val) => updatePolicy('errorHandling', 'ignoreDirectoryErrors', val)}
                isDefined={isDefined('errorHandling', 'ignoreDirectoryErrors')}
                effectiveValue={resolvedPolicy?.effective.errorHandling?.ignoreDirectoryErrors}
                help={t('policies.ignoreDirectoryErrorsHelp')}
              />
              <PolicyBooleanField
                label={t('policies.ignoreUnknownTypes')}
                value={policy.errorHandling?.ignoreUnknownTypes}
                onChange={(val) => updatePolicy('errorHandling', 'ignoreUnknownTypes', val)}
                isDefined={isDefined('errorHandling', 'ignoreUnknownTypes')}
                effectiveValue={resolvedPolicy?.effective.errorHandling?.ignoreUnknownTypes}
                help={t('policies.ignoreUnknownTypesHelp')}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Upload Policy */}
        <AccordionItem value="upload">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              {t('policies.uploadPolicy')}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <PolicyNumberField
                label={t('policies.maxParallelSnapshots')}
                value={policy.upload?.maxParallelSnapshots}
                onChange={(val) => updatePolicy('upload', 'maxParallelSnapshots', val)}
                isDefined={isDefined('upload', 'maxParallelSnapshots')}
                effectiveValue={resolvedPolicy?.effective.upload?.maxParallelSnapshots}
                help={t('policies.maxParallelSnapshotsHelp')}
              />
              <PolicyNumberField
                label={t('policies.maxParallelFileReads')}
                value={policy.upload?.maxParallelFileReads}
                onChange={(val) => updatePolicy('upload', 'maxParallelFileReads', val)}
                isDefined={isDefined('upload', 'maxParallelFileReads')}
                effectiveValue={resolvedPolicy?.effective.upload?.maxParallelFileReads}
                help={t('policies.maxParallelFileReadsHelp')}
              />
              <PolicyNumberField
                label={t('policies.parallelUploadAboveSize')}
                value={policy.upload?.parallelUploadAboveSize}
                onChange={(val) => updatePolicy('upload', 'parallelUploadAboveSize', val)}
                isDefined={isDefined('upload', 'parallelUploadAboveSize')}
                effectiveValue={resolvedPolicy?.effective.upload?.parallelUploadAboveSize}
                help={t('policies.parallelUploadAboveSizeHelp')}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Actions Policy */}
        <AccordionItem value="actions">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-muted-foreground" />
              {t('policies.actionsPolicy')}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">{t('policies.actionsPolicyHelp')}</p>

              {/* Before Snapshot Root */}
              <div className="space-y-2 p-3 border rounded-lg">
                <Label className="font-medium">{t('policies.beforeSnapshotRoot')}</Label>
                <PolicyTextField
                  label={t('policies.actionScript')}
                  value={policy.actions?.beforeSnapshotRoot?.script}
                  onChange={(val) => {
                    const current = policy.actions?.beforeSnapshotRoot || {};
                    updatePolicy(
                      'actions',
                      'beforeSnapshotRoot',
                      val ? { ...current, script: val } : undefined
                    );
                  }}
                  isDefined={isDefined('actions', 'beforeSnapshotRoot')}
                  effectiveValue={resolvedPolicy?.effective.actions?.beforeSnapshotRoot?.script}
                  placeholder={t('policies.actionScriptPlaceholder')}
                  help={t('policies.beforeSnapshotRootHelp')}
                />
                <PolicyTextField
                  label={t('policies.actionCommand')}
                  value={policy.actions?.beforeSnapshotRoot?.path}
                  onChange={(val) => {
                    const current = policy.actions?.beforeSnapshotRoot || {};
                    updatePolicy(
                      'actions',
                      'beforeSnapshotRoot',
                      val ? { ...current, path: val } : undefined
                    );
                  }}
                  isDefined={isDefined('actions', 'beforeSnapshotRoot')}
                  effectiveValue={resolvedPolicy?.effective.actions?.beforeSnapshotRoot?.path}
                  placeholder={t('policies.actionCommandPlaceholder')}
                />
                <PolicyNumberField
                  label={t('policies.actionTimeout')}
                  value={policy.actions?.beforeSnapshotRoot?.timeout}
                  onChange={(val) => {
                    const current = policy.actions?.beforeSnapshotRoot || {};
                    updatePolicy('actions', 'beforeSnapshotRoot', { ...current, timeout: val });
                  }}
                  isDefined={isDefined('actions', 'beforeSnapshotRoot')}
                  effectiveValue={resolvedPolicy?.effective.actions?.beforeSnapshotRoot?.timeout}
                  help={t('policies.actionTimeoutHelp')}
                />
                <PolicySelectField
                  label={t('policies.actionMode')}
                  value={policy.actions?.beforeSnapshotRoot?.mode}
                  onChange={(val) => {
                    const current = policy.actions?.beforeSnapshotRoot || {};
                    updatePolicy('actions', 'beforeSnapshotRoot', { ...current, mode: val });
                  }}
                  isDefined={isDefined('actions', 'beforeSnapshotRoot')}
                  effectiveValue={resolvedPolicy?.effective.actions?.beforeSnapshotRoot?.mode}
                  options={[
                    { value: 'essential', label: t('policies.actionModeEssential') },
                    { value: 'optional', label: t('policies.actionModeOptional') },
                    { value: 'async', label: t('policies.actionModeAsync') },
                  ]}
                  help={t('policies.actionModeHelp')}
                />
              </div>

              {/* After Snapshot Root */}
              <div className="space-y-2 p-3 border rounded-lg">
                <Label className="font-medium">{t('policies.afterSnapshotRoot')}</Label>
                <PolicyTextField
                  label={t('policies.actionScript')}
                  value={policy.actions?.afterSnapshotRoot?.script}
                  onChange={(val) => {
                    const current = policy.actions?.afterSnapshotRoot || {};
                    updatePolicy(
                      'actions',
                      'afterSnapshotRoot',
                      val ? { ...current, script: val } : undefined
                    );
                  }}
                  isDefined={isDefined('actions', 'afterSnapshotRoot')}
                  effectiveValue={resolvedPolicy?.effective.actions?.afterSnapshotRoot?.script}
                  placeholder={t('policies.actionScriptPlaceholder')}
                  help={t('policies.afterSnapshotRootHelp')}
                />
                <PolicyTextField
                  label={t('policies.actionCommand')}
                  value={policy.actions?.afterSnapshotRoot?.path}
                  onChange={(val) => {
                    const current = policy.actions?.afterSnapshotRoot || {};
                    updatePolicy(
                      'actions',
                      'afterSnapshotRoot',
                      val ? { ...current, path: val } : undefined
                    );
                  }}
                  isDefined={isDefined('actions', 'afterSnapshotRoot')}
                  effectiveValue={resolvedPolicy?.effective.actions?.afterSnapshotRoot?.path}
                  placeholder={t('policies.actionCommandPlaceholder')}
                />
                <PolicyNumberField
                  label={t('policies.actionTimeout')}
                  value={policy.actions?.afterSnapshotRoot?.timeout}
                  onChange={(val) => {
                    const current = policy.actions?.afterSnapshotRoot || {};
                    updatePolicy('actions', 'afterSnapshotRoot', { ...current, timeout: val });
                  }}
                  isDefined={isDefined('actions', 'afterSnapshotRoot')}
                  effectiveValue={resolvedPolicy?.effective.actions?.afterSnapshotRoot?.timeout}
                  help={t('policies.actionTimeoutHelp')}
                />
                <PolicySelectField
                  label={t('policies.actionMode')}
                  value={policy.actions?.afterSnapshotRoot?.mode}
                  onChange={(val) => {
                    const current = policy.actions?.afterSnapshotRoot || {};
                    updatePolicy('actions', 'afterSnapshotRoot', { ...current, mode: val });
                  }}
                  isDefined={isDefined('actions', 'afterSnapshotRoot')}
                  effectiveValue={resolvedPolicy?.effective.actions?.afterSnapshotRoot?.mode}
                  options={[
                    { value: 'essential', label: t('policies.actionModeEssential') },
                    { value: 'optional', label: t('policies.actionModeOptional') },
                    { value: 'async', label: t('policies.actionModeAsync') },
                  ]}
                  help={t('policies.actionModeHelp')}
                />
              </div>

              {/* Before Folder */}
              <div className="space-y-2 p-3 border rounded-lg">
                <Label className="font-medium">{t('policies.beforeFolder')}</Label>
                <PolicyTextField
                  label={t('policies.actionScript')}
                  value={policy.actions?.beforeFolder?.script}
                  onChange={(val) => {
                    const current = policy.actions?.beforeFolder || {};
                    updatePolicy(
                      'actions',
                      'beforeFolder',
                      val ? { ...current, script: val } : undefined
                    );
                  }}
                  isDefined={isDefined('actions', 'beforeFolder')}
                  effectiveValue={resolvedPolicy?.effective.actions?.beforeFolder?.script}
                  placeholder={t('policies.actionScriptPlaceholder')}
                  help={t('policies.beforeFolderHelp')}
                />
                <PolicyNumberField
                  label={t('policies.actionTimeout')}
                  value={policy.actions?.beforeFolder?.timeout}
                  onChange={(val) => {
                    const current = policy.actions?.beforeFolder || {};
                    updatePolicy('actions', 'beforeFolder', { ...current, timeout: val });
                  }}
                  isDefined={isDefined('actions', 'beforeFolder')}
                  effectiveValue={resolvedPolicy?.effective.actions?.beforeFolder?.timeout}
                />
                <PolicySelectField
                  label={t('policies.actionMode')}
                  value={policy.actions?.beforeFolder?.mode}
                  onChange={(val) => {
                    const current = policy.actions?.beforeFolder || {};
                    updatePolicy('actions', 'beforeFolder', { ...current, mode: val });
                  }}
                  isDefined={isDefined('actions', 'beforeFolder')}
                  effectiveValue={resolvedPolicy?.effective.actions?.beforeFolder?.mode}
                  options={[
                    { value: 'essential', label: t('policies.actionModeEssential') },
                    { value: 'optional', label: t('policies.actionModeOptional') },
                    { value: 'async', label: t('policies.actionModeAsync') },
                  ]}
                />
              </div>

              {/* After Folder */}
              <div className="space-y-2 p-3 border rounded-lg">
                <Label className="font-medium">{t('policies.afterFolder')}</Label>
                <PolicyTextField
                  label={t('policies.actionScript')}
                  value={policy.actions?.afterFolder?.script}
                  onChange={(val) => {
                    const current = policy.actions?.afterFolder || {};
                    updatePolicy(
                      'actions',
                      'afterFolder',
                      val ? { ...current, script: val } : undefined
                    );
                  }}
                  isDefined={isDefined('actions', 'afterFolder')}
                  effectiveValue={resolvedPolicy?.effective.actions?.afterFolder?.script}
                  placeholder={t('policies.actionScriptPlaceholder')}
                  help={t('policies.afterFolderHelp')}
                />
                <PolicyNumberField
                  label={t('policies.actionTimeout')}
                  value={policy.actions?.afterFolder?.timeout}
                  onChange={(val) => {
                    const current = policy.actions?.afterFolder || {};
                    updatePolicy('actions', 'afterFolder', { ...current, timeout: val });
                  }}
                  isDefined={isDefined('actions', 'afterFolder')}
                  effectiveValue={resolvedPolicy?.effective.actions?.afterFolder?.timeout}
                />
                <PolicySelectField
                  label={t('policies.actionMode')}
                  value={policy.actions?.afterFolder?.mode}
                  onChange={(val) => {
                    const current = policy.actions?.afterFolder || {};
                    updatePolicy('actions', 'afterFolder', { ...current, mode: val });
                  }}
                  isDefined={isDefined('actions', 'afterFolder')}
                  effectiveValue={resolvedPolicy?.effective.actions?.afterFolder?.mode}
                  options={[
                    { value: 'essential', label: t('policies.actionModeEssential') },
                    { value: 'optional', label: t('policies.actionModeOptional') },
                    { value: 'async', label: t('policies.actionModeAsync') },
                  ]}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Logging Policy */}
        <AccordionItem value="logging">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-muted-foreground" />
              {t('policies.loggingPolicy')}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">{t('policies.loggingPolicyHelp')}</p>

              {/* Directory Logging */}
              <div className="space-y-2 p-3 border rounded-lg">
                <Label className="font-medium">{t('policies.directoryLogging')}</Label>
                <PolicyNumberField
                  label={t('policies.logSnapshotted')}
                  value={policy.logging?.directories?.snapshotted}
                  onChange={(val) => {
                    const current = policy.logging?.directories || {};
                    updatePolicy('logging', 'directories', { ...current, snapshotted: val });
                  }}
                  isDefined={isDefined('logging', 'directories')}
                  effectiveValue={resolvedPolicy?.effective.logging?.directories?.snapshotted}
                  help={t('policies.logLevelHelp')}
                />
                <PolicyNumberField
                  label={t('policies.logIgnored')}
                  value={policy.logging?.directories?.ignored}
                  onChange={(val) => {
                    const current = policy.logging?.directories || {};
                    updatePolicy('logging', 'directories', { ...current, ignored: val });
                  }}
                  isDefined={isDefined('logging', 'directories')}
                  effectiveValue={resolvedPolicy?.effective.logging?.directories?.ignored}
                />
              </div>

              {/* Entry Logging */}
              <div className="space-y-2 p-3 border rounded-lg">
                <Label className="font-medium">{t('policies.entryLogging')}</Label>
                <PolicyNumberField
                  label={t('policies.logSnapshotted')}
                  value={policy.logging?.entries?.snapshotted}
                  onChange={(val) => {
                    const current = policy.logging?.entries || {};
                    updatePolicy('logging', 'entries', { ...current, snapshotted: val });
                  }}
                  isDefined={isDefined('logging', 'entries')}
                  effectiveValue={resolvedPolicy?.effective.logging?.entries?.snapshotted}
                  help={t('policies.logLevelHelp')}
                />
                <PolicyNumberField
                  label={t('policies.logIgnored')}
                  value={policy.logging?.entries?.ignored}
                  onChange={(val) => {
                    const current = policy.logging?.entries || {};
                    updatePolicy('logging', 'entries', { ...current, ignored: val });
                  }}
                  isDefined={isDefined('logging', 'entries')}
                  effectiveValue={resolvedPolicy?.effective.logging?.entries?.ignored}
                />
                <PolicyNumberField
                  label={t('policies.logCacheHit')}
                  value={policy.logging?.entries?.cacheHit}
                  onChange={(val) => {
                    const current = policy.logging?.entries || {};
                    updatePolicy('logging', 'entries', { ...current, cacheHit: val });
                  }}
                  isDefined={isDefined('logging', 'entries')}
                  effectiveValue={resolvedPolicy?.effective.logging?.entries?.cacheHit}
                />
                <PolicyNumberField
                  label={t('policies.logCacheMiss')}
                  value={policy.logging?.entries?.cacheMiss}
                  onChange={(val) => {
                    const current = policy.logging?.entries || {};
                    updatePolicy('logging', 'entries', { ...current, cacheMiss: val });
                  }}
                  isDefined={isDefined('logging', 'entries')}
                  effectiveValue={resolvedPolicy?.effective.logging?.entries?.cacheMiss}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* OS Snapshots Policy (Windows VSS) */}
        <AccordionItem value="osSnapshots">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              {t('policies.osSnapshotsPolicy')}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">{t('policies.osSnapshotsPolicyHelp')}</p>
              <PolicySelectField
                label={t('policies.volumeShadowCopy')}
                value={policy.osSnapshots?.volumeShadowCopy?.enable?.toString()}
                onChange={(val) => {
                  const numVal = val ? parseInt(val, 10) : undefined;
                  updatePolicy(
                    'osSnapshots',
                    'volumeShadowCopy',
                    numVal !== undefined ? { enable: numVal } : undefined
                  );
                }}
                isDefined={isDefined('osSnapshots', 'volumeShadowCopy')}
                effectiveValue={resolvedPolicy?.effective.osSnapshots?.volumeShadowCopy?.enable?.toString()}
                options={[
                  { value: '0', label: t('policies.vssNever') },
                  { value: '1', label: t('policies.vssAlways') },
                  { value: '2', label: t('policies.vssWhenAvailable') },
                ]}
                help={t('policies.volumeShadowCopyHelp')}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Splitter Policy */}
        <AccordionItem value="splitter">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              {t('policies.splitterPolicy')}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <PolicyTextField
                label={t('policies.splitterAlgorithm')}
                value={policy.splitter?.algorithm}
                onChange={(val) => updatePolicy('splitter', 'algorithm', val)}
                isDefined={isDefined('splitter', 'algorithm')}
                effectiveValue={resolvedPolicy?.effective.splitter?.algorithm}
                placeholder={t('policies.splitterAlgorithmPlaceholder')}
                help={t('policies.splitterAlgorithmHelp')}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose} disabled={isSaving || isDeleting}>
          {t('common.cancel')}
        </Button>
        {!isNew && !isGlobalPolicy && (
          <Button
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={isSaving || isDeleting}
          >
            {isDeleting ? (
              <Spinner className="h-4 w-4 mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {t('common.delete')}
          </Button>
        )}
        <Button onClick={() => void handleSave()} disabled={isSaving || isDeleting}>
          {isSaving ? <Spinner className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
