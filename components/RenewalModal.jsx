'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { renewFighterSubscription } from '@/app/actions/fighterActions';
import { RefreshCw, Calendar, X } from 'lucide-react';

export default function RenewalModal({ fighter }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [months, setMonths] = useState(1);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setMonths(fighter.packageDurationMonths || 1);
    setError('');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleRenew = () => {
    setError('');
    startTransition(async () => {
      const res = await renewFighterSubscription(fighter._id, months);
      if (res.error) {
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

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-zinc-100">
                Renew Subscription
              </h3>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-zinc-400">
                Extend subscription for fighter <span className="font-bold text-slate-800 dark:text-zinc-200">{fighter.name}</span>.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
                  Renewal Package Duration
                </label>
                <select
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-semibold transition-all"
                >
                  <option value={1}>1 Month</option>
                  <option value={2}>2 Months</option>
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months (1 Year)</option>
                </select>
              </div>

              {/* Date Preview */}
              <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-900/50 text-xs">
                <span className="text-slate-500 dark:text-zinc-400 font-semibold block mb-1">
                  NEW EXPIRY PREVIEW:
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">
                  {(() => {
                    const today = new Date();
                    let baseDate = new Date(fighter.nextPaymentDate);
                    // If already expired, start from today
                    if (baseDate < today) {
                      baseDate = today;
                    }
                    const newExpiry = new Date(baseDate);
                    newExpiry.setMonth(newExpiry.getMonth() + Number(months));
                    return newExpiry.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    });
                  })()}
                </span>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
                  {error}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenew}
                disabled={isPending}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Confirm Renewal'
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
