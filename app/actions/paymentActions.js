'use server';

import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import Fighter from '@/models/Fighter';
import BankCredit from '@/models/BankCredit';
import User from '@/models/User';
import { getCurrentUser } from './authActions';
import { revalidatePath } from 'next/cache';
import { sendPaymentSuccessWhatsApp } from '@/lib/whatsapp';

/**
 * Fetch payments with filtering, search, and summary analytics.
 */
export async function getPayments(filters = {}) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { error: 'Unauthorized' };
    }

    const query = {};

    // Coaches only view payments for their assigned fighters
    if (currentUser.role === 'Coach') {
      const assignedFighters = await Fighter.find({ assignedCoach: currentUser.id }).select('_id').lean();
      const fighterIds = assignedFighters.map(f => f._id);
      query.fighterId = { $in: fighterIds };
    }

    if (filters.fighterId) {
      query.fighterId = filters.fighterId;
    }

    if (filters.search && filters.search.trim()) {
      query.fighterName = { $regex: filters.search.trim(), $options: 'i' };
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'All') {
      query.paymentMethod = filters.paymentMethod;
    }

    if (filters.status && filters.status !== 'All') {
      query.status = filters.status;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1, paymentDate: -1 })
      .lean();

    // Calculate aggregated stats across the matching set (or all accessible)
    let totalRevenue = 0;
    let upiRevenue = 0;
    let cashRevenue = 0;
    let totalTransactions = payments.length;

    const serializedPayments = payments.map((p) => {
      const amt = Number(p.amount) || 0;
      if (p.status === 'Completed') {
        totalRevenue += amt;
        if (p.paymentMethod === 'UPI' || p.paymentMethod === 'YouPI') {
          upiRevenue += amt;
        } else if (p.paymentMethod === 'Cash') {
          cashRevenue += amt;
        }
      }

      return {
        _id: p._id.toString(),
        fighterId: p.fighterId ? p.fighterId.toString() : null,
        fighterName: p.fighterName || 'Unknown Fighter',
        phone: p.phone || '',
        amount: amt,
        durationMonths: p.durationMonths || 1,
        paymentDate: p.paymentDate ? p.paymentDate.toISOString() : null,
        expiryDate: p.expiryDate ? p.expiryDate.toISOString() : null,
        paymentMethod: p.paymentMethod || 'UPI',
        transactionId: p.transactionId || '',
        status: p.status || 'Completed',
        notes: p.notes || '',
        createdAt: p.createdAt ? p.createdAt.toISOString() : null,
      };
    });

    return {
      success: true,
      payments: serializedPayments,
      stats: {
        totalRevenue,
        upiRevenue,
        cashRevenue,
        totalTransactions,
      },
    };
  } catch (err) {
    console.error('Error fetching payments:', err);
    return { error: 'Failed to fetch payments ledger' };
  }
}

/**
 * Fetch payments specific to one fighter.
 */
export async function getFighterPayments(fighterId) {
  try {
    await dbConnect();

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { error: 'Unauthorized' };
    }

    // If currentUser is a Fighter, they can only view their own payments
    if (currentUser.role === 'Fighter' && currentUser.id !== fighterId) {
      return { error: 'Unauthorized to view this payment history' };
    }

    const payments = await Payment.find({ fighterId })
      .sort({ paymentDate: -1 })
      .lean();

    const serialized = payments.map((p) => ({
      _id: p._id.toString(),
      fighterId: p.fighterId.toString(),
      fighterName: p.fighterName,
      phone: p.phone || '',
      amount: Number(p.amount) || 0,
      durationMonths: p.durationMonths || 1,
      paymentDate: p.paymentDate ? p.paymentDate.toISOString() : null,
      expiryDate: p.expiryDate ? p.expiryDate.toISOString() : null,
      paymentMethod: p.paymentMethod || 'UPI',
      transactionId: p.transactionId || '',
      status: p.status || 'Completed',
      notes: p.notes || '',
    }));

    return { success: true, payments: serialized };
  } catch (err) {
    console.error('Error fetching fighter payments:', err);
    return { error: 'Failed to fetch payment records' };
  }
}

