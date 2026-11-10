import dbConnect from '@/lib/db';
import Fighter from '@/models/Fighter';
import Payment from '@/models/Payment';
import { sendPaymentSuccessWhatsApp } from '@/lib/whatsapp';
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

    // Extract duration months
    const durationMonths = Number(
      payload.metadata?.durationMonths ||
      payload.metadata?.months ||
      payload.metadata?.packageDurationMonths ||
      payload.durationMonths ||
      payload.months ||
      1
    );

    // Extract Amount (in INR)
    let amount = payload.amount || payload.metadata?.amount;
    if (!amount && payload.amountPaise) {
      amount = (Number(payload.amountPaise) / 100).toFixed(2);
    }
    if (!amount) {
      amount = durationMonths * 2000;
    }

    await dbConnect();

    // Find fighter
    const fighter = await Fighter.findById(fighterId);
    if (!fighter) {
      console.error(`[Payment Webhook] Fighter not found with ID: ${fighterId}`);
      return NextResponse.json({ error: 'Fighter profile not found' }, { status: 404 });
    }

    // Calculate new subscription date (Strict continuous renewal)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let baseDate = new Date(fighter.nextPaymentDate);
    if (isNaN(baseDate.getTime())) {
      baseDate = today;
    }

    const newPaymentDate = new Date(baseDate);
    newPaymentDate.setMonth(newPaymentDate.getMonth() + durationMonths);

    fighter.packageDurationMonths = durationMonths;
    fighter.nextPaymentDate = newPaymentDate;
    fighter.status = newPaymentDate >= today ? 'Active' : 'Expired';
    fighter.isInactive = false;

    await fighter.save();
    console.log(`[Payment Webhook] Successfully extended subscription for ${fighter.name} until ${newPaymentDate.toISOString()}`);

    // Record or update Payment ledger
    const transactionId = payload.utr || payload.paymentId || payload.id || `UPI_${Date.now()}`;
    let payment = await Payment.findOne({
      fighterId: fighter._id,
      status: 'Pending',
    }).sort({ createdAt: -1 });

    if (payment) {
      payment.status = 'Completed';
      payment.amount = Number(amount);
      payment.durationMonths = durationMonths;
      payment.expiryDate = newPaymentDate;
      payment.paymentMethod = payload.metadata?.method || 'UPI';
      if (payload.utr) payment.transactionId = payload.utr;
      payment.notes = `Auto-verified via Bank Webhook (${transactionId})`;
      await payment.save();
    } else {
      payment = await Payment.create({
        fighterId: fighter._id,
        fighterName: fighter.name,
        phone: fighter.phone,
        amount: Number(amount),
        durationMonths,
        paymentDate: new Date(),
        expiryDate: newPaymentDate,
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
          amount,
          durationMonths,
          nextPaymentDate: newPaymentDate,
          style: fighter.style || 'MMA',
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
      message: `Subscription for ${fighter.name} renewed for ${durationMonths} month(s).`,
      fighter: {
        id: fighter._id,
        name: fighter.name,
        status: fighter.status,
        nextPaymentDate: newPaymentDate,
        packageDurationMonths: durationMonths,
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
