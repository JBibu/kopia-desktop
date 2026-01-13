/**
 * QuickStartStep - Quick start setup for filesystem backups
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { selectFolder } from '@/lib/kopia';
import { FolderOpen, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuickStartStepProps {
  onBack: () => void;
  onComplete: (config: QuickStartConfig) => void;
}

export interface QuickStartConfig {
  backupPath: string;
  directories: string[];
  password: string;
}

export function QuickStartStep({ onBack, onComplete }: QuickStartStepProps) {
  const { t } = useTranslation();

  const [backupPath, setBackupPath] = useState('');
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common folders based on OS
  const commonFolders = [
    { id: 'documents', path: '~/Documents', labelKey: 'onboarding.quickStart.documents' },
    { id: 'pictures', path: '~/Pictures', labelKey: 'onboarding.quickStart.pictures' },
    { id: 'videos', path: '~/Videos', labelKey: 'onboarding.quickStart.videos' },
    { id: 'music', path: '~/Music', labelKey: 'onboarding.quickStart.music' },
  ];

  const handleSelectBackupPath = async () => {
    try {
      const path = await selectFolder();
      if (path) {
        setBackupPath(path);
      }
    } catch {
      toast.error(t('onboarding.quickStart.selectFolderError'));
    }
  };

  const handleSelectCustomFolder = async () => {
    try {
      const path = await selectFolder();
      if (path) {
        setSelectedFolders(new Set([...selectedFolders, path]));
      }
    } catch {
      toast.error(t('onboarding.quickStart.selectFolderError'));
    }
  };

  const toggleFolder = (folderId: string) => {
    const newSelected = new Set(selectedFolders);
    if (newSelected.has(folderId)) {
      newSelected.delete(folderId);
    } else {
      newSelected.add(folderId);
    }
    setSelectedFolders(newSelected);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Validation
    if (!backupPath) {
      toast.error(t('onboarding.quickStart.backupPathRequired'));
      return;
    }

    if (selectedFolders.size === 0) {
      toast.error(t('onboarding.quickStart.selectAtLeastOneFolder'));
      return;
    }

    if (!password) {
      toast.error(t('onboarding.quickStart.passwordRequired'));
      return;
    }

    if (password.length < 8) {
      toast.error(t('onboarding.quickStart.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('onboarding.quickStart.passwordMismatch'));
      return;
    }

    // Resolve directory paths
    const directories = Array.from(selectedFolders).map((id) => {
      const common = commonFolders.find((f) => f.id === id);
      return common?.path || id; // If not common folder, it's a custom path
    });

    onComplete({
      backupPath,
      directories,
      password,
    });
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col min-h-[600px] p-8">
      <div className="max-w-2xl w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">{t('onboarding.quickStart.title')}</h2>
          <p className="text-muted-foreground mt-2">{t('onboarding.quickStart.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Backup Storage Location */}
          <div className="space-y-3">
            <Label htmlFor="backupPath">
              {t('onboarding.quickStart.backupLocation')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('onboarding.quickStart.backupLocationHint')}
            </p>
            <div className="flex gap-2">
              <Input
                id="backupPath"
                value={backupPath}
                onChange={(e) => setBackupPath(e.target.value)}
                placeholder={t('onboarding.quickStart.backupLocationPlaceholder')}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={() => void handleSelectBackupPath()}>
                <FolderOpen className="size-4 mr-2" />
                {t('common.browse')}
              </Button>
            </div>
          </div>

          {/* Folders to Backup */}
          <div className="space-y-3">
            <Label>
              {t('onboarding.quickStart.foldersToBackup')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('onboarding.quickStart.foldersToBackupHint')}
            </p>
            <Card>
              <CardContent className="pt-6 space-y-3">
                {commonFolders.map((folder) => (
                  <div key={folder.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={folder.id}
                      checked={selectedFolders.has(folder.id)}
                      onCheckedChange={() => toggleFolder(folder.id)}
                    />
                    <label
                      htmlFor={folder.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {t(folder.labelKey)}{' '}
                      <span className="text-muted-foreground">({folder.path})</span>
                    </label>
                  </div>
                ))}

                {/* Custom folders */}
                {Array.from(selectedFolders)
                  .filter((id) => !commonFolders.some((f) => f.id === id))
                  .map((path) => (
                    <div key={path} className="flex items-center space-x-2">
                      <Checkbox
                        checked
                        onCheckedChange={() => {
                          const newSelected = new Set(selectedFolders);
                          newSelected.delete(path);
                          setSelectedFolders(newSelected);
                        }}
                      />
                      <label className="text-sm font-medium leading-none cursor-pointer flex-1">
                        {path}
                      </label>
                    </div>
                  ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => void handleSelectCustomFolder()}
                >
                  <FolderOpen className="size-4 mr-2" />
                  {t('onboarding.quickStart.addCustomFolder')}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Password */}
          <div className="space-y-3">
            <Label htmlFor="password">
              {t('onboarding.quickStart.password')} <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('onboarding.quickStart.passwordHint')}
            </p>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('onboarding.quickStart.passwordPlaceholder')}
            />
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('onboarding.quickStart.confirmPasswordPlaceholder')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft className="size-4 mr-2" />
              {t('common.back')}
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              {t('onboarding.quickStart.createBackup')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
