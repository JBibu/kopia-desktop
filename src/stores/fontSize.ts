import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontSize = 'small' | 'medium' | 'large';

interface FontSizeStore {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

export const useFontSizeStore = create<FontSizeStore>()(
  persist(
    (set) => ({
      fontSize: 'medium',
      setFontSize: (fontSize) => {
        set({ fontSize });
        // Apply font size to document root
        applyFontSize(fontSize);
      },
    }),
    {
      name: 'font-size-storage',
      onRehydrateStorage: () => (state) => {
        // Apply font size on initial load
        if (state?.fontSize) {
          applyFontSize(state.fontSize);
        }
      },
    }
  )
);

function applyFontSize(size: FontSize) {
  const root = document.documentElement;

  // Remove existing font size classes
  root.classList.remove('text-sm', 'text-base', 'text-lg');

  // Apply new font size class
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
