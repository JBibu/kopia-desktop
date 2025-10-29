import { useState } from 'react';
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
            {mode === 'create' ? 'Create Repository' : 'Connect to Repository'}
          </h2>
          <p className="text-muted-foreground">
            {mode === 'create'
              ? 'Set a password for your new repository'
              : 'Enter repository password'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {mode === 'create' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> There is NO way to recover your password. Store it
              securely! Consider using a password manager.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">
            Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Enter a strong password"
            required
            autoFocus
            disabled={isSubmitting}
          />
          {mode === 'create' && password && !isPasswordValid && (
            <p className="text-xs text-destructive">Password must be at least 8 characters</p>
          )}
        </div>

        {mode === 'create' && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirm Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              placeholder="Re-enter your password"
              required
              disabled={isSubmitting}
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="My Backup Repository"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              A friendly name to help you identify this repository
            </p>
          </div>
        )}

        {mode === 'create' && (
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-between">
                Advanced Options
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="hash">Hash Algorithm</Label>
                <Select
                  value={advancedOptions.hash || 'BLAKE3-256'}
                  onValueChange={(v) => handleAdvancedChange('hash', v)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="hash">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BLAKE3-256">BLAKE3-256 (recommended)</SelectItem>
                    <SelectItem value="BLAKE2B-256">BLAKE2B-256</SelectItem>
                    <SelectItem value="BLAKE2S-256">BLAKE2S-256</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="encryption">Encryption Algorithm</Label>
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
                      AES256-GCM-HMAC-SHA256 (recommended)
                    </SelectItem>
                    <SelectItem value="CHACHA20-POLY1305-HMAC-SHA256">
                      CHACHA20-POLY1305-HMAC-SHA256
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="splitter">Splitter Algorithm</Label>
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
                      DYNAMIC-4M-BUZHASH (recommended)
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
          Back
        </Button>
        <Button type="button" onClick={onSubmit} disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === 'create' ? 'Creating...' : 'Connecting...'}
            </>
          ) : (
            <>{mode === 'create' ? 'Create Repository' : 'Connect'}</>
          )}
        </Button>
      </div>
    </div>
  );
}
