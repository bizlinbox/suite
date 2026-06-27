'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Building2,
  Check,
  GitBranch,
  Shield,
  X,
  LogOut,
  Plug,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWaba } from '@/context/WabaContext';
import { useTheme } from '@/components/ThemeProvider';

const DRAWER_WIDTH = 256;

const allNavItems = [
  { label: 'Inbox', href: '/dashboard/inbox', icon: MessageSquare, permission: 'conversations.read' as string | null },
  { label: 'Contacts', href: '/dashboard/contacts', icon: Users, permission: 'contacts.read' as string | null },
  { label: 'Users', href: '/dashboard/users', icon: Users, permission: 'users.read' as string | null },
  { label: 'Roles', href: '/dashboard/roles', icon: Shield, permission: 'roles.read' as string | null },
  { label: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone, permission: 'campaigns.read' as string | null },
  { label: 'Automations', href: '/dashboard/automations', icon: GitBranch, permission: 'automations.read' as string | null },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, permission: 'analytics.read' as string | null },
  { label: 'Quick Replies', href: '/dashboard/quick-replies', icon: MessageSquare, permission: 'settings.read' as string | null },
  { label: 'WABA Accounts', href: '/dashboard/waba-accounts', icon: Plug, permission: 'settings.manage' as string | null },
];

function isActiveNav(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  const nested = ['/dashboard/inbox', '/dashboard/users', '/dashboard/campaigns', '/dashboard/automations', '/dashboard/quick-replies', '/dashboard/waba-accounts'];
  if (nested.some((p) => href === p && pathname.startsWith(p))) return true;
  return false;
}

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  onDesktopToggle?: () => void;
  desktopOpen?: boolean;
  collapsed?: boolean;
}

function WabaSwitcher({ collapsed }: { collapsed: boolean }) {
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
    <div className={`relative pb-3 ${collapsed ? 'px-2' : 'px-3'}`} ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center rounded-lg border border-blue-800/40 bg-blue-900/40 text-blue-100 hover:border-blue-700 hover:bg-blue-800/50 ${
          collapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-3 py-2.5'
        }`}
        aria-label="Select WABA account"
        title={selectedWaba?.name || 'Select WABA'}
      >
        <Building2 size={16} className="shrink-0 text-blue-400" />
        {!collapsed && (
          <span className="flex-1 truncate text-left text-sm font-medium">{selectedWaba?.name || 'Select WABA'}</span>
        )}
      </button>

      {open && (
        <div className={`absolute z-50 rounded-xl border border-blue-800/40 bg-[#0f172a] shadow-lg ring-1 ring-black/5 ${
          collapsed ? 'left-14 top-0 w-56' : 'left-3 right-3 top-14'
        }`}>
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
                <span className="flex-1 truncate font-medium">{waba.name}</span>
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

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`flex w-full items-center rounded-lg border border-blue-800/40 bg-blue-900/40 text-blue-200 transition-colors hover:bg-blue-800/50 hover:text-white ${
        collapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-3 py-2'
      }`}
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? <Sun size={16} className="shrink-0 text-blue-400" /> : <Moon size={16} className="shrink-0 text-blue-400" />}
      {!collapsed && <span className="text-sm font-medium">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}

export default function Sidebar({ mobileOpen, onMobileClose, onDesktopToggle, desktopOpen = true, collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = allNavItems.filter((item) => {
    if (!item.permission) return true;
    const perms = user?.permissions || [];
    return perms.includes(item.permission);
  });

  const sidebarWidth = collapsed ? 64 : DRAWER_WIDTH;

  const drawerContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className={`flex items-center py-3.5 ${collapsed ? 'justify-between px-1.5' : 'justify-between px-4'}`}>
        <Link href="/dashboard" className={`flex items-center ${collapsed ? 'gap-0' : 'gap-2.5'}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-700 text-white">
            <MessageSquare size={18} />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-white">BizlInbox</span>
          )}
        </Link>
        <div className="flex items-center gap-1">
          {onDesktopToggle && (
            <button
              onClick={onDesktopToggle}
              className="hidden rounded-md p-1 text-blue-400 hover:bg-blue-800/40 hover:text-white md:block"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}
          {!collapsed && mobileOpen && (
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

      <WabaSwitcher collapsed={collapsed} />

      <div className={`mb-2 h-px bg-blue-800/40 ${collapsed ? 'mx-2' : 'mx-3'}`} />

      {/* Nav */}
      <nav className={`flex-1 space-y-0.5 py-2 ${collapsed ? 'px-2' : 'px-3'}`}>
        {navItems.map((item) => {
          const active = isActiveNav(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center rounded-lg transition-colors ${
                active
                  ? 'bg-blue-800 text-white'
                  : 'text-blue-200 hover:bg-blue-800/40 hover:text-white'
              } ${collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5 text-sm font-medium'}`}
            >
              <Icon
                size={18}
                className={`shrink-0 transition-colors ${
                  active
                    ? 'text-white'
                    : 'text-blue-400 group-hover:text-white'
                }`}
              />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle */}
      <div className={`py-2 ${collapsed ? 'px-2' : 'px-4'}`}>
        <ThemeToggle collapsed={collapsed} />
      </div>

      {/* User / Logout */}
      <div className={`py-3 ${collapsed ? 'px-2' : 'px-4'}`}>
        <div className={`rounded-lg border border-blue-800/40 bg-blue-900/40 ${collapsed ? 'px-2 py-2' : 'px-3 py-2.5'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'}`}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-semibold text-white" title={user?.name || 'User'}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-white">{user?.name}</div>
                <div className="truncate text-[10px] text-blue-300">{user?.email}</div>
              </div>
            )}
          </div>
          <button
            onClick={() => logout()}
            className={`mt-2 flex w-full items-center justify-center rounded-md text-[11px] font-medium text-red-300 transition-colors hover:bg-red-900/20 ${
              collapsed ? 'gap-0 px-1 py-1.5' : 'gap-1.5 px-2 py-1.5'
            }`}
            title="Log out"
          >
            <LogOut size={12} />
            {!collapsed && 'Log out'}
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

      {/* Mobile drawer (always full width) */}
      <div
        className={`fixed left-0 top-0 z-50 h-full bg-[#0f172a] shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: DRAWER_WIDTH }}
      >
        <div className="h-full w-full">{drawerContent}</div>
      </div>

      {/* Desktop drawer */}
      <div
        className={`fixed left-0 top-0 z-30 hidden h-full border-r border-blue-800/30 bg-[#0f172a] transition-[width] duration-300 ease-out md:block ${
          desktopOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: sidebarWidth }}
      >
        <div className="h-full w-full">{drawerContent}</div>
      </div>

      {/* Desktop expand button (when fully hidden) */}
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
