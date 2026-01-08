/**
 * Windows Service Manager Component
 *
 * Provides UI for managing the Kopia Desktop Windows service:
 * - Install/uninstall service
 * - Start/stop service
 * - Monitor service status
 * - Handle UAC elevation
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Settings,
  Play,
  Square,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/kopia';

type ServiceStatus = 'Running' | 'Stopped' | 'Starting' | 'Stopping' | 'Unknown' | 'NotInstalled';

export function WindowsServiceManager() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ServiceStatus>('Unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showUninstallDialog, setShowUninstallDialog] = useState(false);

  // Check if running on Windows
  const isWindows = navigator.platform.toLowerCase().includes('win');

  // Poll service status
  useEffect(() => {
    if (!isWindows) return;

    const checkStatus = async () => {
      try {
        const serviceStatus = await invoke<string>('service_status');
        setStatus(serviceStatus as ServiceStatus);
      } catch (error) {
        // Service not installed or error querying
        const message = getErrorMessage(error);
        if (message.includes('not be installed') || message.includes('not installed')) {
          setStatus('NotInstalled');
        } else {
          setStatus('Unknown');
        }
      }
    };

    // Initial check
    void checkStatus();

    // Poll every 3 seconds
    const interval = setInterval(() => {
      void checkStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [isWindows]);

  const handleInstall = async () => {
    setIsLoading(true);
    try {
      await invoke('service_install');
      toast.success(t('preferences.service.installSuccess'));
      setShowInstallDialog(false);
      // Status will update via polling
    } catch (error) {
      const message = getErrorMessage(error);

      // Check if it's a permission error
      if (
        message.includes('Access is denied') ||
        message.includes('requires elevation') ||
        message.includes('admin')
      ) {
        toast.error(t('preferences.service.elevationNeeded'), {
          description: t('preferences.service.elevationHelp'),
          duration: 8000,
        });
      } else {
        toast.error(t('preferences.service.installFailed', { error: message }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUninstall = async () => {
    setIsLoading(true);
    try {
      await invoke('service_uninstall');
      toast.success(t('preferences.service.uninstallSuccess'));
      setShowUninstallDialog(false);
      // Status will update via polling
    } catch (error) {
      const message = getErrorMessage(error);

      // Check if it's a permission error
      if (
        message.includes('Access is denied') ||
        message.includes('requires elevation') ||
        message.includes('admin')
      ) {
        toast.error(t('preferences.service.elevationNeeded'), {
          description: t('preferences.service.elevationHelp'),
          duration: 8000,
        });
      } else {
        toast.error(t('preferences.service.uninstallFailed', { error: message }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await invoke('service_start');
      toast.success(t('preferences.service.startSuccess'));
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(t('preferences.service.startFailed', { error: message }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await invoke('service_stop');
      toast.success(t('preferences.service.stopSuccess'));
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(t('preferences.service.stopFailed', { error: message }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isWindows) {
    return null; // Only show on Windows
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'Running':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('preferences.service.running')}
          </Badge>
        );
      case 'Stopped':
        return (
          <Badge variant="secondary">
            <Square className="h-3 w-3 mr-1" />
            {t('preferences.service.stopped')}
          </Badge>
        );
      case 'Starting':
      case 'Stopping':
        return (
          <Badge variant="outline">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {status}
          </Badge>
        );
      case 'NotInstalled':
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t('preferences.service.notInstalled')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t('preferences.service.unknown')}
          </Badge>
        );
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">{t('preferences.service.title')}</h3>
        </div>

        {/* UAC Warning */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>{t('preferences.service.elevationRequired')}</AlertTitle>
          <AlertDescription>{t('preferences.service.elevationDescription')}</AlertDescription>
        </Alert>

        {/* Service Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('preferences.service.status')}</span>
          {getStatusBadge()}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {status === 'NotInstalled' || status === 'Unknown' ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowInstallDialog(true)}
                disabled={isLoading}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('preferences.service.install')}
              </Button>
              <Button variant="outline" size="sm" disabled className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                {t('preferences.service.uninstall')}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void (status === 'Running' ? handleStop() : handleStart())}
                disabled={isLoading || status === 'Starting' || status === 'Stopping'}
                className="w-full"
              >
                {status === 'Running' ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    {t('preferences.service.stop')}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    {t('preferences.service.start')}
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowUninstallDialog(true)}
                disabled={isLoading || status === 'Running'}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('preferences.service.uninstall')}
              </Button>
            </>
          )}
        </div>

        {/* Service Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>{t('preferences.service.description')}</p>
          <p>{t('preferences.service.serviceName')}: KopiaDesktopService</p>
        </div>
      </div>

      {/* Install Confirmation Dialog */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {t('preferences.service.installTitle')}
            </DialogTitle>
            <DialogDescription>{t('preferences.service.installDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>{t('preferences.service.adminRequired')}</AlertTitle>
              <AlertDescription>{t('preferences.service.adminDescription')}</AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              {t('preferences.service.installWarning')}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInstallDialog(false)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleInstall()} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('preferences.service.installing')}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {t('preferences.service.install')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Uninstall Confirmation Dialog */}
      <Dialog open={showUninstallDialog} onOpenChange={setShowUninstallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              {t('preferences.service.uninstallTitle')}
            </DialogTitle>
            <DialogDescription>{t('preferences.service.uninstallDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>{t('preferences.service.adminRequired')}</AlertTitle>
              <AlertDescription>{t('preferences.service.adminDescription')}</AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              {t('preferences.service.uninstallWarning')}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUninstallDialog(false)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleUninstall()}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('preferences.service.uninstalling')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('preferences.service.uninstall')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
