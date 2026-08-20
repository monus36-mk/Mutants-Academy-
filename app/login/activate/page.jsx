'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setupFighterPassword } from '@/app/actions/fighterActions';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';
import { Dumbbell, UserCheck, Lock, Mail, Phone, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function ActivatePage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(setupFighterPassword, null);
  const [clientError, setClientError] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailVal, setEmailVal] = useState('');
  const [phoneVal, setPhoneVal] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      const phoneParam = params.get('phone');
      if (emailParam) setEmailVal(emailParam);
      if (phoneParam) setPhoneVal(phoneParam);
    }
  }, []);

  useEffect(() => {
    if (state?.success) {
      setIsSuccess(true);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [state]);

  useEffect(() => {
    if (isSuccess && countdown === 0) {
      router.push('/login');
    }
  }, [isSuccess, countdown, router]);

  const handleSubmit = (e) => {
    setClientError(null);
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
      e.preventDefault();
      setClientError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      e.preventDefault();
      setClientError('Password must be at least 6 characters long');
      return;
    }
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 transition-colors duration-200">
        <div className="w-full max-w-md text-center bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-zinc-150">
            Account Activated!
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-3 leading-relaxed">
            Your portal password has been set successfully. You can now securely log in to your dashboard.
          </p>
          <div className="mt-6 py-2 px-4 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-850 inline-block text-xs font-bold text-slate-500 dark:text-zinc-400 font-mono">
            Redirecting to sign-in page in {countdown}s...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 transition-colors duration-200">
      
      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors mb-6 uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>

        {/* Gym Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/30 mb-4 transform hover:scale-105 transition-transform duration-200">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent uppercase">
            Mutants Academy
          </h1>
          <p className="text-sm font-bold text-slate-500 dark:text-zinc-400 mt-2 uppercase tracking-wide">
            Athlete Activation Portal
          </p>
        </div>

        {/* Setup Card */}
        <div className="bg-white dark:bg-zinc-900/50 dark:backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl shadow-slate-100 dark:shadow-none">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-red-500" /> Setup Athlete Password
          </h2>
          <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 leading-relaxed mb-6">
            Verify your email and registered phone number (as provided to the gym management) to set up your personal password.
          </p>

          <form action={formAction} onSubmit={handleSubmit} className="space-y-5">
            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                Registered Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={emailVal}
                  onChange={(e) => setEmailVal(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 transition-all text-sm font-semibold"
                  placeholder="e.g. fighter@example.com"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                Registered Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={phoneVal}
                  onChange={(e) => setPhoneVal(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 transition-all text-sm font-semibold"
                  placeholder="e.g. +1 555-0199"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 transition-all text-sm"
                  placeholder="Min 6 characters"
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 transition-all text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {(state?.error || clientError) && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium">
                {state?.error || clientError}
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
                'Activate Account'
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
