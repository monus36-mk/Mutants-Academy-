import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/authActions';
import { getFighterProfile } from '@/app/actions/fighterActions';
import { getFighterPayments } from '@/app/actions/paymentActions';
import ThemeToggle from '@/components/ThemeToggle';
import LogoutButton from '@/components/LogoutButton';
import Link from 'next/link';
import { Dumbbell, Clock, CheckCircle2, AlertTriangle, XCircle, ArrowLeft, CreditCard, Banknote, QrCode, ArrowUpRight, Calendar, Users, User, IndianRupee } from 'lucide-react';
import FighterProfileClient from './FighterProfileClient';
import { resolveFighterFees, resolveFighterPackFee } from '@/lib/utils';

export default async function FighterProfilePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'Fighter') {
    redirect('/login');
  }

  const [profileRes, paymentsRes] = await Promise.all([
    getFighterProfile(user.id),
    getFighterPayments(user.id),
  ]);

  if (!profileRes.success || !profileRes.fighter) {
    redirect('/api/auth/logout');
  }

  const fighter = profileRes.fighter;
  const payments = paymentsRes.success ? paymentsRes.payments : [];

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
          text: expDays <= 0 ? 'Your subscription expired today.' : `Your subscription expired ${expDays} day${expDays > 1 ? 's' : ''} ago. Please renew your package now.`,
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
        <div className="w-full max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1720px] 3xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
            <Link href="/fighter" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-500 transition-colors uppercase tracking-wider whitespace-nowrap">
              <ArrowLeft className="w-4 h-4 shrink-0" /> Back to Dashboard
            </Link>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Pay Gym CTA Header Button (Desktop only; on mobile, athletes pay directly from the profile bar below) */}
              <Link
                href={`/renew/${fighter._id}`}
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-red-600/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Pay membership fees online via UPI"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay Gym</span>
              </Link>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                <span className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                  Athlete Profile
                </span>
              </div>

              <ThemeToggle />

              <div className="hidden sm:block">
                <LogoutButton
                  showLabel={false}
                  iconClassName="w-5 h-5"
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-200 cursor-pointer flex items-center justify-center"
                  title="Logout Portal"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Profile View */}
      <main className="flex-1 w-full max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1720px] 3xl:max-w-[1920px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 md:py-8 space-y-5 sm:space-y-8 animate-in fade-in duration-300 pb-24 md:pb-8">
        
        {/* Profile Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 bg-gradient-to-r from-slate-900 to-zinc-900 dark:from-zinc-900 dark:to-black rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-white shadow-xl border border-slate-800 dark:border-zinc-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-red-600/25 border border-red-500/30 text-[10px] sm:text-xs font-bold text-red-400 uppercase tracking-wide sm:tracking-wider mb-2.5 sm:mb-3 whitespace-nowrap">
              <Dumbbell className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> Fighter Account Details
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight">
              Osu, {fighter.name}!
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              Track your subscription validity, package logs, assigned training supervisor, and contact information.
            </p>
          </div>
          
          <div className="shrink-0 flex flex-col items-start md:items-end gap-2.5">
            <div className="flex items-center gap-2">
              <span className={`inline-flex px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-md ${statusConfig.badge}`}>
                {fighter.status}
              </span>
              <Link
                href={`/renew/${fighter._id}`}
                className="px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold uppercase tracking-wider shadow-md shadow-red-600/25 transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" /> Pay / Renew
              </Link>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
              VALID UNTIL: {formatDate(fighter.nextPaymentDate)}
            </span>
          </div>
        </div>

        {/* Status Advisory Banner */}
        <div className={`p-5 rounded-2xl border bg-gradient-to-r ${statusConfig.bannerBg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
          <div className="flex items-start gap-3.5">
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

          <Link
            href={`/renew/${fighter._id}`}
            className="shrink-0 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-red-600/20 inline-flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Pay Gym Fees Now</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          
          {/* Card 1: Subscription Info */}
          <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-500" /> Subscription Details
                </h2>
                <span className="text-xs font-mono font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                  ₹{resolveFighterPackFee(fighter, fighter.packageDurationMonths).toLocaleString('en-IN')} / {fighter.packageDurationMonths || 1} mo{(fighter.packageDurationMonths || 1) > 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between py-2.5 border-b border-slate-100 dark:border-zinc-800/80">
                  <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Agreed Pack Rates</span>
                  <span className="text-sm font-extrabold text-slate-800 dark:text-zinc-100 font-mono text-right">
                    ₹{resolveFighterFees(fighter).monthlyFee.toLocaleString('en-IN')}/1m • ₹{resolveFighterFees(fighter).quarterlyFee.toLocaleString('en-IN')}/3m
                  </span>
                </div>

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

            {/* DIRECT PAY TO GYM ACTION BOX */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Online Fee Payment
                </span>
                <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Instant UPI Activation
                </span>
              </div>

              {(fighter.pendingBalance || 0) > 0 && (
                <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/35 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <IndianRupee className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[11px] font-black uppercase tracking-wider text-orange-700 dark:text-orange-400 block">
                        Pending Balance: ₹{Number(fighter.pendingBalance).toLocaleString('en-IN')}
                      </span>
                      {fighter.pendingFeeNote && (
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate">
                          {fighter.pendingFeeNote}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/renew/${fighter._id}?mode=settle`}
                    className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-extrabold shrink-0"
                  >
                    Pay Due
                  </Link>
                </div>
              )}

              <Link
                href={`/renew/${fighter._id}`}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] text-center cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay to Gym / Renew Membership</span>
                <ArrowUpRight className="w-4 h-4 ml-auto" />
              </Link>

              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 px-1 font-medium">
                <span>Google Pay • PhonePe • Paytm • QR</span>
                <span>Zero Extra Fees</span>
              </div>
            </div>

          </div>

          {/* Card 2: Profile & Coach details (Interactive Client Wrapper) */}
          <FighterProfileClient initialFighter={fighter} />

        </div>

        {/* Card 3: Membership Payment & Receipts Ledger */}
        <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-red-500" /> Past Membership Receipts ({payments.length})
            </h3>
            <Link
              href={`/renew/${fighter._id}`}
              className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1"
            >
              <span>Renew New Plan</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {payments.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-800 text-xs text-slate-400 dark:text-zinc-500">
              No previous payments recorded yet. Online UPI renewals and counter receipts will appear here automatically.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
              {payments.map((p) => (
                <div
                  key={p._id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900/30 hover:bg-slate-50 dark:hover:bg-zinc-850/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                        {p.paymentType === 'Balance Settlement' || p.durationMonths === 0
                          ? '(Balance Settlement)'
                          : `(${p.durationMonths} Mo${p.durationMonths > 1 ? 's' : ''}${
                              p.paymentType === 'Partial Renewal' && p.expectedAmount
                                ? ` • Partial of ₹${Number(p.expectedAmount).toLocaleString('en-IN')}`
                                : ''
                            })`}
                      </span>
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        p.paymentMethod === 'Cash'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                      }`}>
                        {p.paymentMethod === 'Cash' ? <Banknote className="w-3 h-3" /> : <QrCode className="w-3 h-3" />}
                        {p.paymentMethod}
                      </span>
                    </div>
                    <span suppressHydrationWarning className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono block mt-1">
                      {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      {p.transactionId ? ` • Ref: ${p.transactionId}` : ''}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Completed
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 4: Session & Device Sign Out */}
        <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 transition-colors">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-sm font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
                Active Session & Device Access
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xl">
              Persistent login is active. You will stay signed in on this phone/device like Instagram until you choose to log out.
            </p>
          </div>
          
          <div className="w-full sm:w-auto">
            <LogoutButton
              label="Log Out of Athlete Portal"
              iconClassName="w-4 h-4"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-red-600/20 cursor-pointer disabled:opacity-60"
              title="Log Out of Athlete Portal"
            />
          </div>
        </div>

      </main>

      {/* Mobile Fixed Bottom Navigation Bar (3 Tabs: Events, Fighters, Billing) */}
      <nav 
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-zinc-800 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] px-3 pt-2 transition-colors duration-200"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60, paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="grid grid-cols-3 items-center max-w-md mx-auto gap-1">
          {/* Tab 1: Notices & Events */}
          <Link
            href="/fighter"
            className="flex flex-col items-center justify-center py-1 px-2 rounded-2xl text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 font-semibold transition-all cursor-pointer relative"
          >
            <Calendar className="w-5 h-5 stroke-[1.75]" />
            <span className="text-[10px] tracking-tight uppercase mt-1">Events</span>
          </Link>

          {/* Tab 2: Fighter Directory */}
          <Link
            href="/fighter?tab=directory"
            className="flex flex-col items-center justify-center py-1 px-2 rounded-2xl text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 font-semibold transition-all cursor-pointer relative"
          >
            <Users className="w-5 h-5 stroke-[1.75]" />
            <span className="text-[10px] tracking-tight uppercase mt-1">Fighters</span>
          </Link>

          {/* Tab 3: Billing & Receipts */}
          <Link
            href="/fighter?tab=billing"
            className="flex flex-col items-center justify-center py-1 px-2 rounded-2xl text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 font-semibold transition-all cursor-pointer relative"
          >
            <CreditCard className="w-5 h-5 stroke-[1.75]" />
            <span className="text-[10px] tracking-tight uppercase mt-1">Billing</span>
          </Link>
        </div>
      </nav>

      <footer className="border-t border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 py-6 text-center text-xs text-slate-400 dark:text-zinc-500 transition-colors duration-200 mb-16 md:mb-0">
        &copy; 2026 Mutants Academy MMA Gym. All rights reserved.
      </footer>

    </div>
  );
}
