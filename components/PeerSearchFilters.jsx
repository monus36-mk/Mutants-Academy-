'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  RefreshCw,
  Check,
  ArrowUpDown,
  Swords,
  Sparkles,
  Layers,
  Calendar,
  Clock,
} from 'lucide-react';

const sortOptions = [
  { id: 'SeniorFirst', label: 'Seniority: Senior to Junior' },
  { id: 'JuniorFirst', label: 'Seniority: Junior to Senior' },
  { id: 'WeightAsc', label: 'Weight: Lightest First' },
  { id: 'WeightDesc', label: 'Weight: Heaviest First' },
  { id: 'SeniorFirst_WeightAsc', label: 'Seniority & Lightest' },
  { id: 'SeniorFirst_WeightDesc', label: 'Seniority & Heaviest' },
  { id: 'WeightAsc_SeniorFirst', label: 'Lightest & Senior First' },
  { id: 'WeightDesc_SeniorFirst', label: 'Heaviest & Senior First' },
];

const sortLabels = {
  SeniorFirst: 'Senior to Junior',
  JuniorFirst: 'Junior to Senior',
  WeightAsc: 'Lightest First',
  WeightDesc: 'Heaviest First',
  SeniorFirst_WeightAsc: 'Senior & Lightest',
  SeniorFirst_WeightDesc: 'Senior & Heaviest',
  WeightAsc_SeniorFirst: 'Lightest & Senior First',
  WeightDesc_SeniorFirst: 'Heaviest & Senior First',
};

const styleOptions = [
  { id: 'All', label: 'All Styles' },
  { id: 'MMA', label: 'MMA' },
  { id: 'Striking', label: 'Striking' },
  { id: 'Grappling', label: 'Grappling' },
];

const ecaOptions = [
  { id: 'All', label: 'All ECAs' },
  { id: 'None', label: '🥋 None (Martial Arts)' },
  { id: 'Silambam', label: '🥢 Silambam' },
  { id: 'Zumba', label: '💃 Zumba' },
  { id: 'Dance', label: '🎵 Dance' },
];

const levelOptions = [
  { id: 'All', label: 'All Levels' },
  { id: 'Beginner', label: 'Beginner' },
  { id: 'Intermediate', label: 'Intermediate' },
  { id: 'Pro', label: 'Pro' },
];

const ageOptions = [
  { id: 'All', label: 'All Ages' },
  { id: 'Youth', label: 'Youth (<18)' },
  { id: 'Adult', label: 'Adult (18-35)' },
  { id: 'Master', label: 'Master (35+)' },
];

const tenureOptions = [
  { id: 'All', label: 'All Tenures' },
  { id: 'Newcomer', label: 'Newcomer (<6mo)' },
  { id: 'Veteran', label: 'Veteran (6mo+)' },
];

