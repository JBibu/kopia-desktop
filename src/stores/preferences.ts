import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ByteFormat = 'base2' | 'base10';

interface PreferencesStore {
  minimizeToTray: boolean;
  setMinimizeToTray: (value: boolean) => void;
  byteFormat: ByteFormat;
  setByteFormat: (format: ByteFormat) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      minimizeToTray: true, // Default: minimize to tray on close
      setMinimizeToTray: (value) => set({ minimizeToTray: value }),
      byteFormat: 'base2', // Default: Base-2 (KiB, MiB, GiB) with 1024
      setByteFormat: (format) => set({ byteFormat: format }),
    }),
    {
      name: 'kopia-preferences',
    }
  )
);
