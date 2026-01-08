export { cn } from './cn';

import type { ByteFormat } from '@/stores/preferences';

/**
 * Format bytes to human-readable string
 * @param bytes Number of bytes
 * @param decimals Number of decimal places (default: 2)
 * @param format 'base2' (KiB, MiB, GiB with 1024) or 'base10' (KB, MB, GB with 1000)
 */
export function formatBytes(bytes: number, decimals = 2, format: ByteFormat = 'base2'): string {
  if (bytes <= 0) return '0 B';

  const k = format === 'base2' ? 1024 : 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes =
    format === 'base2'
      ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
      : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format distance to now (e.g., "2 hours ago", "5 minutes ago")
 */
export function formatDistanceToNow(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

/**
 * Format date/time to localized string
 * Respects user's locale from language store
 */
export function formatDateTime(date: Date | string, locale = 'en-US'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString(locale);
}

/**
 * Format date with short month and day (e.g., "Jan 15")
 */
export function formatShortDate(date: Date | string, locale = 'en-US'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}
