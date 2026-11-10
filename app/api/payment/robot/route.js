import dbConnect from '@/lib/db';
import Fighter from '@/models/Fighter';
import Payment from '@/models/Payment';
import BankCredit from '@/models/BankCredit';
import { sendPaymentSuccessWhatsApp } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Health-check & status endpoint for Bank Robot Trigger
 */
export async function GET() {
  await dbConnect();
  const recentCredits = await BankCredit.find().sort({ createdAt: -1 }).limit(10).lean();
  return NextResponse.json({
    status: 'ONLINE',
    service: 'Mutants Academy Automated Bank Robot Trigger (Axis & SBI)',
    timestamp: new Date().toISOString(),
    recentCreditsCount: recentCredits.length,
    recentCredits: recentCredits.map(c => ({
      utr: c.utr,
      amount: c.amount,
      bank: c.bank,
      claimed: c.claimed,
      createdAt: c.createdAt,
    })),
  });
}

/**
 * Smart Regex Parser for Indian Bank UPI Credits (Axis, SBI, HDFC, ICICI, etc.)
 */
function parseBankMessage(text) {
  if (!text || typeof text !== 'string') return {};

  const clean = text.replace(/,/g, '');

  // 1. Extract 12-digit UPI UTR / RRN
  let utr = null;
  // Match explicit UTR / Ref patterns first
  const utrExplicitMatch = clean.match(/(?:UTR|Ref|rrn|upi ref|txn id|ref no|UPI\/CR)[\s/:]*([0-9]{12})/i);
  if (utrExplicitMatch) {
    utr = utrExplicitMatch[1];
  } else {
    // Fallback: any standalone 12-digit number
    const standaloneMatch = clean.match(/\b([0-9]{12})\b/);
    if (standaloneMatch) {
      utr = standaloneMatch[1];
    }
  }

  // 2. Extract Amount
  let amount = null;
  const amountMatch =
    clean.match(/(?:credited\s+(?:by|with)|received|credited|cr|deposit)\s+(?:Rs\.?|INR|₹)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i) ||
    clean.match(/(?:Rs\.?|INR|₹)\s*([0-9]+(?:\.[0-9]{1,2})?)\s+(?:credited|received)/i) ||
    clean.match(/(?:Rs\.?|INR|₹)\s*([0-9]+(?:\.[0-9]{1,2})?)/i);

  if (amountMatch) {
    amount = parseFloat(amountMatch[1]);
  }

  // 3. Detect Bank
  let bank = 'UPI';
  const lower = clean.toLowerCase();
  if (lower.includes('axis')) bank = 'Axis Bank';
  else if (lower.includes('sbi') || lower.includes('state bank')) bank = 'SBI';
  else if (lower.includes('icici')) bank = 'ICICI Bank';
  else if (lower.includes('hdfc')) bank = 'HDFC Bank';

  // 4. Extract sender name if present
  let senderInfo = '';
  const senderMatch = clean.match(/(?:by|from)\s+([A-Za-z\s]+?)(?:\s+on|\s+\(UTR|\s+via|\.|$)/i);
  if (senderMatch && senderMatch[1]) {
    senderInfo = senderMatch[1].trim();
  }

  return { utr, amount, bank, senderInfo };
}

/**
 * Handles incoming Bank triggers (SMS forwarder, Gmail webhook, or direct API trigger)
 */
export async function POST(request) {
  try {
    await dbConnect();

    let body = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.json().catch(() => ({}));
    } else {
      const rawText = await request.text().catch(() => '');
      body = { rawText };
    }

    // Support either structured parameters or raw bank SMS / notification text
    let utr = body.utr || body.rrn || body.transactionId || body.referenceId;
    let amount = body.amount !== undefined ? Number(body.amount) : null;
    let bank = body.bank || 'UPI';
    let senderInfo = body.sender || body.senderInfo || '';
    const rawText = body.sms || body.rawText || body.message || body.body || '';

    // If raw SMS/text was provided, run smart parser
    if (rawText) {
      const parsed = parseBankMessage(rawText);
      if (!utr && parsed.utr) utr = parsed.utr;
      if (!amount && parsed.amount) amount = parsed.amount;
      if (parsed.bank && bank === 'UPI') bank = parsed.bank;
      if (!senderInfo && parsed.senderInfo) senderInfo = parsed.senderInfo;
    }

    if (!utr && !amount) {
      return NextResponse.json(
        { error: 'Could not extract UTR or Amount from request payload.' },
        { status: 400 }
      );
    }

    // Clean UTR
    const cleanUtr = utr ? String(utr).trim() : `BANK_${Date.now()}`;
    const cleanAmount = Number(amount) || 0;

    console.log(`[Bank Robot] Processing credit: UTR=${cleanUtr}, Amount=₹${cleanAmount}, Bank=${bank}`);

    // Check if this BankCredit was already logged
    let bankCredit = await BankCredit.findOne({ utr: cleanUtr });
    if (!bankCredit) {
      bankCredit = await BankCredit.create({
        utr: cleanUtr,
        amount: cleanAmount,
        bank,
        senderInfo,
        rawMessage: rawText || JSON.stringify(body),
        claimed: false,
      });
    }

    // Attempt to match with a pending payment claim
    // 1. By exact UTR
    let pendingPayment = await Payment.findOne({
      transactionId: cleanUtr,
      status: 'Pending',
    });

    // 2. Fallback: match by exact amount in the last 45 minutes
    if (!pendingPayment && cleanAmount > 0) {
      const fortyFiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000);
      pendingPayment = await Payment.findOne({
        status: 'Pending',
        amount: cleanAmount,
        createdAt: { $gte: fortyFiveMinsAgo },
      }).sort({ createdAt: -1 });
    }

    // If matched, execute pass activation immediately!
    if (pendingPayment) {
      const fighter = await Fighter.findById(pendingPayment.fighterId);
      if (!fighter) {
        return NextResponse.json({
          success: true,
          matched: false,
          message: 'Payment found but athlete profile is missing.',
        });
      }

      // Check if already completed (race condition protection)
      if (pendingPayment.status === 'Completed') {
        return NextResponse.json({
          success: true,
          matched: true,
          alreadyCompleted: true,
          fighterName: fighter.name,
        });
      }

      // Strict continuous renewal calculation
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

      // Complete payment
      pendingPayment.status = 'Completed';
      pendingPayment.expiryDate = newPaymentDate;
      pendingPayment.transactionId = cleanUtr;
      pendingPayment.notes = `Auto-activated by Robot (${bank} UTR: ${cleanUtr})`.trim();
      await pendingPayment.save();

      // Mark BankCredit as claimed
      bankCredit.claimed = true;
      bankCredit.claimedByFighterId = fighter._id;
      bankCredit.claimedPaymentId = pendingPayment._id;
      await bankCredit.save();

      // Dispatch WhatsApp receipt
      if (fighter.phone) {
        try {
          await sendPaymentSuccessWhatsApp({
            phone: fighter.phone,
            name: fighter.name,
            amount: cleanAmount || pendingPayment.amount,
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

      console.log(`[Bank Robot] SUCCESS! Activated pass for ${fighter.name} until ${newPaymentDate.toISOString()}`);

      return NextResponse.json({
        success: true,
        matched: true,
        fighterName: fighter.name,
        newExpiryDate: newPaymentDate.toISOString(),
        amount: cleanAmount,
        utr: cleanUtr,
        status: fighter.status,
      });
    }

    // No pending claim matched yet (e.g. bank notification arrived before athlete clicked Submit)
    return NextResponse.json({
      success: true,
      matched: false,
      message: 'Bank credit logged in registry. Will auto-match when athlete submits claim or coach approves.',
      creditId: bankCredit._id,
      utr: cleanUtr,
      amount: cleanAmount,
    });
  } catch (err) {
    console.error('[Bank Robot Error]:', err);
    return NextResponse.json({ error: err.message || 'Robot trigger failed' }, { status: 500 });
  }
}
