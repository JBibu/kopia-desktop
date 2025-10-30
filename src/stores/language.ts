/**
 * Language store using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/lib/i18n/config';

type Language = 'en' | 'es';

interface LanguageStore {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => {
        void i18n.changeLanguage(language);
        set({ language });
      },
    }),
    {
      name: 'kopia-desktop-language',
    }
  )
);
