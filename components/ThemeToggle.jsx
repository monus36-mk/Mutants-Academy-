'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all duration-200 cursor-pointer border border-slate-200 dark:border-zinc-800 focus:outline-none"
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
