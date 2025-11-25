/**
 * Policies page - Configure backup policies and schedules
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useKopiaStore } from '@/stores/kopia';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ListTodo,
  Calendar,
  Timer,
  Archive,
  FileX,
  RefreshCw,
  Globe,
  Monitor,
  User,
  FolderTree,
  AlertCircle,
  Info,
  Plus,
  Edit,
} from 'lucide-react';
import type { PolicyResponse } from '@/lib/kopia/types';

export function Policies() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const policies = useKopiaStore((state) => state.policies);
  const isLoading = useKopiaStore((state) => state.isPoliciesLoading);
  const error = useKopiaStore((state) => state.policiesError);
  const fetchPolicies = useKopiaStore((state) => state.refreshPolicies);
  const [selectedTab, setSelectedTab] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchPolicies();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper to get target string
  const getTargetString = (p: PolicyResponse): string => {
    const target = p.target;
    if (!target.userName && !target.host && !target.path) return '*/*/*';
    if (!target.userName && target.host && !target.path) return `@${target.host}/*/*`;
    if (target.userName && target.host && !target.path)
      return `${target.userName}@${target.host}/*`;
    if (target.userName && target.host && target.path)
      return `${target.userName}@${target.host}:${target.path}`;
    return t('tasks.unknown');
  };

  // Group policies by level according to Kopia's 4-level hierarchy:
  // 1. Global (*/*/*): no user, no host, no path
  // 2. Host (@host/*/*): host only, no user, no path
  // 3. User (user@host/*): user AND host, no path
  // 4. Path (user@host/path): user AND host AND path
  const globalPolicies = policies.filter((p) => {
    const t = p.target;
    return !t.userName && !t.host && !t.path;
  });
  const hostPolicies = policies.filter((p) => {
    const t = p.target;
    return !t.userName && t.host && !t.path;
  });
  const userPolicies = policies.filter((p) => {
    const t = p.target;
    return t.userName && t.host && !t.path;
  });
  const pathPolicies = policies.filter((p) => {
    const t = p.target;
    return t.userName && t.host && t.path;
  });

  const getPolicyLevel = (p: PolicyResponse): string => {
    const t = p.target;
    if (!t.userName && !t.host && !t.path) return 'global';
    if (!t.userName && t.host && !t.path) return 'host';
    if (t.userName && t.host && !t.path) return 'user';
    if (t.userName && t.host && t.path) return 'path';
    return 'unknown';
  };

  const getPolicyLevelBadge = (level: string) => {
    const variants = {
      global: { icon: Globe, variant: 'default' as const, textKey: 'policies.global' },
      host: { icon: Monitor, variant: 'secondary' as const, textKey: 'policies.host' },
      user: { icon: User, variant: 'secondary' as const, textKey: 'policies.user' },
      path: { icon: FolderTree, variant: 'outline' as const, textKey: 'policies.path' },
    };

    const config = variants[level as keyof typeof variants] || variants.path;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {t(config.textKey)}
      </Badge>
    );
  };

  const handleEditPolicy = (policyResponse: PolicyResponse) => {
    const params = new URLSearchParams();
    if (policyResponse.target.userName) params.set('userName', policyResponse.target.userName);
    if (policyResponse.target.host) params.set('host', policyResponse.target.host);
    if (policyResponse.target.path) params.set('path', policyResponse.target.path);
    void navigate(`/policies/edit?${params.toString()}`);
  };

  const handleCreateGlobalPolicy = () => {
    void navigate('/policies/edit');
  };

  const PolicyCard = ({ policyResponse }: { policyResponse: PolicyResponse }) => {
    const level = getPolicyLevel(policyResponse);
    const policy = policyResponse.policy;
    const targetStr = getTargetString(policyResponse);

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{targetStr}</CardTitle>
              {getPolicyLevelBadge(level)}
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleEditPolicy(policyResponse)}>
              <Edit className="h-4 w-4 mr-2" />
              {t('common.edit')}
            </Button>
          </div>
          <CardDescription className="text-xs">
            {policy.retention && (
              <span>
                {t('policies.retentionDescription', {
                  latest: policy.retention.keepLatest || 0,
                  daily: policy.retention.keepDaily || 0,
                })}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Accordion type="single" collapsible className="w-full">
            {policy.retention && (
              <AccordionItem value="retention">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {t('policies.retentionPolicy')}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('policies.keepLatest')}</span>
                      <span className="font-medium">{policy.retention.keepLatest || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('policies.keepDaily')}</span>
                      <span className="font-medium">{policy.retention.keepDaily || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('policies.keepWeekly')}</span>
                      <span className="font-medium">{policy.retention.keepWeekly || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('policies.keepMonthly')}</span>
                      <span className="font-medium">{policy.retention.keepMonthly || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('policies.keepAnnual')}</span>
                      <span className="font-medium">{policy.retention.keepAnnual || 0}</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {policy.scheduling && (
              <AccordionItem value="scheduling">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    {t('policies.schedulingPolicy')}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('policies.interval')}</span>
                      <span className="font-medium">
                        {policy.scheduling.intervalSeconds || t('policies.notSet')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('policies.manual')}</span>
                      <span className="font-medium">
                        {policy.scheduling.manual ? t('policies.yes') : t('policies.no')}
                      </span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {policy.compression && (
              <AccordionItem value="compression">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    {t('policies.compressionPolicy')}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('policies.compressorName')}</span>
                      <span className="font-medium">
                        {policy.compression.compressorName || t('policies.default')}
                      </span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {policy.files && (
              <AccordionItem value="files">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <FileX className="h-4 w-4 text-muted-foreground" />
                    {t('policies.filesPolicy')}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    {policy.files.ignore && policy.files.ignore.length > 0 && (
                      <div>
                        <span className="text-muted-foreground block mb-1">
                          {t('policies.ignoreRules')}:
                        </span>
                        <ul className="list-disc list-inside space-y-1">
                          {policy.files.ignore.map((rule: string, idx: number) => (
                            <li key={idx} className="font-mono text-xs">
                              {rule}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('policies.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('policies.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button size="sm" onClick={handleCreateGlobalPolicy}>
            <Plus className="h-4 w-4 mr-2" />
            {t('policies.createPolicy')}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{t('policies.hierarchyInfo')}</AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              {t('policies.global')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalPolicies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              {t('policies.host')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hostPolicies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {t('policies.user')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userPolicies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-muted-foreground" />
              {t('policies.path')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pathPolicies.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">
            {t('policies.all')} ({policies.length})
          </TabsTrigger>
          <TabsTrigger value="global">
            {t('policies.global')} ({globalPolicies.length})
          </TabsTrigger>
          <TabsTrigger value="host">
            {t('policies.host')} ({hostPolicies.length})
          </TabsTrigger>
          <TabsTrigger value="user">
            {t('policies.user')} ({userPolicies.length})
          </TabsTrigger>
          <TabsTrigger value="path">
            {t('policies.path')} ({pathPolicies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : policies.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title={t('policies.noPoliciesFound')}
              description={t('policies.noPoliciesConfigured')}
            />
          ) : (
            policies.map((policy, idx) => <PolicyCard key={idx} policyResponse={policy} />)
          )}
        </TabsContent>

        <TabsContent value="global" className="space-y-4">
          {globalPolicies.length === 0 ? (
            <EmptyState
              icon={Globe}
              title={t('policies.noGlobalPolicies')}
              description={t('policies.noGlobalConfigured')}
            />
          ) : (
            globalPolicies.map((policy, idx) => <PolicyCard key={idx} policyResponse={policy} />)
          )}
        </TabsContent>

        <TabsContent value="host" className="space-y-4">
          {hostPolicies.length === 0 ? (
            <EmptyState
              icon={Monitor}
              title={t('policies.noHostPolicies')}
              description={t('policies.noHostConfigured')}
            />
          ) : (
            hostPolicies.map((policy, idx) => <PolicyCard key={idx} policyResponse={policy} />)
          )}
        </TabsContent>

        <TabsContent value="user" className="space-y-4">
          {userPolicies.length === 0 ? (
            <EmptyState
              icon={User}
              title={t('policies.noUserPolicies')}
              description={t('policies.noUserConfigured')}
            />
          ) : (
            userPolicies.map((policy, idx) => <PolicyCard key={idx} policyResponse={policy} />)
          )}
        </TabsContent>

        <TabsContent value="path" className="space-y-4">
          {pathPolicies.length === 0 ? (
            <EmptyState
              icon={FolderTree}
              title={t('policies.noPathPolicies')}
              description={t('policies.noPathConfigured')}
            />
          ) : (
            pathPolicies.map((policy, idx) => <PolicyCard key={idx} policyResponse={policy} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
