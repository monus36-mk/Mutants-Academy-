'use client';

import { useState } from 'react';
import { getDefaultQuarterlyFee, resolveFighterFees, DEFAULT_MONTHLY_FEE } from '@/lib/utils';

/**
 * Shared form fields for selecting Package Duration (1 or 3 Months) with a single
 * dynamic agreed-fee input slot that automatically tracks the selected duration.
 */
export default function PackagePricingFields({
  duration,
  onDurationChange,
  initialMonthlyFee = DEFAULT_MONTHLY_FEE,
  initialQuarterlyFee = null,
}) {
  const initialFees = resolveFighterFees({
    monthlyFee: initialMonthlyFee,
    quarterlyFee: initialQuarterlyFee,
  });

  const hasSavedCustomQuarterly =
    initialQuarterlyFee !== null &&
    initialQuarterlyFee !== undefined &&
    initialQuarterlyFee !== '' &&
    Number(initialQuarterlyFee) !== getDefaultQuarterlyFee(initialFees.monthlyFee);

  const [monthlyFee, setMonthlyFee] = useState(String(initialFees.monthlyFee));
  const [quarterlyFee, setQuarterlyFee] = useState(String(initialFees.quarterlyFee));
  const [isQuarterlyCustom, setIsQuarterlyCustom] = useState(hasSavedCustomQuarterly);

  const isLegacyDuration = duration !== 1 && duration !== 3;
  const isQuarterlySelected = duration === 3;

  const parsedMonthly = Number(monthlyFee);
  const autoQuarterly = getDefaultQuarterlyFee(
    monthlyFee !== '' && Number.isFinite(parsedMonthly) && parsedMonthly >= 0
      ? parsedMonthly
      : DEFAULT_MONTHLY_FEE
  );

  const activeValue = isQuarterlySelected ? quarterlyFee : monthlyFee;
  const activeLabel = isQuarterlySelected
    ? '3 Months Agreed Fee (₹) *'
    : duration === 1
    ? '1 Month Agreed Fee (₹) *'
    : `Agreed Monthly Fee (${duration}M Pack) (₹) *`;

  const handleActiveFeeChange = (val) => {
    if (isQuarterlySelected) {
      setIsQuarterlyCustom(true);
      setQuarterlyFee(val);
      return;
    }

    setMonthlyFee(val);
    if (!isQuarterlyCustom) {
      const nextNum = Number(val);
      const nextBase = val !== '' && Number.isFinite(nextNum) && nextNum >= 0 ? nextNum : DEFAULT_MONTHLY_FEE;
      setQuarterlyFee(String(getDefaultQuarterlyFee(nextBase)));
    }
  };

  const handleResetQuarterly = () => {
    setIsQuarterlyCustom(false);
    setQuarterlyFee(String(autoQuarterly));
  };

  return (
    <>
      {/* Package Duration */}
      <div>
        <label
          htmlFor="packageDurationMonths"
          className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5"
        >
          Package Duration *
        </label>
        <select
          id="packageDurationMonths"
          name="packageDurationMonths"
          required
          value={duration}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold"
        >
          <option value={1}>1 Month</option>
          <option value={3}>3 Months</option>
          {isLegacyDuration && <option value={duration}>{duration} Months (Current)</option>}
        </select>
      </div>

      {/* Single Dynamic Agreed Fee Slot */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label
            htmlFor="agreedFeeInput"
            className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400"
          >
            {activeLabel}
          </label>
          {isQuarterlySelected && isQuarterlyCustom && (
            <button
              type="button"
              onClick={handleResetQuarterly}
              className="text-[10px] font-bold uppercase text-slate-500 hover:text-red-500 underline cursor-pointer shrink-0"
              title={`Reset to ₹${autoQuarterly}`}
            >
              Reset
            </button>
          )}
        </div>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-sm font-bold text-slate-400 dark:text-zinc-500 pointer-events-none select-none z-10">
            ₹
          </span>
          <input
            id="agreedFeeInput"
            type="number"
            min="0"
            step="any"
            required
            value={activeValue}
            onChange={(e) => handleActiveFeeChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold font-mono"
            style={{ paddingLeft: '2.5rem' }}
            placeholder={isQuarterlySelected ? '4000' : '1300'}
          />
        </div>
        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
          {isQuarterlySelected
            ? `Standard 3-mo rate is ₹4,000 (1-mo rate: ₹${Number(monthlyFee || 0).toLocaleString('en-IN')}). Custom rate applies to this fighter.`
            : `Standard 1-mo rate is ₹1,300 (3-mo pack: ₹${Number(quarterlyFee || 0).toLocaleString('en-IN')}). Custom rate applies to this fighter.`}
        </p>

        {/* Submit both agreed fees cleanly without duplicate form keys */}
        <input type="hidden" name="monthlyFee" value={monthlyFee} />
        <input type="hidden" name="quarterlyFee" value={quarterlyFee} />
      </div>
    </>
  );
}
