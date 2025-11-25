import { useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { usePreferencesStore } from '@/stores/preferences';

export function WindowCloseHandler() {
  const minimizeToTray = usePreferencesStore((state) => state.minimizeToTray);
  const minimizeToTrayRef = useRef(minimizeToTray);

  // Keep ref in sync with store value
  useEffect(() => {
    minimizeToTrayRef.current = minimizeToTray;
  }, [minimizeToTray]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupCloseHandler = async () => {
      try {
        // Check if running in Tauri environment
        if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
          return;
        }

        const appWindow = getCurrentWindow();

        unlisten = await appWindow.onCloseRequested(async (event) => {
          const shouldMinimize = minimizeToTrayRef.current;

          if (shouldMinimize) {
            // Prevent the default close behavior
            event.preventDefault();
            // Hide the window instead of closing
            await appWindow.hide();
          }
          // If minimizeToTray is false, allow default close behavior
        });
      } catch {
        // Not in Tauri environment - no handler needed
      }
    };

    void setupCloseHandler();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []); // Only set up once on mount

  return null;
}
