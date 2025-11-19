import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ByteFormat = 'base2' | 'base10';

interface PreferencesStore {
  minimizeToTray: boolean;
  setMinimizeToTray: (value: boolean) => void;
  byteFormat: ByteFormat;
  setByteFormat: (format: ByteFormat) => void;
  desktopNotifications: boolean;
  setDesktopNotifications: (value: boolean) => void;
  autoStartServer: boolean;
  setAutoStartServer: (value: boolean) => void;
  soundEffects: boolean;
  setSoundEffects: (value: boolean) => void;
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
      autoStartServer: false, // Default: don't auto-start server
      setAutoStartServer: (value) => set({ autoStartServer: value }),
      soundEffects: true, // Default: enable sound effects
      setSoundEffects: (value) => set({ soundEffects: value }),
    }),
    {
      name: 'kopia-preferences',
    }
  )
);
