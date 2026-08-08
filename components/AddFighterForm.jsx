'use client';

import { useState, useTransition, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addFighter } from '@/app/actions/fighterActions';
import { UserPlus, Calendar, Phone, Dumbbell, ShieldAlert, Award, Mail } from 'lucide-react';

export default function AddFighterForm({ coaches, currentUser }) {
  const router = useRouter();
  
  // Format today's date in YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [entryDate, setEntryDate] = useState(getTodayString());
  const [joiningDate, setJoiningDate] = useState(getTodayString());
  const [dob, setDob] = useState('');
  const [duration, setDuration] = useState(1);

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
  const [assignedCoach, setAssignedCoach] = useState(
    currentUser.role === 'Coach' ? currentUser.id : ''
  );
  
  const [state, formAction, isPending] = useActionState(addFighter, null);

  useEffect(() => {
    if (state?.success) {
      router.push('/admin');
      router.refresh();
    }
  }, [state, router]);

  // Compute payment date preview
  const getExpiryPreview = () => {
    if (!entryDate) return '';
    const date = new Date(entryDate);
    date.setMonth(date.getMonth() + Number(duration));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl max-w-2xl mx-auto transition-colors duration-200">
      
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-zinc-800 pb-5 mb-6">
        <div className="p-3 rounded-2xl bg-red-500/10 text-red-600">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-tight">
            Register New Fighter
          </h2>
          <p className="text-slate-400 dark:text-zinc-500 text-xs mt-0.5">
            Fill out subscription package details and assign a supervisor coach.
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Fighter Name */}
          <div>
            <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Full Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
              placeholder="e.g. Georges St-Pierre"
            />
          </div>

          {/* Fighter Phone */}
          <div>
            <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Phone Number *
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
                placeholder="e.g. +1 555-0199"
              />
            </div>
          </div>

          {/* Fighter Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold"
                placeholder="e.g. fighter@mutantsacademy.com"
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="dob" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Date of Birth * {dob && (calculateAge(dob) !== null && calculateAge(dob) >= 0 ? `(${calculateAge(dob)} years old)` : '')}
            </label>
            <input
              id="dob"
              name="dob"
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-mono"
            />
          </div>

          {/* Weight Class */}
          <div>
            <label htmlFor="weightClass" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Weight Class *
            </label>
            <input
              id="weightClass"
              name="weightClass"
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
              placeholder="e.g. Welterweight (170 lbs)"
            />
          </div>

          {/* Experience Level */}
          <div>
            <label htmlFor="experienceLevel" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Experience Level *
            </label>
            <select
              id="experienceLevel"
              name="experienceLevel"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Pro">Pro</option>
            </select>
          </div>

          {/* Original Joined Date */}
          <div>
            <label htmlFor="joiningDate" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Original Joined Date *
            </label>
            <input
              id="joiningDate"
              name="joiningDate"
              type="date"
              required
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-mono"
            />
          </div>

          {/* Current Package Start Date */}
          <div>
            <label htmlFor="entryDate" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Current Package Start Date *
            </label>
            <input
              id="entryDate"
              name="entryDate"
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-mono"
            />
          </div>

          {/* Package Duration */}
          <div>
            <label htmlFor="packageDurationMonths" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Package Duration (Months) *
            </label>
            <select
              id="packageDurationMonths"
              name="packageDurationMonths"
              required
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
            >
              <option value={1}>1 Month</option>
              <option value={2}>2 Months</option>
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months (1 Year)</option>
            </select>
          </div>
        </div>

        {/* Assigned Coach */}
        <div>
          <label htmlFor="assignedCoach" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
            Assigned Coach *
          </label>
          {currentUser.role === 'Coach' ? (
            <div className="relative">
              <input
                type="text"
                disabled
                value={`Self (${currentUser.name})`}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 text-sm font-semibold"
              />
              <input type="hidden" name="assignedCoach" value={currentUser.id} />
            </div>
          ) : (
            <select
              id="assignedCoach"
              name="assignedCoach"
              required
              value={assignedCoach}
              onChange={(e) => setAssignedCoach(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
            >
              <option value="">-- Select Coach --</option>
              {coaches.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Next Payment Expiry Preview */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-850 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-500" />
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Calculated Expiry Date
              </span>
              <span className="text-sm font-black text-slate-700 dark:text-zinc-300 font-mono">
                {getExpiryPreview() || 'Choose parameters...'}
              </span>
            </div>
          </div>
          <div className="text-[10px] font-bold uppercase text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
            Auto-Calculate
          </div>
        </div>

        {state?.error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {state.error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 text-sm font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Save Fighter Entry'
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
