/**
 * Pin Dialog Component - Manage snapshot pins for retention protection
 *
 * Allows users to add or remove pins from snapshots to protect them from
 * automatic deletion by retention policies.
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Pin, X } from 'lucide-react';
import { toast } from 'sonner';
import { editSnapshot } from '@/lib/kopia';
import { getErrorMessage } from '@/lib/kopia';
import { useCurrentRepoId } from '@/hooks';

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
  currentPins: string[];
  onPinsUpdated: () => void;
}

export function PinDialog({
  open,
  onOpenChange,
  snapshotId,
  currentPins,
  onPinsUpdated,
}: PinDialogProps) {
  const { t } = useTranslation();
  const currentRepoId = useCurrentRepoId();
  const [pins, setPins] = useState<string[]>(currentPins);
  const [newPinName, setNewPinName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddPin = () => {
    const trimmedName = newPinName.trim();
    if (!trimmedName) {
      toast.error(t('snapshots.pins.emptyName'));
      return;
    }
    if (pins.includes(trimmedName)) {
      toast.error(t('snapshots.pins.duplicateName'));
      return;
    }
    setPins([...pins, trimmedName]);
    setNewPinName('');
  };

  const handleRemovePin = (pinToRemove: string) => {
    setPins(pins.filter((pin) => pin !== pinToRemove));
  };

  const handleSave = async () => {
    if (!currentRepoId) {
      toast.error(t('common.noRepositorySelected'));
      return;
    }

    setIsSubmitting(true);
    try {
      const pinsToAdd = pins.filter((pin) => !currentPins.includes(pin));
      const pinsToRemove = currentPins.filter((pin) => !pins.includes(pin));

      if (pinsToAdd.length === 0 && pinsToRemove.length === 0) {
        onOpenChange(false);
        return;
      }

      await editSnapshot(currentRepoId, {
        snapshots: [snapshotId],
        addPins: pinsToAdd.length > 0 ? pinsToAdd : undefined,
        removePins: pinsToRemove.length > 0 ? pinsToRemove : undefined,
      });

      toast.success(t('snapshots.pins.updateSuccess'));
      onPinsUpdated();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newPinName.trim()) {
      e.preventDefault();
      handleAddPin();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="h-5 w-5" />
            {t('snapshots.pins.manageTitle')}
          </DialogTitle>
          <DialogDescription>{t('snapshots.pins.manageDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Pins */}
          <div className="space-y-2">
            <Label>{t('snapshots.pins.currentPins')}</Label>
            {pins.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('snapshots.pins.noPins')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pins.map((pin) => (
                  <Badge key={pin} variant="secondary" className="gap-1">
                    <Pin className="h-3 w-3" />
                    {pin}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => handleRemovePin(pin)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Add New Pin */}
          <div className="space-y-2">
            <Label htmlFor="newPin">{t('snapshots.pins.addNew')}</Label>
            <div className="flex gap-2">
              <Input
                id="newPin"
                type="text"
                placeholder={t('snapshots.pins.pinNamePlaceholder')}
                value={newPinName}
                onChange={(e) => setNewPinName(e.target.value)}
                onKeyPress={handleKeyPress}
                maxLength={50}
              />
              <Button onClick={handleAddPin} disabled={!newPinName.trim()}>
                <Pin className="h-4 w-4 mr-2" />
                {t('common.add')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('snapshots.pins.pinHint')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSubmitting}>
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
