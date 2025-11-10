/**
 * PolicyEdit page - Edit a specific policy
 *
 * Allows editing policies at any hierarchy level (global, host, user, path)
 * Shows inheritance from parent policies
 */

import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { PolicyEditor } from '@/components/kopia/policy/PolicyEditor';
import type { PolicyTarget } from '@/lib/kopia/types';

export function PolicyEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Parse target from URL params
  const target: PolicyTarget = {
    userName: searchParams.get('userName') || undefined,
    host: searchParams.get('host') || undefined,
    path: searchParams.get('path') || undefined,
  };

  const handleClose = () => {
    void navigate('/policies');
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={handleClose}>
        <ChevronLeft className="h-4 w-4 mr-2" />
        {t('common.back')}
      </Button>

      {/* Editor */}
      <PolicyEditor target={target} onClose={handleClose} />
    </div>
  );
}
