export { cn } from './cn';

export type ByteFormat = 'base2' | 'base10';

/**
 * Format bytes to human-readable string
 * @param bytes Number of bytes
 * @param decimals Number of decimal places (default: 2)
 * @param format 'base2' (KiB, MiB, GiB with 1024) or 'base10' (KB, MB, GB with 1000)
 */
export function formatBytes(bytes: number, decimals = 2, format: ByteFormat = 'base2'): string {
  if (bytes === 0) return '0 B';

  const k = format === 'base2' ? 1024 : 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes =
    format === 'base2'
      ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
      : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  // Handle negative bytes
  const absBytes = Math.abs(bytes);
  const sign = bytes < 0 ? '-' : '';

  // Calculate the appropriate size index
  const i = Math.floor(Math.log(absBytes) / Math.log(k));

  // Clamp i to valid array bounds (0 to sizes.length - 1)
  const safeIndex = Math.min(Math.max(0, i), sizes.length - 1);

  return `${sign}${parseFloat((absBytes / Math.pow(k, safeIndex)).toFixed(dm))} ${sizes[safeIndex]}`;
}

/**
 * Format distance to now (e.g., "2 hours ago", "5 minutes ago")
 */
export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
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
