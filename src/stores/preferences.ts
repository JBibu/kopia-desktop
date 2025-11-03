import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesStore {
  minimizeToTray: boolean;
  setMinimizeToTray: (value: boolean) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      minimizeToTray: true, // Default: minimize to tray on close
      setMinimizeToTray: (value) => set({ minimizeToTray: value }),
    }),
    {
      name: 'kopia-preferences',
    }
  )
);
