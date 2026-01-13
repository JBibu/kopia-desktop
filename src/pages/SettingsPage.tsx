/**
 * Settings page - Tabbed interface for application settings
 * Combines: General preferences, Policies, and Mounts
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { usePreferencesStore, type ByteFormat, type FontSize } from '@/stores';
import { usePolicies, useMounts, useCurrentRepoId } from '@/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Palette,
  Globe,
  Bell,
  Zap,
  Sun,
  Moon,
  Monitor,
  Type,
  Mail,
  HardDrive,
  AlertTriangle,
  AlertCircle,
  ListTodo,
  Calendar,
  Timer,
  Archive,
  FileX,
  RefreshCw,
  User,
  FolderTree,
  Info,
  Edit,
  Copy,
  HardDriveDownload,
  FolderOpen,
} from 'lucide-react';
import { NotificationProfiles } from '@/components/kopia/notifications';
import { WindowsServiceManager } from '@/components/kopia';
import { PolicyEditDialog } from '@/components/kopia/policy';
import { toast } from 'sonner';
import { disconnectRepository, getErrorMessage } from '@/lib/kopia';
import type { PolicyResponse, PolicyTarget } from '@/lib/kopia';
import { PageHeader, type BreadcrumbItemType } from '@/components/layout/PageHeader';
import packageJson from '../../package.json';

type SettingsTab = 'general' | 'policies' | 'mounts';

export function SettingsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialTab = (): SettingsTab => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'general' || tabParam === 'policies' || tabParam === 'mounts') {
      return tabParam;
    }
    return 'general';
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(getInitialTab);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const breadcrumbs: BreadcrumbItemType[] = [{ label: t('nav.settings') }];

  const tabs = {
    value: activeTab,
    onChange: (value: string) => handleTabChange(value as SettingsTab),
    items: [
      { value: 'general', label: t('settings.tabs.general') },
      { value: 'policies', label: t('settings.tabs.policies') },
      { value: 'mounts', label: t('settings.tabs.mounts') },
    ],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        breadcrumbs={breadcrumbs}
        tabs={tabs}
      />

      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'policies' && <PoliciesTab />}
      {activeTab === 'mounts' && <MountsTab />}
    </div>
  );
}

// === General Tab ===
function GeneralTab() {
  const { t } = useTranslation();
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    fontSize,
    setFontSize,
    minimizeToTray,
    setMinimizeToTray,
    byteFormat,
    setByteFormat,
    desktopNotifications,
    setDesktopNotifications,
  } = usePreferencesStore();
  const currentRepoId = useCurrentRepoId();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleFactoryReset = async () => {
    setIsResetting(true);

    try {
      if (currentRepoId) {
        try {
          await disconnectRepository(currentRepoId);
        } catch {
          // Ignore errors if not connected or server not running
        }
      }

      const storageKeys = [
        'kopia-desktop-theme',
        'kopia-desktop-language',
        'font-size-storage',
        'kopia-preferences',
        'kopia-profiles',
      ];

      storageKeys.forEach((key) => localStorage.removeItem(key));

      toast.success(t('preferences.factoryResetSuccess'));
      setShowResetDialog(false);

      setTimeout(() => {
        window.location.href = '/repository?tab=connect';
      }, 1000);
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(t('preferences.factoryResetFailed', { error: message }));
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            {t('preferences.appearance')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme" className="text-sm">
              {t('preferences.theme')}
            </Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    {t('preferences.light')}
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    {t('preferences.dark')}
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    {t('preferences.system')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="fontSize" className="text-sm">
              {t('preferences.textSize')}
            </Label>
            <Select value={fontSize} onValueChange={(value: FontSize) => setFontSize(value)}>
              <SelectTrigger id="fontSize" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">
                  <div className="flex items-center gap-2">
                    <Type className="h-3 w-3" />
                    {t('preferences.small')}
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    {t('preferences.medium')}
                  </div>
                </SelectItem>
                <SelectItem value="large">
                  <div className="flex items-center gap-2">
                    <Type className="h-5 w-5" />
                    {t('preferences.large')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="byteFormat" className="text-sm">
                {t('preferences.byteFormat')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('preferences.byteFormatDescription')}
              </p>
            </div>
            <Select value={byteFormat} onValueChange={(value: ByteFormat) => setByteFormat(value)}>
              <SelectTrigger id="byteFormat" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="base2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    {t('preferences.base2')}
                  </div>
                </SelectItem>
                <SelectItem value="base10">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    {t('preferences.base10')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('preferences.language')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="language" className="text-sm">
              {t('preferences.interfaceLanguage')}
            </Label>
            <Select value={language} onValueChange={(value: 'en' | 'es') => setLanguage(value)}>
              <SelectTrigger id="language" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('preferences.english')}</SelectItem>
                <SelectItem value="es">{t('preferences.spanish')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t('preferences.notifications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="text-sm">
              {t('preferences.desktopNotifications')}
            </Label>
            <Switch
              id="notifications"
              checked={desktopNotifications}
              onCheckedChange={setDesktopNotifications}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">{t('preferences.kopiaNotificationProfiles')}</h3>
            </div>
            <NotificationProfiles />
          </div>
        </CardContent>
      </Card>

      {/* System */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {t('preferences.system')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="minimize-to-tray" className="text-sm">
                {t('preferences.minimizeToTray')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('preferences.minimizeToTrayDescription')}
              </p>
            </div>
            <Switch
              id="minimize-to-tray"
              checked={minimizeToTray}
              onCheckedChange={setMinimizeToTray}
            />
          </div>

          <Separator />

          <WindowsServiceManager />

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t('common.version')}</p>
              <p className="font-mono">{packageJson.version}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('common.environment')}</p>
              <p className="font-mono">
                {import.meta.env.MODE === 'production'
                  ? t('preferences.production')
                  : t('common.development')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t('preferences.dangerZone')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm">{t('preferences.factoryReset')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('preferences.factoryResetDescription')}
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowResetDialog(true)}
            className="w-full"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {t('preferences.resetToDefaults')}
          </Button>
        </CardContent>
      </Card>

      {/* Factory Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('preferences.factoryResetConfirmTitle')}
            </DialogTitle>
            <DialogDescription>{t('preferences.factoryResetConfirmDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <p className="text-sm text-muted-foreground">{t('preferences.factoryResetWarning')}</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li>{t('preferences.factoryResetWarningRepository')}</li>
              <li>{t('preferences.factoryResetWarningTheme')}</li>
              <li>{t('preferences.factoryResetWarningLanguage')}</li>
              <li>{t('preferences.factoryResetWarningProfiles')}</li>
              <li>{t('preferences.factoryResetWarningPreferences')}</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              disabled={isResetting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleFactoryReset()}
              disabled={isResetting}
            >
              {isResetting ? t('preferences.resetting') : t('preferences.resetToDefaults')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === Policies Tab ===
function PoliciesTab() {
  const { t } = useTranslation();
  const { policies, isLoading, error, refresh: fetchPolicies } = usePolicies();
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [policyEditTarget, setPolicyEditTarget] = useState<PolicyTarget | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchPolicies();
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const globalPolicies = policies.filter(
    (p) => !p.target.userName && !p.target.host && !p.target.path
  );
  const hostPolicies = policies.filter(
    (p) => !p.target.userName && p.target.host && !p.target.path
  );
  const userPolicies = policies.filter((p) => p.target.userName && p.target.host && !p.target.path);
  const pathPolicies = policies.filter((p) => p.target.userName && p.target.host && p.target.path);

  const getPolicyLevel = (p: PolicyResponse): string => {
    const target = p.target;
    if (!target.userName && !target.host && !target.path) return 'global';
    if (!target.userName && target.host && !target.path) return 'host';
    if (target.userName && target.host && !target.path) return 'user';
    if (target.userName && target.host && target.path) return 'path';
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
    setPolicyEditTarget(policyResponse.target);
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

  const filteredPolicies =
    selectedLevel === 'all'
      ? policies
      : selectedLevel === 'global'
        ? globalPolicies
        : selectedLevel === 'host'
          ? hostPolicies
          : selectedLevel === 'user'
            ? userPolicies
            : pathPolicies;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tabs value={selectedLevel} onValueChange={setSelectedLevel}>
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
          </Tabs>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
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
        <AlertDescription>{t('policies.hierarchyInfo')}</AlertDescription>
      </Alert>

      {/* Policy Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filteredPolicies.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={t('policies.noPoliciesFound')}
          description={t('policies.noPoliciesConfigured')}
        />
      ) : (
        <div className="space-y-4">
          {filteredPolicies.map((policy, idx) => (
            <PolicyCard key={idx} policyResponse={policy} />
          ))}
        </div>
      )}

      {/* Policy Edit Dialog */}
      {policyEditTarget && (
        <PolicyEditDialog
          open={!!policyEditTarget}
          onOpenChange={(open) => !open && setPolicyEditTarget(null)}
          target={policyEditTarget}
          onSave={() => {
            setPolicyEditTarget(null);
            void fetchPolicies();
          }}
        />
      )}
    </div>
  );
}

