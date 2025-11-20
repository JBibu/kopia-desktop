/**
 * Backup Profiles store using Zustand
 *
 * Manages backup profiles that contain directories to backup.
 * Each profile has a list of directories and shared policy configuration.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BackupProfile } from '@/lib/kopia/types';
import { v4 as uuidv4 } from 'uuid';

interface ProfilesStore {
  profiles: BackupProfile[];

  // CRUD operations
  createProfile: (profile: Omit<BackupProfile, 'id' | 'createdAt' | 'updatedAt'>) => BackupProfile;
  updateProfile: (id: string, updates: Partial<Omit<BackupProfile, 'id' | 'createdAt'>>) => void;
  deleteProfile: (id: string) => void;
  getProfile: (id: string) => BackupProfile | undefined;

  // Directory management
  addDirectory: (profileId: string, directory: string) => void;
  removeDirectory: (profileId: string, directory: string) => void;

  // Toggle enabled state
  toggleProfile: (id: string) => void;

  // Pin/Unpin profiles
  togglePin: (id: string) => void;

  // Reorder profiles
  reorderProfiles: (profileIds: string[]) => void;
}

export const useProfilesStore = create<ProfilesStore>()(
  persist(
    (set, get) => ({
      profiles: [],

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

      getProfile: (id) => {
        return get().profiles.find((profile) => profile.id === id);
      },

      addDirectory: (profileId, directory) => {
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === profileId
              ? {
                  ...profile,
                  directories: [...profile.directories, directory],
                  updatedAt: new Date().toISOString(),
                }
              : profile
          ),
        }));
      },

      removeDirectory: (profileId, directory) => {
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === profileId
              ? {
                  ...profile,
                  directories: profile.directories.filter((dir) => dir !== directory),
                  updatedAt: new Date().toISOString(),
                }
              : profile
          ),
        }));
      },

      toggleProfile: (id) => {
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id
              ? {
                  ...profile,
                  enabled: !profile.enabled,
                  updatedAt: new Date().toISOString(),
                }
              : profile
          ),
        }));
      },

      /**
       * Toggle pin state for a profile
       * Pinned profiles appear first in the sorted list
       */
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
    }
  )
);
