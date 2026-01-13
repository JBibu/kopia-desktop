/**
 * Backup Profiles store using Zustand
 *
 * Manages backup profiles that contain directories to backup.
 * Each profile has a list of directories and shared policy configuration.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BackupProfile } from '@/lib/kopia';
import { matchPolicyToPreset } from '@/lib/kopia/policy-presets';
import { v4 as uuidv4 } from 'uuid';

interface ProfilesStore {
  profiles: BackupProfile[];
  _migrationVersion: number; // Internal: tracks migration status

  // CRUD operations
  createProfile: (profile: Omit<BackupProfile, 'id' | 'createdAt' | 'updatedAt'>) => BackupProfile;
  updateProfile: (id: string, updates: Partial<Omit<BackupProfile, 'id' | 'createdAt'>>) => void;
  deleteProfile: (id: string) => void;

  // Pin/Unpin profiles
  togglePin: (id: string) => void;

  // Reorder profiles
  reorderProfiles: (profileIds: string[]) => void;

  // Migration
  _migrateProfiles: () => void;
}

const CURRENT_MIGRATION_VERSION = 1;

export const useProfilesStore = create<ProfilesStore>()(
  persist(
    (set, get) => ({
      profiles: [],
      _migrationVersion: 0,

      /**
       * Migrate profiles from old format to new preset-based format
       *
       * Migration v1: Add policyPreset field to existing profiles
       * - Analyzes existing policy to find matching preset
       * - If no match, marks as CUSTOM and stores policy
       * - Backs up original profiles to localStorage
       */
      _migrateProfiles: () => {
        const state = get();

        // Skip if already migrated
        if (state._migrationVersion >= CURRENT_MIGRATION_VERSION) {
          return;
        }

        console.log('[Profiles] Running migration v1: Adding policy presets');

        // Backup original profiles before migration
        const backup = JSON.stringify(state.profiles);
        localStorage.setItem('kopia-profiles-backup-v1', backup);
        localStorage.setItem('kopia-profiles-backup-timestamp', new Date().toISOString());

        // Migrate each profile
        const migratedProfiles = state.profiles.map((profile) => {
          // Skip if already has policyPreset
          if (profile.policyPreset) {
            return profile;
          }

          // Try to match existing policy to a preset
          const presetId = matchPolicyToPreset(profile.policy);

          // Build migrated profile
          const migrated: BackupProfile = {
            ...profile,
            policyPreset: presetId,
            // If CUSTOM, store the original policy
            customPolicy: presetId === 'CUSTOM' ? profile.policy : undefined,
            updatedAt: new Date().toISOString(),
          };

          console.log(`[Profiles] Migrated "${profile.name}" to preset: ${presetId}`);
          return migrated;
        });

        set({
          profiles: migratedProfiles,
          _migrationVersion: CURRENT_MIGRATION_VERSION,
        });

        console.log(`[Profiles] Migration complete. Backup saved to localStorage.`);
      },

      createProfile: (profileData) => {
        const now = new Date().toISOString();
        const newProfile: BackupProfile = {
          ...profileData,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          profiles: [...state.profiles, newProfile],
        }));

        return newProfile;
      },

      updateProfile: (id, updates) => {
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id
              ? { ...profile, ...updates, updatedAt: new Date().toISOString() }
              : profile
          ),
        }));
      },

      deleteProfile: (id) => {
        set((state) => ({
          profiles: state.profiles.filter((profile) => profile.id !== id),
        }));
      },

      togglePin: (id) => {
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id
              ? {
                  ...profile,
                  pinned: !profile.pinned,
                  updatedAt: new Date().toISOString(),
                }
              : profile
          ),
        }));
      },

      /**
       * Reorder profiles based on drag-and-drop
       * Updates the order field for all profiles to maintain sort order
       */
      reorderProfiles: (profileIds) => {
        set((state) => {
          const profileMap = new Map(state.profiles.map((p) => [p.id, p]));
          const reordered: BackupProfile[] = [];

          profileIds.forEach((id, index) => {
            const profile = profileMap.get(id);
            if (profile) {
              reordered.push({
                ...profile,
                order: index,
                updatedAt: new Date().toISOString(),
              });
            }
          });

          // Add any profiles not in the reorder list (shouldn't happen, but for safety)
          const reorderedIds = new Set(profileIds);
          const remaining = state.profiles
            .filter((p) => !reorderedIds.has(p.id))
            .map((p, index) => ({
              ...p,
              order: reordered.length + index,
            }));

          return { profiles: [...reordered, ...remaining] };
        });
      },
    }),
    {
      name: 'kopia-profiles', // localStorage key
      version: CURRENT_MIGRATION_VERSION,
      onRehydrateStorage: () => (state) => {
        // Run migration after store is hydrated from localStorage
        if (state) {
          state._migrateProfiles();
        }
      },
    }
  )
);
