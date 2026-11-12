'use client';

import { useState, useTransition, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { renewFighterSubscription } from '@/app/actions/fighterActions';
import { RefreshCw, Calendar, X, Banknote, QrCode, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useModalBackHandler } from '@/hooks/useModalBackHandler';
import { resolveFighterFees, resolveFighterPackFee } from '@/lib/utils';

export default function RenewalModal({ fighter }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useModalBackHandler(isOpen, setIsOpen, `renewal_${fighter._id}`);

  const { monthlyFee: monthlyRate, quarterlyFee: quarterlyRate } = resolveFighterFees(fighter);

  const calculateDefaultAmount = (durationMonths) => {
    return resolveFighterPackFee({ monthlyFee: monthlyRate, quarterlyFee: quarterlyRate }, durationMonths);
  };

  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState(monthlyRate || 1300);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [resetFromToday, setResetFromToday] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const isExpired = useMemo(() => {
    if (!fighter.nextPaymentDate) return false;
    const exp = new Date(fighter.nextPaymentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !isNaN(exp.getTime()) && exp < today;
  }, [fighter.nextPaymentDate]);

  const daysOverdue = useMemo(() => {
    if (!isExpired) return 0;
    const exp = new Date(fighter.nextPaymentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - exp.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }, [isExpired, fighter.nextPaymentDate]);

  const handleOpen = () => {
    const initialMonths = (fighter.packageDurationMonths === 3 || fighter.packageDurationMonths === 1)
      ? fighter.packageDurationMonths
      : 1;
    setMonths(initialMonths);
    setAmount(calculateDefaultAmount(initialMonths));
    setPaymentMethod('Cash');
    setResetFromToday(false);
    setError('');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleDurationChange = (newMonths) => {
    setMonths(newMonths);
    setAmount(calculateDefaultAmount(newMonths));
  };

  const handleRenew = () => {
    setError('');
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    startTransition(async () => {
      const res = await renewFighterSubscription(
        fighter._id,
        months,
        Number(amount),
        paymentMethod,
        resetFromToday
      );
      if (res?.error) {
        setError(res.error);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 dark:bg-amber-600/20 dark:hover:bg-amber-600/35 text-white dark:text-amber-400 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
      >
        <Calendar className="w-3.5 h-3.5" /> Renew
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm text-left whitespace-normal transition-all duration-300"
          onClick={() => !isPending && handleClose()}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="shrink-0 flex items-start justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-zinc-100 uppercase tracking-tight">
                  Renew Membership
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 break-words">
                  Fighter: <span className="font-bold text-slate-800 dark:text-zinc-200">{fighter.name}</span>
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Renewal Duration Selector - focused on 1 Month & 3 Months */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
                  Renewal Plan Duration *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDurationChange(1)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer min-w-0 ${
                      months === 1
                        ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold shadow-sm'
                        : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <span className="block text-xs font-extrabold uppercase">🥊 1 Month</span>
                    <span className="text-[11px] font-mono opacity-80">₹{calculateDefaultAmount(1).toLocaleString('en-IN')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDurationChange(3)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer min-w-0 ${
                      months === 3
                        ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold shadow-sm'
                        : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <span className="block text-xs font-extrabold uppercase">🔥 3 Months</span>
                    <span className="text-[11px] font-mono opacity-80">₹{calculateDefaultAmount(3).toLocaleString('en-IN')}</span>
                  </button>
                </div>
              </div>

              {/* Amount Paid Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                  Amount Paid (₹) *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-bold text-slate-400 dark:text-zinc-500 pointer-events-none select-none z-10">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-bold font-mono transition-all"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="1300"
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1.5 leading-relaxed break-words">
                  Agreed pack rates: ₹{monthlyRate.toLocaleString('en-IN')} (1 mo) • ₹{quarterlyRate.toLocaleString('en-IN')} (3 mos). Adjust if needed for concessions.
                </p>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-w-0 ${
                      paymentMethod === 'Cash'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <Banknote className="w-4 h-4 shrink-0" />
                    <span className="truncate">Cash Counter</span>
                    {paymentMethod === 'Cash' && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-w-0 ${
                      paymentMethod === 'UPI'
                        ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 shadow-sm'
                        : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <QrCode className="w-4 h-4 shrink-0" />
                    <span className="truncate">UPI Online</span>
                    {paymentMethod === 'UPI' && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
                  </button>
                </div>
              </div>

              {/* Overdue Alert & Waiver Toggle */}
              {isExpired && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold text-amber-700 dark:text-amber-400 block text-xs break-words">
                        Subscription Overdue by {daysOverdue} days
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5 leading-relaxed break-words">
                        {resetFromToday
                          ? 'Waiver active: Fresh cycle starts today. Overdue period is not billed.'
                          : 'Continuous cycle: Extends from previous due date so overdue days are covered.'}
                      </p>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 pt-2.5 border-t border-amber-500/20 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={resetFromToday}
                      onChange={(e) => setResetFromToday(e.target.checked)}
                      className="w-4 h-4 mt-0.5 shrink-0 rounded text-red-600 focus:ring-red-500 border-slate-300 dark:border-zinc-700 cursor-pointer accent-red-600"
                    />
                    <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 leading-snug min-w-0 flex-1 break-words">
                      Reset cycle from Today (Waiver for native visit / medical break)
                    </span>
                  </label>
                </div>
              )}

              {/* Date Preview */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800/80 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="text-slate-500 dark:text-zinc-400 font-semibold text-[10px] uppercase tracking-wider">
                    NEW VALIDITY EXPIRY:
                  </span>
                  {isExpired && !resetFromToday && (
                    <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Continuous Cycle
                    </span>
                  )}
                  {isExpired && resetFromToday && (
                    <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Waiver Applied
                    </span>
                  )}
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm block">
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    let baseDate = new Date(fighter.nextPaymentDate);
                    if (resetFromToday || isNaN(baseDate.getTime())) {
                      baseDate = today;
                    }
                    const newExpiry = new Date(baseDate);
                    newExpiry.setMonth(newExpiry.getMonth() + Number(months));
                    return newExpiry.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });
                  })()}
                </span>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium break-words">
                  {error}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 flex items-center justify-end gap-2.5 sm:gap-3 px-5 py-4 sm:px-6 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenew}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Confirm & Log Payment'
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
