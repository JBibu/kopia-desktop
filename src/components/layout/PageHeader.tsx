import { Fragment } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Home } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface BreadcrumbItemType {
  /** Display label */
  label: string;
  /** Navigation path (optional - if not provided, item is non-clickable) */
  path?: string;
  /** Click handler (alternative to path) */
  onClick?: () => void;
  /** Optional icon */
  icon?: React.ElementType;
}

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ElementType;
}

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Breadcrumb items (excluding home, which is automatic) */
  breadcrumbs?: BreadcrumbItemType[];
  /** Action buttons to show on the right */
  actions?: React.ReactNode;
  /** Loading state - shows skeleton for title */
  isLoading?: boolean;
  /** Show back button instead of breadcrumbs */
  showBack?: boolean;
  /** Custom back handler (defaults to navigate(-1)) */
  onBack?: () => void;
  /** Tabs for page-level navigation */
  tabs?: {
    value: string;
    onChange: (value: string) => void;
    items: TabItem[];
  };
  /** Additional className for the container */
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  isLoading,
  showBack,
  onBack,
  tabs,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      void navigate(-1);
    }
  };

  return (
    <div className={cn('space-y-4 mb-6', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && !showBack && (
        <Breadcrumb>
          <BreadcrumbList>
            {/* Home icon */}
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center">
                  <Home className="h-3.5 w-3.5" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {/* Breadcrumb items */}
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              const isClickable = crumb.path || crumb.onClick;

              return (
                <Fragment key={crumb.path || `crumb-${idx}`}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="max-w-[200px] truncate">
                        {crumb.icon && <crumb.icon className="h-3.5 w-3.5 mr-1.5 inline" />}
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : isClickable ? (
                      crumb.onClick ? (
                        <BreadcrumbLink asChild>
                          <button
                            type="button"
                            onClick={crumb.onClick}
                            className="max-w-[200px] truncate flex items-center hover:text-foreground"
                          >
                            {crumb.icon && <crumb.icon className="h-3.5 w-3.5 mr-1.5" />}
                            {crumb.label}
                          </button>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link
                            to={crumb.path!}
                            className="max-w-[200px] truncate flex items-center"
                          >
                            {crumb.icon && <crumb.icon className="h-3.5 w-3.5 mr-1.5" />}
                            {crumb.label}
                          </Link>
                        </BreadcrumbLink>
                      )
                    ) : (
                      <span className="max-w-[200px] truncate flex items-center text-muted-foreground">
                        {crumb.icon && <crumb.icon className="h-3.5 w-3.5 mr-1.5" />}
                        {crumb.label}
                      </span>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* Title Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {showBack && (
            <Button variant="outline" size="icon" onClick={handleBack} className="shrink-0 mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="space-y-1 min-w-0">
            {isLoading ? (
              <div className="h-9 w-48 bg-muted animate-pulse rounded" />
            ) : (
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{title}</h1>
            )}
            {subtitle && <p className="text-sm text-muted-foreground line-clamp-2">{subtitle}</p>}
          </div>
        </div>

        {/* Actions */}
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* Tabs */}
      {tabs && (
        <Tabs value={tabs.value} onValueChange={tabs.onChange}>
          <TabsList>
            {tabs.items.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="gap-2">
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}
