import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, AlertTriangle, ChevronDown, Loader2 } from 'lucide-react';
import type { SetupWizardState } from '../types';

interface PasswordSetupProps {
  mode: 'create' | 'connect';
  password: string;
  confirmPassword: string;
  description: string;
  advancedOptions: SetupWizardState['advancedOptions'];
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (password: string) => void;
  onDescriptionChange: (description: string) => void;
  onAdvancedOptionsChange: (options: SetupWizardState['advancedOptions']) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export function PasswordSetup({
  mode,
  password,
  confirmPassword,
  description,
  advancedOptions,
  onPasswordChange,
  onConfirmPasswordChange,
  onDescriptionChange,
  onAdvancedOptionsChange,
  onBack,
  onSubmit,
  isSubmitting = false,
}: PasswordSetupProps) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const isPasswordValid = password.length >= 8;
  const canSubmit =
    password && (mode === 'connect' || (passwordsMatch && isPasswordValid && confirmPassword));

  const handleAdvancedChange = (
    field: keyof SetupWizardState['advancedOptions'],
    value: string
  ) => {
    onAdvancedOptionsChange({ ...advancedOptions, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">
            {mode === 'create' ? t('setup.password.createTitle') : t('setup.password.connectTitle')}
          </h2>
          <p className="text-muted-foreground">
            {mode === 'create'
              ? t('setup.password.createSubtitle')
              : t('setup.password.connectSubtitle')}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {mode === 'create' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('setup.password.importantLabel')}</strong>{' '}
              {t('setup.password.passwordWarning')}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">
            {t('setup.password.passwordLabel')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={t('setup.password.passwordPlaceholder')}
            required
            autoFocus
            disabled={isSubmitting}
          />
          {mode === 'create' && password && !isPasswordValid && (
            <p className="text-xs text-destructive">{t('setup.password.passwordMinLength')}</p>
          )}
        </div>

        {mode === 'create' && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {t('setup.password.confirmPasswordLabel')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              placeholder={t('setup.password.confirmPasswordPlaceholder')}
              required
              disabled={isSubmitting}
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-destructive">{t('setup.password.passwordMismatch')}</p>
            )}
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-2">
            <Label htmlFor="description">{t('setup.password.descriptionLabel')}</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={t('setup.password.descriptionPlaceholder')}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">{t('setup.password.descriptionHelper')}</p>
          </div>
        )}

        {mode === 'create' && (
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-between">
                {t('setup.password.advancedOptions')}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="hash">{t('setup.password.hashAlgorithm')}</Label>
                <Select
                  value={advancedOptions.hash || 'BLAKE3-256'}
                  onValueChange={(v) => handleAdvancedChange('hash', v)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="hash">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BLAKE3-256">
                      BLAKE3-256 ({t('setup.password.recommended')})
                    </SelectItem>
                    <SelectItem value="BLAKE2B-256">BLAKE2B-256</SelectItem>
                    <SelectItem value="BLAKE2S-256">BLAKE2S-256</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="encryption">{t('setup.password.encryptionAlgorithm')}</Label>
                <Select
                  value={advancedOptions.encryption || 'AES256-GCM-HMAC-SHA256'}
                  onValueChange={(v) => handleAdvancedChange('encryption', v)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="encryption">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AES256-GCM-HMAC-SHA256">
                      AES256-GCM-HMAC-SHA256 ({t('setup.password.recommended')})
                    </SelectItem>
                    <SelectItem value="CHACHA20-POLY1305-HMAC-SHA256">
                      CHACHA20-POLY1305-HMAC-SHA256
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="splitter">{t('setup.password.splitterAlgorithm')}</Label>
                <Select
                  value={advancedOptions.splitter || 'DYNAMIC-4M-BUZHASH'}
                  onValueChange={(v) => handleAdvancedChange('splitter', v)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="splitter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DYNAMIC-4M-BUZHASH">
                      DYNAMIC-4M-BUZHASH ({t('setup.password.recommended')})
                    </SelectItem>
                    <SelectItem value="FIXED-4M">FIXED-4M</SelectItem>
                    <SelectItem value="FIXED-1M">FIXED-1M</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <div className="flex justify-between gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          {t('setup.back')}
        </Button>
        <Button type="button" onClick={onSubmit} disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === 'create' ? t('setup.password.creating') : t('setup.password.connecting')}
            </>
          ) : (
            <>
              {mode === 'create'
                ? t('setup.password.createButton')
                : t('setup.password.connectButton')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
