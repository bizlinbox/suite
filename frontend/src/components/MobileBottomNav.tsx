'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Users, Megaphone } from 'lucide-react';

const bottomNavItems = [
  { label: 'Inbox', href: '/dashboard/inbox', icon: MessageSquare },
  { label: 'Contacts', href: '/dashboard/contacts', icon: Users },
  { label: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
];

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === '/dashboard/inbox') return pathname.startsWith('/dashboard/inbox');
  if (href === '/dashboard/campaigns') return pathname.startsWith('/dashboard/campaigns');
  return false;
}

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/90 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/90 md:hidden">
      <div className="flex items-center justify-around">
        {bottomNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors ${
                active
                  ? 'text-primary-700 dark:text-primary-400'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for notched devices */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
