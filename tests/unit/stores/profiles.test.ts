/**
 * Unit tests for Profiles Store
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useProfilesStore } from '@/stores/profiles';

// Mock uuid - return unique IDs
let uuidCounter = 0;
vi.mock('uuid', () => ({
  v4: (): string => `test-uuid-${uuidCounter++}`,
}));

describe('ProfilesStore', () => {
  beforeEach(() => {
    // Reset store state and UUID counter before each test
    useProfilesStore.setState({ profiles: [] });
    uuidCounter = 0;
  });

  describe('createProfile', () => {
    it('creates a new profile', () => {
      const store = useProfilesStore.getState();
      const profileData = {
        name: 'Test Profile',
        description: 'Test description',
        directories: ['/home/user/documents'],
        enabled: true,
      };

      const profile = store.createProfile(profileData);

      expect(profile.id).toBe('test-uuid-0');
      expect(profile.name).toBe('Test Profile');
      expect(profile.description).toBe('Test description');
      expect(profile.directories).toEqual(['/home/user/documents']);
      expect(profile.enabled).toBe(true);
      expect(profile.createdAt).toBeDefined();
      expect(profile.updatedAt).toBeDefined();
    });

    it('adds profile to store', () => {
      const store = useProfilesStore.getState();
      const profileData = {
        name: 'Test Profile',
        directories: ['/home/user/documents'],
        enabled: true,
      };

      store.createProfile(profileData);
      const profiles = useProfilesStore.getState().profiles;

      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe('Test Profile');
    });

    it('creates multiple profiles', () => {
      const store = useProfilesStore.getState();

      store.createProfile({ name: 'Profile 1', directories: ['/dir1'], enabled: true });
      store.createProfile({ name: 'Profile 2', directories: ['/dir2'], enabled: true });
      store.createProfile({ name: 'Profile 3', directories: ['/dir3'], enabled: true });

      const profiles = useProfilesStore.getState().profiles;
      expect(profiles).toHaveLength(3);
    });
  });

  describe('updateProfile', () => {
    it('updates profile name', async () => {
      const store = useProfilesStore.getState();
      const profile = store.createProfile({
        name: 'Old Name',
        directories: ['/dir'],
        enabled: true,
      });

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      store.updateProfile(profile.id, { name: 'New Name' });
      const updated = useProfilesStore.getState().profiles[0];

      expect(updated.name).toBe('New Name');
      expect(updated.updatedAt).not.toBe(profile.updatedAt);
    });

    it('updates profile description', () => {
      const store = useProfilesStore.getState();
      const profile = store.createProfile({
        name: 'Test',
        directories: ['/dir'],
        enabled: true,
      });

      store.updateProfile(profile.id, { description: 'New description' });
      const updated = useProfilesStore.getState().profiles[0];

      expect(updated.description).toBe('New description');
    });

    it('updates multiple fields at once', () => {
      const store = useProfilesStore.getState();
      const profile = store.createProfile({
        name: 'Test',
        directories: ['/dir'],
        enabled: true,
      });

      store.updateProfile(profile.id, {
        name: 'Updated Name',
        description: 'Updated description',
        enabled: false,
      });

      const updated = useProfilesStore.getState().profiles[0];
      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated description');
      expect(updated.enabled).toBe(false);
    });

    it('does not update non-existent profile', () => {
      const store = useProfilesStore.getState();
      store.createProfile({ name: 'Test', directories: ['/dir'], enabled: true });

      store.updateProfile('non-existent-id', { name: 'Updated' });
      const profiles = useProfilesStore.getState().profiles;

      expect(profiles[0].name).toBe('Test');
    });
  });

  describe('deleteProfile', () => {
    it('deletes a profile', () => {
      const store = useProfilesStore.getState();
      const profile = store.createProfile({
        name: 'Test',
        directories: ['/dir'],
        enabled: true,
      });

      store.deleteProfile(profile.id);
      const profiles = useProfilesStore.getState().profiles;

      expect(profiles).toHaveLength(0);
    });

    it('deletes correct profile from multiple', () => {
      const store = useProfilesStore.getState();
      store.createProfile({
        name: 'Profile 1',
        directories: ['/dir1'],
        enabled: true,
      });
      const profile2 = store.createProfile({
        name: 'Profile 2',
        directories: ['/dir2'],
        enabled: true,
      });
      store.createProfile({
        name: 'Profile 3',
        directories: ['/dir3'],
        enabled: true,
      });

      // Delete middle profile
      store.deleteProfile(profile2.id);
      const profiles = useProfilesStore.getState().profiles;

      expect(profiles).toHaveLength(2);
      expect(profiles.find((p) => p.name === 'Profile 1')).toBeDefined();
      expect(profiles.find((p) => p.name === 'Profile 3')).toBeDefined();
      expect(profiles.find((p) => p.name === 'Profile 2')).toBeUndefined();
    });

    it('does not error when deleting non-existent profile', () => {
      const store = useProfilesStore.getState();
      store.createProfile({ name: 'Test', directories: ['/dir'], enabled: true });

      expect(() => store.deleteProfile('non-existent-id')).not.toThrow();
      expect(useProfilesStore.getState().profiles).toHaveLength(1);
    });
  });

  describe('getProfile', () => {
    it('gets profile by id', () => {
      const store = useProfilesStore.getState();
      const profile = store.createProfile({
        name: 'Test',
        directories: ['/dir'],
        enabled: true,
      });

      const found = store.getProfile(profile.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Test');
    });

    it('returns undefined for non-existent profile', () => {
      const store = useProfilesStore.getState();
      const found = store.getProfile('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('addDirectory', () => {
    it('adds directory to profile', async () => {
      const store = useProfilesStore.getState();
      const profile = store.createProfile({
        name: 'Test',
        directories: ['/dir1'],
        enabled: true,
      });

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      store.addDirectory(profile.id, '/dir2');
      const updated = useProfilesStore.getState().profiles[0];

      expect(updated.directories).toEqual(['/dir1', '/dir2']);
      expect(updated.updatedAt).not.toBe(profile.updatedAt);
    });

    it('adds multiple directories', () => {
      const store = useProfilesStore.getState();
      const profile = store.createProfile({
        name: 'Test',
        directories: ['/dir1'],
        enabled: true,
      });

      store.addDirectory(profile.id, '/dir2');
      store.addDirectory(profile.id, '/dir3');
      const updated = useProfilesStore.getState().profiles[0];

      expect(updated.directories).toEqual(['/dir1', '/dir2', '/dir3']);
    });

    it('does not modify other profiles when adding directory', () => {
      const store = useProfilesStore.getState();
      const profile1 = store.createProfile({
        name: 'Profile 1',
        directories: ['/dir1'],
        enabled: true,
      });
      store.createProfile({
        name: 'Profile 2',
        directories: ['/dirA'],
        enabled: true,
      });

      store.addDirectory(profile1.id, '/dir2');
      const profiles = useProfilesStore.getState().profiles;

      expect(profiles[0].directories).toEqual(['/dir1', '/dir2']);
      expect(profiles[1].directories).toEqual(['/dirA']);
    });
  });

  describe('removeDirectory', () => {
    it('removes directory from profile', async () => {
      const store = useProfilesStore.getState();
      const profile = store.createProfile({
        name: 'Test',
        directories: ['/dir1', '/dir2', '/dir3'],
        enabled: true,
      });

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      store.removeDirectory(profile.id, '/dir2');
      const updated = useProfilesStore.getState().profiles[0];

      expect(updated.directories).toEqual(['/dir1', '/dir3']);
      expect(updated.updatedAt).not.toBe(profile.updatedAt);
    });

    it('does nothing when removing non-existent directory', () => {
      const store = useProfilesStore.getState();
      const profile = store.createProfile({
        name: 'Test',
        directories: ['/dir1'],
        enabled: true,
      });

      store.removeDirectory(profile.id, '/non-existent');
      const updated = useProfilesStore.getState().profiles[0];

      expect(updated.directories).toEqual(['/dir1']);
    });

    it('does not modify other profiles when removing directory', () => {
      const store = useProfilesStore.getState();
      const profile1 = store.createProfile({
        name: 'Profile 1',
        directories: ['/dir1', '/dir2'],
        enabled: true,
      });
      store.createProfile({
        name: 'Profile 2',
        directories: ['/dirA', '/dirB'],
        enabled: true,
      });

      store.removeDirectory(profile1.id, '/dir2');
      const profiles = useProfilesStore.getState().profiles;

      expect(profiles[0].directories).toEqual(['/dir1']);
      expect(profiles[1].directories).toEqual(['/dirA', '/dirB']);
    });
  });

  describe('toggleProfile', () => {
    it('toggles profile enabled state', () => {
      const store = useProfilesStore.getState();
      const profile = store.createProfile({
        name: 'Test',
        directories: ['/dir'],
        enabled: true,
      });

      store.toggleProfile(profile.id);
      expect(useProfilesStore.getState().profiles[0].enabled).toBe(false);

      store.toggleProfile(profile.id);
      expect(useProfilesStore.getState().profiles[0].enabled).toBe(true);
    });

    it('updates updatedAt when toggling', async () => {
      const store = useProfilesStore.getState();
      const profile = store.createProfile({
        name: 'Test',
        directories: ['/dir'],
        enabled: true,
      });

      const originalUpdatedAt = profile.updatedAt;

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      store.toggleProfile(profile.id);

      expect(useProfilesStore.getState().profiles[0].updatedAt).not.toBe(originalUpdatedAt);
    });

    it('does not modify other profiles when toggling', () => {
      const store = useProfilesStore.getState();
      const profile1 = store.createProfile({
        name: 'Profile 1',
        directories: ['/dir1'],
        enabled: true,
      });
      store.createProfile({
        name: 'Profile 2',
        directories: ['/dir2'],
        enabled: false,
      });

      store.toggleProfile(profile1.id);
      const profiles = useProfilesStore.getState().profiles;

      expect(profiles[0].enabled).toBe(false);
      expect(profiles[1].enabled).toBe(false);
    });
  });

  describe('togglePin', () => {
    it('toggles profile pin state', () => {
      const store = useProfilesStore.getState();
      const profile = store.createProfile({
        name: 'Test',
        directories: ['/dir'],
        enabled: true,
      });

      store.togglePin(profile.id);
      expect(useProfilesStore.getState().profiles[0].pinned).toBe(true);

      store.togglePin(profile.id);
      expect(useProfilesStore.getState().profiles[0].pinned).toBe(false);
    });

    it('does not modify other profiles when toggling pin', () => {
      const store = useProfilesStore.getState();
      const profile1 = store.createProfile({
        name: 'Profile 1',
        directories: ['/dir1'],
        enabled: true,
      });
      store.createProfile({
        name: 'Profile 2',
        directories: ['/dir2'],
        enabled: true,
      });

      store.togglePin(profile1.id);
      const profiles = useProfilesStore.getState().profiles;

      expect(profiles[0].pinned).toBe(true);
      expect(profiles[1].pinned).toBeUndefined();
    });
  });

  describe('reorderProfiles', () => {
    it('reorders profiles', () => {
      const store = useProfilesStore.getState();

      const profile1 = store.createProfile({
        name: 'Profile 1',
        directories: ['/dir1'],
        enabled: true,
      });
      const profile2 = store.createProfile({
        name: 'Profile 2',
        directories: ['/dir2'],
        enabled: true,
      });
      const profile3 = store.createProfile({
        name: 'Profile 3',
        directories: ['/dir3'],
        enabled: true,
      });

      // Reorder: 3, 1, 2
      store.reorderProfiles([profile3.id, profile1.id, profile2.id]);
      const profiles = useProfilesStore.getState().profiles;

      expect(profiles[0].order).toBe(0);
      expect(profiles[0].name).toBe('Profile 3');

      expect(profiles[1].order).toBe(1);
      expect(profiles[1].name).toBe('Profile 1');

      expect(profiles[2].order).toBe(2);
      expect(profiles[2].name).toBe('Profile 2');
    });

    it('handles partial reordering', () => {
      const store = useProfilesStore.getState();

      const profile1 = store.createProfile({
        name: 'Profile 1',
        directories: ['/dir1'],
        enabled: true,
      });
      const profile2 = store.createProfile({
        name: 'Profile 2',
        directories: ['/dir2'],
        enabled: true,
      });
      store.createProfile({
        name: 'Profile 3',
        directories: ['/dir3'],
        enabled: true,
      });

      // Only reorder 2 profiles, the third should be added at the end
      store.reorderProfiles([profile2.id, profile1.id]);
      const profiles = useProfilesStore.getState().profiles;

      expect(profiles).toHaveLength(3);
      expect(profiles[0].name).toBe('Profile 2');
      expect(profiles[1].name).toBe('Profile 1');
      expect(profiles[2].name).toBe('Profile 3');
    });
  });
});
