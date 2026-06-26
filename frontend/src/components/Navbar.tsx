'use client';

import { Menu, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface NavbarProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

export default function Navbar({ onMenuClick, sidebarOpen }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className={`fixed top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-200/80 bg-white/80 px-4 backdrop-blur-xl transition-[width,margin] duration-300 dark:border-gray-800/80 dark:bg-gray-950/80 md:w-[calc(100%-256px)] ${
        sidebarOpen ? 'md:ml-[256px] md:w-[calc(100%-256px)]' : 'md:ml-0 md:w-full'
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