/**
 * Submit an online renewal claim (Status: Pending) awaiting robot or coach verification.
 */
export async function submitPendingRenewal({ fighterId, durationMonths, amount, utr = '', paymentMethod = 'UPI' }) {
  try {
    await dbConnect();

    const fighter = await Fighter.findById(fighterId);
    if (!fighter) {
      return { error: 'Fighter not found' };
    }

    const duration = Number(durationMonths) || 1;
    const cleanAmount = Number(amount) || 1300;
    const cleanUtr = String(utr || '').trim();

    // Check if matching bank credit already arrived via Bank Robot (Axis/SBI)
    if (cleanUtr) {
      const existingCredit = await BankCredit.findOne({ utr: cleanUtr, claimed: false });
      if (existingCredit) {
        // Instant approval because the bank already confirmed the credit!
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let baseDate = new Date(fighter.nextPaymentDate);
        if (isNaN(baseDate.getTime())) {
          baseDate = today;
        }

        const newPaymentDate = new Date(baseDate);
        newPaymentDate.setMonth(newPaymentDate.getMonth() + duration);

        fighter.packageDurationMonths = duration;
        fighter.nextPaymentDate = newPaymentDate;
        fighter.status = newPaymentDate >= today ? 'Active' : 'Expired';
        fighter.isInactive = false;
        await fighter.save();

        const payment = await Payment.create({
          fighterId: fighter._id,
          fighterName: fighter.name,
          phone: fighter.phone,
          amount: cleanAmount,
          durationMonths: duration,
          paymentDate: new Date(),
          expiryDate: newPaymentDate,
          paymentMethod: paymentMethod || 'UPI',
          transactionId: cleanUtr,
          status: 'Completed',
          notes: `Instant Auto-Approved via Bank Robot (${existingCredit.bank || 'UPI'})`,
        });

        existingCredit.claimed = true;
        existingCredit.claimedByFighterId = fighter._id;
        existingCredit.claimedPaymentId = payment._id;
        await existingCredit.save();

        if (fighter.phone) {
          try {
            await sendPaymentSuccessWhatsApp({
              phone: fighter.phone,
              name: fighter.name,
              amount: cleanAmount,
              durationMonths: duration,
              nextPaymentDate: newPaymentDate,
              style: fighter.style || 'MMA',
            });
          } catch (waErr) {
            console.error('Failed to dispatch WhatsApp receipt:', waErr);
          }
        }

        revalidatePath('/admin');
        revalidatePath('/admin/payments');
        revalidatePath(`/renew/${fighter._id}`);

        return {
          success: true,
          paymentId: payment._id.toString(),
          instantApproved: true,
          fighterStatus: fighter.status,
          expiryDate: newPaymentDate.toISOString(),
        };
      }
    }

    // Check if an identical pending claim was already submitted in the last 10 minutes
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const existingPending = await Payment.findOne({
      fighterId: fighter._id,
      status: 'Pending',
      createdAt: { $gte: tenMinsAgo },
    });

    if (existingPending) {
      // Update existing pending claim with the latest UTR/amount
      existingPending.amount = cleanAmount;
      existingPending.durationMonths = duration;
      if (cleanUtr) existingPending.transactionId = cleanUtr;
      existingPending.notes = cleanUtr ? `UTR: ${cleanUtr} (Submitted online)` : 'Submitted online, awaiting verification';
      await existingPending.save();

      revalidatePath('/admin');
      revalidatePath('/admin/payments');
      return { success: true, paymentId: existingPending._id.toString(), isExisting: true };
    }

    const payment = await Payment.create({
      fighterId: fighter._id,
      fighterName: fighter.name,
      phone: fighter.phone,
      amount: cleanAmount,
      durationMonths: duration,
      paymentDate: new Date(),
      paymentMethod: paymentMethod || 'UPI',
      transactionId: cleanUtr || `CLAIM_${Date.now()}`,
      status: 'Pending',
      notes: cleanUtr ? `UTR: ${cleanUtr} (Submitted online)` : 'Submitted online, awaiting verification',
    });

    revalidatePath('/admin');
    revalidatePath('/admin/payments');

    return { success: true, paymentId: payment._id.toString() };
  } catch (err) {
    console.error('Failed to submit pending renewal:', err);
    return { error: 'Failed to submit renewal claim.' };
  }
}

