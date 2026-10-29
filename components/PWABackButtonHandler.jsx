'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSessionTokenForSync } from '@/app/actions/authActions';

export default function PWABackButtonHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const [showExitToast, setShowExitToast] = useState(false);
  const lastBackPressTimeRef = useRef(0);
  const toastTimeoutRef = useRef(null);

  // 1. Background sync: Ensure persistent localStorage token exists if user has an active session cookie
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Skip on login page
    if (pathname === '/login' || pathname.startsWith('/login/')) return;

    const syncToken = async () => {
      try {
        const existingToken = localStorage.getItem('mutants_auth_token');
        if (!existingToken) {
          const res = await getSessionTokenForSync();
          if (res?.token) {
            localStorage.setItem('mutants_auth_token', res.token);
            if (res.role) localStorage.setItem('mutants_user_role', res.role);
          }
        }
      } catch (e) {
        // Silently ignore storage errors
      }
    };

    syncToken();
  }, [pathname]);

  // 2. Mobile Back-Button Management for PWA & Mobile Web
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isRootRoute = pathname === '/admin' || pathname === '/fighter' || pathname === '/login' || pathname === '/';

    // Push an initial trap state if at root so 'popstate' can be intercepted
    if (isRootRoute) {
      if (!window.history.state?.isPwaRoot) {
        window.history.pushState({ isPwaRoot: true }, '', window.location.href);
      }
    }

    const handlePopState = (event) => {
      // If back button was used to close a modal, ignore exit toast
      if (event.state?.isModal) {
        return;
      }

      if (isRootRoute) {
        const now = Date.now();
        const timeDiff = now - lastBackPressTimeRef.current;

        if (timeDiff < 2000) {
          // Double tap back within 2 seconds: User genuinely wants to exit the app
          setShowExitToast(false);
          // Allow default exit by navigating back or closing
          window.history.back();
        } else {
          // First tap back on root dashboard: Prevent accidental exit & show toast
          lastBackPressTimeRef.current = now;
          setShowExitToast(true);

          // Re-push root guard so next back press also gets intercepted
          window.history.pushState({ isPwaRoot: true }, '', window.location.href);

          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = setTimeout(() => {
            setShowExitToast(false);
          }, 2000);
        }
      } else {
        // On sub-routes (e.g. /admin/events, /admin/add-fighter, /fighter/profile):
        // If history is empty (opened directly), redirect gracefully to parent dashboard
        if (window.history.length <= 1) {
          if (pathname.startsWith('/admin')) {
            router.push('/admin');
          } else if (pathname.startsWith('/fighter')) {
            router.push('/fighter');
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [pathname, router]);

  if (!showExitToast) return null;

  return (
    <div
      id="pwa-exit-toast"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-zinc-900/95 dark:bg-zinc-800/95 text-white shadow-2xl backdrop-blur-md border border-zinc-700/60 text-xs font-semibold tracking-wide">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span>Press back again to exit</span>
      </div>
    </div>
  );
}
