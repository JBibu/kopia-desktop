/**
 * Unit tests for Preferences Store
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

// Mock document.documentElement for font size tests
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

describe('PreferencesStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = usePreferencesStore.getState();
    store.setTheme('system');
    store.setLanguage('en');
    store.setFontSize('medium');
    store.setMinimizeToTray(true);
    store.setByteFormat('base2');
    store.setDesktopNotifications(true);

    // Reset mock calls
    vi.clearAllMocks();
  });

  describe('Theme preferences', () => {
    it('has default theme', () => {
      const store = usePreferencesStore.getState();
      expect(store.theme).toBe('system');
    });

    it('sets theme to light', () => {
      const store = usePreferencesStore.getState();
      store.setTheme('light');
      expect(usePreferencesStore.getState().theme).toBe('light');
    });

    it('sets theme to dark', () => {
      const store = usePreferencesStore.getState();
      store.setTheme('dark');
      expect(usePreferencesStore.getState().theme).toBe('dark');
    });

    it('sets theme to system', () => {
      const store = usePreferencesStore.getState();
      store.setTheme('system');
      expect(usePreferencesStore.getState().theme).toBe('system');
    });
  });

  describe('Language preferences', () => {
    it('has default language', () => {
      const store = usePreferencesStore.getState();
      expect(store.language).toBe('en');
    });

    it('sets language to English', () => {
      const store = usePreferencesStore.getState();
      store.setLanguage('en');
      expect(usePreferencesStore.getState().language).toBe('en');
    });

    it('sets language to Spanish', () => {
      const store = usePreferencesStore.getState();
      store.setLanguage('es');
      expect(usePreferencesStore.getState().language).toBe('es');
    });
  });

  describe('Font size preferences', () => {
    it('has default font size', () => {
      const store = usePreferencesStore.getState();
      expect(store.fontSize).toBe('medium');
    });

    it('sets font size to small', () => {
      const store = usePreferencesStore.getState();
      store.setFontSize('small');
      expect(usePreferencesStore.getState().fontSize).toBe('small');
    });

    it('sets font size to medium', () => {
      const store = usePreferencesStore.getState();
      store.setFontSize('medium');
      expect(usePreferencesStore.getState().fontSize).toBe('medium');
    });

    it('sets font size to large', () => {
      const store = usePreferencesStore.getState();
      store.setFontSize('large');
      expect(usePreferencesStore.getState().fontSize).toBe('large');
    });

    it('applies font size class to document root', () => {
      const store = usePreferencesStore.getState();
      store.setFontSize('large');
      expect(mockClassList.remove).toHaveBeenCalledWith('text-sm', 'text-base', 'text-lg');
      expect(mockClassList.add).toHaveBeenCalledWith('text-lg');
    });
  });

  describe('System tray behavior', () => {
    it('has default minimize to tray', () => {
      const store = usePreferencesStore.getState();
      expect(store.minimizeToTray).toBe(true);
    });

    it('sets minimize to tray to false', () => {
      const store = usePreferencesStore.getState();
      store.setMinimizeToTray(false);
      expect(usePreferencesStore.getState().minimizeToTray).toBe(false);
    });

    it('sets minimize to tray to true', () => {
      const store = usePreferencesStore.getState();
      store.setMinimizeToTray(true);
      expect(usePreferencesStore.getState().minimizeToTray).toBe(true);
    });
  });

  describe('Byte format preferences', () => {
    it('has default byte format', () => {
      const store = usePreferencesStore.getState();
      expect(store.byteFormat).toBe('base2');
    });

    it('sets byte format to base2', () => {
      const store = usePreferencesStore.getState();
      store.setByteFormat('base2');
      expect(usePreferencesStore.getState().byteFormat).toBe('base2');
    });

    it('sets byte format to base10', () => {
      const store = usePreferencesStore.getState();
      store.setByteFormat('base10');
      expect(usePreferencesStore.getState().byteFormat).toBe('base10');
    });
  });

  describe('Desktop notifications', () => {
    it('has default desktop notifications enabled', () => {
      const store = usePreferencesStore.getState();
      expect(store.desktopNotifications).toBe(true);
    });

    it('disables desktop notifications', () => {
      const store = usePreferencesStore.getState();
      store.setDesktopNotifications(false);
      expect(usePreferencesStore.getState().desktopNotifications).toBe(false);
    });

    it('enables desktop notifications', () => {
      const store = usePreferencesStore.getState();
      store.setDesktopNotifications(true);
      expect(usePreferencesStore.getState().desktopNotifications).toBe(true);
    });
  });

  describe('Source preferences', () => {
    it('has empty source preferences by default', () => {
      const store = usePreferencesStore.getState();
      expect(store.sourcePreferences).toEqual({});
    });

    it('toggles source pin', () => {
      const store = usePreferencesStore.getState();
      const sourceId = 'user@host:/path';

      // First toggle should pin it
      store.toggleSourcePin(sourceId);
      expect(usePreferencesStore.getState().sourcePreferences[sourceId]?.pinned).toBe(true);

      // Second toggle should unpin it
      store.toggleSourcePin(sourceId);
      expect(usePreferencesStore.getState().sourcePreferences[sourceId]?.pinned).toBe(false);
    });

    it('toggles pin on source without existing preferences', () => {
      const store = usePreferencesStore.getState();
      const sourceId = 'new-source';

      // Should create new preference with pinned=true
      store.toggleSourcePin(sourceId);
      expect(usePreferencesStore.getState().sourcePreferences[sourceId]?.pinned).toBe(true);
    });

    it('preserves existing source preferences when toggling pin', () => {
      const store = usePreferencesStore.getState();
      const sourceId = 'user@host:/path';

      // Set order first
      store.reorderSources([sourceId]);
      expect(usePreferencesStore.getState().sourcePreferences[sourceId]?.order).toBe(0);

      // Toggle pin should preserve order
      store.toggleSourcePin(sourceId);
      const prefs = usePreferencesStore.getState().sourcePreferences[sourceId];
      expect(prefs?.pinned).toBe(true);
      expect(prefs?.order).toBe(0);
    });

    it('reorders sources', () => {
      const store = usePreferencesStore.getState();
      const sourceIds = ['source1', 'source2', 'source3'];

      store.reorderSources(sourceIds);
      const prefs = usePreferencesStore.getState().sourcePreferences;

      expect(prefs['source1']?.order).toBe(0);
      expect(prefs['source2']?.order).toBe(1);
      expect(prefs['source3']?.order).toBe(2);
    });

    it('reorders sources with existing preferences', () => {
      const store = usePreferencesStore.getState();

      // Set up existing preferences
      store.toggleSourcePin('source1');
      store.reorderSources(['source1', 'source2']);

      // Reorder
      store.reorderSources(['source2', 'source1']);
      const prefs = usePreferencesStore.getState().sourcePreferences;

      // Order should be updated, but pin should be preserved
      expect(prefs['source2']?.order).toBe(0);
      expect(prefs['source1']?.order).toBe(1);
      expect(prefs['source1']?.pinned).toBe(true);
    });

    it('reorders single source', () => {
      const store = usePreferencesStore.getState();

      store.reorderSources(['only-source']);
      const prefs = usePreferencesStore.getState().sourcePreferences;

      expect(prefs['only-source']?.order).toBe(0);
    });

    it('handles empty source list in reorder', () => {
      const store = usePreferencesStore.getState();

      // Set up existing preference
      store.toggleSourcePin('existing');

      // Reorder with empty list
      store.reorderSources([]);
      const prefs = usePreferencesStore.getState().sourcePreferences;

      // Existing preference should remain
      expect(prefs['existing']?.pinned).toBe(true);
    });
  });
});
