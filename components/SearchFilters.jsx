'use client';

import { useState, useEffect, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  RefreshCw,
  X,
  SlidersHorizontal,
  Check,
  ArrowUpDown,
  UserCheck,
  Swords,
  Sparkles,
  Calendar,
  Layers,
  Clock,
  ChevronDown
} from 'lucide-react';

export default function SearchFilters({ coaches, isAdmin, currentUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  // URL State
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const assignedCoach = searchParams.get('assignedCoach') || '';
  const style = searchParams.get('style') || '';
  const eca = searchParams.get('eca') !== null ? searchParams.get('eca') : 'None';
  const experienceLevel = searchParams.get('experienceLevel') || '';
  const ageFilter = searchParams.get('ageFilter') || '';
  const tenureFilter = searchParams.get('tenureFilter') || '';
  const sortBy = searchParams.get('sortBy') || 'SeniorFirst';

  // Staged Filter State (for modal)
  const [stagedFilters, setStagedFilters] = useState({
    status,
    assignedCoach,
    style,
    eca,
    experienceLevel,
    ageFilter,
    tenureFilter,
    sortBy,
  });

  // Keep staged state in sync when URL changes
  useEffect(() => {
    setStagedFilters({
      status,
      assignedCoach,
      style,
      eca,
      experienceLevel,
      ageFilter,
      tenureFilter,
      sortBy,
    });
  }, [status, assignedCoach, style, eca, experienceLevel, ageFilter, tenureFilter, sortBy]);

  // Lock body scroll when modal is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Calculate active filters from URL
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

  // Count staged filters in modal
  const stagedCount = [
    stagedFilters.status,
    stagedFilters.assignedCoach,
    stagedFilters.style,
    stagedFilters.eca !== 'None' ? stagedFilters.eca : '',
    stagedFilters.experienceLevel,
    stagedFilters.ageFilter,
    stagedFilters.tenureFilter,
    stagedFilters.sortBy !== 'SeniorFirst' ? stagedFilters.sortBy : '',
  ].filter(Boolean).length;

  const handleSearchChange = (val) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('search', val);
    } else {
      params.delete('search');
    }
    params.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleRemoveFilter = (key) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === 'eca') {
      params.delete('eca'); // will fallback to default None
    } else {
      params.delete(key);
    }
    params.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClearAll = () => {
    setStagedFilters({
      status: '',
      assignedCoach: '',
      style: '',
      eca: 'None',
      experienceLevel: '',
      ageFilter: '',
      tenureFilter: '',
      sortBy: 'SeniorFirst',
    });
    startTransition(() => {
      router.push(pathname);
    });
  };

  const applyStagedFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);

    if (stagedFilters.status) params.set('status', stagedFilters.status);
    if (stagedFilters.assignedCoach) params.set('assignedCoach', stagedFilters.assignedCoach);
    if (stagedFilters.style) params.set('style', stagedFilters.style);
    if (stagedFilters.eca && stagedFilters.eca !== 'None') params.set('eca', stagedFilters.eca);
    if (stagedFilters.experienceLevel) params.set('experienceLevel', stagedFilters.experienceLevel);
    if (stagedFilters.ageFilter) params.set('ageFilter', stagedFilters.ageFilter);
    if (stagedFilters.tenureFilter) params.set('tenureFilter', stagedFilters.tenureFilter);
    if (stagedFilters.sortBy && stagedFilters.sortBy !== 'SeniorFirst') {
      params.set('sortBy', stagedFilters.sortBy);
    }

    setIsOpen(false);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const resetStagedFilters = () => {
    setStagedFilters({
      status: '',
      assignedCoach: '',
      style: '',
      eca: 'None',
      experienceLevel: '',
      ageFilter: '',
      tenureFilter: '',
      sortBy: 'SeniorFirst',
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl md:rounded-3xl p-3 sm:p-4 shadow-sm space-y-2.5 mb-6 transition-all duration-200">
      {/* Search & Single Filter Button Bar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search fighter by name..."
            defaultValue={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-semibold transition-all"
          />
        </div>

        {/* Master "Filter & Sort" Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`px-3.5 sm:px-4 py-2.5 rounded-xl md:rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer select-none shrink-0 ${
            activeFilters.length > 0
              ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20 hover:bg-red-700'
              : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-700'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters & Sort</span>
          {activeFilters.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-red-600 text-[10px] font-black flex items-center justify-center shadow-sm">
              {activeFilters.length}
            </span>
          )}
        </button>

        {/* Reset Button (If active filters exist) */}
        {(searchParams.toString() || activeFilters.length > 0) && (
          <button
            type="button"
            onClick={handleClearAll}
            className="px-3 py-2.5 rounded-xl md:rounded-2xl text-xs font-semibold text-slate-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/50 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Reset all filters"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Reset</span>
          </button>
        )}
      </div>

      {/* Active Filter Chips (Removable with one click) */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mr-0.5">
            Active:
          </span>
          {activeFilters.map((filterItem) => (
            <span
              key={filterItem.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg sm:rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 animate-in fade-in zoom-in-95 duration-150"
            >
              {filterItem.label}
              <button
                type="button"
                onClick={() => handleRemoveFilter(filterItem.key)}
                className="hover:bg-red-200 dark:hover:bg-red-900/50 rounded-full p-0.5 text-red-500 hover:text-red-700 dark:hover:text-red-200 transition-colors cursor-pointer"
                title={`Remove ${filterItem.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* FILTER & SORT MODAL / BOTTOM SHEET DIALOG                  */}
      {/* ========================================================= */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal / Bottom Sheet Box */}
          <div className="relative w-full sm:max-w-2xl bg-white dark:bg-zinc-900 border-t sm:border border-slate-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            
            {/* Mobile Sheet Handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    Filter & Sort Athletes
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Filter by status, discipline, age, coach & order
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              
              {/* Section: Sort Options */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  <ArrowUpDown className="w-3.5 h-3.5 text-red-500" />
                  <span>Sort Order</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'SeniorFirst', label: 'Seniority: Senior to Junior' },
                    { id: 'JuniorFirst', label: 'Seniority: Junior to Senior' },
                    { id: 'WeightAsc', label: 'Weight: Lightest First' },
                    { id: 'WeightDesc', label: 'Weight: Heaviest First' },
                    { id: 'SeniorFirst_WeightAsc', label: 'Seniority & Lightest' },
                    { id: 'SeniorFirst_WeightDesc', label: 'Seniority & Heaviest' },
                    { id: 'WeightAsc_SeniorFirst', label: 'Lightest & Senior First' },
                    { id: 'WeightDesc_SeniorFirst', label: 'Heaviest & Senior First' },
                    { id: 'ExpirySoonest', label: 'Expiry: Soonest First' },
                  ].map((item) => {
                    const isSelected = stagedFilters.sortBy === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setStagedFilters({ ...stagedFilters, sortBy: item.id })}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-600 dark:text-red-400 font-bold'
                            : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <span>{item.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-red-500 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section: Subscription Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  <UserCheck className="w-3.5 h-3.5 text-red-500" />
                  <span>Subscription Status</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: '', label: 'All Statuses' },
                    { id: 'Active', label: '🟢 Active' },
                    { id: 'Due Soon', label: '🟡 Due Soon' },
                    { id: 'Expired', label: '🔴 Expired' },
                  ].map((opt) => {
                    const isSelected = stagedFilters.status === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStagedFilters({ ...stagedFilters, status: opt.id })}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm'
                            : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section: Extra-Curricular Activity (ECA) */}
              {isAdmin && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>ECA Program</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'None', label: '🥋 None (Martial Arts)' },
                      { id: 'All', label: '⭐ All ECAs' },
                      { id: 'Silambam', label: '🥢 Silambam' },
                      { id: 'Zumba', label: '💃 Zumba' },
                      { id: 'Dance', label: '🎵 Dance' },
                    ].map((opt) => {
                      const isSelected = stagedFilters.eca === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setStagedFilters({ ...stagedFilters, eca: opt.id })}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-600/20'
                              : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section: Martial Style */}
              {(isAdmin || currentUser?.category === 'Martial Arts') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    <Swords className="w-3.5 h-3.5 text-red-500" />
                    <span>Martial Style</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: '', label: 'All Styles' },
                      { id: 'MMA', label: 'MMA' },
                      { id: 'Striking', label: 'Striking' },
                      { id: 'Grappling', label: 'Grappling' },
                    ].map((opt) => {
                      const isSelected = stagedFilters.style === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setStagedFilters({ ...stagedFilters, style: opt.id })}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm'
                            : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section: Assigned Coach */}
              {isAdmin && coaches && coaches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>Assigned Coach</span>
                  </div>
                  <select
                    value={stagedFilters.assignedCoach}
                    onChange={(e) => setStagedFilters({ ...stagedFilters, assignedCoach: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-semibold"
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

              {/* Section: Experience Level, Age Group, & Tenure */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Experience Level */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Experience Level
                  </label>
                  <select
                    value={stagedFilters.experienceLevel}
                    onChange={(e) => setStagedFilters({ ...stagedFilters, experienceLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">All Levels</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Pro">Pro</option>
                  </select>
                </div>

                {/* Age Group */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Age Group
                  </label>
                  <select
                    value={stagedFilters.ageFilter}
                    onChange={(e) => setStagedFilters({ ...stagedFilters, ageFilter: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">All Ages</option>
                    <option value="Youth">Youth (&lt;18)</option>
                    <option value="Adult">Adult (18-35)</option>
                    <option value="Master">Master (35+)</option>
                  </select>
                </div>

                {/* Tenure */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Tenure
                  </label>
                  <select
                    value={stagedFilters.tenureFilter}
                    onChange={(e) => setStagedFilters({ ...stagedFilters, tenureFilter: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 text-slate-900 dark:text-zinc-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">All Tenures</option>
                    <option value="Newcomer">Newcomer (&lt;6mo)</option>
                    <option value="Veteran">Veteran (6mo+)</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/90 backdrop-blur-md flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetStagedFilters}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
              >
                Reset
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyStagedFilters}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Apply Filters</span>
                  {stagedCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-white/20 text-white text-[10px] font-black flex items-center justify-center">
                      {stagedCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

