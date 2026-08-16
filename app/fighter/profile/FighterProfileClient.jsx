'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSelfFighterProfile } from '@/app/actions/fighterActions';
import { User, Mail, Award, Check } from 'lucide-react';

export default function FighterProfileClient({ initialFighter }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [style, setStyle] = useState(initialFighter.style || 'MMA');
  const [weightClass, setWeightClass] = useState(initialFighter.weightClass || '');
  const [bio, setBio] = useState(initialFighter.bio || '');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!style || !weightClass) {
      setError('Please fill in all fields.');
      return;
    }

    setIsPending(true);
    setError('');
    setSuccess(false);

    try {
      const res = await updateSelfFighterProfile(style, weightClass, bio);
      if (res.success) {
        setSuccess(true);
        setIsEditing(false);
        router.refresh();
      } else {
        setError(res.error || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      
      {/* Athlete Profile Details Card */}
      <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-black text-slate-800 dark:text-zinc-150 uppercase tracking-wider flex items-center gap-2">
            <User className="w-5 h-5 text-red-500" /> Athlete Profile
          </h2>
          
          {!isEditing ? (
            <button
              onClick={() => {
                setError('');
                setSuccess(false);
                setIsEditing(true);
              }}
              className="text-xs font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors uppercase tracking-wider cursor-pointer border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-xl hover:bg-red-50/10"
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setError('');
                  setStyle(initialFighter.style || 'MMA');
                  setWeightClass(initialFighter.weightClass || '');
                  setBio(initialFighter.bio || '');
                  setIsEditing(false);
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-400 transition-colors uppercase tracking-wider cursor-pointer"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors uppercase tracking-wider px-3.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Save
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-650 dark:text-red-400 text-xs font-bold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-650 dark:text-emerald-450 text-xs font-bold">
            Profile updated successfully!
          </div>
        )}
        
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-6">
            
            {/* Martial Style */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Martial Style</span>
              {isEditing ? (
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/20 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold"
                >
                  <option value="MMA" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">MMA</option>
                  <option value="Striking" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Striking (Boxing/Muay Thai)</option>
                  <option value="Grappling" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Grappling (BJJ/Wrestling)</option>
                </select>
              ) : (
                <span className="text-sm font-extrabold text-red-500 dark:text-red-400 uppercase tracking-wide block mt-1">{initialFighter.style}</span>
              )}
            </div>

            {/* Experience Level (View Only) */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Experience Level</span>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold mt-1.5 ${
                initialFighter.experienceLevel === 'Pro' 
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30'
                  : initialFighter.experienceLevel === 'Intermediate' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30'
                  : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50'
              }`}>
                {initialFighter.experienceLevel}
              </span>
            </div>

            {/* Weight Class */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Weight Class</span>
              {isEditing ? (
                <input
                  type="text"
                  required
                  value={weightClass}
                  onChange={(e) => setWeightClass(e.target.value)}
                  placeholder="e.g. 60 or 75"
                  className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-955/20 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold"
                />
              ) : (
                <span className="text-sm font-bold text-slate-700 dark:text-zinc-250 block mt-1.5">{initialFighter.weightClass} kg</span>
              )}
            </div>

            {/* Phone (View Only) */}
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Phone</span>
              <span className="text-sm font-bold text-slate-700 dark:text-zinc-250 font-mono block mt-1.5">
                {initialFighter.phone}
              </span>
            </div>

            {/* Email (View Only) */}
            <div className="col-span-2">
              <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Email Address</span>
              <span className="text-sm font-bold text-slate-700 dark:text-zinc-250 font-mono block mt-1.5 break-all">
                {initialFighter.email}
              </span>
            </div>

            {/* Bio / Achievements */}
            <div className="col-span-2 border-t border-slate-100 dark:border-zinc-800/80 pt-4">
              <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider mb-1.5">Bio & Achievements</span>
              {isEditing ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell other fighters about your training background, weight cuts, favorite styles, or competition achievements..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/20 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold resize-none"
                />
              ) : (
                <p className="text-xs font-medium text-slate-655 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {initialFighter.bio || (
                    <span className="italic text-slate-400 dark:text-zinc-550">
                      No bio or achievements listed yet. Click "Edit Profile" to write one!
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Coach Details (Training Supervisor) */}
      <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm transition-colors">
        <h2 className="text-base font-black text-slate-800 dark:text-zinc-150 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-red-500" /> Training Supervisor
        </h2>
        
        {initialFighter.assignedCoach ? (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-lg">
              {initialFighter.assignedCoach.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-zinc-100 text-sm uppercase">
                {initialFighter.assignedCoach.name}
              </h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500 uppercase font-semibold">
                Academy Coach
              </p>
              <a
                href={`mailto:${initialFighter.assignedCoach.email}`}
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-red-500 hover:text-red-650 dark:hover:text-red-400 font-mono"
              >
                <Mail className="w-3.5 h-3.5" /> {initialFighter.assignedCoach.email}
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-700 dark:text-zinc-350 text-sm">
                General Coaching Staff
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                No coach currently assigned.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
