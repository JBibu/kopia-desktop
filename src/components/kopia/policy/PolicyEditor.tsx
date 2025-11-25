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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
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
} from 'lucide-react';
import type { PolicyDefinition, PolicyTarget, ResolvedPolicyResponse } from '@/lib/kopia/types';
import {
  getPolicy,
  setPolicy as setPolicyClient,
  deletePolicy,
  resolvePolicy,
} from '@/lib/kopia/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia/errors';
import { formatDateTime } from '@/lib/utils';
import { usePreferencesStore } from '@/stores/preferences';

interface PolicyEditorProps {
  target: PolicyTarget;
  onClose?: () => void;
  onSave?: () => void;
}

export function PolicyEditor({ target, onClose, onSave }: PolicyEditorProps) {
  const { t } = useTranslation();
  const language = usePreferencesStore((state) => state.language);
  const locale = language === 'es' ? 'es-ES' : 'en-US';

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
      setIsLoading(true);
      setError(null);
      try {
        const response = await getPolicy(target.userName, target.host, target.path);
        // Extract just the policy definition from the response
        setPolicy(response.policy || {});
        setIsNew(false);
      } catch (err: unknown) {
        // Policy not found - this is a new policy (expected for new policies)
        const message = getErrorMessage(err);

        // Extract nested error message if available
        let errorData = '';
        if (typeof err === 'object' && err !== null && 'data' in err) {
          const data = err.data as Record<string, unknown>;
          if (typeof data.message === 'string') {
            errorData = data.message;
          }
        }

        // Check error type directly (language-independent)
        const errorType =
          typeof err === 'object' && err !== null && 'type' in err ? (err.type as string) : '';

        // Treat NOT_FOUND, 404, HTTP failures, deserialization errors, and "not found" as new policy scenarios
        // This is expected behavior when creating a new policy
        const isNotFoundError =
          errorType === 'HTTP_REQUEST_FAILED' ||
          message.includes('NOT_FOUND') ||
          message.includes('not found') ||
          message.includes('404') ||
          message.includes('HTTP request failed') ||
          message.includes('La solicitud HTTP falló') ||
          errorData.includes('missing field') ||
          errorData.includes('error decoding response body') ||
          message.toLowerCase().includes('not found');

        if (isNotFoundError) {
          setPolicy({});
          setIsNew(true);
        } else {
          // Only set error for actual failures (not missing policies)
          if (import.meta.env.DEV) {
            console.error('Error fetching policy:', message, err);
          }
          setError(message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [target]);

  // Resolve policy in real-time to show effective values
  useEffect(() => {
    const doResolve = async () => {
      try {
        // Always call resolve without updates parameter to get the effective policy
        // This avoids serialization issues and still shows inherited values
        const resolved = await resolvePolicy(target.userName, target.host, target.path);
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
  }, [target]); // Only depend on target, not policy, to avoid constant re-resolution

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setPolicyClient(policy, target.userName, target.host, target.path);
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
    if (!confirm(t('policies.confirmDelete'))) return;

    setIsDeleting(true);
    try {
      await deletePolicy(target.userName, target.host, target.path);
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
              <PolicyArrayField
                label={t('policies.timeOfDay')}
                value={policy.scheduling?.timeOfDay}
                onChange={(val) => updatePolicy('scheduling', 'timeOfDay', val)}
                isDefined={isDefined('scheduling', 'timeOfDay')}
                effectiveValue={resolvedPolicy?.effective.scheduling?.timeOfDay}
                placeholder="e.g., 09:00, 17:00"
                help={t('policies.timeOfDayHelp')}
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
                value={policy.files?.dotIgnoreFiles}
                onChange={(val) => updatePolicy('files', 'dotIgnoreFiles', val)}
                isDefined={isDefined('files', 'dotIgnoreFiles')}
                effectiveValue={resolvedPolicy?.effective.files?.dotIgnoreFiles}
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
              <PolicyArrayField
                label={t('policies.neverCompress')}
                value={policy.compression?.neverCompress}
                onChange={(val) => updatePolicy('compression', 'neverCompress', val)}
                isDefined={isDefined('compression', 'neverCompress')}
                effectiveValue={resolvedPolicy?.effective.compression?.neverCompress}
                placeholder="e.g., .jpg, .mp4, .zip"
                help={t('policies.neverCompressHelp')}
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

// ============================================================================
// Field Components
// ============================================================================

interface PolicyFieldProps {
  label: string;
  isDefined: boolean;
  effectiveValue?: unknown;
  help?: string;
}

interface PolicyNumberFieldProps extends PolicyFieldProps {
  value?: number;
  onChange: (value: number | undefined) => void;
}

function PolicyNumberField({
  label,
  value,
  onChange,
  isDefined,
  effectiveValue,
  help,
}: PolicyNumberFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {isDefined && <Badge variant="outline">{t('policies.overridden')}</Badge>}
        </Label>
        {effectiveValue !== undefined && !isDefined && typeof effectiveValue === 'number' && (
          <span className="text-xs text-muted-foreground">
            {t('policies.inherited')}: {effectiveValue}
          </span>
        )}
      </div>
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
        placeholder={typeof effectiveValue === 'number' ? String(effectiveValue) : undefined}
      />
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

interface PolicyTextFieldProps extends PolicyFieldProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}

function PolicyTextField({
  label,
  value,
  onChange,
  isDefined,
  effectiveValue,
  placeholder,
  help,
}: PolicyTextFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {isDefined && <Badge variant="outline">{t('policies.overridden')}</Badge>}
        </Label>
        {effectiveValue !== undefined && !isDefined && typeof effectiveValue === 'string' && (
          <span className="text-xs text-muted-foreground">
            {t('policies.inherited')}: {effectiveValue}
          </span>
        )}
      </div>
      <Input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={
          placeholder || (typeof effectiveValue === 'string' ? effectiveValue : undefined)
        }
      />
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

interface PolicyBooleanFieldProps extends PolicyFieldProps {
  value?: boolean;
  onChange: (value: boolean | undefined) => void;
}

function PolicyBooleanField({
  label,
  value,
  onChange,
  isDefined,
  effectiveValue,
  help,
}: PolicyBooleanFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {isDefined && <Badge variant="outline">{t('policies.overridden')}</Badge>}
        </Label>
        {effectiveValue !== undefined && !isDefined && (
          <span className="text-xs text-muted-foreground">
            {t('policies.inherited')}:{' '}
            {effectiveValue ? t('policies.enabled') : t('policies.disabled')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Switch checked={value ?? false} onCheckedChange={(checked) => onChange(checked)} />
        <span className="text-sm text-muted-foreground">
          {value ? t('policies.enabled') : t('policies.disabled')}
        </span>
      </div>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

interface PolicyArrayFieldProps extends PolicyFieldProps {
  value?: string[];
  onChange: (value: string[] | undefined) => void;
  placeholder?: string;
}

function PolicyArrayField({
  label,
  value,
  onChange,
  isDefined,
  effectiveValue,
  placeholder,
  help,
}: PolicyArrayFieldProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (!inputValue.trim()) return;
    const newValue = [...(value || []), inputValue.trim()];
    onChange(newValue);
    setInputValue('');
  };

  const handleRemove = (index: number) => {
    const newValue = [...(value || [])];
    newValue.splice(index, 1);
    onChange(newValue.length > 0 ? newValue : undefined);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {isDefined && <Badge variant="outline">{t('policies.overridden')}</Badge>}
        </Label>
        {effectiveValue !== undefined && !isDefined && Array.isArray(effectiveValue) && (
          <span className="text-xs text-muted-foreground">
            {t('policies.inherited')}: {effectiveValue.length} {t('policies.rules')}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button type="button" size="sm" onClick={handleAdd}>
          {t('common.add')}
        </Button>
      </div>
      {value && value.length > 0 && (
        <div className="space-y-1">
          {value.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 text-sm bg-muted rounded"
            >
              <code className="font-mono">{item}</code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(idx)}
                className="h-6 w-6 p-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}
