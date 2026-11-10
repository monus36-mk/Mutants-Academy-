import dbConnect from '@/lib/db';
import Fighter from '@/models/Fighter';
import { sendPaymentReminderEmail } from '@/lib/mail';
import { sendPaymentReminderWhatsApp } from '@/lib/whatsapp';
import { getBaseUrl } from '@/lib/url';
import { NextResponse } from 'next/server';

export async function GET(request) {
  // Authorization check (validates Vercel Cron or custom requests using Bearer token)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === 'production' && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    // Determine base URL from incoming request or dynamic environment
    const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const requestProto = request.headers.get('x-forwarded-proto') || (requestHost?.includes('localhost') ? 'http' : 'https');
    const detectedUrl = requestHost ? `${requestProto}://${requestHost}` : null;
    const cronAppUrl = await getBaseUrl(detectedUrl);

    const fighters = await Fighter.find({ isInactive: { $ne: true } }).lean();
    let emailSentCount = 0;
    let whatsappSentCount = 0;
    const details = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const f of fighters) {
      if (!f.email && !f.phone) continue;
      
      const paymentDate = new Date(f.nextPaymentDate);
      paymentDate.setHours(0, 0, 0, 0);
      
      const diffTime = paymentDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Trigger reminder alerts at billing milestones:
      // - 3 days before expiry
      // - 1 day before expiry
      // - Expiring today (0 days)
      // - 3 days after expiry (-3 days)
      if (diffDays === 3 || diffDays === 1 || diffDays === 0 || diffDays === -3) {
        const payUrl = `${cronAppUrl}/renew/${f._id}`;
        let emailSuccess = false;
        let whatsappSuccess = false;
        let emailError = null;
        let whatsappError = null;

        // 1. Send Email Reminder
        if (f.email) {
          try {
            await sendPaymentReminderEmail(f.email, f.name, f.nextPaymentDate, diffDays, cronAppUrl);
            emailSentCount++;
            emailSuccess = true;
          } catch (mailErr) {
            console.error(`Failed to send billing email to ${f.email}:`, mailErr);
            emailError = mailErr.message;
          }
        }

        // 2. Send WhatsApp Reminder
        if (f.phone) {
          try {
            const waRes = await sendPaymentReminderWhatsApp({
              phone: f.phone,
              name: f.name,
              nextPaymentDate: f.nextPaymentDate,
              diffDays,
              payUrl,
            });

            if (waRes.success) {
              whatsappSentCount++;
              whatsappSuccess = true;
            } else {
              whatsappError = waRes.error;
            }
          } catch (waErr) {
            console.error(`Failed to send WhatsApp billing reminder to ${f.phone}:`, waErr);
            whatsappError = waErr.message;
          }
        }

        details.push({
          fighterId: f._id,
          name: f.name,
          email: f.email,
          phone: f.phone,
          diffDays,
          emailSuccess,
          whatsappSuccess,
          emailError,
          whatsappError,
          payUrl,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed reminders. Sent ${emailSentCount} email(s) and ${whatsappSentCount} WhatsApp message(s).`,
      processedCount: fighters.length,
      emailSentCount,
      whatsappSentCount,
      details,
    });
  } catch (err) {
    console.error('Error executing automated reminders cron:', err);
    return NextResponse.json({ error: 'Failed to process reminders', details: err.message }, { status: 500 });
  }
}