/**
 * 1-Click Approve a pending payment (by Coach/Admin or Automated Robot).
 */
export async function approvePendingPayment(paymentId) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return { error: 'Payment record not found' };
    }

    if (payment.status === 'Completed') {
      return { success: true, message: 'Payment is already approved and completed.' };
    }

    const fighter = await Fighter.findById(payment.fighterId);
    if (!fighter) {
      return { error: 'Associated fighter profile not found' };
    }

    if (user.role === 'Coach' && fighter.assignedCoach?.toString() !== user.id) {
      return { error: 'Unauthorized: you can only approve payments for your assigned fighters' };
    }

    // Strict continuous renewal calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let baseDate = new Date(fighter.nextPaymentDate);
    if (isNaN(baseDate.getTime())) {
      baseDate = today;
    }

    const newPaymentDate = new Date(baseDate);
    newPaymentDate.setMonth(newPaymentDate.getMonth() + (payment.durationMonths || 1));

    fighter.packageDurationMonths = payment.durationMonths || 1;
    fighter.nextPaymentDate = newPaymentDate;
    fighter.status = newPaymentDate >= today ? 'Active' : 'Expired';
    fighter.isInactive = false;
    await fighter.save();

    // Mark payment as Completed
    payment.status = 'Completed';
    payment.expiryDate = newPaymentDate;
    payment.notes = `${payment.notes || ''} [Approved by ${user.name || user.role}]`.trim();
    await payment.save();

    // Dispatch official WhatsApp payment receipt
    if (fighter.phone) {
      try {
        await sendPaymentSuccessWhatsApp({
          phone: fighter.phone,
          name: fighter.name,
          amount: payment.amount,
          durationMonths: payment.durationMonths,
          nextPaymentDate: newPaymentDate,
          style: fighter.style || 'MMA',
        });
      } catch (waErr) {
        console.error('Failed to dispatch WhatsApp receipt on approval:', waErr);
      }
    }

    revalidatePath('/admin');
    revalidatePath('/admin/payments');
    revalidatePath(`/renew/${fighter._id}`);

    return {
      success: true,
      fighterName: fighter.name,
      newExpiryDate: newPaymentDate.toISOString(),
      amount: payment.amount,
    };
  } catch (err) {
    console.error('Error approving pending payment:', err);
    return { error: 'Failed to approve payment' };
  }
}

/**
 * 1-Click Reject a fake or unverified claim.
 */
export async function rejectPendingPayment(paymentId, reason = '') {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return { error: 'Payment not found' };
    }

    payment.status = 'Failed';
    payment.notes = `${payment.notes || ''} [Rejected by ${user.name || user.role}: ${reason || 'Unverified'}]`.trim();
    await payment.save();

    revalidatePath('/admin');
    revalidatePath('/admin/payments');

    return { success: true };
  } catch (err) {
    console.error('Error rejecting payment:', err);
    return { error: 'Failed to reject payment' };
  }
}

/**
 * Polling check endpoint called by fighter checkout screen to auto-sense approval.
 */
export async function checkPaymentStatus(paymentId) {
  try {
    await dbConnect();
    const payment = await Payment.findById(paymentId).lean();
    if (!payment) {
      return { error: 'Payment record not found' };
    }

    const fighter = await Fighter.findById(payment.fighterId).select('status nextPaymentDate name phone photo').lean();

    return {
      success: true,
      status: payment.status, // 'Pending', 'Completed', 'Failed'
      expiryDate: payment.expiryDate ? payment.expiryDate.toISOString() : null,
      fighterStatus: fighter?.status || 'Active',
      fighterNextPaymentDate: fighter?.nextPaymentDate ? fighter.nextPaymentDate.toISOString() : null,
    };
  } catch (err) {
    return { error: 'Failed to check status' };
  }
}