// === Mounts Tab ===
function MountsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mounts, isLoading, error, unmount: unmountSnapshot } = useMounts();

  const handleCopyPath = (path: string) => {
    void navigator.clipboard.writeText(path);
    toast.success(t('mounts.pathCopied'));
  };

  const handleUnmount = async (objectId: string) => {
    try {
      await unmountSnapshot(objectId);
      toast.success(t('mounts.unmountSuccess'));
    } catch (err) {
      toast.error(t('mounts.unmountFailed', { error: getErrorMessage(err) }));
    }
  };

  const handleBrowse = (objectId: string) => {
    void navigate(
      `/snapshots/browse?oid=${objectId}&rootOid=${objectId}&path=/&snapshotId=${objectId}`
    );
  };

  const mountsList = mounts?.items || [];

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('mounts.mountedSnapshots')}</CardTitle>
          <CardDescription>
            {isLoading
              ? t('mounts.loading')
              : t('mounts.totalMounts', { count: mountsList.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : mountsList.length === 0 ? (
            <EmptyState
              icon={HardDrive}
              title={t('mounts.noMounts')}
              description={t('mounts.noMountsDesc')}
              action={{
                label: t('mounts.viewSnapshots'),
                onClick: () => void navigate('/profiles'),
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('mounts.snapshotObject')}</TableHead>
                  <TableHead>{t('mounts.mountPath')}</TableHead>
                  <TableHead className="w-[150px]">{t('mounts.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mountsList.map((mount) => (
                  <TableRow key={mount.root}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        <code className="text-sm bg-muted px-2 py-1 rounded">{mount.root}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input readOnly value={mount.path} className="font-mono text-sm" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyPath(mount.path)}
                          title={t('mounts.copyPath')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBrowse(mount.root)}
                        >
                          <FolderOpen className="h-4 w-4 mr-2" />
                          {t('mounts.browse')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleUnmount(mount.root)}
                        >
                          <HardDriveDownload className="h-4 w-4 mr-2" />
                          {t('mounts.unmount')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
