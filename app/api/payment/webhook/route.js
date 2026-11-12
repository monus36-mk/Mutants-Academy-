import dbConnect from '@/lib/db';
import Fighter from '@/models/Fighter';
import Payment from '@/models/Payment';
import { sendPaymentSuccessWhatsApp } from '@/lib/whatsapp';
import { applyCompletedPaymentToFighter } from '@/lib/paymentLifecycle';
import { resolveFighterPackFee } from '@/lib/utils';
import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Payment Webhook
 */
export async function GET() {
  return NextResponse.json({
    status: 'ONLINE',
    service: 'Mutants Academy UPI Payment Gateway Webhook (YouPI-PG)',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handles incoming POST webhooks from YouPI-PG / UPI payment systems.
 */
export async function POST(request) {
  try {
    // Optional webhook signature / secret validation
    const webhookSecret = process.env.YOUPI_WEBHOOK_SECRET;
    if (webhookSecret) {
      const incomingSecret =
        request.headers.get('x-webhook-secret') ||
        request.headers.get('x-youpi-secret') ||
        new URL(request.url).searchParams.get('secret');

      if (incomingSecret !== webhookSecret) {
        console.warn('[Payment Webhook] Unauthorized webhook attempt: secret mismatch');
        return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
      }
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    console.log('[Payment Webhook] Received webhook event:', JSON.stringify(payload, null, 2));

    // Normalize payment status across possible YouPI-PG / UPI gateway event schemas
    const rawStatus = (
      payload.event ||
      payload.status ||
      payload.data?.status ||
      payload.payment?.status ||
      ''
    ).toString().toUpperCase().trim();

    const isSuccess = [
      'SUCCESS',
      'OBSERVED_SUCCESS',
      'VERIFIED',
      'PAID',
      'COMPLETED',
      'RECONCILED'
    ].includes(rawStatus) || rawStatus.includes('SUCCESS') || rawStatus.includes('VERIF');

    if (!isSuccess) {
      console.log(`[Payment Webhook] Event ignored (status not a success milestone: "${rawStatus}")`);
      return NextResponse.json({
        success: true,
        message: `Webhook event acknowledged with status: ${rawStatus || 'NON_SUCCESS'}`,
      });
    }

    // Extract Fighter ID
    let rawFighterId =
      payload.metadata?.fighterId ||
      payload.metadata?.fighter_id ||
      payload.fighterId ||
      payload.fighter_id ||
      payload.custom_fields?.fighterId ||
      payload.orderId ||
      payload.order_id ||
      payload.orderRef;

    if (!rawFighterId) {
      console.warn('[Payment Webhook] Missing fighter ID in webhook metadata/orderId');
      return NextResponse.json({ error: 'Missing fighterId in webhook payload' }, { status: 400 });
    }

    // Clean prefixed order IDs (e.g., "RENEW_653abc..." -> "653abc...")
    const fighterId = String(rawFighterId).replace(/^RENEW[_-]/i, '').trim();

    // Extract duration months (preserve explicit 0 for pending fee settlement)
    const rawDuration =
      payload.metadata?.durationMonths ??
      payload.metadata?.months ??
      payload.metadata?.packageDurationMonths ??
      payload.durationMonths ??
      payload.months;
    const durationMonths =
      rawDuration !== undefined && rawDuration !== null && String(rawDuration).trim() !== ''
        ? Number(rawDuration)
        : 1;
    const isSettlement = durationMonths === 0 || payload.metadata?.paymentType === 'Balance Settlement';

    // Extract Amount (in INR)
    let amount = payload.amount || payload.metadata?.amount;
    if (!amount && payload.amountPaise) {
      amount = (Number(payload.amountPaise) / 100).toFixed(2);
    }

    await dbConnect();

    // Find fighter
    const fighter = await Fighter.findById(fighterId);
    if (!fighter) {
      console.error(`[Payment Webhook] Fighter not found with ID: ${fighterId}`);
      return NextResponse.json({ error: 'Fighter profile not found' }, { status: 404 });
    }

    if (!amount) {
      amount = isSettlement
        ? Math.max(0, Number(fighter.pendingBalance) || 0) || resolveFighterPackFee(fighter, 1)
        : resolveFighterPackFee(fighter, durationMonths || 1);
    }

    const outcome = applyCompletedPaymentToFighter(fighter, {
      amount: Number(amount),
      durationMonths: isSettlement ? 0 : durationMonths,
      paymentType: isSettlement ? 'Balance Settlement' : 'Renewal',
    });

    await fighter.save();
    console.log(`[Payment Webhook] Processed payment for ${fighter.name}`);

    // Record or update Payment ledger
    const transactionId = payload.utr || payload.paymentId || payload.id || `UPI_${Date.now()}`;
    let payment = await Payment.findOne({
      fighterId: fighter._id,
      status: 'Pending',
    }).sort({ createdAt: -1 });

    if (payment) {
      payment.status = 'Completed';
      payment.amount = outcome.paidAmount;
      payment.expectedAmount = payment.expectedAmount ?? outcome.expectedAmount;
      payment.paymentType = outcome.paymentType;
      payment.durationMonths = outcome.durationMonths;
      payment.expiryDate = outcome.nextPaymentDate || fighter.nextPaymentDate;
      payment.paymentMethod = payload.metadata?.method || 'UPI';
      if (payload.utr) payment.transactionId = payload.utr;
      payment.notes = `Auto-verified via Bank Webhook (${transactionId})`;
      await payment.save();
    } else {
      payment = await Payment.create({
        fighterId: fighter._id,
        fighterName: fighter.name,
        phone: fighter.phone,
        amount: outcome.paidAmount,
        expectedAmount: outcome.expectedAmount,
        paymentType: outcome.paymentType,
        durationMonths: outcome.durationMonths,
        paymentDate: new Date(),
        expiryDate: outcome.nextPaymentDate || fighter.nextPaymentDate,
        paymentMethod: payload.metadata?.method || 'UPI',
        transactionId,
        status: 'Completed',
        notes: `Auto-verified via Bank Webhook (${transactionId})`,
      });
    }

    // Dispatch official WhatsApp payment & renewal receipt
    let whatsappDispatched = false;
    let whatsappError = null;

    if (fighter.phone) {
      try {
        const waRes = await sendPaymentSuccessWhatsApp({
          phone: fighter.phone,
          name: fighter.name,
          amount: outcome.paidAmount,
          durationMonths: outcome.durationMonths,
          nextPaymentDate: outcome.nextPaymentDate || fighter.nextPaymentDate,
          style: fighter.style || 'MMA',
          paymentType: outcome.paymentType,
          expectedAmount: outcome.expectedAmount,
          remainingBalance: outcome.newPendingBalance,
        });

        whatsappDispatched = Boolean(waRes.success);
        if (!waRes.success) {
          whatsappError = waRes.error;
        }
      } catch (waErr) {
        console.error('[Payment Webhook] WhatsApp dispatch error:', waErr);
        whatsappError = waErr.message;
      }
    }

    return NextResponse.json({
      success: true,
      message: outcome.isSettlement
        ? `Pending fee settled for ${fighter.name}.`
        : `Subscription for ${fighter.name} renewed for ${outcome.durationMonths} month(s).`,
      fighter: {
        id: fighter._id,
        name: fighter.name,
        status: fighter.status,
        nextPaymentDate: outcome.nextPaymentDate || fighter.nextPaymentDate,
        packageDurationMonths: fighter.packageDurationMonths,
        pendingBalance: outcome.newPendingBalance,
      },
      whatsappDispatched,
      whatsappError,
      utr: payload.utr || null,
      paymentId: payload.paymentId || payload.id || null,
    });
  } catch (err) {
    console.error('[Payment Webhook Error] Failed to process webhook:', err);
    return NextResponse.json(
      { error: 'Internal server error while processing webhook', details: err.message },
      { status: 500 }
    );
  }
}
