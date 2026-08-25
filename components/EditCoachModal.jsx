'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCoach } from '@/app/actions/coachActions';
import { X, User, Mail, Key, Eye, EyeOff, Edit, Save } from 'lucide-react';

export default function EditCoachModal({ coach }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState(coach.name || '');
  const [email, setEmail] = useState(coach.email || '');
  const [category, setCategory] = useState(coach.category || 'Martial Arts');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setName(coach.name || '');
    setEmail(coach.email || '');
    setCategory(coach.category || 'Martial Arts');
  }, [coach]);

  const handleOpen = () => {
    setName(coach.name || '');
    setEmail(coach.email || '');
    setCategory(coach.category || 'Martial Arts');
    setPassword('');
    setError(null);
    setSuccess(false);
    setIsOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('category', category);
    formData.append('password', password);

    startTransition(async () => {
      const res = await updateCoach(coach._id, formData);
      if (res.success) {
        setSuccess(true);
        router.refresh();
        setIsOpen(false);
      } else {
        setError(res.error || 'Failed to update coach profile');
      }
    });
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 hover:text-red-600 border border-slate-200 dark:border-zinc-800 hover:border-red-200 dark:hover:border-red-900/50 mr-2"
        title={`Edit ${coach.name}`}
      >
        <Edit className="w-3.5 h-3.5" /> Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
            onClick={() => !isPending && setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                <Edit className="w-5 h-5 text-red-500" /> Edit Coach Profile
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-600 dark:hover:text-zinc-200 transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                  Coach Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
                    placeholder="e.g. John Kavanagh"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
                    placeholder="coach@mutantsacademy.com"
                  />
                </div>
              </div>

              {/* Discipline / Category */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                  Discipline / Category *
                </label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold"
                >
                  <option value="Martial Arts">Martial Arts (MMA/Striking/Grappling)</option>
                  <option value="Silambam">Silambam</option>
                </select>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                  New Password (leave blank to keep current)
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium animate-shake">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Coach profile updated successfully!
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/10 cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