export default function PeerSearchFilters({
  searchQuery,
  setSearchQuery,
  styleFilter,
  setStyleFilter,
  ecaFilter,
  setEcaFilter,
  levelFilter,
  setLevelFilter,
  ageFilter,
  setAgeFilter,
  tenureFilter,
  setTenureFilter,
  sortBy,
  setSortBy,
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Staged filter state for modal dialog
  const [staged, setStaged] = useState({
    styleFilter,
    ecaFilter,
    levelFilter,
    ageFilter,
    tenureFilter,
    sortBy,
  });

  // Sync staged state when active filters change
  useEffect(() => {
    setStaged({
      styleFilter,
      ecaFilter,
      levelFilter,
      ageFilter,
      tenureFilter,
      sortBy,
    });
  }, [styleFilter, ecaFilter, levelFilter, ageFilter, tenureFilter, sortBy]);

  // Lock body scroll on mobile when modal is open
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

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Compute active filters
  const activeFilters = [];
  if (styleFilter && styleFilter !== 'All') {
    activeFilters.push({ key: 'style', label: `Style: ${styleFilter}` });
  }
  if (ecaFilter && ecaFilter !== 'All') {
    activeFilters.push({ key: 'eca', label: `ECA: ${ecaFilter}` });
  }
  if (levelFilter && levelFilter !== 'All') {
    activeFilters.push({ key: 'level', label: `Level: ${levelFilter}` });
  }
  if (ageFilter && ageFilter !== 'All') {
    activeFilters.push({ key: 'age', label: `Age: ${ageFilter}` });
  }
  if (tenureFilter && tenureFilter !== 'All') {
    activeFilters.push({ key: 'tenure', label: `Tenure: ${tenureFilter}` });
  }
  if (sortBy && sortBy !== 'SeniorFirst') {
    activeFilters.push({ key: 'sortBy', label: `Sort: ${sortLabels[sortBy] || sortBy}` });
  }

  const stagedCount = [
    staged.styleFilter !== 'All' ? staged.styleFilter : '',
    staged.ecaFilter !== 'All' ? staged.ecaFilter : '',
    staged.levelFilter !== 'All' ? staged.levelFilter : '',
    staged.ageFilter !== 'All' ? staged.ageFilter : '',
    staged.tenureFilter !== 'All' ? staged.tenureFilter : '',
    staged.sortBy !== 'SeniorFirst' ? staged.sortBy : '',
  ].filter(Boolean).length;

  const handleRemoveFilter = (key) => {
    if (key === 'style') setStyleFilter('All');
    if (key === 'eca') setEcaFilter('All');
    if (key === 'level') setLevelFilter('All');
    if (key === 'age') setAgeFilter('All');
    if (key === 'tenure') setTenureFilter('All');
    if (key === 'sortBy') setSortBy('SeniorFirst');
  };

  const handleClearAll = () => {
    setSearchQuery('');
    setStyleFilter('All');
    setEcaFilter('All');
    setLevelFilter('All');
    setAgeFilter('All');
    setTenureFilter('All');
    setSortBy('SeniorFirst');
  };

  const applyStaged = () => {
    setStyleFilter(staged.styleFilter);
    setEcaFilter(staged.ecaFilter);
    setLevelFilter(staged.levelFilter);
    setAgeFilter(staged.ageFilter);
    setTenureFilter(staged.tenureFilter);
    setSortBy(staged.sortBy);
    setIsOpen(false);
  };

  const resetStaged = () => {
    setStaged({
      styleFilter: 'All',
      ecaFilter: 'All',
      levelFilter: 'All',
      ageFilter: 'All',
      tenureFilter: 'All',
      sortBy: 'SeniorFirst',
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl md:rounded-3xl p-3 sm:p-4 shadow-sm space-y-2.5 mb-6 transition-all duration-200">
      
      {/* Search Input & Filters & Sort Trigger Bar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search fighter by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-semibold transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-0.5 rounded-full"
              title="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Master "Filters & Sort" Trigger Button */}
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
        {(searchQuery || activeFilters.length > 0) && (
          <button
            type="button"
            onClick={handleClearAll}
            className="px-3 py-2.5 rounded-xl md:rounded-2xl text-xs font-semibold text-slate-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/50 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Reset all filters"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mr-0.5">
            Active:
          </span>
          {activeFilters.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg sm:rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 animate-in fade-in zoom-in-95 duration-150"
            >
              {item.label}
              <button
                type="button"
                onClick={() => handleRemoveFilter(item.key)}
                className="hover:bg-red-200 dark:hover:bg-red-900/50 rounded-full p-0.5 text-red-500 hover:text-red-700 dark:hover:text-red-200 transition-colors cursor-pointer"
                title={`Remove ${item.label}`}
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

      {/* Filter & Sort Bottom Sheet / Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Box */}
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-10 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
            style={{ maxWidth: '672px' }}
          >
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
                    Filter by discipline, experience, age, tenure & sort order
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              
              {/* Sort Order */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  <ArrowUpDown className="w-3.5 h-3.5 text-red-500" />
                  <span>Sort Order</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {sortOptions.map((item) => {
                    const isSelected = staged.sortBy === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setStaged({ ...staged, sortBy: item.id })}
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

              {/* Martial Style */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  <Swords className="w-3.5 h-3.5 text-red-500" />
                  <span>Martial Style</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {styleOptions.map((opt) => {
                    const isSelected = staged.styleFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          const newStyle = opt.id;
                          setStaged({
                            ...staged,
                            styleFilter: newStyle,
                            ecaFilter: newStyle === 'All' ? 'All' : staged.ecaFilter,
                          });
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                            : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                        style={isSelected ? { backgroundColor: '#0f172a', color: '#ffffff', borderColor: '#0f172a' } : undefined}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Extra-Curricular Activity (ECA) */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>ECA Program</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ecaOptions.map((opt) => {
                    const isSelected = staged.ecaFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStaged({ ...staged, ecaFilter: opt.id })}
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

              {/* Experience Level */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  <Layers className="w-3.5 h-3.5 text-red-500" />
                  <span>Experience Level</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {levelOptions.map((opt) => {
                    const isSelected = staged.levelFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStaged({ ...staged, levelFilter: opt.id })}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                            : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                        style={isSelected ? { backgroundColor: '#0f172a', color: '#ffffff', borderColor: '#0f172a' } : undefined}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Age Group */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  <Calendar className="w-3.5 h-3.5 text-red-500" />
                  <span>Age Group</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ageOptions.map((opt) => {
                    const isSelected = staged.ageFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStaged({ ...staged, ageFilter: opt.id })}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                            : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                        style={isSelected ? { backgroundColor: '#0f172a', color: '#ffffff', borderColor: '#0f172a' } : undefined}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tenure */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-red-500" />
                  <span>Tenure</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tenureOptions.map((opt) => {
                    const isSelected = staged.tenureFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStaged({ ...staged, tenureFilter: opt.id })}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                            : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                        style={isSelected ? { backgroundColor: '#0f172a', color: '#ffffff', borderColor: '#0f172a' } : undefined}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/60 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetStaged}
                className="text-xs font-bold text-slate-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 py-2 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyStaged}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Apply Filters</span>
                  {stagedCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-white text-red-600 text-[10px] font-black flex items-center justify-center">
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
