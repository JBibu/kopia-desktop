/**
 * Profile Form Dialog - Create/Edit backup profiles with directory management
 * Redesigned with policy presets for simplified UX
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { listen } from '@tauri-apps/api/event';
import { useProfilesStore } from '@/stores';
import { selectFolder } from '@/lib/kopia';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PolicyPresetSelector } from '@/components/kopia/policy';
import { FolderOpen, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { BackupProfile } from '@/lib/kopia';
import type { PolicyPresetId } from '@/lib/kopia/policy-presets';

interface ProfileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: BackupProfile; // undefined = create mode, BackupProfile = edit mode
}

export function ProfileFormDialog({ open, onOpenChange, profile }: ProfileFormDialogProps) {
  const { t } = useTranslation();
  const { createProfile, updateProfile } = useProfilesStore();

  const [name, setName] = useState(() => profile?.name || '');
  const [description, setDescription] = useState(() => profile?.description || '');
  const [directories, setDirectories] = useState<string[]>(() => profile?.directories || []);
  const [policyPreset, setPolicyPreset] = useState<PolicyPresetId>(
    () => (profile?.policyPreset as PolicyPresetId) || 'DAILY_30'
  );
  const [isDragging, setIsDragging] = useState(false);

  // Reset form when profile or open changes
  useEffect(() => {
    if (!open) return;

    setName(profile?.name || '');
    setDescription(profile?.description || '');
    setDirectories(profile?.directories || []);
    setPolicyPreset((profile?.policyPreset as PolicyPresetId) || 'DAILY_30');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile?.id]);

  // Set up drag and drop listeners
  useEffect(() => {
    if (!open) return;

    const unlistenDragEnter = listen<string[]>('tauri://drag-enter', () => {
      setIsDragging(true);
    });

    const unlistenDragLeave = listen<string[]>('tauri://drag-leave', () => {
      setIsDragging(false);
    });

    const unlistenDrop = listen<{ paths: string[] }>('tauri://drag-drop', (event) => {
      setIsDragging(false);
      const paths = event.payload.paths;

      // Filter for directories only and add them
      const newDirectories = paths.filter((path) => !directories.includes(path));
      if (newDirectories.length > 0) {
        setDirectories([...directories, ...newDirectories]);
        toast.success(t('profiles.directoriesAdded', { count: newDirectories.length }));
      }
    });

    // Cleanup listeners
    return () => {
      void unlistenDragEnter.then((fn) => fn());
      void unlistenDragLeave.then((fn) => fn());
      void unlistenDrop.then((fn) => fn());
    };
  }, [open, directories, t]);

  const handleAddDirectory = async () => {
    try {
      const selectedPath = await selectFolder();
      if (selectedPath) {
        if (directories.includes(selectedPath)) {
          toast.error(t('profiles.directoryAlreadyAdded'));
        } else {
          setDirectories([...directories, selectedPath]);
        }
      }
    } catch {
      // User cancelled or error
    }
  };

  const handleRemoveDirectory = (directory: string) => {
    setDirectories(directories.filter((d) => d !== directory));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t('profiles.nameRequired'));
      return;
    }

    if (directories.length === 0) {
      toast.error(t('profiles.atLeastOneDirectory'));
      return;
    }

    try {
      if (profile) {
        // Edit mode
        updateProfile(profile.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          directories,
          policyPreset,
        });
        toast.success(t('profiles.profileUpdated', { name: name.trim() }));
      } else {
        // Create mode
        createProfile({
          name: name.trim(),
          description: description.trim() || undefined,
          directories,
          policyPreset,
          enabled: true,
        });
        toast.success(t('profiles.profileCreated', { name: name.trim() }));
      }

      onOpenChange(false);
    } catch (err) {
      toast.error(t('profiles.profileCreationFailed'));
      if (import.meta.env.DEV) {
        console.error('Failed to create/update profile:', err);
      }
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {profile ? t('profiles.editProfile') : t('profiles.createProfile')}
          </DialogTitle>
          <DialogDescription>
            {profile
              ? t('profiles.editProfileDescription')
              : t('profiles.createProfileDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {t('profiles.name')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('profiles.namePlaceholder')}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('profiles.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('profiles.descriptionPlaceholder')}
              rows={2}
            />
          </div>

          {/* Directories */}
          <div className="space-y-2">
            <Label>
              {t('profiles.directories')} <span className="text-destructive">*</span>
            </Label>
            <div className="space-y-2">
              {directories.length === 0 ? (
                <div
                  className={`flex items-center justify-center py-8 border-2 border-dashed rounded-md transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  }`}
                >
                  <div className="text-center">
                    <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {t('profiles.noDirectoriesAdded')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('profiles.dragDropHint')}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className={`space-y-2 max-h-[200px] overflow-y-auto p-2 border-2 border-dashed rounded-md transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  }`}
                >
                  {directories.map((directory, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-background rounded group"
                    >
                      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm flex-1 truncate" title={directory}>
                        {directory}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => handleRemoveDirectory(directory)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => void handleAddDirectory()}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('profiles.addDirectory')}
              </Button>
            </div>
          </div>

          {/* Backup Schedule (Policy Preset) */}
          <div className="space-y-2">
            <Label>{t('profiles.backupSchedule')}</Label>
            <p className="text-sm text-muted-foreground mb-3">
              {t('profiles.backupScheduleDescription')}
            </p>
            <PolicyPresetSelector value={policyPreset} onChange={setPolicyPreset} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{profile ? t('common.save') : t('common.create')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
