/**
 * PolicyEdit page - Edit a specific policy
 *
 * Allows editing policies at any hierarchy level (global, host, user, path)
 * Shows inheritance from parent policies
 */

import { useNavigate, useSearchParams } from 'react-router';
import { PolicyEditor } from '@/components/kopia/policy';
import type { PolicyTarget } from '@/lib/kopia';

export function PolicyEdit() {
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
      {/* Editor */}
      <PolicyEditor target={target} onClose={handleClose} />
    </div>
  );
}
