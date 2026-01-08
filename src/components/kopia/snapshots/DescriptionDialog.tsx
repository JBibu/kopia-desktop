/**
 * Description Dialog Component - Edit snapshot description
 *
 * Allows users to add, edit, or remove descriptions from snapshots
 * to help identify and organize their backups.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { editSnapshot } from '@/lib/kopia';
import { getErrorMessage } from '@/lib/kopia';
import { useCurrentRepoId } from '@/hooks';

interface DescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
  currentDescription?: string;
  onDescriptionUpdated: () => void;
}

export function DescriptionDialog({
  open,
  onOpenChange,
  snapshotId,
  currentDescription = '',
  onDescriptionUpdated,
}: DescriptionDialogProps) {
  const { t } = useTranslation();
  const currentRepoId = useCurrentRepoId();
  const [description, setDescription] = useState(currentDescription);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (overrideDescription?: string) => {
    if (!currentRepoId) {
      toast.error(t('common.noRepositorySelected'));
      return;
    }

    const newDescription = (overrideDescription ?? description).trim();
    setIsSubmitting(true);
    try {
      await editSnapshot(currentRepoId, {
        snapshots: [snapshotId],
        description: newDescription,
      });

      toast.success(
        newDescription
          ? t('snapshots.description.updateSuccess')
          : t('snapshots.description.removeSuccess')
      );
      onDescriptionUpdated();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUnchanged = description === currentDescription;
  const hasDescription = currentDescription && currentDescription.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('snapshots.description.title')}
          </DialogTitle>
          <DialogDescription>{t('snapshots.description.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">{t('snapshots.description.label')}</Label>
            <Textarea
              id="description"
              placeholder={t('snapshots.description.placeholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{t('snapshots.description.hint')}</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {hasDescription && (
            <Button
              variant="destructive"
              onClick={() => void handleSave('')}
              disabled={isSubmitting}
            >
              {t('snapshots.description.remove')}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSubmitting || isUnchanged}>
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                {t('common.saving')}
              </>
            ) : (
              t('common.save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
