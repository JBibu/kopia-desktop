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
    }),
    {
      name: 'kopia-profiles', // localStorage key
    }
  )
);
