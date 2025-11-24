/**
 * Integration tests for formatting utilities
 *
 * These tests verify that formatting utilities work correctly together
 * and handle real-world data scenarios.
 */

import { describe, expect, it } from 'vitest';
import { formatBytes, formatDistanceToNow, formatDateTime, formatShortDate } from '@/lib/utils';

describe('Formatting Integration', () => {
  describe('Snapshot size display scenarios', () => {
    it('formats various snapshot sizes consistently', () => {
      // Real-world snapshot sizes
      const sizes = {
        tiny: 1024, // 1 KiB - small config file
        small: 1024 * 1024 * 5, // 5 MiB - small document backup
        medium: 1024 * 1024 * 1024 * 2.5, // 2.5 GiB - photos backup
        large: 1024 * 1024 * 1024 * 500, // 500 GiB - full system backup
        huge: 1024 * 1024 * 1024 * 1024 * 2, // 2 TiB - archive
      };

      // Base-2 formatting (default)
      // Note: parseFloat removes trailing zeros
      expect(formatBytes(sizes.tiny)).toBe('1 KiB');
      expect(formatBytes(sizes.small)).toBe('5 MiB');
      expect(formatBytes(sizes.medium)).toBe('2.5 GiB');
      expect(formatBytes(sizes.large)).toBe('500 GiB');
      expect(formatBytes(sizes.huge)).toBe('2 TiB');

      // Base-10 formatting (user preference)
      expect(formatBytes(sizes.tiny, 2, 'base10')).toBe('1.02 KB');
      expect(formatBytes(sizes.small, 2, 'base10')).toBe('5.24 MB');
      expect(formatBytes(sizes.medium, 2, 'base10')).toBe('2.68 GB');
      expect(formatBytes(sizes.large, 2, 'base10')).toBe('536.87 GB');
      expect(formatBytes(sizes.huge, 2, 'base10')).toBe('2.2 TB'); // parseFloat removes trailing zero
    });

    it('handles incremental backup size display', () => {
      const fullBackup = 1024 * 1024 * 1024 * 100; // 100 GiB
      const increment1 = 1024 * 1024 * 50; // 50 MiB added
      const increment2 = 1024 * 1024 * 120; // 120 MiB added
      const increment3 = 1024 * 1024 * 5; // 5 MiB added

      // Show progression
      const sizes = [fullBackup, increment1, increment2, increment3];
      const formatted = sizes.map((s) => formatBytes(s, 2));

      expect(formatted).toEqual(['100 GiB', '50 MiB', '120 MiB', '5 MiB']);
    });

    it('compares sizes in different formats side by side', () => {
      const size = 1024 * 1024 * 1024 * 10; // 10 GiB

      // User might see both formats in different contexts
      const base2 = formatBytes(size, 2, 'base2');
      const base10 = formatBytes(size, 2, 'base10');

      expect(base2).toBe('10 GiB');
      expect(base10).toBe('10.74 GB');

      // Base10 is always larger for the same binary size
      expect(parseFloat(base10)).toBeGreaterThan(parseFloat(base2));
    });
  });

  describe('Snapshot timestamp display scenarios', () => {
    it('shows backup timeline with consistent formatting', () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // All should produce valid relative times
      const relative = [
        formatDistanceToNow(hourAgo),
        formatDistanceToNow(dayAgo),
        formatDistanceToNow(weekAgo),
        formatDistanceToNow(monthAgo),
      ];

      relative.forEach((r) => {
        expect(r).toBeTruthy();
        expect(r).toContain('ago');
      });
    });

    it('formats snapshot list with mixed timestamp formats', () => {
      const snapshots = [
        { time: new Date('2024-01-15T10:30:00Z'), size: 1024 * 1024 * 1024 * 5 },
        { time: new Date('2024-02-20T14:45:00Z'), size: 1024 * 1024 * 1024 * 5.2 },
        { time: new Date('2024-03-10T09:15:00Z'), size: 1024 * 1024 * 1024 * 5.5 },
      ];

      // Format for snapshot list view
      const formatted = snapshots.map((s) => ({
        shortDate: formatShortDate(s.time),
        fullDate: formatDateTime(s.time),
        relative: formatDistanceToNow(s.time),
        size: formatBytes(s.size),
      }));

      formatted.forEach((f) => {
        // formatShortDate returns "Jan 15" format, not ISO
        expect(f.shortDate).toBeTruthy();
        expect(f.fullDate).toBeTruthy();
        expect(f.relative).toContain('ago');
        expect(f.size).toContain('GiB');
      });
    });
  });

  describe('Error message formatting', () => {
    it('formats error with size information', () => {
      const tooLargeSize = 1024 * 1024 * 1024 * 1024 * 10; // 10 TiB
      const maxSize = 1024 * 1024 * 1024 * 1024 * 5; // 5 TiB

      const error = `File size ${formatBytes(tooLargeSize)} exceeds maximum ${formatBytes(maxSize)}`;
      expect(error).toBe('File size 10 TiB exceeds maximum 5 TiB');
    });

    it('formats success message with time and size', () => {
      const size = 1024 * 1024 * 1024 * 2.5; // 2.5 GiB
      const completedAt = new Date();

      const message = `Backup completed: ${formatBytes(size)} backed up ${formatDistanceToNow(completedAt)}`;
      expect(message).toContain('2.5 GiB');
      expect(message).toContain('backed up');
    });
  });

  describe('Dashboard summary scenarios', () => {
    it('formats repository statistics', () => {
      const stats = {
        totalSize: 1024 * 1024 * 1024 * 1024 * 1.5, // 1.5 TiB total
        snapshotCount: 42,
        lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        oldestBackup: new Date('2023-01-01T00:00:00Z'),
      };

      const formatted = {
        size: formatBytes(stats.totalSize),
        count: stats.snapshotCount,
        lastBackup: formatDistanceToNow(stats.lastBackup),
        oldestBackup: formatShortDate(stats.oldestBackup),
      };

      expect(formatted.size).toBe('1.5 TiB');
      expect(formatted.count).toBe(42);
      expect(formatted.lastBackup).toContain('hours ago');
      expect(formatted.oldestBackup).toBe('Jan 1'); // Short format, not ISO
    });

    it('formats comparison between two snapshots', () => {
      const snapshot1 = {
        time: new Date('2024-01-01T00:00:00Z'),
        size: 1024 * 1024 * 1024 * 10, // 10 GiB
      };

      const snapshot2 = {
        time: new Date('2024-01-02T00:00:00Z'),
        size: 1024 * 1024 * 1024 * 10.5, // 10.5 GiB
      };

      const diff = snapshot2.size - snapshot1.size;

      const comparison = {
        snapshot1: {
          date: formatShortDate(snapshot1.time),
          size: formatBytes(snapshot1.size),
        },
        snapshot2: {
          date: formatShortDate(snapshot2.time),
          size: formatBytes(snapshot2.size),
        },
        difference: formatBytes(diff),
      };

      expect(comparison.snapshot1.date).toBe('Jan 1');
      expect(comparison.snapshot1.size).toBe('10 GiB');
      expect(comparison.snapshot2.date).toBe('Jan 2');
      expect(comparison.snapshot2.size).toBe('10.5 GiB');
      expect(comparison.difference).toBe('512 MiB');
    });
  });

  describe('Precision and rounding consistency', () => {
    it('maintains precision across different size ranges', () => {
      const sizes = [
        1024 * 1.5, // 1.5 KiB
        1024 * 1024 * 1.5, // 1.5 MiB
        1024 * 1024 * 1024 * 1.5, // 1.5 GiB
        1024 * 1024 * 1024 * 1024 * 1.5, // 1.5 TiB
      ];

      // All should maintain same decimal value (1.5)
      const formatted = sizes.map((s) => formatBytes(s, 2));
      formatted.forEach((f) => {
        expect(f).toMatch(/1\.5\s/); // 1.5 followed by space
      });
    });

    it('handles different decimal precision consistently', () => {
      const size = 1024 * 1024 * 1024 * 1.23456789;

      expect(formatBytes(size, 0)).toBe('1 GiB');
      expect(formatBytes(size, 1)).toBe('1.2 GiB');
      expect(formatBytes(size, 2)).toBe('1.23 GiB');
      expect(formatBytes(size, 3)).toBe('1.235 GiB');
      expect(formatBytes(size, 4)).toBe('1.2346 GiB');
    });
  });

  describe('Locale-independent formatting', () => {
    it('formats dates consistently', () => {
      const date = new Date('2024-03-15T10:30:45Z');

      // formatShortDate returns "Mar 15" format (localized short)
      const short = formatShortDate(date);
      expect(short).toBeTruthy();
      expect(short).toContain('Mar');
    });

    it('byte sizes use periods not commas for decimals', () => {
      const size = 1024 * 1024 * 1024 * 1.5;

      const formatted = formatBytes(size, 2);
      expect(formatted).toContain('1.5');
      expect(formatted).not.toContain('1,5'); // No European format
    });
  });
});
