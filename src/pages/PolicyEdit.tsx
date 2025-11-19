/**
 * PolicyEdit page - Edit a specific policy
 *
 * Allows editing policies at any hierarchy level (global, host, user, path)
 * Shows inheritance from parent policies
 */

import { useNavigate, useSearchParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/policies">{t('nav.policies')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t('policies.editPolicy')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Editor */}
      <PolicyEditor target={target} onClose={handleClose} />
    </div>
  );
}
