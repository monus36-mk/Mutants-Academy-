import { getCurrentUser } from '@/app/actions/authActions';
import { getCoaches } from '@/app/actions/coachActions';
import OnboardCoachForm from '@/components/OnboardCoachForm';
import CoachStaffList from '@/components/CoachStaffList';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

export default async function ManageCoachesPage() {
  const user = await getCurrentUser();
  
  // Extra safety check in case middleware is bypassed
  if (!user || user.role !== 'MainAdmin') {
    redirect('/admin');
  }

  const res = await getCoaches();
  const coaches = res.success ? res.coaches : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-800 dark:text-zinc-100 flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-red-500" /> Coaching Staff Directory
        </h1>
        <p className="text-slate-400 dark:text-zinc-500 text-sm mt-1">
          Manage system credentials, credentials onboarding, and assign fighters to coaching accounts.
        </p>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        
        {/* Onboarding Form */}
        <div className="lg:col-span-1 xl:col-span-1">
          <OnboardCoachForm />
        </div>

        {/* Coach Table List with Sleek Search & Filters Modal */}
        <div className="lg:col-span-2 xl:col-span-3">
          <CoachStaffList initialCoaches={coaches} />
        </div>

      </div>

    </div>
  );
}
