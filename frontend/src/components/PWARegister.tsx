'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, X, WifiOff, Wifi } from 'lucide-react';

export default function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineToast, setShowOfflineToast] = useState(false);
  const [showOnlineToast, setShowOnlineToast] = useState(false);

  // Register service worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        setSwRegistration(reg);

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });

        // Check for existing waiting worker
        if (reg.waiting && navigator.serviceWorker.controller) {
          setUpdateAvailable(true);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('SW registration failed:', err);
      }
    };

    register();
  }, []);

  // Handle beforeinstallprompt
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    window.addEventListener('appinstalled', () => {
      setInstallPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Online / offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineToast(true);
      setTimeout(() => setShowOfflineToast(false), 4000);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineToast(true);
      setTimeout(() => setShowOnlineToast(false), 3000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  const handleUpdate = useCallback(() => {
    if (!swRegistration?.waiting) return;
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    setUpdateAvailable(false);
    window.location.reload();
  }, [swRegistration]);

  const dismissInstall = useCallback(() => {
    setInstallPrompt(null);
  }, []);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return (
    <>
      {/* Install prompt banner */}
      {installPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-sm rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900 md:bottom-6 md:left-auto md:right-6 md:w-auto">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <Download size={20} className="text-primary-700 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Install BizlInbox</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Add to your home screen for quick access and offline support.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleInstall}
                  className="rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#128C7E]"
                >
                  Install
                </button>
                <button
                  onClick={dismissInstall}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={dismissInstall}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Update available toast */}
      {updateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-sm rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-lg dark:border-blue-900/30 dark:bg-blue-900/20 md:bottom-6 md:left-auto md:right-6">
          <div className="flex items-center gap-3">
            <p className="flex-1 text-xs font-medium text-blue-800 dark:text-blue-300">
              A new version is available.
            </p>
            <button
              onClick={handleUpdate}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              Reload
            </button>
            <button
              onClick={dismissUpdate}
              className="rounded-md p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-800/40"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Offline toast */}
      {showOfflineToast && (
        <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-xs font-medium text-white shadow-lg dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <WifiOff size={14} />
            <span>You are offline</span>
          </div>
        </div>
      )}

      {/* Online restored toast */}
      {showOnlineToast && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-green-500 px-4 py-1 text-center text-[11px] font-medium text-white">
          <div className="flex items-center justify-center gap-1.5">
            <Wifi size={12} />
            <span>Back online</span>
          </div>
        </div>
      )}
    </>
  );
}
