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
