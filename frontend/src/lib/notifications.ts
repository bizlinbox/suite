export interface NotificationPayload {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  conversationId?: string;
  url?: string;
  requireInteraction?: boolean;
}

const STORAGE_KEY = 'bizlinbox:notifications';

export function isNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationsSupported()) return 'denied';
  return Notification.permission;
}

export function areNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'enabled' && getNotificationPermission() === 'granted';
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationsSupported()) return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export function setNotificationsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem(STORAGE_KEY, 'enabled');
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Show a local notification.
 * If the app is in the background, sends to the service worker.
 * If in the foreground, uses the Notification API directly.
 */
export async function showLocalNotification(payload: NotificationPayload): Promise<void> {
  if (!isNotificationsSupported()) return;
  if (getNotificationPermission() !== 'granted') return;
  if (!areNotificationsEnabled()) return;

  const { title, body, icon, tag, conversationId, url, requireInteraction } = payload;

  const options: NotificationOptions = {
    body: body || 'New message',
    tag: tag || 'bizlinbox-message',
    requireInteraction: requireInteraction ?? false,
    data: { conversationId, url } as any,
  };

  // Use the service worker to show the notification so it persists
  // and handles clicks even if the page is closed later
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, options);
}

/**
 * Dismiss all notifications with a given tag.
 */
export async function dismissNotifications(tag?: string): Promise<void> {
  if (!isNotificationsSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const notifications = await registration.getNotifications({ tag });
  notifications.forEach((n) => n.close());
}
