/**
 * Policies page - Configure backup policies and schedules
 */

import { useEffect, useState } from 'react';
import { usePolicies } from '@/hooks/usePolicies';
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
} from 'lucide-react';
import type { PolicyResponse } from '@/lib/kopia/types';

export function Policies() {
  const { policies, isLoading, error, fetchPolicies } = usePolicies();
  const [selectedTab, setSelectedTab] = useState('all');

  useEffect(() => {
    void fetchPolicies();
  }, [fetchPolicies]);

  const handleRefresh = async () => {
    await fetchPolicies();
  };

  // Helper to get target string
  const getTargetString = (p: PolicyResponse): string => {
    const t = p.target;
    if (!t.userName && !t.host && !t.path) return '*/*/*';
    if (!t.userName && t.host && !t.path) return `@${t.host}/*/*`;
    if (t.userName && t.host && !t.path) return `${t.userName}@${t.host}/*`;
    if (t.userName && t.host && t.path) return `${t.userName}@${t.host}:${t.path}`;
    return 'unknown';
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
      global: { icon: Globe, variant: 'default' as const, text: 'Global' },
      host: { icon: Monitor, variant: 'secondary' as const, text: 'Host' },
      user: { icon: User, variant: 'secondary' as const, text: 'User' },
      path: { icon: FolderTree, variant: 'outline' as const, text: 'Path' },
    };

    const config = variants[level as keyof typeof variants] || variants.path;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const PolicyCard = ({ policyResponse }: { policyResponse: PolicyResponse }) => {
    const level = getPolicyLevel(policyResponse);
    const policy = policyResponse.policy;
    const targetStr = getTargetString(policyResponse);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{targetStr}</CardTitle>
              {getPolicyLevelBadge(level)}
            </div>
          </div>
          <CardDescription className="text-xs">
            {policy.retention && (
              <span>
                Retention: Keep {policy.retention.keepLatest || 0} latest,{' '}
                {policy.retention.keepDaily || 0} daily
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
                    Retention Policy
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Keep Latest</span>
                      <span className="font-medium">{policy.retention.keepLatest || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Keep Daily</span>
                      <span className="font-medium">{policy.retention.keepDaily || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Keep Weekly</span>
                      <span className="font-medium">{policy.retention.keepWeekly || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Keep Monthly</span>
                      <span className="font-medium">{policy.retention.keepMonthly || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Keep Annual</span>
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
                    Scheduling Policy
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interval</span>
                      <span className="font-medium">{policy.scheduling.interval || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Manual</span>
                      <span className="font-medium">{policy.scheduling.manual ? 'Yes' : 'No'}</span>
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
                    Compression Policy
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Compressor Name</span>
                      <span className="font-medium">
                        {policy.compression.compressorName || 'Default'}
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
                    Files Policy
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    {policy.files.ignore && policy.files.ignore.length > 0 && (
                      <div>
                        <span className="text-muted-foreground block mb-1">Ignore Rules:</span>
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
          <h1 className="text-3xl font-bold tracking-tight">Policies</h1>
          <p className="text-sm text-muted-foreground">Configure backup policies and schedules</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleRefresh()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
        <AlertDescription>
          Kopia uses a 4-level policy hierarchy: Global → Host → User → Path. More specific policies
          override less specific ones.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Global
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
              Host
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
              User
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
              Path
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
          <TabsTrigger value="all">All ({policies.length})</TabsTrigger>
          <TabsTrigger value="global">Global ({globalPolicies.length})</TabsTrigger>
          <TabsTrigger value="host">Host ({hostPolicies.length})</TabsTrigger>
          <TabsTrigger value="user">User ({userPolicies.length})</TabsTrigger>
          <TabsTrigger value="path">Path ({pathPolicies.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : policies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ListTodo className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Policies Found</h3>
                <p className="text-sm text-muted-foreground">
                  No backup policies are configured yet
                </p>
              </CardContent>
            </Card>
          ) : (
            policies.map((policy, idx) => <PolicyCard key={idx} policyResponse={policy} />)
          )}
        </TabsContent>

        <TabsContent value="global" className="space-y-4">
          {globalPolicies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Global Policies</h3>
                <p className="text-sm text-muted-foreground">No global policies are configured</p>
              </CardContent>
            </Card>
          ) : (
            globalPolicies.map((policy, idx) => <PolicyCard key={idx} policyResponse={policy} />)
          )}
        </TabsContent>

        <TabsContent value="host" className="space-y-4">
          {hostPolicies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Host Policies</h3>
                <p className="text-sm text-muted-foreground">No host policies are configured</p>
              </CardContent>
            </Card>
          ) : (
            hostPolicies.map((policy, idx) => <PolicyCard key={idx} policyResponse={policy} />)
          )}
        </TabsContent>

        <TabsContent value="user" className="space-y-4">
          {userPolicies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No User Policies</h3>
                <p className="text-sm text-muted-foreground">No user policies are configured</p>
              </CardContent>
            </Card>
          ) : (
            userPolicies.map((policy, idx) => <PolicyCard key={idx} policyResponse={policy} />)
          )}
        </TabsContent>

        <TabsContent value="path" className="space-y-4">
          {pathPolicies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Path Policies</h3>
                <p className="text-sm text-muted-foreground">No path policies are configured</p>
              </CardContent>
            </Card>
          ) : (
            pathPolicies.map((policy, idx) => <PolicyCard key={idx} policyResponse={policy} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
