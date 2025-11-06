/**
 * Preferences page
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/stores/theme';
import { useLanguageStore } from '@/stores/language';
import { useFontSizeStore, type FontSize } from '@/stores/fontSize';
import { usePreferencesStore } from '@/stores/preferences';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Palette, Globe, Bell, Zap, Sun, Moon, Monitor, Type, Mail } from 'lucide-react';
import { NotificationProfiles } from '@/components/kopia/notifications/NotificationProfiles';

export function Preferences() {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const { fontSize, setFontSize } = useFontSizeStore();
  const { minimizeToTray, setMinimizeToTray } = usePreferencesStore();
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);

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

      {/* Desktop Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t('preferences.notifications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="text-sm">
              {t('preferences.desktopNotifications')}
            </Label>
            <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sound" className="text-sm">
              {t('preferences.soundEffects')}
            </Label>
            <Switch id="sound" checked={soundEffects} onCheckedChange={setSoundEffects} />
          </div>
        </CardContent>
      </Card>

      {/* Kopia Notification Profiles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {t('preferences.kopiaNotificationProfiles')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationProfiles />
        </CardContent>
      </Card>

      {/* Advanced */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {t('preferences.advanced')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-backup" className="text-sm">
              {t('preferences.autoStartServer')}
            </Label>
            <Switch id="auto-backup" checked={autoBackup} onCheckedChange={setAutoBackup} />
          </div>

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

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t('common.version')}</p>
              <p className="font-mono">0.1.0</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('common.environment')}</p>
              <p className="font-mono">{t('common.development')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
