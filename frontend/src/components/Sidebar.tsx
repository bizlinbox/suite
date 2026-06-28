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
  ChevronDown,
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
  FileText,
  FormInput,
  Settings,
  Server,
  Store,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWaba } from '@/context/WabaContext';
import { useTheme } from '@/components/ThemeProvider';

const DRAWER_WIDTH = 256;

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  permission: string | null;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<any>;
  permission: string | null;
  items: NavItem[];
}

const topNavItems: NavItem[] = [
  { label: 'Inbox', href: '/dashboard/inbox', icon: MessageSquare, permission: 'conversations.read' as string | null },
  { label: 'Contacts', href: '/dashboard/contacts', icon: Users, permission: 'contacts.read' as string | null },
  { label: 'Roles', href: '/dashboard/roles', icon: Shield, permission: 'roles.read' as string | null },
  { label: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone, permission: 'campaigns.read' as string | null },
  { label: 'Automations', href: '/dashboard/automations', icon: GitBranch, permission: 'automations.read' as string | null },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, permission: 'analytics.read' as string | null },
  { label: 'Quick Replies', href: '/dashboard/quick-replies', icon: MessageSquare, permission: 'settings.read' as string | null },
  { label: 'Templates', href: '/dashboard/templates', icon: FileText, permission: 'settings.read' as string | null },
  { label: 'Flows', href: '/dashboard/flows', icon: FormInput, permission: 'settings.read' as string | null },
  { label: 'Marketplace', href: '/dashboard/marketplace', icon: Store, permission: null },
];

const manageGroup: NavGroup = {
  label: 'Manage',
  icon: Settings2,
  permission: null,
  items: [
    { label: 'Users', href: '/dashboard/users', icon: Users, permission: 'users.read' as string | null },
    { label: 'WABA Accounts', href: '/dashboard/waba-accounts', icon: Plug, permission: 'settings.manage' as string | null },
    { label: 'AI Agents', href: '/dashboard/ai-agents', icon: Sparkles, permission: 'settings.read' as string | null },
    { label: 'API Logs', href: '/dashboard/api-logs', icon: Server, permission: 'settings.read' as string | null },
  ],
};

