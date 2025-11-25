/**
 * 404 Not Found page
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, ArrowLeft, FileQuestion } from 'lucide-react';

export function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Icon */}
            <div className="rounded-full bg-muted p-6">
              <FileQuestion className="h-12 w-12 text-muted-foreground" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">404</h1>
              <h2 className="text-xl font-semibold">{t('notFound.title')}</h2>
              <p className="text-sm text-muted-foreground">{t('notFound.description')}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => void navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back')}
              </Button>
              <Button onClick={() => void navigate('/')}>
                <Home className="h-4 w-4 mr-2" />
                {t('notFound.goHome')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
