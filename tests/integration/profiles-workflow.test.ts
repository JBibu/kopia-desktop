/**
 * Integration tests for Profile workflows
 *
 * These tests verify complete user workflows involving profiles,
 * testing the interaction between store actions and state updates.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useProfilesStore } from '@/stores/profiles';

// Mock uuid
let uuidCounter = 0;
vi.mock('uuid', () => ({
  v4: (): string => `test-uuid-${uuidCounter++}`,
}));

describe('Profile Workflows (Integration)', () => {
  beforeEach(() => {
    // Reset store and counter
    useProfilesStore.setState({ profiles: [] });
    uuidCounter = 0;
  });

  describe('Complete backup profile lifecycle', () => {
    it('creates, edits, uses, and deletes a profile', async () => {
      const store = useProfilesStore.getState();

      // 1. User creates a new profile
      const profile = store.createProfile({
        name: 'Documents Backup',
        description: 'Daily backup of documents folder',
        directories: ['/home/user/documents'],
        enabled: true,
      });

      expect(profile.id).toBe('test-uuid-0');
      expect(useProfilesStore.getState().profiles).toHaveLength(1);

      // 2. User adds more directories to the profile via updateProfile
      store.updateProfile(profile.id, {
        directories: ['/home/user/documents', '/home/user/pictures', '/home/user/videos'],
      });

      const updated = useProfilesStore.getState().profiles[0];
      expect(updated.directories).toHaveLength(3);

      // 3. User realizes videos folder is too large, removes it
      store.updateProfile(profile.id, {
        directories: ['/home/user/documents', '/home/user/pictures'],
      });
      const afterRemoval = useProfilesStore.getState().profiles[0];
      expect(afterRemoval.directories).toHaveLength(2);

      // 4. User updates profile settings
      await new Promise((resolve) => setTimeout(resolve, 10));
      store.updateProfile(profile.id, {
        name: 'Important Documents',
        description: 'Critical documents and photos',
        enabled: false, // Temporarily disable
      });

      const afterUpdate = useProfilesStore.getState().profiles[0];
      expect(afterUpdate.name).toBe('Important Documents');
      expect(afterUpdate.enabled).toBe(false);
      expect(afterUpdate.updatedAt).not.toBe(profile.updatedAt);

      // 5. User re-enables the profile
      store.updateProfile(profile.id, { enabled: true });
      expect(useProfilesStore.getState().profiles[0].enabled).toBe(true);

      // 6. User pins the profile as favorite
      store.togglePin(profile.id);
      expect(useProfilesStore.getState().profiles[0].pinned).toBe(true);

      // 7. User eventually deletes the profile
      store.deleteProfile(profile.id);
      expect(useProfilesStore.getState().profiles).toHaveLength(0);
    });

    it('manages multiple profiles with different priorities', () => {
      const store = useProfilesStore.getState();

      // User creates multiple profiles
      const work = store.createProfile({
        name: 'Work Files',
        directories: ['/home/user/work'],
        enabled: true,
      });

      const personal = store.createProfile({
        name: 'Personal Files',
        directories: ['/home/user/personal'],
        enabled: true,
      });

      const archive = store.createProfile({
        name: 'Archive',
        directories: ['/mnt/archive'],
        enabled: false, // Not active yet
      });

      expect(useProfilesStore.getState().profiles).toHaveLength(3);

      // User pins important profiles
      store.togglePin(work.id);
      store.togglePin(personal.id);

      const profiles = useProfilesStore.getState().profiles;
      expect(profiles.find((p) => p.id === work.id)?.pinned).toBe(true);
      expect(profiles.find((p) => p.id === personal.id)?.pinned).toBe(true);
      expect(profiles.find((p) => p.id === archive.id)?.pinned).toBeUndefined();

      // User reorders profiles by priority
      store.reorderProfiles([work.id, personal.id, archive.id]);

      const reordered = useProfilesStore.getState().profiles;
      expect(reordered[0].name).toBe('Work Files');
      expect(reordered[1].name).toBe('Personal Files');
      expect(reordered[2].name).toBe('Archive');
      expect(reordered[0].order).toBe(0);
      expect(reordered[1].order).toBe(1);
      expect(reordered[2].order).toBe(2);
    });
  });

  describe('Profile state consistency', () => {
    it('maintains profile isolation when operating on one profile', () => {
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

      const initialProfile2 = { ...useProfilesStore.getState().profiles[1] };

      // Modify profile1 extensively
      store.updateProfile(profile1.id, {
        directories: ['/dir1', '/dir1a', '/dir1b'],
        enabled: false,
        name: 'Modified Profile 1',
      });
      store.togglePin(profile1.id);

      // Profile2 should be completely unchanged
      const finalProfile2 = useProfilesStore.getState().profiles[1];
      expect(finalProfile2.name).toBe(initialProfile2.name);
      expect(finalProfile2.directories).toEqual(initialProfile2.directories);
      expect(finalProfile2.enabled).toBe(initialProfile2.enabled);
      expect(finalProfile2.pinned).toBe(initialProfile2.pinned);
    });

    it('updates timestamps correctly across operations', async () => {
      const store = useProfilesStore.getState();
      const profile = store.createProfile({
        name: 'Test',
        directories: ['/dir'],
        enabled: true,
      });

      const createdAt = profile.createdAt;
      const initialUpdatedAt = profile.updatedAt;

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Each operation should update the timestamp
      store.updateProfile(profile.id, { directories: ['/dir', '/dir2'] });
      const afterAdd = useProfilesStore.getState().profiles[0];
      expect(afterAdd.updatedAt).not.toBe(initialUpdatedAt);
      expect(afterAdd.createdAt).toBe(createdAt); // createdAt never changes

      await new Promise((resolve) => setTimeout(resolve, 10));
      store.updateProfile(profile.id, { enabled: false });
      const afterToggle = useProfilesStore.getState().profiles[0];
      expect(afterToggle.updatedAt).not.toBe(afterAdd.updatedAt);

      await new Promise((resolve) => setTimeout(resolve, 10));
      store.updateProfile(profile.id, { name: 'Updated' });
      const afterUpdate = useProfilesStore.getState().profiles[0];
      expect(afterUpdate.updatedAt).not.toBe(afterToggle.updatedAt);
    });
  });

  describe('Reordering workflows', () => {
    it('handles complex reordering scenarios', () => {
      const store = useProfilesStore.getState();

      // Create profiles in initial order
      const p1 = store.createProfile({ name: 'First', directories: ['/1'], enabled: true });
      const p2 = store.createProfile({ name: 'Second', directories: ['/2'], enabled: true });
      const p3 = store.createProfile({ name: 'Third', directories: ['/3'], enabled: true });
      const p4 = store.createProfile({ name: 'Fourth', directories: ['/4'], enabled: true });

      // User reorders: 3, 1, 4, 2
      store.reorderProfiles([p3.id, p1.id, p4.id, p2.id]);

      const profiles = useProfilesStore.getState().profiles;
      expect(profiles[0].name).toBe('Third');
      expect(profiles[1].name).toBe('First');
      expect(profiles[2].name).toBe('Fourth');
      expect(profiles[3].name).toBe('Second');

      // Orders should be sequential
      expect(profiles[0].order).toBe(0);
      expect(profiles[1].order).toBe(1);
      expect(profiles[2].order).toBe(2);
      expect(profiles[3].order).toBe(3);
    });

    it('preserves profile properties during reordering', () => {
      const store = useProfilesStore.getState();

      const p1 = store.createProfile({
        name: 'Profile 1',
        description: 'Description 1',
        directories: ['/dir1', '/dir2'],
        enabled: true,
      });

      const p2 = store.createProfile({
        name: 'Profile 2',
        description: 'Description 2',
        directories: ['/dir3'],
        enabled: false,
      });

      // Pin first profile
      store.togglePin(p1.id);

      // Reorder
      store.reorderProfiles([p2.id, p1.id]);

      const profiles = useProfilesStore.getState().profiles;

      // Check first profile (was p2)
      expect(profiles[0].name).toBe('Profile 2');
      expect(profiles[0].description).toBe('Description 2');
      expect(profiles[0].directories).toEqual(['/dir3']);
      expect(profiles[0].enabled).toBe(false);
      expect(profiles[0].pinned).toBeUndefined();

      // Check second profile (was p1)
      expect(profiles[1].name).toBe('Profile 1');
      expect(profiles[1].description).toBe('Description 1');
      expect(profiles[1].directories).toEqual(['/dir1', '/dir2']);
      expect(profiles[1].enabled).toBe(true);
      expect(profiles[1].pinned).toBe(true); // Pin preserved!
    });
  });
});
