import dbConnect from '@/lib/db';
import Fighter from '@/models/Fighter';
import { sendPaymentReminderEmail } from '@/lib/mail';
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
    
    const fighters = await Fighter.find({}).lean();
    let sentCount = 0;
    const details = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const f of fighters) {
      if (!f.email) continue;
      
      const paymentDate = new Date(f.nextPaymentDate);
      paymentDate.setHours(0, 0, 0, 0);
      
      const diffTime = paymentDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Trigger reminder emails at billing milestones:
      // - 3 days before expiry
      // - 1 day before expiry
      // - Expiring today (0 days)
      // - 3 days after expiry (-3 days)
      if (diffDays === 3 || diffDays === 1 || diffDays === 0 || diffDays === -3) {
        try {
          await sendPaymentReminderEmail(f.email, f.name, f.nextPaymentDate, diffDays);
          sentCount++;
          details.push({ email: f.email, name: f.name, diffDays, success: true });
        } catch (mailErr) {
          console.error(`Failed to send billing email to ${f.email}:`, mailErr);
          details.push({ email: f.email, name: f.name, diffDays, success: false, error: mailErr.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed reminders. Sent ${sentCount} email(s).`,
      processedCount: fighters.length,
      sentCount,
      details
    });
  } catch (err) {
    console.error('Error executing automated reminders cron:', err);
    return NextResponse.json({ error: 'Failed to process reminders', details: err.message }, { status: 500 });
  }
}
