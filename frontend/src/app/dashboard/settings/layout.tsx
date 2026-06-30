'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can } = usePermission();
  const canManageSettings = can('settings.manage');

  const tabs = [
    { label: 'General', href: '/dashboard/settings/general' },
    { label: 'Labels', href: '/dashboard/settings/labels' },
    { label: 'Notifications', href: '/dashboard/settings/notifications' },
    { label: 'Files', href: '/dashboard/settings/files' },
    { label: 'Integrations', href: '/dashboard/settings/integrations' },
    ...(canManageSettings ? [{ label: 'WABA', href: '/dashboard/waba-accounts' }] : []),
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your organization preferences and integrations</p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-gray-100/50 p-1 dark:border-gray-800 dark:bg-gray-800/50">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${
                active
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
