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
  return typeof window !== 'undefined' && 'Notification' in window;
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
 * Show a local notification using the standard Notification API.
 */
export async function showLocalNotification(payload: NotificationPayload): Promise<void> {
  if (!isNotificationsSupported()) return;
  if (getNotificationPermission() !== 'granted') return;
  if (!areNotificationsEnabled()) return;

  const { title, body, tag, requireInteraction } = payload;

  new Notification(title, {
    body: body || 'New message',
    tag: tag || 'bizlinbox-message',
    requireInteraction: requireInteraction ?? false,
  });
}

/**
 * Dismiss all notifications with a given tag.
 */
export async function dismissNotifications(tag?: string): Promise<void> {
  if (!isNotificationsSupported()) return;
  const notifications = await (navigator as any).getNotifications?.({ tag });
  if (!notifications) return;
  notifications.forEach((n: Notification) => n.close());
}