function isActiveNav(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  const nested = ['/dashboard/inbox', '/dashboard/users', '/dashboard/campaigns', '/dashboard/automations', '/dashboard/quick-replies', '/dashboard/waba-accounts', '/dashboard/templates', '/dashboard/flows', '/dashboard/api-logs'];
  if (nested.some((p) => href === p && pathname.startsWith(p))) return true;
  return false;
}

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  onDesktopToggle?: () => void;
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
        className={`flex w-full items-center rounded-lg border border-gray-200 bg-gray-100 text-gray-700 hover:border-gray-300 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-700/60 ${
          collapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-3 py-2.5'
        }`}
        aria-label="Select WABA account"
        title={selectedWaba?.name || 'Select WABA'}
      >
        <Building2 size={16} className="shrink-0 text-gray-400 dark:text-gray-500" />
        {!collapsed && (
          <span className="flex-1 truncate text-left text-sm font-medium">{selectedWaba?.name || 'Select WABA'}</span>
        )}
      </button>

      {open && (
        <div className={`absolute z-50 rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-900 ${
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
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-100'
                }`}
              >
                <Building2 size={16} className="shrink-0 text-gray-400 dark:text-gray-500" />
                <span className="flex-1 truncate font-medium">{waba.name}</span>
                {waba.id === selectedWabaId && (
                  <Check size={16} className="shrink-0 text-primary-700 dark:text-primary-300" />
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
      className={`flex w-full items-center rounded-lg border border-gray-200 bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-gray-100 ${
        collapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-3 py-2'
      }`}
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? <Sun size={16} className="shrink-0 text-gray-400 dark:text-gray-500" /> : <Moon size={16} className="shrink-0 text-gray-400 dark:text-gray-500" />}
      {!collapsed && <span className="text-sm font-medium">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}

export default function Sidebar({ mobileOpen, onMobileClose, onDesktopToggle, collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [manageOpen, setManageOpen] = useState(false);

  const filteredTopItems = topNavItems.filter((item) => {
    if (!item.permission) return true;
    const perms = user?.permissions || [];
    return perms.includes(item.permission);
  });

  const filteredManageItems = manageGroup.items.filter((item) => {
    if (!item.permission) return true;
    const perms = user?.permissions || [];
    return perms.includes(item.permission);
  });

  const isManageActive = filteredManageItems.some((item) => isActiveNav(pathname, item.href));

  const sidebarWidth = collapsed ? 64 : DRAWER_WIDTH;

  const drawerContent = (isCollapsed: boolean) => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className={`flex items-center py-3.5 ${isCollapsed ? 'justify-between px-1.5' : 'justify-between px-4'}`}>
        <Link href="/dashboard" className={`flex items-center ${isCollapsed ? 'gap-0' : 'gap-2.5'}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-700 text-white">
            <MessageSquare size={18} />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">BizlInbox</span>
          )}
        </Link>
        <div className="flex items-center gap-1">
          {onDesktopToggle && (
            <button
              onClick={onDesktopToggle}
              className="hidden rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-500 dark:hover:bg-gray-800/60 dark:hover:text-gray-100 md:block"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}
          {!isCollapsed && mobileOpen && (
            <button
              onClick={onMobileClose}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-500 dark:hover:bg-gray-800/60 dark:hover:text-gray-100 md:hidden"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <WabaSwitcher collapsed={isCollapsed} />

      <div className={`mb-2 h-px bg-gray-200 dark:bg-gray-700/50 ${isCollapsed ? 'mx-2' : 'mx-3'}`} />

      {/* Nav */}
      <nav className={`flex-1 space-y-0.5 overflow-y-auto py-2 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {filteredTopItems.map((item) => {
          const active = isActiveNav(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`group flex items-center rounded-lg transition-colors ${
                active
                  ? 'bg-blue-800 text-white'
                  : 'text-gray-700 hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-gray-100'
              } ${isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5 text-sm font-medium'}`}
            >
              <Icon
                size={18}
                className={`shrink-0 transition-colors ${
                  active
                    ? 'text-white dark:text-white'
                    : 'text-gray-500 group-hover:text-gray-900 dark:text-gray-500 dark:group-hover:text-gray-100'
                }`}
              />
              {!isCollapsed && item.label}
            </Link>
          );
        })}

        {/* Manage submenu */}
        {filteredManageItems.length > 0 && (
          <div className="mt-1">
            {isCollapsed ? (
              <div className="space-y-0.5">
                {filteredManageItems.map((item) => {
                  const active = isActiveNav(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={`group flex items-center rounded-lg transition-colors ${
                        active
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-100'
                      } ${isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5 text-sm font-medium'}`}
                    >
                      <Icon
                        size={18}
                        className={`shrink-0 transition-colors ${
                          active
                            ? 'text-white'
                            : 'text-gray-500 group-hover:text-gray-900 dark:text-gray-500 dark:group-hover:text-gray-100'
                        }`}
                      />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <>
                <button
                  onClick={() => setManageOpen((prev) => !prev)}
                  className={`flex w-full items-center rounded-lg transition-colors ${
                    isManageActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-100'
                  } gap-3 px-3 py-2.5 text-sm font-medium`}
                >
                  <Settings2
                    size={18}
                    className={`shrink-0 transition-colors ${
                      isManageActive ? 'text-primary-700 dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  />
                  <span className="flex-1 text-left">Manage</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-gray-500 transition-transform dark:text-gray-500 ${manageOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {manageOpen && (
                  <div className="space-y-0.5 pl-3">
                    {filteredManageItems.map((item) => {
                      const active = isActiveNav(pathname, item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group flex items-center rounded-lg transition-colors ${
                            active
                              ? 'bg-blue-800 text-white'
                              : 'text-gray-700 hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-gray-100'
                          } gap-3 px-3 py-2 text-sm font-medium`}
                        >
                          <Icon
                            size={16}
                            className={`shrink-0 transition-colors ${
                              active
                                ? 'text-white'
                                : 'text-gray-500 group-hover:text-gray-900 dark:text-gray-500 dark:group-hover:text-gray-100'
                            }`}
                          />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </nav>

      {/* Theme Toggle */}
      <div className={`py-2 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        <ThemeToggle collapsed={isCollapsed} />
      </div>

      {/* User / Logout */}
      <div className={`py-3 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        <div className={`rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800/60 ${isCollapsed ? 'px-2 py-2' : 'px-3 py-2.5'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white" title={user?.name || 'User'}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">{user?.name}</div>
                <div className="truncate text-[10px] text-gray-500 dark:text-gray-400">{user?.email}</div>
              </div>
            )}
          </div>
          <div className={`mt-2 flex items-center ${isCollapsed ? 'justify-center gap-1' : 'gap-2'}`}>
            <Link
              href="/dashboard/profile"
              className={`flex items-center rounded-md text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-gray-100 ${
                isCollapsed ? 'gap-0 px-1.5 py-1.5' : 'flex-1 gap-1.5 px-2 py-1.5'
              }`}
              title="Profile"
            >
              <Settings size={12} />
              {!isCollapsed && 'Profile'}
            </Link>
            <button
              onClick={() => logout()}
              className={`flex items-center rounded-md text-[11px] font-medium text-red-300 transition-colors hover:bg-red-900/20 ${
                isCollapsed ? 'gap-0 px-1.5 py-1.5' : 'flex-1 gap-1.5 px-2 py-1.5'
              }`}
              title="Log out"
            >
              <LogOut size={12} />
              {!isCollapsed && 'Log out'}
            </button>
          </div>
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
        className={`fixed left-0 top-0 z-50 h-full bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-gray-900 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: DRAWER_WIDTH }}
      >
        <div className="h-full w-full">{drawerContent(false)}</div>
      </div>

      {/* Desktop drawer */}
      <div
        className="fixed left-0 top-0 z-30 hidden h-full border-r border-gray-200 bg-white transition-[width] duration-300 ease-out dark:border-gray-800 dark:bg-gray-900 md:block"
        style={{ width: sidebarWidth }}
      >
        <div className="h-full w-full">{drawerContent(collapsed)}</div>
      </div>
    </>
  );
}
