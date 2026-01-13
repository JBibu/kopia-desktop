/**
 * NewBackupDialog - Dialog for creating new backup sources/snapshots
 * Simplified version of SnapshotCreate for use in dialogs
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnapshots, useCurrentRepoId } from '@/hooks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { FolderOpen, Camera, Calculator, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage, selectFolder, estimateSnapshot } from '@/lib/kopia';
import { SnapshotEstimationResults } from '@/components/kopia/snapshots';

interface NewBackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill the path (e.g., when adding to a profile) */
  defaultPath?: string;
  /** Callback after successful creation */
  onSuccess?: () => void;
}

export function NewBackupDialog({
  open,
  onOpenChange,
  defaultPath = '',
  onSuccess,
}: NewBackupDialogProps) {
  const { t } = useTranslation();
  const { createSnapshot } = useSnapshots();
  const currentRepoId = useCurrentRepoId();

  // Form state
  const [path, setPath] = useState(defaultPath);
  const [startSnapshot, setStartSnapshot] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Estimation state
  const [estimationTaskId, setEstimationTaskId] = useState<string | null>(null);
  const [showEstimation, setShowEstimation] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPath(defaultPath);
      setStartSnapshot(true);
      setEstimationTaskId(null);
      setShowEstimation(false);
    }
  }, [open, defaultPath]);

  const handleBrowseFolder = async () => {
    try {
      const selectedPath = await selectFolder(path || undefined);
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

  const handleCreate = async () => {
    if (!path.trim()) {
      toast.error(t('snapshotCreate.pathRequired'));
      return;
    }

    setIsCreating(true);
    try {
      await createSnapshot(path, startSnapshot);

      toast.success(
        startSnapshot ? t('snapshotCreate.snapshotCreated') : t('snapshotCreate.sourceCreated')
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t('snapshotCreate.title')}
          </DialogTitle>
          <DialogDescription>{t('snapshotCreate.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Path selection */}
          <div className="space-y-2">
            <Label htmlFor="backup-path">
              {t('snapshotCreate.path')} <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="backup-path"
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

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="start-snapshot-now"
                checked={startSnapshot}
                onCheckedChange={(checked) => setStartSnapshot(checked === true)}
              />
              <Label htmlFor="start-snapshot-now" className="text-sm font-normal cursor-pointer">
                {t('snapshotCreate.startSnapshotNow')}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              {startSnapshot
                ? t('snapshotCreate.willStartImmediately', 'Will start backup immediately')
                : t('snapshotCreate.willCreateSourceOnly', 'Will only register the source')}
            </p>
          </div>

          {/* Estimation Results */}
          {showEstimation && estimationTaskId && (
            <>
              <Separator />
              <SnapshotEstimationResults
                taskId={estimationTaskId}
                onClose={() => {
                  setShowEstimation(false);
                  setEstimationTaskId(null);
                }}
              />
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleEstimate()}
            disabled={isCreating || !path.trim()}
          >
            <Calculator className="h-4 w-4 mr-2" />
            {t('snapshots.estimate')}
          </Button>
          <Button onClick={() => void handleCreate()} disabled={isCreating || !path.trim()}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
