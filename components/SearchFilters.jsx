'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';

export default function SearchFilters({ coaches, isAdmin }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleFilterChange = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Always reset page if filters change
    params.delete('page');

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4 mb-8 transition-colors duration-200">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide flex items-center gap-2">
          <Filter className="w-4 h-4 text-red-500" /> Filter & Search Fighters
        </h3>
        {searchParams.toString() && (
          <button
            onClick={handleClearFilters}
            className="text-xs font-semibold text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isPending ? 'animate-spin' : ''}`} /> Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="relative">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
            Search Name
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. Khabib Nurmagomedov"
              defaultValue={searchParams.get('search') || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
            Subscription Status
          </label>
          <select
            defaultValue={searchParams.get('status') || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Due Soon">Due Soon</option>
            <option value="Expired">Expired</option>
          </select>
        </div>

        {/* Coach Filter (Admin Only) */}
        {isAdmin && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Assigned Coach
            </label>
            <select
              defaultValue={searchParams.get('assignedCoach') || ''}
              onChange={(e) => handleFilterChange('assignedCoach', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
            >
              <option value="">All Coaches</option>
              {coaches?.map((coach) => (
                <option key={coach._id} value={coach._id}>
                  {coach.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Loading Indicator */}
        {isPending && (
          <div className="flex items-end justify-start sm:justify-end pb-3 text-xs text-slate-500 dark:text-zinc-400 font-semibold gap-1.5 animate-pulse">
            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            Updating Radar...
          </div>
        )}
      </div>
    </div>
  );
}
