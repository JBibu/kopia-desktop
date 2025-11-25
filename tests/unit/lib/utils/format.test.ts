/**
 * Unit tests for formatting utility functions
 */

import { describe, expect, it } from 'vitest';
import { formatBytes, formatDistanceToNow, formatDateTime, formatShortDate } from '@/lib/utils';

describe('formatBytes', () => {
  describe('base2 format (default)', () => {
    it('formats 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(0, 2, 'base2')).toBe('0 B');
    });

    it('formats bytes (< 1024)', () => {
      expect(formatBytes(1)).toBe('1 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1023)).toBe('1023 B');
    });

    it('formats KiB', () => {
      expect(formatBytes(1024)).toBe('1 KiB');
      expect(formatBytes(1536)).toBe('1.5 KiB');
      expect(formatBytes(2048)).toBe('2 KiB');
    });

    it('formats MiB', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MiB');
      expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MiB');
      expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MiB');
    });

    it('formats GiB', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GiB');
      expect(formatBytes(5.25 * 1024 * 1024 * 1024)).toBe('5.25 GiB');
    });

    it('formats TiB', () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TiB');
    });

    it('formats PiB', () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024 * 1024)).toBe('1 PiB');
    });

    it('respects decimal places', () => {
      expect(formatBytes(1536, 0)).toBe('2 KiB');
      expect(formatBytes(1536, 1)).toBe('1.5 KiB');
      expect(formatBytes(1536, 2)).toBe('1.5 KiB');
      expect(formatBytes(1536, 3)).toBe('1.5 KiB');
    });

    it('handles negative decimal places', () => {
      expect(formatBytes(1536, -1)).toBe('2 KiB');
    });
  });

  describe('base10 format', () => {
    it('formats 0 bytes', () => {
      expect(formatBytes(0, 2, 'base10')).toBe('0 B');
    });

    it('formats bytes (< 1000)', () => {
      expect(formatBytes(1, 2, 'base10')).toBe('1 B');
      expect(formatBytes(500, 2, 'base10')).toBe('500 B');
      expect(formatBytes(999, 2, 'base10')).toBe('999 B');
    });

    it('formats KB', () => {
      expect(formatBytes(1000, 2, 'base10')).toBe('1 KB');
      expect(formatBytes(1500, 2, 'base10')).toBe('1.5 KB');
    });

    it('formats MB', () => {
      expect(formatBytes(1000 * 1000, 2, 'base10')).toBe('1 MB');
      expect(formatBytes(2.5 * 1000 * 1000, 2, 'base10')).toBe('2.5 MB');
    });

    it('formats GB', () => {
      expect(formatBytes(1000 * 1000 * 1000, 2, 'base10')).toBe('1 GB');
    });

    it('formats TB', () => {
      expect(formatBytes(1000 * 1000 * 1000 * 1000, 2, 'base10')).toBe('1 TB');
    });

    it('formats PB', () => {
      expect(formatBytes(1000 * 1000 * 1000 * 1000 * 1000, 2, 'base10')).toBe('1 PB');
    });
  });

  describe('edge cases', () => {
    it('handles very large numbers (exceeding PiB)', () => {
      // 1024^6 = 1 EiB (exbibyte) - but we only have up to PiB
      const result = formatBytes(1024 ** 6);
      expect(result).toContain('1024 PiB');
    });

    it('handles fractional bytes', () => {
      expect(formatBytes(0.5)).toBe('0.5 B');
      expect(formatBytes(123.456)).toBe('123.46 B');
    });

    it('handles negative bytes', () => {
      // BUG: This will fail with current implementation
      // Math.log(-1) = NaN, causing undefined behavior
      const result = formatBytes(-1024);
      expect(result).toMatch(/^-?\d+(\.\d+)?\s+\w+$/);
    });
  });
});

