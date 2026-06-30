'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
const TAB_PATHS = [
  '/dashboard/settings/general',
  '/dashboard/settings/notifications',
  '/dashboard/settings/integrations',
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showTabs = TAB_PATHS.includes(pathname);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your organization preferences and integrations</p>
        </div>
      </div>

      {showTabs && (
        <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-gray-100/50 p-1 dark:border-gray-800 dark:bg-gray-800/50">
          {TAB_PATHS.map((href) => {
            const label = href.split('/').pop()!.replace(/^\w/, (c) => c.toUpperCase());
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}

      {children}
    </div>
  );
}
