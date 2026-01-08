/**
 * User Preferences Store
 *
 * Manages application-level user preferences that persist across sessions.
 * Stored in localStorage under the key 'kopia-preferences'.
 *
 * Consolidates theme, language, fontSize, and other application preferences.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/lib/i18n/config';

export type ByteFormat = 'base2' | 'base10';
export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'es';
export type FontSize = 'small' | 'medium' | 'large';

interface SourcePreference {
  pinned?: boolean;
  order?: number;
}

/** Maps language code to full locale string for date/number formatting */
const LANGUAGE_TO_LOCALE: Record<Language, string> = {
  en: 'en-US',
  es: 'es-ES',
};

interface PreferencesStore {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Language
  language: Language;
  setLanguage: (language: Language) => void;
  /** Get full locale string (e.g., 'en-US') for formatting */
  getLocale: () => string;

  // Font size
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;

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

/**
 * Helper function to apply font size class to document root
 */
function applyFontSize(size: FontSize) {
  const root = document.documentElement;
  root.classList.remove('text-sm', 'text-base', 'text-lg');

  switch (size) {
    case 'small':
      root.classList.add('text-sm');
      break;
    case 'medium':
      root.classList.add('text-base');
      break;
    case 'large':
      root.classList.add('text-lg');
      break;
  }
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      // Theme preferences
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // Language preferences
      language: 'en',
      setLanguage: (language) => {
        void i18n.changeLanguage(language);
        set({ language });
      },
      getLocale: () => LANGUAGE_TO_LOCALE[get().language],

      // Font size preferences
      fontSize: 'medium',
      setFontSize: (fontSize) => {
        applyFontSize(fontSize);
        set({ fontSize });
      },

      // System tray behavior
      minimizeToTray: true, // Default: minimize to tray on close
      setMinimizeToTray: (value) => set({ minimizeToTray: value }),

      // Display preferences
      byteFormat: 'base2', // Default: Base-2 (KiB, MiB, GiB) with 1024
      setByteFormat: (format) => set({ byteFormat: format }),

      // Notification preferences
      desktopNotifications: true, // Default: show desktop notifications
      setDesktopNotifications: (value) => set({ desktopNotifications: value }),

      // Source preferences
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
      onRehydrateStorage: () => (state) => {
        // Apply font size on initial load
        if (state?.fontSize) {
          applyFontSize(state.fontSize);
        }
      },
    }
  )
);