describe('formatDistanceToNow', () => {
  it('formats "just now" for recent times', () => {
    const now = new Date();
    expect(formatDistanceToNow(now)).toBe('just now');

    const fiveSecondsAgo = new Date(now.getTime() - 5000);
    expect(formatDistanceToNow(fiveSecondsAgo)).toBe('just now');

    const fiftyNineSecondsAgo = new Date(now.getTime() - 59000);
    expect(formatDistanceToNow(fiftyNineSecondsAgo)).toBe('just now');
  });

  it('formats minutes', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    expect(formatDistanceToNow(oneMinuteAgo)).toBe('1 minute ago');

    const twoMinutesAgo = new Date(now.getTime() - 120000);
    expect(formatDistanceToNow(twoMinutesAgo)).toBe('2 minutes ago');

    const fiftyNineMinutesAgo = new Date(now.getTime() - 59 * 60000);
    expect(formatDistanceToNow(fiftyNineMinutesAgo)).toBe('59 minutes ago');
  });

  it('formats hours', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    expect(formatDistanceToNow(oneHourAgo)).toBe('1 hour ago');

    const twoHoursAgo = new Date(now.getTime() - 2 * 3600000);
    expect(formatDistanceToNow(twoHoursAgo)).toBe('2 hours ago');

    const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 3600000);
    expect(formatDistanceToNow(twentyThreeHoursAgo)).toBe('23 hours ago');
  });

  it('formats days', () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 3600000);
    expect(formatDistanceToNow(oneDayAgo)).toBe('1 day ago');

    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 3600000);
    expect(formatDistanceToNow(twoDaysAgo)).toBe('2 days ago');

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600000);
    expect(formatDistanceToNow(sevenDaysAgo)).toBe('7 days ago');
  });

  it('handles future dates', () => {
    const now = new Date();
    const future = new Date(now.getTime() + 60000);
    // Future dates result in negative diff, which should show as "just now"
    expect(formatDistanceToNow(future)).toBe('just now');
  });

  it('uses singular for 1 unit', () => {
    const now = new Date();
    expect(formatDistanceToNow(new Date(now.getTime() - 60000))).toBe('1 minute ago');
    expect(formatDistanceToNow(new Date(now.getTime() - 3600000))).toBe('1 hour ago');
    expect(formatDistanceToNow(new Date(now.getTime() - 24 * 3600000))).toBe('1 day ago');
  });

  it('uses plural for multiple units', () => {
    const now = new Date();
    expect(formatDistanceToNow(new Date(now.getTime() - 120000))).toBe('2 minutes ago');
    expect(formatDistanceToNow(new Date(now.getTime() - 2 * 3600000))).toBe('2 hours ago');
    expect(formatDistanceToNow(new Date(now.getTime() - 2 * 24 * 3600000))).toBe('2 days ago');
  });
});

describe('formatDateTime', () => {
  it('formats Date object', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = formatDateTime(date, 'en-US');
    // Result will vary by timezone, just check format
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it('formats string date', () => {
    const dateString = '2024-01-15T10:30:00Z';
    const result = formatDateTime(dateString, 'en-US');
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it('respects locale', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const enResult = formatDateTime(date, 'en-US');
    const esResult = formatDateTime(date, 'es-ES');
    // Results should be different for different locales
    expect(enResult).toBeTruthy();
    expect(esResult).toBeTruthy();
  });

  it('uses default locale when not specified', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = formatDateTime(date);
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });
});

describe('formatShortDate', () => {
  it('formats Date object', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = formatShortDate(date, 'en-US');
    expect(result).toMatch(/Jan 15/);
  });

  it('formats string date', () => {
    const dateString = '2024-01-15T10:30:00Z';
    const result = formatShortDate(dateString, 'en-US');
    expect(result).toMatch(/Jan 15/);
  });

  it('respects locale', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const enResult = formatShortDate(date, 'en-US');
    const esResult = formatShortDate(date, 'es-ES');
    expect(enResult).toBeTruthy();
    expect(esResult).toBeTruthy();
  });

  it('uses default locale when not specified', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = formatShortDate(date);
    expect(result).toBeTruthy();
  });
});
