'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileBottomNav from '@/components/MobileBottomNav';
import { WabaProvider } from '@/context/WabaContext';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import NotificationManager from '@/components/NotificationManager';
import { Menu } from 'lucide-react';

const DRAWER_WIDTH = 256;

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin } = usePermission();

  const isInbox = pathname === '/dashboard/inbox' || pathname.startsWith('/dashboard/inbox/');

  const handleMobileClose = () => setMobileOpen(false);
  const handleDesktopToggle = () => {
    if (isInbox) {
      setCollapsed((prev) => !prev);
    } else {
      setDesktopOpen((prev) => !prev);
    }
  };

  const wabaAccounts = useMemo(() => user?.wabaAccounts || [], [user?.wabaAccounts]);
  const noWaba = !loading && wabaAccounts.length === 0;

  useEffect(() => {
    if (noWaba && isAdmin && pathname !== '/dashboard/waba-accounts') {
      router.replace('/dashboard/waba-accounts');
    }
  }, [noWaba, isAdmin, pathname, router]);

  // Auto-collapse on inbox page, restore on leave
  useEffect(() => {
    if (isInbox) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
      setDesktopOpen(true);
    }
  }, [isInbox]);

  // Auth guard: show loading while fetching user, don't render if unauthenticated
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-xl border-4 border-gray-200 border-t-primary-700 dark:border-gray-800" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <WabaProvider wabaAccounts={wabaAccounts}>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="fixed left-4 top-4 z-40 rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} className="text-gray-700 dark:text-gray-200" />
        </button>

        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={handleMobileClose}
          onDesktopToggle={handleDesktopToggle}
          desktopOpen={desktopOpen}
          collapsed={isInbox ? collapsed : false}
        />
        <main
          className={`flex-1 overflow-x-hidden p-4 pb-20 transition-[margin,width] duration-300 ease-out sm:p-5 sm:pb-20 md:p-6 md:pb-6 ${
            isInbox
              ? collapsed
                ? 'md:ml-16'
                : 'md:ml-[256px]'
              : desktopOpen
                ? 'md:ml-[256px]'
                : 'md:ml-0'
          }`}
        >
          {noWaba && !isAdmin ? (
            <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
              <div className="panel max-w-md p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  WhatsApp Business Account Required
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No WhatsApp Business Account (WABA) has been configured for your organization yet.
                  Please contact your admin to set one up.
                </p>
              </div>
            </div>
          ) : (
            <div className={isInbox ? '' : 'mx-auto max-w-7xl'}>{children}</div>
          )}
        </main>

        <MobileBottomNav />
        <NotificationManager />
      </div>
    </WabaProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutInner>{children}</DashboardLayoutInner>;
}
