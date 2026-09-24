'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, RefreshCw, ChevronDown, ChevronUp, X, SlidersHorizontal } from 'lucide-react';

export default function SearchFilters({ coaches, isAdmin, currentUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);

  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const assignedCoach = searchParams.get('assignedCoach') || '';
  const style = searchParams.get('style') || '';
  const eca = searchParams.get('eca') !== null ? searchParams.get('eca') : 'None';
  const experienceLevel = searchParams.get('experienceLevel') || '';
  const ageFilter = searchParams.get('ageFilter') || '';
  const tenureFilter = searchParams.get('tenureFilter') || '';
  const sortBy = searchParams.get('sortBy') || 'SeniorFirst';

  // Calculate number of active filters (excluding default sort and default ECA)
  const activeFilters = [];
  if (status) activeFilters.push({ key: 'status', label: `Status: ${status}` });
  if (assignedCoach && coaches) {
    const coachObj = coaches.find((c) => c._id === assignedCoach);
    activeFilters.push({ key: 'assignedCoach', label: `Coach: ${coachObj ? coachObj.name : 'Selected'}` });
  }
  if (style) activeFilters.push({ key: 'style', label: `Style: ${style}` });
  if (eca && eca !== 'None') activeFilters.push({ key: 'eca', label: `ECA: ${eca}` });
  if (experienceLevel) activeFilters.push({ key: 'experienceLevel', label: `Level: ${experienceLevel}` });
  if (ageFilter) activeFilters.push({ key: 'ageFilter', label: `Age: ${ageFilter}` });
  if (tenureFilter) activeFilters.push({ key: 'tenureFilter', label: `Tenure: ${tenureFilter}` });
  if (sortBy && sortBy !== 'SeniorFirst') {
    const sortLabels = {
      JuniorFirst: 'Junior First',
      WeightAsc: 'Lightest First',
      WeightDesc: 'Heaviest First',
      SeniorFirst_WeightAsc: 'Senior & Lightest',
      SeniorFirst_WeightDesc: 'Senior & Heaviest',
      WeightAsc_SeniorFirst: 'Lightest & Senior',
      WeightDesc_SeniorFirst: 'Heaviest & Senior',
      ExpirySoonest: 'Expiry Soonest',
    };
    activeFilters.push({ key: 'sortBy', label: `Sort: ${sortLabels[sortBy] || sortBy}` });
  }

  const handleFilterChange = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && !(key === 'eca' && value === 'None')) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Automatically reset eca to default if style is set to 'All Styles'
    if (key === 'style' && !value) {
      params.delete('eca');
    }

    // Always reset page if filters change
    params.delete('page');

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleRemoveFilter = (key) => {
    handleFilterChange(key, '');
  };

  const handleClearFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-4 md:p-5 shadow-sm space-y-3 mb-6 transition-all duration-200">
      
      {/* Compact Main Control Bar (Always visible) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search fighter by name (e.g. Khabib)..."
            defaultValue={search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold"
          />
        </div>

        {/* Right Buttons: Quick Filter Toggle & Clear */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Main Filter Dropdown Trigger Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer select-none ${
              isExpanded || activeFilters.length > 0
                ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 shadow-sm'
                : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {activeFilters.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* Clear Filters Button if any query or filter exists */}
          {(searchParams.toString() || activeFilters.length > 0) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-slate-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/50 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Reset all filters"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips / Pills (Visible when filters are active) */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mr-1">
            Active:
          </span>
          {activeFilters.map((filterItem) => (
            <span
              key={filterItem.key}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 animate-in fade-in zoom-in-95 duration-150"
            >
              {filterItem.label}
              <button
                type="button"
                onClick={() => handleRemoveFilter(filterItem.key)}
                className="hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full p-0.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                title={`Remove ${filterItem.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-[11px] font-bold text-red-500 hover:underline ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Expandable Advanced Filter Tray */}
      {isExpanded && (
        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3.5">
            {/* Status Filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                Subscription Status
              </label>
              <select
                value={status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Due Soon">Due Soon</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            {/* Coach Filter */}
            {isAdmin && coaches && coaches.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                  Assigned Coach
                </label>
                <select
                  value={assignedCoach}
                  onChange={(e) => handleFilterChange('assignedCoach', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold"
                >
                  <option value="">All Coaches</option>
                  {coaches.map((coach) => (
                    <option key={coach._id} value={coach._id}>
                      {coach.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Martial Style */}
            {(isAdmin || currentUser?.category === 'Martial Arts') && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                  Martial Style
                </label>
                <select
                  value={style}
                  onChange={(e) => handleFilterChange('style', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold"
                >
                  <option value="">All Styles</option>
                  <option value="MMA">MMA</option>
                  <option value="Striking">Striking</option>
                  <option value="Grappling">Grappling</option>
                </select>
              </div>
            )}

            {/* ECA */}
            {isAdmin && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                  ECA
                </label>
                <select
                  value={eca}
                  onChange={(e) => handleFilterChange('eca', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold"
                >
                  <option value="None">None (Martial Arts)</option>
                  <option value="All">All ECAs</option>
                  <option value="Silambam">Silambam</option>
                  <option value="Zumba">Zumba</option>
                  <option value="Dance">Dance</option>
                </select>
              </div>
            )}

            {/* Experience Level */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                Experience Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold"
              >
                <option value="">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Pro">Pro</option>
              </select>
            </div>

            {/* Age Group */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                Age Group
              </label>
              <select
                value={ageFilter}
                onChange={(e) => handleFilterChange('ageFilter', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold"
              >
                <option value="">All Ages</option>
                <option value="Youth">Youth (&lt;18)</option>
                <option value="Adult">Adult (18-35)</option>
                <option value="Master">Master (35+)</option>
              </select>
            </div>

            {/* Tenure */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                Tenure
              </label>
              <select
                value={tenureFilter}
                onChange={(e) => handleFilterChange('tenureFilter', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold"
              >
                <option value="">All Tenures</option>
                <option value="Newcomer">Newcomer (&lt;6mo)</option>
                <option value="Veteran">Veteran (6mo+)</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold"
              >
                <option value="SeniorFirst">Seniority: Senior to Junior</option>
                <option value="JuniorFirst">Seniority: Junior to Senior</option>
                <option value="WeightAsc">Weight: Lightest First</option>
                <option value="WeightDesc">Weight: Heaviest First</option>
                <option value="SeniorFirst_WeightAsc">Seniority & Weight (Senior First, Lightest First)</option>
                <option value="SeniorFirst_WeightDesc">Seniority & Weight (Senior First, Heaviest First)</option>
                <option value="WeightAsc_SeniorFirst">Weight & Seniority (Lightest First, Senior First)</option>
                <option value="WeightDesc_SeniorFirst">Weight & Seniority (Heaviest First, Senior First)</option>
                <option value="ExpirySoonest">Expiry: Soonest First</option>
              </select>
            </div>
          </div>

          {/* Loading Indicator */}
          {isPending && (
            <div className="flex items-center justify-start pt-3 text-xs text-slate-500 dark:text-zinc-400 font-semibold gap-1.5 animate-pulse">
              <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              Applying filter changes...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
