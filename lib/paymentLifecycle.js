import { calculateStatus, resolveFighterPackFee } from './utils.js';

function normalizeMoney(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.round(num * 100) / 100;
}

/**
 * Resolves financials for a 1M / 3M package renewal, handling partial fee shortfalls
 * (recorded into pendingBalance unless waived) and excess payments clearing prior dues.
 */
export function resolveRenewalFinancials(
  fighter,
  { durationMonths, paidAmount, keepShortfallAsDue = true, feeNote }
) {
  const expectedAmount = resolveFighterPackFee(fighter, durationMonths);
  const currentPending = normalizeMoney(fighter?.pendingBalance, 0);

  let actualPaid = normalizeMoney(paidAmount, 0);
  if (actualPaid <= 0) {
    actualPaid = expectedAmount;
  }

  let newPendingBalance = currentPending;
  let shortfallAdded = 0;
  let clearedFromExcess = 0;
  let paymentType = 'Renewal';

  if (actualPaid < expectedAmount) {
    const shortfall = normalizeMoney(expectedAmount - actualPaid, 0);
    if (keepShortfallAsDue && shortfall > 0) {
      shortfallAdded = shortfall;
      newPendingBalance = normalizeMoney(currentPending + shortfall, 0);
      paymentType = 'Partial Renewal';
    }
  } else if (actualPaid > expectedAmount && currentPending > 0) {
    const excess = normalizeMoney(actualPaid - expectedAmount, 0);
    clearedFromExcess = Math.min(currentPending, excess);
    newPendingBalance = normalizeMoney(Math.max(0, currentPending - clearedFromExcess), 0);
  }

  let nextPendingFeeNote = fighter?.pendingFeeNote ? String(fighter.pendingFeeNote).trim() : '';
  if (newPendingBalance === 0) {
    nextPendingFeeNote = '';
  } else if (typeof feeNote === 'string' && feeNote.trim() !== '') {
    nextPendingFeeNote = feeNote.trim();
  }

  return {
    expectedAmount,
    actualPaid,
    currentPending,
    newPendingBalance,
    shortfallAdded,
    clearedFromExcess,
    paymentType,
    nextPendingFeeNote,
  };
}

/**
 * Resolves financials for collecting an outstanding balance without adding package duration.
 */
export function resolveBalanceSettlement(fighter, { paidAmount, feeNote }) {
  const currentPending = normalizeMoney(fighter?.pendingBalance, 0);
  const actualPaid = normalizeMoney(paidAmount, 0);
  const newPendingBalance = normalizeMoney(Math.max(0, currentPending - actualPaid), 0);

  let nextPendingFeeNote = fighter?.pendingFeeNote ? String(fighter.pendingFeeNote).trim() : '';
  if (newPendingBalance === 0) {
    nextPendingFeeNote = '';
  } else if (typeof feeNote === 'string') {
    const trimmed = feeNote.trim();
    if (trimmed !== '') nextPendingFeeNote = trimmed;
  }

  return {
    expectedAmount: currentPending > 0 ? currentPending : actualPaid,
    actualPaid,
    currentPending,
    newPendingBalance,
    paymentType: 'Balance Settlement',
    nextPendingFeeNote,
  };
}

/**
 * Mutates a fighter object/document when a payment is completed (direct admin renewal,
 * partial balance settlement, UPI verification approval, or automated bank credit).
 */
export function applyCompletedPaymentToFighter(
  fighter,
  {
    amount,
    durationMonths,
    paymentType,
    resetFromToday = false,
    keepShortfallAsDue = true,
    feeNote,
  }
) {
  const parsedDuration = Number(durationMonths);
  const isSettlement = paymentType === 'Balance Settlement' || parsedDuration === 0;

  if (isSettlement) {
    const settlement = resolveBalanceSettlement(fighter, {
      paidAmount: amount,
      feeNote,
    });

    fighter.pendingBalance = settlement.newPendingBalance;
    fighter.pendingFeeNote = settlement.nextPendingFeeNote;
    fighter.status = calculateStatus(fighter.nextPaymentDate);
    fighter.isInactive = false;

    return {
      isSettlement: true,
      durationMonths: 0,
      paymentType: 'Balance Settlement',
      expectedAmount: settlement.expectedAmount,
      paidAmount: settlement.actualPaid,
      previousPendingBalance: settlement.currentPending,
      newPendingBalance: settlement.newPendingBalance,
      shortfallAdded: 0,
      clearedFromExcess: Math.min(settlement.currentPending, settlement.actualPaid),
      nextPaymentDate: fighter.nextPaymentDate ? new Date(fighter.nextPaymentDate) : null,
    };
  }

  const effectiveDuration = Number.isInteger(parsedDuration) && parsedDuration > 0 ? parsedDuration : 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let baseDate = new Date(fighter.nextPaymentDate);
  if (resetFromToday || isNaN(baseDate.getTime())) {
    baseDate = new Date(today);
  }

  const newPaymentDate = new Date(baseDate);
  newPaymentDate.setMonth(newPaymentDate.getMonth() + effectiveDuration);

  const financials = resolveRenewalFinancials(fighter, {
    durationMonths: effectiveDuration,
    paidAmount: amount,
    keepShortfallAsDue,
    feeNote,
  });

  fighter.packageDurationMonths = effectiveDuration;
  fighter.nextPaymentDate = newPaymentDate;
  fighter.status = calculateStatus(newPaymentDate);
  fighter.isInactive = false;
  fighter.pendingBalance = financials.newPendingBalance;
  fighter.pendingFeeNote = financials.nextPendingFeeNote;

  return {
    isSettlement: false,
    durationMonths: effectiveDuration,
    paymentType: financials.paymentType,
    expectedAmount: financials.expectedAmount,
    paidAmount: financials.actualPaid,
    previousPendingBalance: financials.currentPending,
    newPendingBalance: financials.newPendingBalance,
    shortfallAdded: financials.shortfallAdded,
    clearedFromExcess: financials.clearedFromExcess,
    nextPaymentDate: newPaymentDate,
  };
}

