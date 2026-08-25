import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/authActions';
import { getFighterProfile } from '@/app/actions/fighterActions';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';
import { Dumbbell, Clock, LogOut, CheckCircle2, AlertTriangle, XCircle, ArrowLeft } from 'lucide-react';
import FighterProfileClient from './FighterProfileClient';

export default async function FighterProfilePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'Fighter') {
    redirect('/login');
  }

  const profileRes = await getFighterProfile();
  if (!profileRes.success) {
    const { logout } = require('@/app/actions/authActions');
    await logout();
    redirect('/login');
  }

  const fighter = profileRes.fighter;

  const handleLogout = async () => {
    'use server';
    const { logout } = require('@/app/actions/authActions');
    await logout();
    redirect('/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getExpiredDays = (nextPaymentDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentDate = new Date(nextPaymentDate);
    paymentDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - paymentDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusConfig = (status, nextPaymentDate) => {
    switch (status) {
      case 'Expired':
        const expDays = getExpiredDays(nextPaymentDate);
        return {
          bg: 'bg-red-500/10 border-red-500/20 text-red-500',
          badge: 'bg-red-500 text-white',
          icon: XCircle,
          text: expDays <= 0 ? 'Your subscription expired today.' : `Your subscription expired ${expDays} day${expDays > 1 ? 's' : ''} ago. Please contact management to renew.`,
          bannerBg: 'from-red-950/20 to-red-900/10 border-red-500/20',
          accentColor: 'text-red-500',
        };
      case 'Due Soon':
        return {
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
          badge: 'bg-amber-500 text-white',
          icon: AlertTriangle,
          text: 'Your subscription is due soon for renewal. Please arrange payment to avoid interruption.',
          bannerBg: 'from-amber-950/20 to-amber-900/10 border-amber-500/20',
          accentColor: 'text-amber-500',
        };
      default: // Active
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
          badge: 'bg-emerald-500 text-white',
          icon: CheckCircle2,
          text: 'Your membership is active and in good standing. Train hard!',
          bannerBg: 'from-emerald-950/20 to-emerald-900/10 border-emerald-500/20',
          accentColor: 'text-emerald-500',
        };
    }
  };

  const statusConfig = getStatusConfig(fighter.status, fighter.nextPaymentDate);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors duration-200 flex flex-col font-sans select-none">
      
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/fighter" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-500 transition-colors uppercase tracking-wider">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                <span className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                  Athlete Profile
                </span>
              </div>

              <ThemeToggle />

              <form action={handleLogout}>
                <button
                  type="submit"
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-200 cursor-pointer"
                  title="Logout Portal"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Profile View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
        
        {/* Profile Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 to-zinc-900 dark:from-zinc-900 dark:to-black rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800 dark:border-zinc-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/25 border border-red-500/30 text-xs font-bold text-red-400 uppercase tracking-wider mb-3">
              <Dumbbell className="w-3.5 h-3.5" /> Fighter Account Details
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              Osu, {fighter.name}!
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Track your subscription validity, package logs, assigned training supervisor, and contact information.
            </p>
          </div>
          
          <div className="shrink-0 flex flex-col items-start md:items-end gap-1.5">
            <span className={`inline-flex px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-md ${statusConfig.badge}`}>
              {fighter.status}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
              VALID UNTIL: {formatDate(fighter.nextPaymentDate)}
            </span>
          </div>
        </div>

        {/* Status Advisory Banner */}
        <div className={`p-5 rounded-2xl border bg-gradient-to-r ${statusConfig.bannerBg} flex items-start gap-3.5`}>
          <StatusIcon className={`w-6 h-6 shrink-0 mt-0.5 ${statusConfig.accentColor}`} />
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-zinc-200">
              Subscription Status Advisory
            </h3>
            <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
              {statusConfig.text}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          
          {/* Card 1: Subscription Info */}
          <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between transition-colors">
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-500" /> Subscription Details
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-zinc-800/80">
                  <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Membership Package</span>
                  <span className="text-sm font-extrabold text-slate-700 dark:text-zinc-200 uppercase">
                    {fighter.packageDurationMonths} Month{fighter.packageDurationMonths > 1 ? 's' : ''} Cycle
                  </span>
                </div>
                
                <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-zinc-800/80">
                  <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Current Cycle Started</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 font-mono">
                    {formatDate(fighter.entryDate)}
                  </span>
                </div>

                <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-zinc-800/80">
                  <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Next Expiry Renewal Date</span>
                  <span className="text-sm font-extrabold text-red-500 dark:text-red-400 font-mono">
                    {formatDate(fighter.nextPaymentDate)}
                  </span>
                </div>

                <div className="flex justify-between py-2.5">
                  <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Original Joined Date</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 font-mono">
                    {formatDate(fighter.joiningDate)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800 p-4 rounded-2xl text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 leading-relaxed mt-6">
              ⚠️ Note: All packages automatically freeze upon expiration. Please coordinate payment updates directly with your coach.
            </div>
          </div>

          {/* Card 2: Profile & Coach details (Interactive Client Wrapper) */}
          <FighterProfileClient initialFighter={fighter} />

        </div>

      </main>

      <footer className="border-t border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 py-6 text-center text-xs text-slate-400 dark:text-zinc-500 transition-colors duration-200">
        &copy; 2026 Mutants Academy MMA Gym. All rights reserved.
      </footer>

    </div>
  );
}
