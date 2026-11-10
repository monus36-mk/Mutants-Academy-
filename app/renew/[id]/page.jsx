import dbConnect from '@/lib/db';
import Fighter from '@/models/Fighter';
import RenewPaymentClient from '@/components/RenewPaymentClient';
import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    await dbConnect();
    const fighter = await Fighter.findById(id).select('name').lean();
    if (fighter) {
      return {
        title: `Renew Subscription - ${fighter.name} | Mutants Academy`,
        description: `Official subscription renewal and UPI payment portal for ${fighter.name} at Mutants Academy.`,
      };
    }
  } catch (e) {
    // Fallback
  }

  return {
    title: 'Renew Athlete Subscription | Mutants Academy MMA',
    description: 'Instant UPI package renewal and status activation for Mutants Academy fighters.',
  };
}

export default async function RenewPage({ params }) {
  // Await page params in Next.js 15 / 16
  const { id } = await params;

  await dbConnect();
  
  let fighter = null;
  try {
    fighter = await Fighter.findById(id).lean();
  } catch (err) {
    console.error('Invalid fighter ID in renew page:', id, err.message);
  }

  if (!fighter) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-zinc-950">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Athlete Profile Not Found
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            The athlete profile you are trying to renew does not exist or may have been removed. Please reach out to your coach or front desk to verify your account link.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/20"
            >
              <ArrowLeft className="w-4 h-4" /> Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const serializedFighter = {
    _id: fighter._id.toString(),
    name: fighter.name,
    phone: fighter.phone,
    email: fighter.email || '',
    photo: fighter.photo || '',
    style: fighter.style || 'MMA',
    weightClass: fighter.weightClass || 'Open',
    experienceLevel: fighter.experienceLevel || 'Beginner',
    status: fighter.status || 'Active',
    isInactive: Boolean(fighter.isInactive),
    packageDurationMonths: fighter.packageDurationMonths || 1,
    monthlyFee: fighter.monthlyFee !== undefined ? fighter.monthlyFee : 1300,
    nextPaymentDate: fighter.nextPaymentDate ? fighter.nextPaymentDate.toISOString() : null,
    joiningDate: fighter.joiningDate ? fighter.joiningDate.toISOString() : null,
  };

  const upiConfig = {
    vpa: process.env.NEXT_PUBLIC_GYM_UPI_ID || 'monuskumar36@okicici',
    name: process.env.NEXT_PUBLIC_GYM_UPI_NAME || 'Mutants Academy',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors">
      <RenewPaymentClient fighter={serializedFighter} upiConfig={upiConfig} />
    </div>
  );
}
