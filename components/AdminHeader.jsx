'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { performClientLogout } from '@/lib/clientAuth';
import { Users, PlusCircle, LayoutDashboard, LogOut, Menu, X, Calendar, Megaphone, CreditCard, UserCheck } from 'lucide-react';
import { useModalBackHandler } from '@/hooks/useModalBackHandler';

export default function AdminHeader({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [navTarget, setNavTarget] = useState(null);

  useModalBackHandler(isOpen, setIsOpen, 'adminMobileMenu');

  const navLinks = useMemo(() => {
    const links = [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/attendance', label: 'Attendance', icon: UserCheck },
      { href: '/admin/payments', label: 'Payments', icon: CreditCard },
      { href: '/admin/add-fighter', label: 'Add Fighter', icon: PlusCircle },
      { href: '/admin/events', label: 'Events Board', icon: Calendar },
      { href: '/admin/notices', label: 'Notice Board', icon: Megaphone },
    ];
    if (user?.role === 'MainAdmin') {
      links.push({ href: '/admin/users', label: 'Coaches', icon: Users });
    }
    return links;
  }, [user?.role]);

  // Warm up all admin navbar routes so clicking any tab renders its shell immediately
  useEffect(() => {
    navLinks.forEach((link) => {
      router.prefetch(link.href);
    });
  }, [navLinks, router]);

  const activeNavHref =
    navTarget && navTarget.fromPathname === pathname ? navTarget.href : pathname;

  const closeDrawerForNavigation = () => {
    if (!isOpen) return;
    // Clear modal history flag before closing so useModalBackHandler won't call window.history.back() mid-navigation
    if (typeof window !== 'undefined' && window.history.state?.isModal) {
      const nextState = { ...window.history.state };
      delete nextState.isModal;
      delete nextState.modalId;
      delete nextState.modalToken;
      delete nextState.timestamp;
      window.history.replaceState(nextState, '');
    }
    setIsOpen(false);
  };

  const handleNavClick = (href) => {
    closeDrawerForNavigation();
    if (pathname !== href) {
      setNavTarget({ href, fromPathname: pathname });
    }
  };

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    closeDrawerForNavigation();
    performClientLogout();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors duration-200">
      <div className="w-full max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1720px] 3xl:max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-6 xl:px-10 2xl:px-12">
        <div className="flex h-16 items-center justify-between gap-2 lg:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 lg:gap-4 xl:gap-6 min-w-0">
            <Link href="/admin" onClick={() => handleNavClick('/admin')} className="flex items-center gap-2 xl:gap-2.5 group shrink-0">
              <div className="w-8 h-8 xl:w-9 xl:h-9 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <img src="/logo.png" alt="Mutants Academy" className="w-full h-full object-contain drop-shadow-md" />
              </div>
              <span className="font-black tracking-tight text-[13px] xl:text-lg text-slate-900 dark:text-white uppercase leading-[1.05] flex flex-col xl:flex-row xl:items-center xl:gap-1.5 whitespace-nowrap">
                <span>Mutants</span>
                <span className="text-red-600">Academy</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-0.5 xl:gap-1 min-w-0">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = activeNavHref === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch
                    onClick={() => handleNavClick(link.href)}
                    className={`flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-2 xl:px-3 py-1.5 xl:py-2 rounded-xl text-[11px] lg:text-xs xl:text-sm font-semibold whitespace-nowrap shrink-0 transition-all duration-150 ${
                      isActive
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Icon className="hidden min-[900px]:block w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Section: Role indicator, Theme, Logout */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2.5 shrink-0">
            {/* User Indicator */}
            <div className="flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3 py-1 xl:py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 whitespace-nowrap">
              <div className="w-2 h-2 xl:w-2.5 xl:h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="text-left leading-tight">
                <p className="text-[11px] xl:text-xs font-bold text-slate-800 dark:text-zinc-200 leading-none">
                  {user?.name}
                </p>
                <span className="hidden lg:block text-[9px] xl:text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mt-0.5">
                  {user?.role === 'MainAdmin' ? 'Administrator' : 'Coach'}
                </span>
              </div>
            </div>

            <ThemeToggle />

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 xl:p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-200 cursor-pointer disabled:opacity-50"
              title="Logout Account"
            >
              {isLoggingOut ? (
                <div className="w-4 h-4 xl:w-5 xl:h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 xl:w-5 xl:h-5" />
              )}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 pt-2 pb-4 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeNavHref === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch
                onClick={() => handleNavClick(link.href)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}

          <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between px-4">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                {user?.name}
              </p>
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                {user?.role === 'MainAdmin' ? 'Administrator' : 'Coach'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer disabled:opacity-60"
            >
              {isLoggingOut ? (
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
