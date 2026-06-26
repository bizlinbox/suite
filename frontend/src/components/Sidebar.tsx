'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Building2,
  Check,
  GitBranch,
  Shield,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWaba } from '@/context/WabaContext';

const DRAWER_WIDTH = 256;

const allNavItems = [
  { label: 'Inbox', href: '/dashboard/inbox', icon: MessageSquare, permission: 'conversations.read' as string | null },
  { label: 'Contacts', href: '/dashboard/contacts', icon: Users, permission: 'contacts.read' as string | null },
  { label: 'Users', href: '/dashboard/users', icon: Users, permission: 'users.read' as string | null },
  { label: 'Roles', href: '/dashboard/roles', icon: Shield, permission: 'roles.read' as string | null },
  { label: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone, permission: 'campaigns.read' as string | null },
  { label: 'Automations', href: '/dashboard/automations', icon: GitBranch, permission: 'automations.read' as string | null },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, permission: 'analytics.read' as string | null },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, permission: 'settings.read' as string | null },
];

function isActiveNav(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  const nested = ['/dashboard/inbox', '/dashboard/users', '/dashboard/campaigns', '/dashboard/automations', '/dashboard/settings'];
  if (nested.some((p) => href === p && pathname.startsWith(p))) return true;
  return false;
}

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  onDesktopToggle?: () => void;
  desktopOpen?: boolean;
}

function WabaSwitcher() {
  const { user } = useAuth();
  const { selectedWabaId, setSelectedWabaId } = useWaba();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const wabaAccounts = user?.wabaAccounts || [];
  const selectedWaba = wabaAccounts.find((w) => w.id === selectedWabaId);

  if (wabaAccounts.length === 0) return null;

  return (
    <div className="relative px-3 pb-3" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-blue-800/40 bg-blue-900/40 px-3 py-2.5 text-sm text-blue-100 hover:border-blue-700 hover:bg-blue-800/50"
        aria-label="Select WABA account"
      >
        <Building2 size={16} className="shrink-0 text-blue-400" />
        <span className="flex-1 truncate text-left font-medium">{selectedWaba?.name || 'Select WABA'}</span>
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-14 z-50 rounded-xl border border-blue-800/40 bg-[#0f172a] shadow-lg ring-1 ring-black/5">
          <div className="px-1 py-1">
            {wabaAccounts.map((waba) => (
              <button
                key={waba.id}
                onClick={() => {
                  setSelectedWabaId(waba.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  waba.id === selectedWabaId
                    ? 'bg-blue-800 text-white'
                    : 'text-blue-200 hover:bg-blue-800/40 hover:text-white'
                }`}
              >
                <Building2 size={16} className="shrink-0 text-blue-400" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{waba.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">{waba.businessAccountId}</div>
                </div>
                {waba.id === selectedWabaId && (
                  <Check size={16} className="shrink-0 text-white" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ mobileOpen, onMobileClose, onDesktopToggle, desktopOpen = true }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = allNavItems.filter((item) => {
    if (!item.permission) return true;
    const perms = user?.permissions || [];
    return perms.includes(item.permission);
  });

  const drawerContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3.5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700 text-white">
            <MessageSquare size={18} />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">BizlInbox</span>
        </Link>
        <div className="flex items-center gap-1">
          {onDesktopToggle && (
            <button
              onClick={onDesktopToggle}
              className="hidden rounded-md p-1.5 text-blue-400 hover:bg-blue-800/40 hover:text-white md:block"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {mobileOpen && (
            <button
              onClick={onMobileClose}
              className="rounded-md p-1.5 text-blue-400 hover:bg-blue-800/40 hover:text-white md:hidden"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <WabaSwitcher />

      <div className="mx-3 mb-2 h-px bg-blue-800/40" />

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {navItems.map((item) => {
          const active = isActiveNav(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-800 text-white'
                  : 'text-blue-200 hover:bg-blue-800/40 hover:text-white'
              }`}
            >
              <Icon
                size={18}
                className={`shrink-0 transition-colors ${
                  active
                    ? 'text-white'
                    : 'text-blue-400 group-hover:text-white'
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3">
        <div className="rounded-lg border border-blue-800/40 bg-blue-900/40 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-xs font-semibold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-white">{user?.name}</div>
              <div className="truncate text-[10px] text-blue-300">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-red-300 transition-colors hover:bg-red-900/20"
          >
            <LogOut size={12} />
            Log out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed left-0 top-0 z-50 h-full bg-[#0f172a] shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: DRAWER_WIDTH }}
      >
        {drawerContent}
      </div>

      {/* Desktop drawer */}
      <div
        className={`fixed left-0 top-0 z-30 hidden h-full border-r border-blue-800/30 bg-[#0f172a] transition-[width] duration-300 ease-out md:block ${
          desktopOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: DRAWER_WIDTH }}
      >
        {drawerContent}
      </div>

      {/* Desktop expand button */}
      {!desktopOpen && onDesktopToggle && (
        <button
          onClick={onDesktopToggle}
          className="fixed left-4 top-4 z-30 hidden items-center gap-2 rounded-lg border border-blue-800/40 bg-[#0f172a] px-3 py-2 text-sm font-medium text-blue-200 shadow-sm hover:bg-blue-900/60 md:flex"
          aria-label="Expand sidebar"
        >
          <ChevronRight size={16} />
          Menu
        </button>
      )}
    </>
  );
}
