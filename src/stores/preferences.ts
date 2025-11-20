/**
 * User Preferences Store
 *
 * Manages application-level user preferences that persist across sessions.
 * Stored in localStorage under the key 'kopia-preferences'.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ByteFormat = 'base2' | 'base10';

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
    }),
    {
      name: 'kopia-preferences',
    }
  )
);
