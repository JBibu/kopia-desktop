/**
 * User Preferences Store
 *
 * Manages application-level user preferences that persist across sessions.
 * Stored in localStorage under the key 'kopia-preferences'.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ByteFormat = 'base2' | 'base10';

interface SourcePreference {
  pinned?: boolean;
  order?: number;
}

interface PreferencesStore {
  // System tray behavior
  minimizeToTray: boolean;
  setMinimizeToTray: (value: boolean) => void;

  // Display preferences
  byteFormat: ByteFormat;
  setByteFormat: (format: ByteFormat) => void;

  // Notification preferences
  desktopNotifications: boolean;
  setDesktopNotifications: (value: boolean) => void;

  // Source preferences (pinning and ordering)
  sourcePreferences: Record<string, SourcePreference>; // key: sourceId (user@host:path)
  toggleSourcePin: (sourceId: string) => void;
  reorderSources: (sourceIds: string[]) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      minimizeToTray: true, // Default: minimize to tray on close
      setMinimizeToTray: (value) => set({ minimizeToTray: value }),
      byteFormat: 'base2', // Default: Base-2 (KiB, MiB, GiB) with 1024
      setByteFormat: (format) => set({ byteFormat: format }),
      desktopNotifications: true, // Default: show desktop notifications
      setDesktopNotifications: (value) => set({ desktopNotifications: value }),
      sourcePreferences: {},

      /**
       * Toggle pin state for an individual source
       * Pinned sources appear first in the sorted list
       * @param sourceId - Format: "user@host:/path"
       */
      toggleSourcePin: (sourceId) =>
        set((state) => ({
          sourcePreferences: {
            ...state.sourcePreferences,
            [sourceId]: {
              ...state.sourcePreferences[sourceId],
              pinned: !state.sourcePreferences[sourceId]?.pinned,
            },
          },
        })),

      /**
       * Reorder sources based on drag-and-drop
       * Updates the order field for all sources to maintain sort order
       * @param sourceIds - Array of source IDs in new order
       */
      reorderSources: (sourceIds) =>
        set((state) => {
          const newPreferences = { ...state.sourcePreferences };
          sourceIds.forEach((sourceId, index) => {
            newPreferences[sourceId] = {
              ...newPreferences[sourceId],
              order: index,
            };
          });
          return { sourcePreferences: newPreferences };
        }),
    }),
    {
      name: 'kopia-preferences',
    }
  )
);
