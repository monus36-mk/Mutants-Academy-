'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendResetOtp, verifyOtpAndResetPassword } from '@/app/actions/authActions';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';
import { Dumbbell, KeyRound, Lock, Mail, ArrowLeft, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Step state: 1 = Email submission, 2 = OTP & Password reset
  const [step, setStep] = useState(1);
  const [emailSubmitted, setEmailSubmitted] = useState('');

  // Eye toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States for actions
  const [otpState, otpAction, isOtpPending] = useActionState(sendResetOtp, null);
  const [resetState, resetAction, isResetPending] = useActionState(verifyOtpAndResetPassword, null);

  const [countdown, setCountdown] = useState(3);
  const [isSuccess, setIsSuccess] = useState(false);

  // Switch to step 2 if OTP sent successfully
  useEffect(() => {
    if (otpState?.success && otpState?.email) {
      setEmailSubmitted(otpState.email);
      setStep(2);
    }
  }, [otpState]);

  // Handle successful password reset redirection countdown
  useEffect(() => {
    if (resetState?.success) {
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
  }, [resetState]);

  useEffect(() => {
    if (isSuccess && countdown === 0) {
      router.push('/login');
    }
  }, [isSuccess, countdown, router]);

  if (isSuccess) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 transition-colors duration-200">
        <div className="w-full max-w-md text-center bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-zinc-100">
            Password Reset!
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-3 leading-relaxed">
            Your portal password has been reset successfully. You can now log in using your new credentials.
          </p>
          <div className="mt-6 py-2 px-4 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800 inline-block text-xs font-bold text-slate-500 dark:text-zinc-400 font-mono">
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
        {/* Back Link */}
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
            Password Recovery
          </p>
        </div>

        {/* Reset Card */}
        <div className="bg-white dark:bg-zinc-900/50 dark:backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl shadow-slate-100 dark:shadow-none">
          
          {step === 1 ? (
            <>
              <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-red-500" /> Reset Password
              </h2>
              <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 leading-relaxed mb-6">
                Enter your registered email address below. If an account matches, we will send a 6-digit OTP code to verify your identity.
              </p>

              <form action={otpAction} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 transition-all text-sm font-semibold"
                      placeholder="e.g. fighter@example.com"
                    />
                  </div>
                </div>

                {otpState?.error && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium">
                    {otpState.error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isOtpPending}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-lg shadow-red-600/25 hover:shadow-red-500/30 dark:shadow-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isOtpPending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Request Reset OTP'
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" /> Verify OTP & Reset
              </h2>
              <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 leading-relaxed mb-6">
                A verification code has been dispatched to <strong>{emailSubmitted}</strong>. Please enter the OTP and select a new password.
              </p>

              <form action={resetAction} className="space-y-5">
                {/* Hidden Email Field */}
                <input type="hidden" name="email" value={emailSubmitted} />

                {/* OTP Input */}
                <div>
                  <label htmlFor="otp" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                    6-Digit Verification Code (OTP)
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    pattern="\d{6}"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 transition-all text-center text-lg font-bold font-mono tracking-[4px]"
                    placeholder="123456"
                  />
                </div>

                {/* New Password */}
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
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 transition-all text-sm font-semibold"
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

                {/* Confirm New Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 transition-all text-sm font-semibold"
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

                {resetState?.error && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium">
                    {resetState.error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 font-bold text-sm transition-all cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isResetPending}
                    className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-lg shadow-red-600/25 hover:shadow-red-500/30 dark:shadow-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isResetPending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
