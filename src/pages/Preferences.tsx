/**
 * Preferences page
 *
 * Allows users to configure application settings organized into sections:
 * - Appearance: Theme, text size, byte format
 * - Language: Interface language selection
 * - Notifications: Desktop notifications + Kopia notification profiles
 * - System: Minimize to tray, version info
 * - Danger Zone: Factory reset
 */

import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/stores/theme';
import { useLanguageStore } from '@/stores/language';
import { useFontSizeStore, type FontSize } from '@/stores/fontSize';
import { usePreferencesStore, type ByteFormat } from '@/stores/preferences';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { NotificationProfiles } from '@/components/kopia/notifications/NotificationProfiles';
import { toast } from 'sonner';
import { useState } from 'react';
import packageJson from '../../package.json';
import { disconnectRepository } from '@/lib/kopia/client';
import { getErrorMessage } from '@/lib/kopia/errors';

export function Preferences() {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const { fontSize, setFontSize } = useFontSizeStore();
  const {
    minimizeToTray,
    setMinimizeToTray,
    byteFormat,
    setByteFormat,
    desktopNotifications,
    setDesktopNotifications,
  } = usePreferencesStore();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  /**
   * Handle factory reset
   *
   * Performs a complete reset of the application:
   * 1. Disconnects from the current repository
   * 2. Clears all persisted settings from localStorage
   * 3. Redirects to setup page with hard refresh
   */
  const handleFactoryReset = async () => {
    setIsResetting(true);

    try {
      // Step 1: Disconnect from repository
      try {
        await disconnectRepository();
      } catch (error) {
        // Ignore errors if not connected or server not running
        console.warn('Repository disconnect failed (may not be connected):', error);
      }

      // Step 2: Clear all stores from localStorage
      // Note: These keys must match the 'name' property in each store's persist config
      const storageKeys = [
        'kopia-desktop-theme', // Theme store
        'kopia-desktop-language', // Language store
        'font-size-storage', // Font size store
        'kopia-preferences', // Preferences store
        'kopia-profiles', // Profiles store
      ];

      storageKeys.forEach((key) => localStorage.removeItem(key));

      toast.success(t('preferences.factoryResetSuccess'));
      setShowResetDialog(false);

      // Step 3: Redirect to setup page with hard refresh to re-initialize all stores
      setTimeout(() => {
        window.location.href = '/setup';
      }, 1000);
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(t('preferences.factoryResetFailed', { error: message }));
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('preferences.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('preferences.subtitle')}</p>
      </div>

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
          {/* Desktop Notifications Toggle */}
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

          {/* Kopia Notification Profiles */}
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
          {/* Minimize to Tray */}
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

          {/* App Information */}
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
