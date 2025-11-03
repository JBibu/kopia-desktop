/**
 * Native desktop notifications using Tauri notification plugin
 */

import {
  isPermissionGranted,
  requestPermission,
  sendNotification as tauriSendNotification,
} from '@tauri-apps/plugin-notification';

/**
 * Check if notification permission is granted
 */
export async function checkNotificationPermission(): Promise<boolean> {
  return await isPermissionGranted();
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const permission = await requestPermission();
  return permission === 'granted';
}

/**
 * Send a native desktop notification
 * Automatically requests permission if not granted
 */
export async function sendDesktopNotification(options: {
  title: string;
  body: string;
  icon?: string;
}): Promise<void> {
  // Check and request permission if needed
  let permissionGranted = await isPermissionGranted();

  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }

  if (!permissionGranted) {
    console.warn('Notification permission not granted');
    return;
  }

  // Send notification
  tauriSendNotification(options);
}

/**
 * Send notification for task completion
 */
export async function notifyTaskComplete(taskType: string, success: boolean): Promise<void> {
  const title = success ? `${taskType} completed` : `${taskType} failed`;
  const body = success
    ? `The ${taskType.toLowerCase()} task has completed successfully.`
    : `The ${taskType.toLowerCase()} task has failed. Check the logs for details.`;

  await sendDesktopNotification({
    title,
    body,
  });
}

/**
 * Send notification for snapshot creation
 */
export async function notifySnapshotCreated(
  source: string,
  stats?: { files?: number; bytes?: number }
): Promise<void> {
  let body = `Snapshot created for ${source}`;

  if (stats?.files && stats?.bytes) {
    const fileCount = stats.files.toLocaleString();
    const sizeGB = (stats.bytes / 1024 / 1024 / 1024).toFixed(2);
    body += `\n${fileCount} files, ${sizeGB} GB`;
  }

  await sendDesktopNotification({
    title: 'Snapshot Created',
    body,
  });
}

/**
 * Send notification for errors
 */
export async function notifyError(title: string, message: string): Promise<void> {
  await sendDesktopNotification({
    title: `Error: ${title}`,
    body: message,
  });
}

/**
 * Send notification for warnings
 */
export async function notifyWarning(title: string, message: string): Promise<void> {
  await sendDesktopNotification({
    title: `Warning: ${title}`,
    body: message,
  });
}
