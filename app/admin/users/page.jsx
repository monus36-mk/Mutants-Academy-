import { getCurrentUser } from '@/app/actions/authActions';
import { getCoaches } from '@/app/actions/coachActions';
import OnboardCoachForm from '@/components/OnboardCoachForm';
import EditCoachModal from '@/components/EditCoachModal';
import DeleteCoachButton from '@/components/DeleteCoachButton';
import { redirect } from 'next/navigation';
import { Users, Calendar, ShieldCheck, Mail } from 'lucide-react';

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

        {/* Coach Table List */}
        <div className="lg:col-span-2 xl:col-span-3">
          <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden transition-colors duration-200">
            
            <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800">
              <h2 className="text-base font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-red-500" /> Active Coaches ({coaches.length})
              </h2>
            </div>

            {coaches.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300">No coaches registered</h3>
                <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1">
                  Onboard a coach using the form to start assigning fighters to them.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[650px] xl:min-w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-900/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 border-b border-slate-100 dark:border-zinc-800/80">
                      <th className="px-6 py-4 min-w-[200px]">Coach Info</th>
                      <th className="px-6 py-4 whitespace-nowrap">Discipline</th>
                      <th className="px-6 py-4 whitespace-nowrap">System Role</th>
                      <th className="px-6 py-4 whitespace-nowrap">Onboarding Date</th>
                      <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {coaches.map((coach) => (
                      <tr 
                        key={coach._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 transition-all duration-150"
                      >
                        {/* Name / Email */}
                        <td className="px-6 py-4">
                          <div>
                            <span className="block font-bold text-slate-800 dark:text-zinc-100 text-sm">
                              {coach.name}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-zinc-500 mt-0.5 font-mono">
                              <Mail className="w-3.5 h-3.5 shrink-0" /> {coach.email}
                            </span>
                          </div>
                        </td>

                        {/* Discipline */}
                        <td className="px-6 py-4 text-xs font-bold whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                            coach.category === 'Silambam' 
                              ? 'bg-amber-105 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-900/30' 
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30'
                          }`}>
                            {coach.category || 'Martial Arts'}
                          </span>
                        </td>

                        {/* System Role */}
                        <td className="px-6 py-4 text-xs font-bold whitespace-nowrap">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 border border-red-500/10 uppercase tracking-wide">
                            {coach.role === 'MainAdmin' ? 'Main Admin' : 'Coach / Sub-Admin'}
                          </span>
                        </td>

                        {/* Onboarding Date */}
                        <td className="px-6 py-4 text-xs text-slate-500 dark:text-zinc-400 font-mono whitespace-nowrap">
                          <div className="flex items-center gap-1.5 mt-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {coach.createdAt 
                              ? new Date(coach.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'N/A'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex justify-end items-center gap-1 shrink-0">
                            <EditCoachModal coach={coach} />
                            <DeleteCoachButton coachId={coach._id} coachName={coach.name} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
