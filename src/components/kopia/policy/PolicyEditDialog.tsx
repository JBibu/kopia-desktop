/**
 * PolicyEditDialog - Dialog wrapper for PolicyEditor
 * Allows editing policies in a modal dialog
 */

import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PolicyEditor } from './PolicyEditor';
import type { PolicyTarget } from '@/lib/kopia';
import { Settings2 } from 'lucide-react';

interface PolicyEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Policy target (userName, host, path) */
  target: PolicyTarget;
  /** Callback after save/delete */
  onSave?: () => void;
}

export function PolicyEditDialog({ open, onOpenChange, target, onSave }: PolicyEditDialogProps) {
  const { t } = useTranslation();

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSave = () => {
    onSave?.();
  };

  // Generate target label
  const targetLabel = target.path
    ? target.path.split('/').pop() || target.path
    : target.userName
      ? `${target.userName}@${target.host}`
      : target.host
        ? target.host
        : t('policies.globalPolicy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t('policies.editPolicyFor', { target: targetLabel })}
          </DialogTitle>
        </DialogHeader>
        <PolicyEditor target={target} onClose={handleClose} onSave={handleSave} />
      </DialogContent>
    </Dialog>
  );
}
