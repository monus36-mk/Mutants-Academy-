'use client';

import { useState, useMemo, useEffect } from 'react';
import EditCoachModal from '@/components/EditCoachModal';
import DeleteCoachButton from '@/components/DeleteCoachButton';
import { useModalBackHandler } from '@/hooks/useModalBackHandler';
import {
  Users,
  Calendar,
  Mail,
  Search,
  SlidersHorizontal,
  X,
  RefreshCw,
  Check,
  ArrowUpDown,
  ShieldCheck,
  Award,
} from 'lucide-react';

export default function CoachStaffList({ initialCoaches = [] }) {
  const [search, setSearch] = useState('');
  const [discipline, setDiscipline] = useState('All');
  const [role, setRole] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [isOpen, setIsOpen] = useState(false);

  useModalBackHandler(isOpen, setIsOpen, 'coachStaffModal');

  // Staged state for modal
  const [staged, setStaged] = useState({
    discipline,
    role,
    sortBy,
  });

  useEffect(() => {
    setStaged({ discipline, role, sortBy });
  }, [discipline, role, sortBy]);

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

  const activeFilters = [];
  if (discipline !== 'All') {
    activeFilters.push({ key: 'discipline', label: `Discipline: ${discipline}` });
  }
  if (role !== 'All') {
    activeFilters.push({ key: 'role', label: `Role: ${role === 'MainAdmin' ? 'Main Admin' : 'Coach'}` });
  }
  if (sortBy !== 'Newest') {
    const sortLabels = {
      Oldest: 'Oldest First',
      NameAsc: 'Name (A-Z)',
      NameDesc: 'Name (Z-A)',
    };
    activeFilters.push({ key: 'sortBy', label: `Sort: ${sortLabels[sortBy] || sortBy}` });
  }

  const stagedCount = [
    staged.discipline !== 'All' ? staged.discipline : '',
    staged.role !== 'All' ? staged.role : '',
    staged.sortBy !== 'Newest' ? staged.sortBy : '',
  ].filter(Boolean).length;

  const handleRemoveFilter = (key) => {
    if (key === 'discipline') setDiscipline('All');
    if (key === 'role') setRole('All');
    if (key === 'sortBy') setSortBy('Newest');
  };

  const handleClearAll = () => {
    setSearch('');
    setDiscipline('All');
    setRole('All');
    setSortBy('Newest');
  };

  const applyStaged = () => {
    setDiscipline(staged.discipline);
    setRole(staged.role);
    setSortBy(staged.sortBy);
    setIsOpen(false);
  };

  const resetStaged = () => {
    setStaged({
      discipline: 'All',
      role: 'All',
      sortBy: 'Newest',
    });
  };

  // Filtered and sorted coaches
  const filteredCoaches = useMemo(() => {
    return initialCoaches
      .filter((coach) => {
        if (search) {
          const q = search.toLowerCase();
          const matchName = coach.name?.toLowerCase().includes(q);
          const matchEmail = coach.email?.toLowerCase().includes(q);
          if (!matchName && !matchEmail) return false;
        }

        if (discipline !== 'All') {
          const cat = coach.category || 'Martial Arts';
          if (cat !== discipline) return false;
        }

        if (role !== 'All') {
          if (coach.role !== role) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'Oldest') {
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        }
        if (sortBy === 'NameAsc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'NameDesc') {
          return b.name.localeCompare(a.name);
        }
        // Default: Newest
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [initialCoaches, search, discipline, role, sortBy]);

  return (
    <div className="space-y-4">
      {/* Sleek Search & Filters Bar */}
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl md:rounded-3xl p-3 sm:p-4 shadow-sm space-y-2.5 transition-all duration-200">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search coach by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-semibold transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-0.5 rounded-full cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters & Sort Button */}
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

          {/* Reset button */}
          {(search || activeFilters.length > 0) && (
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
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden transition-colors duration-200">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-red-500" /> Active Coaches ({filteredCoaches.length})
          </h2>
          {filteredCoaches.length !== initialCoaches.length && (
            <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
              Filtered from {initialCoaches.length} total
            </span>
          )}
        </div>

        {filteredCoaches.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300">No coaches match criteria</h3>
            <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1">
              Try adjusting your search query or reset your filters.
            </p>
            <button
              type="button"
              onClick={handleClearAll}
              className="mt-4 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
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
                {filteredCoaches.map((coach) => (
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
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                          coach.category === 'Silambam'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-900/30'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30'
                        }`}
                      >
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

      {/* Filter Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-10 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
            style={{ maxWidth: '576px' }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                    Filter & Sort Coaches
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Filter coaches by discipline, role & order
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

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Sort Order */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  <ArrowUpDown className="w-3.5 h-3.5 text-red-500" />
                  <span>Sort Order</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Newest', label: 'Newest Onboarded' },
                    { id: 'Oldest', label: 'Oldest Onboarded' },
                    { id: 'NameAsc', label: 'Name (A to Z)' },
                    { id: 'NameDesc', label: 'Name (Z to A)' },
                  ].map((item) => {
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

              {/* Discipline */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  <Award className="w-3.5 h-3.5 text-red-500" />
                  <span>Discipline / Category</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'All', label: 'All Disciplines' },
                    { id: 'Martial Arts', label: '🥋 Martial Arts' },
                    { id: 'Silambam', label: '🥢 Silambam' },
                  ].map((opt) => {
                    const isSelected = staged.discipline === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStaged({ ...staged, discipline: opt.id })}
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

              {/* Role */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                  <span>System Role</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'All', label: 'All Roles' },
                    { id: 'MainAdmin', label: '👑 Main Admin' },
                    { id: 'Coach', label: '🥋 Coach / Sub-Admin' },
                  ].map((opt) => {
                    const isSelected = staged.role === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStaged({ ...staged, role: opt.id })}
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

            {/* Footer */}
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
