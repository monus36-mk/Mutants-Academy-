import { getCurrentUser } from '@/app/actions/authActions';
import { getCoaches } from '@/app/actions/coachActions';
import { getFighters } from '@/app/actions/fighterActions';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import SearchFilters from '@/components/SearchFilters';
import RenewalModal from '@/components/RenewalModal';
import DeleteButton from '@/components/DeleteButton';
import FighterDetailModal from '@/components/FighterDetailModal';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Dumbbell, Users, Clock, AlertCircle, Plus, Phone, UserCheck, ShieldAlert, Edit3, Mail } from 'lucide-react';

export default async function AdminDashboard({ searchParams }) {
  // Await searchParams as required in Next.js 15
  const params = await searchParams;
  const search = params.search || '';
  const status = params.status || '';
  const assignedCoach = params.assignedCoach || '';
  const style = params.style || '';
  const experienceLevel = params.experienceLevel || '';
  const ageFilter = params.ageFilter || '';
  const tenureFilter = params.tenureFilter || '';
  const eca = params.eca || '';
  const sortBy = params.sortBy || 'SeniorFirst';

   const userPayload = await getCurrentUser();
  if (!userPayload) {
    return redirect('/login');
  }

  await dbConnect();
  const dbUser = await User.findById(userPayload.id).lean();
  const user = dbUser ? {
    id: dbUser._id.toString(),
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    category: dbUser.category
  } : userPayload;

  const isAdmin = user?.role === 'MainAdmin';

  // Fetch coach list for filtering (if admin or coach)
  let coaches = [];
  if (isAdmin || user?.role === 'Coach') {
    const coachRes = await getCoaches();
    if (coachRes.success) {
      coaches = coachRes.coaches;
    }
  }

  const fightersRes = await getFighters({ 
    search, 
    status, 
    assignedCoach,
    style,
    experienceLevel,
    ageFilter,
    tenureFilter,
    eca,
    sortBy
  });
  const fighters = fightersRes.success ? fightersRes.fighters : [];

  // Fetch list of fighters matching current filters except status, to compute stats metrics
  const statsFightersRes = await getFighters({
    search,
    assignedCoach,
    style,
    experienceLevel,
    ageFilter,
    tenureFilter,
    eca
  });
  const statsFighters = statsFightersRes.success ? statsFightersRes.fighters : [];

  // Compute metrics dynamically based on search/filters
  const totalCount = statsFighters.length;
  const activeCount = statsFighters.filter(f => f.status === 'Active').length;
  const dueCount = statsFighters.filter(f => f.status === 'Due Soon').length;
  const expiredCount = statsFighters.filter(f => f.status === 'Expired').length;

  const buildStatusLink = (newStatus) => {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    if (assignedCoach) query.set('assignedCoach', assignedCoach);
    if (style) query.set('style', style);
    if (experienceLevel) query.set('experienceLevel', experienceLevel);
    if (ageFilter) query.set('ageFilter', ageFilter);
    if (tenureFilter) query.set('tenureFilter', tenureFilter);
    if (eca) query.set('eca', eca);
    if (sortBy) query.set('sortBy', sortBy);
    if (newStatus) query.set('status', newStatus);
    return `/admin?${query.toString()}`;
  };

  const getExpiredDays = (nextPaymentDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentDate = new Date(nextPaymentDate);
    paymentDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - paymentDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 to-zinc-900 dark:from-zinc-900 dark:to-black rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-800 dark:border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/25 border border-red-500/30 text-xs font-bold text-red-400 uppercase tracking-wider mb-3">
            <UserCheck className="w-3.5 h-3.5" /> Expiry Radar Active
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            "Mutants Academy Headquarter Dashboard. Monitoring all fighters and coaching staff."
          </p>
        </div>
        <div>
          <Link
            href="/admin/add-fighter"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/20 hover:shadow-red-500/30 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New Fighter
          </Link>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

        {/* Card 1: Total */}
        <Link
          href={buildStatusLink('')}
          className={`bg-white dark:bg-zinc-900/50 border rounded-3xl p-5 md:p-6 shadow-sm flex items-center gap-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer ${status === ''
              ? 'border-red-500/50 ring-2 ring-red-500/10'
              : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
            }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 shrink-0">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Total Fighters
            </span>
            <span className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white leading-tight">
              {totalCount}
            </span>
          </div>
        </Link>

        {/* Card 2: Active */}
        <Link
          href={buildStatusLink('Active')}
          className={`bg-white dark:bg-zinc-900/50 border rounded-3xl p-5 md:p-6 shadow-sm flex items-center gap-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer ${status === 'Active'
              ? 'border-emerald-500/50 ring-2 ring-emerald-500/10'
              : 'border-slate-200 dark:border-zinc-800 hover:border-emerald-500/30'
            }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Active Subs
            </span>
            <span className="text-2xl md:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">
              {activeCount}
            </span>
          </div>
        </Link>

        {/* Card 3: Due Soon */}
        <Link
          href={buildStatusLink('Due Soon')}
          className={`bg-white dark:bg-zinc-900/50 border rounded-3xl p-5 md:p-6 shadow-sm flex items-center gap-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer ${status === 'Due Soon'
              ? 'border-amber-500/50 ring-2 ring-amber-500/10'
              : 'border-slate-200 dark:border-zinc-800 hover:border-amber-500/30'
            }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Due Soon (3d)
            </span>
            <span className="text-2xl md:text-3xl font-extrabold text-amber-600 dark:text-amber-400 leading-tight">
              {dueCount}
            </span>
          </div>
        </Link>

        {/* Card 4: Expired */}
        <Link
          href={buildStatusLink('Expired')}
          className={`bg-white dark:bg-zinc-900/50 border rounded-3xl p-5 md:p-6 shadow-sm flex items-center gap-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer ${status === 'Expired'
              ? 'border-red-500/50 ring-2 ring-red-500/10'
              : 'border-slate-200 dark:border-zinc-800 hover:border-red-500/30'
            }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Expired Subs
            </span>
            <span className="text-2xl md:text-3xl font-extrabold text-red-600 dark:text-red-400 leading-tight">
              {expiredCount}
            </span>
          </div>
        </Link>

      </div>

      {/* Filters */}
      <SearchFilters coaches={coaches} isAdmin={isAdmin} currentUser={user} />

      {/* Expiry Radar Table */}
      <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden transition-colors duration-200">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100">
            Fighters Roster ({fighters.length})
          </h2>
          <span className="text-xs text-slate-400 dark:text-zinc-500 font-semibold font-mono uppercase">
            TODAY: {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        </div>

        {fighters.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 mb-4">
              <Dumbbell className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-zinc-300">No fighters found</h3>
            <p className="text-slate-400 dark:text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
              Try adjusting your search criteria or register a new fighter entry to begin.
            </p>
            <Link
              href="/admin/add-fighter"
              className="inline-flex items-center gap-1.5 mt-5 text-sm font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400"
            >
              Add New Fighter <Plus className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-900/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 border-b border-slate-100 dark:border-zinc-800/80">
                  <th className="px-6 py-4">Fighter Info</th>
                  <th className="hidden sm:table-cell px-6 py-4">Weight Class</th>
                  <th className="hidden sm:table-cell px-6 py-4">Exp Level</th>
                  <th className="px-6 py-4">Assigned Coach</th>
                  <th className="px-6 py-4">Next Payment</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {fighters.map((fighter) => {
                  const canEdit = isAdmin || (user?.role === 'Coach' && fighter.assignedCoach?._id?.toString() === user.id);
                  return (
                    <tr
                      key={fighter._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 transition-all duration-150"
                    >
                      {/* Fighter Detail Trigger Column */}
                      <td className="px-6 py-4.5">
                        <FighterDetailModal fighter={fighter} canEdit={canEdit} />
                      </td>

                    {/* Weight Class */}
                    <td className="hidden sm:table-cell px-6 py-4.5 text-sm font-semibold text-slate-700 dark:text-zinc-300">
                      {fighter.weightClass}
                    </td>

                    {/* Experience Level */}
                    <td className="hidden sm:table-cell px-6 py-4.5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${fighter.experienceLevel === 'Pro'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30'
                          : fighter.experienceLevel === 'Intermediate'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30'
                            : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50'
                        }`}>
                        {fighter.experienceLevel}
                      </span>
                    </td>

                    {/* Assigned Coach */}
                    <td className="px-6 py-4.5 text-sm font-semibold text-slate-700 dark:text-zinc-300">
                      {fighter.assignedCoach ? fighter.assignedCoach.name : <span className="text-red-500 font-bold">Unassigned</span>}
                    </td>

                    {/* Next Payment Date */}
                    <td className="px-6 py-4.5">
                      <div>
                        <span className="block text-sm font-bold text-slate-700 dark:text-zinc-300 font-mono">
                          {new Date(fighter.nextPaymentDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="block text-[10px] text-slate-400 dark:text-zinc-500 font-medium uppercase mt-0.5">
                          Package: {fighter.packageDurationMonths} Month{fighter.packageDurationMonths > 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4.5">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${fighter.status === 'Expired'
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20'
                            : fighter.status === 'Due Soon'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}>
                          {fighter.status}
                        </span>
                        {fighter.status === 'Expired' && (
                          <span className="text-[10px] text-red-500 dark:text-red-400 font-bold uppercase ml-1 mt-0.5">
                            {(() => {
                              const days = getExpiredDays(fighter.nextPaymentDate);
                              return days <= 0 ? 'Expires today' : `Expired ${days} day${days > 1 ? 's' : ''} ago`;
                            })()}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-6 py-4.5">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit ? (
                          <>
                            <Link
                              href={`/admin/edit-fighter/${fighter._id}`}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-all cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-zinc-700"
                              title="Edit Fighter"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-red-500" /> Edit
                            </Link>
                            <RenewalModal fighter={fighter} />
                            <DeleteButton fighterId={fighter._id} />
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-zinc-600 font-bold italic tracking-wide select-none px-2 py-1 bg-slate-100/50 dark:bg-zinc-900/30 rounded-lg border border-slate-200/50 dark:border-zinc-800/40">View Only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
