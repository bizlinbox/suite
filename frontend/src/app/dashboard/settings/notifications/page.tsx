'use client';

import { useEffect, useState, useCallback } from 'react';
import { LuBell as Bell, LuBellOff as BellOff, LuCheck as Check, LuTriangleAlert as AlertTriangle } from 'react-icons/lu';
import {
  isNotificationsSupported,
  getNotificationPermission,
  requestNotificationPermission,
  areNotificationsEnabled,
  setNotificationsEnabled,
} from '@/lib/notifications';

export default function NotificationsSettingsPage() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSupported(isNotificationsSupported());
    setPermission(getNotificationPermission());
    setEnabled(areNotificationsEnabled());
  }, []);

  const handleToggle = useCallback(async () => {
    if (!supported) return;

    setLoading(true);
    try {
      if (enabled) {
        // Disable
        setNotificationsEnabled(false);
        setEnabled(false);
      } else {
        // Enable: request permission if needed
        const current = getNotificationPermission();
        if (current !== 'granted') {
          const result = await requestNotificationPermission();
          setPermission(result);
          if (result !== 'granted') {
            setLoading(false);
            return;
          }
        }
        setNotificationsEnabled(true);
        setEnabled(true);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, supported]);

  if (!supported) {
    return (
      <div className="panel">
        <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/20">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Notifications Not Supported
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Your browser does not support push notifications. Try using a modern browser or installing the app as a PWA.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Push Notifications</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Receive real-time notifications for new WhatsApp messages even when BizlInbox is running in the background.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              enabled
                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {enabled ? <Bell size={20} /> : <BellOff size={20} />}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {enabled ? 'Notifications enabled' : 'Notifications disabled'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {permission === 'granted'
                ? 'Browser permission granted'
                : permission === 'denied'
                  ? 'Browser permission denied — enable in browser settings'
                  : 'Waiting for permission'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={loading || permission === 'denied'}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
            enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
          } ${(loading || permission === 'denied') ? 'cursor-not-allowed opacity-50' : ''}`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {permission === 'denied' && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/20">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Permission blocked</p>
            <p className="mt-0.5 text-sm text-red-700 dark:text-red-400">
              Notifications are blocked in your browser settings. Please unblock BizlInbox to enable push notifications.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">What you will receive</h3>
        <ul className="space-y-2">
          {[
            'New incoming WhatsApp messages',
            'Conversation updates when assigned to you',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Check size={16} className="shrink-0 text-green-600 dark:text-green-400" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
