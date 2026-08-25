'use client';

import { useActionState, useState } from 'react';
import { login } from '@/app/actions/authActions';
import { Dumbbell, LogIn, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-500 transition-colors duration-200">
      
      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Gym Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/30 mb-4 transform hover:scale-105 transition-transform duration-200">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent uppercase">
            Mutants Academy
          </h1>
          <p className="text-sm font-bold text-slate-500 dark:text-zinc-400 mt-2 uppercase tracking-wide">
            Staff & Athlete Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-zinc-900/50 dark:backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl shadow-slate-100 dark:shadow-none min-h-[340px] flex flex-col justify-center">
          <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-red-500" /> Account Sign In
          </h2>

          <form action={formAction} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-medium"
                placeholder="e.g. coach@mutantsacademy.com or fighter@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {state?.error && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold">
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-lg shadow-red-600/25 hover:shadow-red-500/30 dark:shadow-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign In to Portal'
              )}
            </button>
          </form>

          {/* Action Links */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center border-t border-slate-100 dark:border-zinc-800/80 pt-4">
            <Link
              href="/login/activate"
              className="text-xs font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors uppercase tracking-wider"
            >
              Activate Athlete Account
            </Link>
            <Link
              href="/login/forgot-password"
              className="text-xs font-bold text-slate-400 hover:text-red-500 dark:hover:text-red-405 transition-colors uppercase tracking-wider"
            >
              Forgot Password?
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
