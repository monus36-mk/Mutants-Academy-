'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all duration-200 cursor-pointer border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      aria-label="Toggle theme"
      type="button"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-zinc-700 animate-pulse" />
      ) : (
        <Sun className="w-5 h-5 text-amber-400 animate-spin-slow" />
      )}
    </button>
  );
}
