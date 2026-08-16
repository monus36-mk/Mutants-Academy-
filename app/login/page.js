'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/app/actions/authActions';
import { Dumbbell, LogIn } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(login, null);
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    if (state?.success) {
      setIsEntering(true);
      if (state.role === 'Fighter') {
        router.push('/fighter');
      } else {
        router.push('/admin');
      }
      router.refresh();
    }
  }, [state, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 transition-colors duration-200">
      
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
          {isEntering ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-red-500/10" />
              <div className="text-center space-y-1.5">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-zinc-150 uppercase tracking-widest animate-pulse">
                  Opening Dashboard...
                </h3>
                <p className="text-[10px] text-slate-450 dark:text-zinc-500 font-bold uppercase tracking-wider">
                  Preparing your training profile
                </p>
              </div>
            </div>
          ) : (
            <>
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-650 transition-all text-sm font-medium"
                    placeholder="e.g. coach@mutantsacademy.com or fighter@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-650 transition-all text-sm font-medium"
                    placeholder="••••••••"
                  />
                </div>

                {state?.error && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold">
                    {state.error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-650 to-red-700 hover:from-red-500 hover:to-red-650 text-white font-bold text-sm shadow-lg shadow-red-600/25 hover:shadow-red-500/30 dark:shadow-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Sign In to Portal'
                  )}
                </button>
              </form>

              {/* Activation Link */}
              <div className="mt-6 text-center">
                <Link
                  href="/login/activate"
                  className="text-xs font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors uppercase tracking-wider animate-pulse"
                >
                  First time logging in? Activate Athlete Account
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
