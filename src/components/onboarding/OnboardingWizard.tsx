/**
 * OnboardingWizard - Main wizard controller for first-time setup
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { WelcomeStep } from './WelcomeStep';
import { QuickStartStep, type QuickStartConfig } from './QuickStartStep';
import { usePreferencesStore } from '@/stores/preferences';
import { useProfilesStore } from '@/stores/profiles';
import { createRepository } from '@/lib/kopia';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

type WizardStep = 'welcome' | 'quickStart' | 'advanced';

export function OnboardingWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setOnboardingComplete = usePreferencesStore((state) => state.setOnboardingComplete);
  const createProfile = useProfilesStore((state) => state.createProfile);

  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');

  const handleQuickStart = () => {
    setCurrentStep('quickStart');
  };

  const handleAdvancedSetup = () => {
    setOnboardingComplete();
    void navigate('/repository?tab=connect');
  };

  const handleSkip = () => {
    setOnboardingComplete();
    void navigate('/');
  };

  const handleQuickStartComplete = async (config: QuickStartConfig) => {
    try {
      // Step 1: Create filesystem repository
      await createRepository('default', {
        storage: {
          type: 'filesystem',
          config: {
            path: config.backupPath,
          },
        },
        password: config.password,
      });

      toast.success(t('onboarding.quickStart.repositoryCreated'));

      // Step 2: Create backup profile with QUICK_START preset
      const profile = createProfile({
        name: t('onboarding.quickStart.defaultProfileName'),
        description: t('onboarding.quickStart.defaultProfileDescription'),
        directories: config.directories,
        policyPreset: 'QUICK_START',
        enabled: true,
      });

      toast.success(t('onboarding.quickStart.profileCreated', { name: profile.name }));

      // Step 3: Mark onboarding as complete
      setOnboardingComplete();

      // Step 4: Navigate to profiles page
      toast.success(t('onboarding.quickStart.setupComplete'));
      void navigate('/profiles');
    } catch (err) {
      console.error('Quick start setup failed:', err);
      toast.error(t('onboarding.quickStart.setupFailed'));
    }
  };

  const handleBack = () => {
    setCurrentStep('welcome');
  };

  return (
    <div className="min-h-screen bg-background">
      {currentStep === 'welcome' && (
        <WelcomeStep
          onQuickStart={handleQuickStart}
          onAdvancedSetup={() => void handleAdvancedSetup()}
          onSkip={() => void handleSkip()}
        />
      )}

      {currentStep === 'quickStart' && (
        <QuickStartStep
          onBack={handleBack}
          onComplete={(config) => handleQuickStartComplete(config)}
        />
      )}
    </div>
  );
}
