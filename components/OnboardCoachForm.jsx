'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onboardCoach } from '@/app/actions/coachActions';
import { UserPlus, User, Mail, Key } from 'lucide-react';

export default function OnboardCoachForm() {
  const router = useRouter();
  const formRef = useRef(null);
  const [state, formAction, isPending] = useActionState(onboardCoach, null);

  useEffect(() => {
    if (state?.success) {
      if (formRef.current) {
        formRef.current.reset();
      }
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 md:p-6 shadow-sm transition-colors duration-200">
      
      <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide flex items-center gap-2 mb-4">
        <UserPlus className="w-4.5 h-4.5 text-red-500" /> Onboard New Coach
      </h3>

      <form ref={formRef} action={formAction} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
            Coach Name *
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
              placeholder="e.g. John Kavanagh"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
              placeholder="coach@mutantsacademy.com"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
            Default Password *
          </label>
          <div className="relative">
            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        {state?.error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium animate-shake">
            {state.error}
          </div>
        )}

        {state?.success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            Coach onboarded successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-md shadow-red-600/10 cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
        >
          {isPending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Save Coach Profile'
          )}
        </button>
      </form>
    </div>
  );
}
