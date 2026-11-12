'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 rounded-2xl bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all duration-200 cursor-pointer border border-slate-200 dark:border-zinc-800 focus:outline-none"
      aria-label="Toggle theme"
      type="button"
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-700 animate-pulse" />
      ) : (
        <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-spin-slow" />
      )}
    </button>
  );
}
