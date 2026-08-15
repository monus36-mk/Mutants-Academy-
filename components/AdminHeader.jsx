'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/app/actions/authActions';
import ThemeToggle from './ThemeToggle';
import { Dumbbell, Users, PlusCircle, LayoutDashboard, LogOut, Menu, X, ShieldAlert, Calendar } from 'lucide-react';

export default function AdminHeader({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      const res = await logout();
      if (res.success) {
        router.push('/login');
        router.refresh();
      }
    });
  };

  const navLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/add-fighter', label: 'Add Fighter', icon: PlusCircle },
    { href: '/admin/events', label: 'Events Board', icon: Calendar },
  ];

  // Only Main Admin can manage coaches
  if (user?.role === 'MainAdmin') {
    navLinks.push({ href: '/admin/users', label: 'Coaches', icon: Users });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-600 text-white shadow-md shadow-red-600/20 group-hover:scale-105 transition-transform">
                <Dumbbell className="w-5 h-5" />
              </div>
              <span className="font-black tracking-tight text-xl text-slate-900 dark:text-white uppercase">
                Mutants <span className="text-red-600">Academy</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Section: Role indicator, Theme, Logout */}
          <div className="hidden md:flex items-center gap-4">
            {/* User Indicator */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 leading-none">
                  {user?.name}
                </p>
                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  {user?.role === 'MainAdmin' ? 'Administrator' : 'Coach'}
                </span>
              </div>
            </div>

            <ThemeToggle />

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isPending}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-200 cursor-pointer disabled:opacity-50"
              title="Logout Account"
            >
              {isPending ? (
                <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900"
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
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
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
              onClick={handleLogout}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
