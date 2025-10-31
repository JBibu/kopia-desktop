/**
 * Overview/Dashboard page
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useKopiaServer } from '@/hooks/useKopiaServer';
import { useRepository } from '@/hooks/useRepository';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Database,
  Server,
  CheckCircle,
  XCircle,
  PlayCircle,
  FolderArchive,
  ListTodo,
} from 'lucide-react';

export function Overview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { serverStatus, isLoading: serverLoading, startServer } = useKopiaServer();
  const { status: repoStatus, isLoading: repoLoading } = useRepository();
  const hasTriedToStart = useRef(false);

  const isServerRunning = serverStatus?.running ?? false;
  const isRepoConnected = repoStatus?.connected ?? false;

  // Auto-start server if not running (only try once)
  useEffect(() => {
    if (!hasTriedToStart.current && serverStatus && !serverStatus.running && !serverLoading) {
      hasTriedToStart.current = true;
      void startServer();
    }
  }, [serverStatus, serverLoading, startServer]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('overview.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('overview.subtitle')}</p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Server Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" />
                {t('overview.kopiaServer')}
              </CardTitle>
              {isServerRunning && (
                <Badge className="bg-success text-success-foreground">{t('common.active')}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {serverLoading ? (
              <div className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">
                  {t('overview.checkingStatus')}
                </span>
              </div>
            ) : isServerRunning ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">{t('common.online')}</span>
                </div>
                {serverStatus?.uptime !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {t('overview.uptime', { minutes: Math.floor(serverStatus.uptime / 60) })}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">{t('common.offline')}</span>
                </div>
                <Button size="sm" onClick={() => void startServer()} className="w-full">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {t('overview.startServer')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Repository Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                {t('overview.repository')}
              </CardTitle>
              {isRepoConnected && (
                <Badge className="bg-success text-success-foreground">
                  {t('common.connected')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {repoLoading ? (
              <div className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">
                  {t('overview.checkingConnection')}
                </span>
              </div>
            ) : isRepoConnected ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">{t('common.connected')}</span>
                </div>
                {repoStatus?.storage && (
                  <Badge variant="secondary" className="text-xs">
                    {repoStatus.storage}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">{t('common.notConnected')}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    void navigate('/repository');
                  }}
                  className="w-full"
                  disabled={!isServerRunning}
                >
                  <Database className="mr-2 h-4 w-4" />
                  {t('common.connect')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {isServerRunning && isRepoConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('overview.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                void navigate('/snapshots');
              }}
            >
              <FolderArchive className="mr-2 h-4 w-4" />
              {t('overview.viewSnapshots')}
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                void navigate('/policies');
              }}
            >
              <ListTodo className="mr-2 h-4 w-4" />
              {t('overview.managePolicies')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
