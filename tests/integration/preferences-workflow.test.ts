/**
 * Integration tests for Preferences workflows
 *
 * These tests verify complete user preference workflows,
 * testing interactions between multiple preference settings.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { usePreferencesStore } from '@/stores/preferences';

// Mock i18n
vi.mock('@/lib/i18n/config', () => ({
  default: {
    changeLanguage: vi.fn(),
    t: (key: string) => key,
  },
}));

// Mock document.documentElement
const mockClassList = {
  add: vi.fn(),
  remove: vi.fn(),
};

Object.defineProperty(document, 'documentElement', {
  value: {
    classList: mockClassList,
  },
  writable: true,
});

describe('Preferences Workflows (Integration)', () => {
  beforeEach(() => {
    // Reset to defaults
    const store = usePreferencesStore.getState();
    store.setTheme('system');
    store.setLanguage('en');
    store.setFontSize('medium');
    store.setMinimizeToTray(true);
    store.setByteFormat('base2');
    store.setDesktopNotifications(true);

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('User onboarding workflow', () => {
    it('configures preferences during initial setup', () => {
      const store = usePreferencesStore.getState();

      // New user chooses their preferences
      store.setLanguage('es'); // Spanish
      store.setTheme('dark'); // Dark theme
      store.setFontSize('large'); // Larger text for accessibility
      store.setByteFormat('base10'); // Prefers GB over GiB
      store.setDesktopNotifications(true); // Wants notifications

      // Verify all settings applied
      const state = usePreferencesStore.getState();
      expect(state.language).toBe('es');
      expect(state.theme).toBe('dark');
      expect(state.fontSize).toBe('large');
      expect(state.byteFormat).toBe('base10');
      expect(state.desktopNotifications).toBe(true);

      // Verify font size was applied to DOM
      expect(mockClassList.add).toHaveBeenCalledWith('text-lg');
    });
  });

  describe('Accessibility workflow', () => {
    it('applies accessibility settings together', () => {
      const store = usePreferencesStore.getState();

      // User with visual impairment configures accessibility
      store.setFontSize('large');
      store.setTheme('dark'); // High contrast

      const state = usePreferencesStore.getState();
      expect(state.fontSize).toBe('large');
      expect(state.theme).toBe('dark');
      expect(mockClassList.add).toHaveBeenCalledWith('text-lg');
    });

    it('changes font size multiple times', () => {
      const store = usePreferencesStore.getState();

      // User experiments with font sizes
      store.setFontSize('small');
      expect(mockClassList.add).toHaveBeenCalledWith('text-sm');

      mockClassList.add.mockClear();
      store.setFontSize('large');
      expect(mockClassList.remove).toHaveBeenCalledWith('text-sm', 'text-base', 'text-lg');
      expect(mockClassList.add).toHaveBeenCalledWith('text-lg');

      mockClassList.add.mockClear();
      store.setFontSize('medium');
      expect(mockClassList.add).toHaveBeenCalledWith('text-base');
    });
  });

  describe('Source management workflows', () => {
    it('manages pinned sources for backup prioritization', () => {
      const store = usePreferencesStore.getState();

      const importantSource = 'user@laptop:/home/user/documents';
      const regularSource = 'user@laptop:/home/user/downloads';
      const archiveSource = 'user@laptop:/mnt/archive';

      // User pins important sources
      store.toggleSourcePin(importantSource);
      store.toggleSourcePin(archiveSource);

      const prefs = usePreferencesStore.getState().sourcePreferences;
      expect(prefs[importantSource]?.pinned).toBe(true);
      expect(prefs[regularSource]?.pinned).toBeUndefined();
      expect(prefs[archiveSource]?.pinned).toBe(true);

      // User realizes archive shouldn't be pinned
      store.toggleSourcePin(archiveSource);
      const updated = usePreferencesStore.getState().sourcePreferences;
      expect(updated[archiveSource]?.pinned).toBe(false);
    });

    it('reorders sources and preserves pins', () => {
      const store = usePreferencesStore.getState();

      const sources = ['user@laptop:/work', 'user@laptop:/personal', 'user@laptop:/photos'];

      // Pin favorite source
      store.toggleSourcePin(sources[1]); // personal

      // Reorder sources
      store.reorderSources([sources[2], sources[0], sources[1]]);

      const prefs = usePreferencesStore.getState().sourcePreferences;

      // Check order
      expect(prefs[sources[2]]?.order).toBe(0); // photos first
      expect(prefs[sources[0]]?.order).toBe(1); // work second
      expect(prefs[sources[1]]?.order).toBe(2); // personal third

      // Pin should be preserved
      expect(prefs[sources[1]]?.pinned).toBe(true);
    });

    it('handles complex source operations', () => {
      const store = usePreferencesStore.getState();

      const s1 = 'user@laptop:/source1';
      const s2 = 'user@laptop:/source2';
      const s3 = 'user@laptop:/source3';

      // Initial setup: reorder and pin
      store.reorderSources([s1, s2, s3]);
      store.toggleSourcePin(s1);
      store.toggleSourcePin(s3);

      let prefs = usePreferencesStore.getState().sourcePreferences;
      expect(prefs[s1]?.pinned).toBe(true);
      expect(prefs[s1]?.order).toBe(0);
      expect(prefs[s3]?.pinned).toBe(true);
      expect(prefs[s3]?.order).toBe(2);

      // User reorders again
      store.reorderSources([s3, s2, s1]);

      prefs = usePreferencesStore.getState().sourcePreferences;

      // New order
      expect(prefs[s3]?.order).toBe(0);
      expect(prefs[s2]?.order).toBe(1);
      expect(prefs[s1]?.order).toBe(2);

      // Pins preserved
      expect(prefs[s1]?.pinned).toBe(true);
      expect(prefs[s3]?.pinned).toBe(true);
      expect(prefs[s2]?.pinned).toBeUndefined();
    });
  });

  describe('Byte format and language interaction', () => {
    it('changes between base2 and base10', () => {
      const store = usePreferencesStore.getState();

      // Default is base2 (KiB, MiB, GiB)
      expect(usePreferencesStore.getState().byteFormat).toBe('base2');

      // Switch to base10 (KB, MB, GB)
      store.setByteFormat('base10');
      expect(usePreferencesStore.getState().byteFormat).toBe('base10');

      // Switch back
      store.setByteFormat('base2');
      expect(usePreferencesStore.getState().byteFormat).toBe('base2');
    });

    it('handles language changes with existing preferences', () => {
      const store = usePreferencesStore.getState();

      // Setup some preferences
      store.setByteFormat('base10');
      store.setTheme('dark');
      store.setFontSize('large');

      // Change language
      store.setLanguage('es');

      // All other preferences should remain
      const state = usePreferencesStore.getState();
      expect(state.language).toBe('es');
      expect(state.byteFormat).toBe('base10');
      expect(state.theme).toBe('dark');
      expect(state.fontSize).toBe('large');
    });
  });

  describe('System tray behavior', () => {
    it('toggles minimize to tray setting', () => {
      const store = usePreferencesStore.getState();

      // Default is true
      expect(usePreferencesStore.getState().minimizeToTray).toBe(true);

      // User disables it
      store.setMinimizeToTray(false);
      expect(usePreferencesStore.getState().minimizeToTray).toBe(false);

      // User re-enables it
      store.setMinimizeToTray(true);
      expect(usePreferencesStore.getState().minimizeToTray).toBe(true);
    });

    it('combines tray settings with notifications', () => {
      const store = usePreferencesStore.getState();

      // User wants background operation
      store.setMinimizeToTray(true);
      store.setDesktopNotifications(true);

      let state = usePreferencesStore.getState();
      expect(state.minimizeToTray).toBe(true);
      expect(state.desktopNotifications).toBe(true);

      // User disables notifications but keeps tray
      store.setDesktopNotifications(false);
      state = usePreferencesStore.getState();
      expect(state.minimizeToTray).toBe(true);
      expect(state.desktopNotifications).toBe(false);
    });
  });

  describe('Theme switching workflows', () => {
    it('cycles through all theme options', () => {
      const store = usePreferencesStore.getState();

      // Start with system
      expect(usePreferencesStore.getState().theme).toBe('system');

      // Switch to light
      store.setTheme('light');
      expect(usePreferencesStore.getState().theme).toBe('light');

      // Switch to dark
      store.setTheme('dark');
      expect(usePreferencesStore.getState().theme).toBe('dark');

      // Back to system
      store.setTheme('system');
      expect(usePreferencesStore.getState().theme).toBe('system');
    });
  });

  describe('Complete preference reset workflow', () => {
    it('resets all preferences to defaults', () => {
      const store = usePreferencesStore.getState();

      // User customizes everything
      store.setTheme('dark');
      store.setLanguage('es');
      store.setFontSize('large');
      store.setMinimizeToTray(false);
      store.setByteFormat('base10');
      store.setDesktopNotifications(false);
      store.toggleSourcePin('source1');
      store.reorderSources(['source1', 'source2']);

      // Verify customizations
      let state = usePreferencesStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.language).toBe('es');
      expect(state.fontSize).toBe('large');
      expect(Object.keys(state.sourcePreferences).length).toBeGreaterThan(0);

      // User wants to reset to defaults
      store.setTheme('system');
      store.setLanguage('en');
      store.setFontSize('medium');
      store.setMinimizeToTray(true);
      store.setByteFormat('base2');
      store.setDesktopNotifications(true);

      // Source preferences would need manual clearing (not implemented)
      // but core preferences are reset
      state = usePreferencesStore.getState();
      expect(state.theme).toBe('system');
      expect(state.language).toBe('en');
      expect(state.fontSize).toBe('medium');
      expect(state.minimizeToTray).toBe(true);
      expect(state.byteFormat).toBe('base2');
      expect(state.desktopNotifications).toBe(true);
    });
  });
});
