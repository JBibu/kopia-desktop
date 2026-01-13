/**
 * WelcomeStep - Initial welcome screen for onboarding wizard
 */

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Zap, Layers, ArrowRight } from 'lucide-react';

interface WelcomeStepProps {
  onQuickStart: () => void;
  onAdvancedSetup: () => void;
  onSkip: () => void;
}

export function WelcomeStep({ onQuickStart, onAdvancedSetup, onSkip }: WelcomeStepProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] p-8">
      <div className="max-w-3xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t('onboarding.welcome.title')}</h1>
          <p className="text-xl text-muted-foreground">{t('onboarding.welcome.subtitle')}</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          <Card>
            <CardHeader>
              <Shield className="size-8 text-primary mb-2" />
              <CardTitle className="text-lg">{t('onboarding.welcome.feature1Title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{t('onboarding.welcome.feature1Description')}</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="size-8 text-primary mb-2" />
              <CardTitle className="text-lg">{t('onboarding.welcome.feature2Title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{t('onboarding.welcome.feature2Description')}</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Layers className="size-8 text-primary mb-2" />
              <CardTitle className="text-lg">{t('onboarding.welcome.feature3Title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{t('onboarding.welcome.feature3Description')}</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 mt-12">
          <Button size="lg" onClick={onQuickStart} className="w-full">
            <ArrowRight className="mr-2 size-5" />
            {t('onboarding.welcome.quickStart')}
          </Button>
          <Button size="lg" variant="outline" onClick={onAdvancedSetup} className="w-full">
            {t('onboarding.welcome.advancedSetup')}
          </Button>
          <Button variant="ghost" onClick={onSkip} className="w-full">
            {t('onboarding.welcome.skip')}
          </Button>
        </div>
      </div>
    </div>
  );
}