/**
 * Trigger or simulate a bank credit (Axis, SBI, UPI) to test or manually feed the robot.
 */
export async function triggerRobotBankCredit({ utr, amount, bank = 'Axis Bank', rawMessage = '' }) {
  try {
    await dbConnect();

    const cleanUtr = String(utr || '').trim() || `ROBOT_${Date.now()}`;
    const cleanAmount = Number(amount) || 1300;

    // Check or create bank credit
    let bankCredit = await BankCredit.findOne({ utr: cleanUtr });
    if (!bankCredit) {
      bankCredit = await BankCredit.create({
        utr: cleanUtr,
        amount: cleanAmount,
        bank,
        rawMessage: rawMessage || `Simulated ${bank} Credit: ₹${cleanAmount}`,
        claimed: false,
      });
    }

    // Match with pending payment
    let pendingPayment = await Payment.findOne({
      transactionId: cleanUtr,
      status: 'Pending',
    });

    if (!pendingPayment && cleanAmount > 0) {
      const fortyFiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000);
      pendingPayment = await Payment.findOne({
        status: 'Pending',
        amount: cleanAmount,
        createdAt: { $gte: fortyFiveMinsAgo },
      }).sort({ createdAt: -1 });
    }

    if (pendingPayment) {
      const fighter = await Fighter.findById(pendingPayment.fighterId);
      if (!fighter) {
        return { error: 'Athlete profile not found for pending payment' };
      }

      if (pendingPayment.status === 'Completed') {
        return { success: true, message: 'Payment already completed', alreadyDone: true };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let baseDate = new Date(fighter.nextPaymentDate);
      if (isNaN(baseDate.getTime())) {
        baseDate = today;
      }

      const durationMonths = pendingPayment.durationMonths || 1;
      const newPaymentDate = new Date(baseDate);
      newPaymentDate.setMonth(newPaymentDate.getMonth() + durationMonths);

      fighter.packageDurationMonths = durationMonths;
      fighter.nextPaymentDate = newPaymentDate;
      fighter.status = newPaymentDate >= today ? 'Active' : 'Expired';
      fighter.isInactive = false;
      await fighter.save();

      pendingPayment.status = 'Completed';
      pendingPayment.expiryDate = newPaymentDate;
      pendingPayment.transactionId = cleanUtr;
      pendingPayment.notes = `Auto-activated by Robot (${bank} UTR: ${cleanUtr})`.trim();
      await pendingPayment.save();

      bankCredit.claimed = true;
      bankCredit.claimedByFighterId = fighter._id;
      bankCredit.claimedPaymentId = pendingPayment._id;
      await bankCredit.save();

      if (fighter.phone) {
        try {
          await sendPaymentSuccessWhatsApp({
            phone: fighter.phone,
            name: fighter.name,
            amount: cleanAmount,
            durationMonths,
            nextPaymentDate: newPaymentDate,
            style: fighter.style || 'MMA',
          });
        } catch (waErr) {
          console.error('[Bank Robot] Failed to dispatch WhatsApp receipt:', waErr);
        }
      }

      revalidatePath('/admin');
      revalidatePath('/admin/payments');
      revalidatePath(`/renew/${fighter._id}`);

      return {
        success: true,
        matched: true,
        fighterName: fighter.name,
        newExpiryDate: newPaymentDate.toISOString(),
        amount: cleanAmount,
        utr: cleanUtr,
      };
    }

    return {
      success: true,
      matched: false,
      message: 'Bank credit logged in registry. Awaiting matching athlete claim or coach approval.',
      utr: cleanUtr,
      amount: cleanAmount,
    };
  } catch (err) {
    console.error('Robot bank trigger error:', err);
    return { error: err.message || 'Robot trigger failed' };
  }
}


