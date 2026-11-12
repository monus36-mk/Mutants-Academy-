'use client';

import { useState, useTransition, useMemo, useEffect, useRef } from 'react';
import { 
  getAttendanceForDate, 
  adminManualPunch,
  getMonthlyAttendanceReport,
  getFighterAttendanceHistory,
  updateGymLocationSettings
} from '@/app/actions/attendanceActions';
import { getBrowserCoordinates, parseGoogleMapsLocation } from '@/lib/geoUtils';
import { useModalBackHandler } from '@/hooks/useModalBackHandler';
import { 
  Users, CheckCircle2, XCircle, 
  Search, Download, UserCheck, 
  ChevronLeft, ChevronRight, User, History, X, Flame,
  Trophy, ChevronDown, MoreVertical, LogIn, LogOut,
  MapPin, LocateFixed, ExternalLink, AlertTriangle, ShieldCheck
} from 'lucide-react';

function getTodayISTDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default function AttendanceDashboardClient({ initialData, initialDate, currentUser }) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [roster, setRoster] = useState(initialData.roster || []);
  const [stats, setStats] = useState(initialData.stats || {});
  const [gymSettings, setGymSettings] = useState(
    initialData.gymSettings || {
      locationLabel: 'Mutants Academy',
      latitude: null,
      longitude: null,
      hasCoordinates: false,
      radiusMeters: 100,
      geofenceEnabled: true,
      requireCheckOutLocation: true,
      updatedByName: '',
      updatedAt: null,
    }
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [styleFilter, setStyleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('SeniorToJunior'); // 'SeniorToJunior', 'EarlyToLate', 'LateToEarly', 'JuniorToSenior'

  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState(null);

  // Active athlete dropdown menu for manual punch override
  const [activeMenuFighterId, setActiveMenuFighterId] = useState(null);

  // History modal for any fighter
  const [historyModalFighter, setHistoryModalFighter] = useState(null);
  const [historyModalData, setHistoryModalData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Gym Location settings modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locLabel, setLocLabel] = useState(gymSettings.locationLabel || 'Mutants Academy');
  const [locLat, setLocLat] = useState(gymSettings.latitude !== null && gymSettings.latitude !== undefined ? String(gymSettings.latitude) : '');
  const [locLng, setLocLng] = useState(gymSettings.longitude !== null && gymSettings.longitude !== undefined ? String(gymSettings.longitude) : '');
  const [locRadius, setLocRadius] = useState(gymSettings.radiusMeters || 100);
  const [locEnabled, setLocEnabled] = useState(gymSettings.geofenceEnabled ?? true);
  const [locRequireCheckOut, setLocRequireCheckOut] = useState(gymSettings.requireCheckOutLocation ?? true);
  const [mapsPasteInput, setMapsPasteInput] = useState('');
  const [locMsg, setLocMsg] = useState(null);
  const [isCapturingGPS, setIsCapturingGPS] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  useModalBackHandler(Boolean(historyModalFighter), (open) => {
    if (!open) {
      setHistoryModalFighter(null);
      setHistoryModalData(null);
    }
  }, 'adminAttendanceHistory');
  useModalBackHandler(showLocationModal, setShowLocationModal, 'adminGymLocation');

  const knownTodayRef = useRef(getTodayISTDate());
  const selectedDateRef = useRef(selectedDate);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // Auto-refresh today's roster when returning to tab or passing IST midnight
  useEffect(() => {
    const syncIfNeeded = async () => {
      const currentToday = getTodayISTDate();
      const viewingYesterdayToday =
        selectedDateRef.current === knownTodayRef.current && currentToday !== knownTodayRef.current;

      const targetDate = viewingYesterdayToday ? currentToday : selectedDateRef.current;
      if (viewingYesterdayToday) {
        knownTodayRef.current = currentToday;
        setSelectedDate(currentToday);
      }

      if (targetDate === currentToday) {
        const res = await getAttendanceForDate(targetDate);
        if (res.success) {
          setRoster(res.roster);
          setStats(res.stats);
          if (res.gymSettings) setGymSettings(res.gymSettings);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncIfNeeded();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = setInterval(() => {
      if (getTodayISTDate() !== knownTodayRef.current) {
        syncIfNeeded();
      }
    }, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  // Close manual action menu on outside click
  useEffect(() => {
    if (!activeMenuFighterId) return;
    const handleDocClick = () => setActiveMenuFighterId(null);
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [activeMenuFighterId]);

  const openHistoryModal = async (fighter) => {
    setHistoryModalFighter(fighter);
    setHistoryModalData(null);
    setLoadingHistory(true);
    const res = await getFighterAttendanceHistory(fighter.fighterId);
    if (res.success) {
      setHistoryModalData(res);
    }
    setLoadingHistory(false);
  };

  // Date shifting helpers using pure UTC calendar math on YYYY-MM-DD (avoids IST midnight shift)
  const handleShiftDate = (days) => {
    const parts = selectedDate.split('-');
    const utcDate = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + days));
    const newDateStr = utcDate.toISOString().split('T')[0];
    handleDateChange(newDateStr);
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    startTransition(async () => {
      const res = await getAttendanceForDate(newDate);
      if (res.success) {
        setRoster(res.roster);
        setStats(res.stats);
        if (res.gymSettings) setGymSettings(res.gymSettings);
      }
    });
  };

  const openLocationModal = () => {
    setLocLabel(gymSettings.locationLabel || 'Mutants Academy');
    setLocLat(gymSettings.latitude !== null && gymSettings.latitude !== undefined ? String(gymSettings.latitude) : '');
    setLocLng(gymSettings.longitude !== null && gymSettings.longitude !== undefined ? String(gymSettings.longitude) : '');
    setLocRadius(gymSettings.radiusMeters || 100);
    setLocEnabled(gymSettings.geofenceEnabled ?? true);
    setLocRequireCheckOut(gymSettings.requireCheckOutLocation ?? true);
    setMapsPasteInput('');
    setLocMsg(null);
    setShowLocationModal(true);
  };

  const handleCaptureCurrentLocation = async () => {
    setLocMsg(null);
    setIsCapturingGPS(true);
    const geoRes = await getBrowserCoordinates();
    setIsCapturingGPS(false);
    if (geoRes.error) {
      setLocMsg({ type: 'error', text: geoRes.error });
      return;
    }
    setLocLat(String(Number(geoRes.latitude.toFixed(6))));
    setLocLng(String(Number(geoRes.longitude.toFixed(6))));
    setLocMsg({
      type: 'success',
      text: `Captured current location (±${geoRes.accuracy || 0}m GPS accuracy). Click Save Location to apply.`,
    });
  };

  const handleApplyMapsInput = () => {
    setLocMsg(null);
    const parsed = parseGoogleMapsLocation(mapsPasteInput);
    if (parsed.error) {
      setLocMsg({ type: 'error', text: parsed.error });
      return;
    }
    setLocLat(String(parsed.latitude));
    setLocLng(String(parsed.longitude));
    setLocMsg({
      type: 'success',
      text: `Extracted coordinates (${parsed.latitude}, ${parsed.longitude}). Verify pin or click Save Location.`,
    });
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setLocMsg(null);
    setIsSavingLocation(true);
    const res = await updateGymLocationSettings({
      locationLabel: locLabel,
      latitude: locLat,
      longitude: locLng,
      radiusMeters: locRadius,
      geofenceEnabled: locEnabled,
      requireCheckOutLocation: locRequireCheckOut,
    });
    setIsSavingLocation(false);

    if (res.success) {
      setGymSettings(res.settings);
      setShowLocationModal(false);
      setMessage(res.message || 'Gym location updated!');
      setTimeout(() => setMessage(null), 4000);
    } else {
      setLocMsg({ type: 'error', text: res.error || 'Failed to save gym location' });
    }
  };

  const handleSetToday = () => {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    handleDateChange(today);
  };

  // Manual Punch Override (Fallback if fighter phone died)
  const handleManualAction = (fighterId, action) => {
    setActiveMenuFighterId(null);
    startTransition(async () => {
      const res = await adminManualPunch({ fighterId, action, date: selectedDate });
      if (res.success) {
        setMessage(`Manual ${action} updated successfully.`);
        setTimeout(() => setMessage(null), 3000);
        const fresh = await getAttendanceForDate(selectedDate);
        if (fresh.success) {
          setRoster(fresh.roster);
          setStats(fresh.stats);
        }
      } else {
        alert(res.error || 'Failed to update attendance');
      }
    });
  };

  // Export Monthly CSV Matrix
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const yearMonth = selectedDate.substring(0, 7); // e.g. "2026-11"
      const res = await getMonthlyAttendanceReport(yearMonth);
      if (!res.success || !res.summary) {
        alert('Could not fetch monthly attendance report');
        return;
      }

      const headers = ['Athlete Name', 'Phone', 'Style', 'Days Present', 'Days Late', 'Days Absent'];
      const rows = res.summary.map((s) => [
        `"${s.name}"`,
        `"${s.phone}"`,
        `"${s.style}"`,
        s.present,
        s.late,
        s.absent,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Mutants_Academy_Attendance_${yearMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export CSV report');
    } finally {
      setIsExporting(false);
    }
  };

  // Friendly date display (locked to UTC calendar day represented by selectedDate)
  const friendlyDate = useMemo(() => {
    const parts = selectedDate.split('-');
    const utcDate = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    return utcDate.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [selectedDate]);

  // Accurate stat totals (ensures Total = OnMats + Completed + NotCheckedIn)
  const completedTotal = (stats.completed || 0) + (stats.lateCount || 0);
  const notCheckedInTotal = (stats.unmarked || 0) + (stats.absentCount || 0);

  // Filter and sort roster (matching fighter attendance sort rules)
  const processedRoster = useMemo(() => {
    let list = roster.filter((f) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = f.name?.toLowerCase().includes(q);
        const matchesPhone = f.phone?.includes(q);
        if (!matchesName && !matchesPhone) return false;
      }

      if (styleFilter !== 'All' && f.style !== styleFilter) {
        return false;
      }

      const isPresented =
        f.status === 'Checked In' || f.status === 'Completed' || f.status === 'Present' || f.status === 'Late';

      if (sortBy === 'PresentedFighters' && !isPresented) {
        return false;
      }

      if (statusFilter === 'OnMats') {
        return f.status === 'Checked In';
      }
      if (statusFilter === 'Completed') {
        return f.status === 'Completed' || f.status === 'Present' || f.status === 'Late';
      }
      if (statusFilter === 'Absent') {
        return f.status === 'Absent' || f.status === 'Unmarked';
      }

      return true;
    });

    list.sort((a, b) => {
      const dateA = a.joiningDate ? new Date(a.joiningDate).getTime() : 0;
      const dateB = b.joiningDate ? new Date(b.joiningDate).getTime() : 0;

      if (sortBy === 'SeniorToJunior') {
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        if (dateA && dateB && dateA !== dateB) return dateA - dateB;
        return a.name.localeCompare(b.name);
      }

      if (sortBy === 'JuniorToSenior') {
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        if (dateA && dateB && dateA !== dateB) return dateB - dateA;
        return a.name.localeCompare(b.name);
      }

      if (sortBy === 'EarlyToLate' || sortBy === 'PresentedFighters') {
        const aCheckedIn = a.status === 'Checked In' || a.status === 'Completed' || a.status === 'Present' || a.status === 'Late';
        const bCheckedIn = b.status === 'Checked In' || b.status === 'Completed' || b.status === 'Present' || b.status === 'Late';

        if (aCheckedIn && bCheckedIn) {
          const timeA = a.inTimestamp ? new Date(a.inTimestamp).getTime() : null;
          const timeB = b.inTimestamp ? new Date(b.inTimestamp).getTime() : null;
          if (timeA !== null && timeB !== null && timeA !== timeB) return timeA - timeB;
          if (timeA !== null && timeB === null) return -1;
          if (timeA === null && timeB !== null) return 1;
          return a.name.localeCompare(b.name);
        }
        if (aCheckedIn) return -1;
        if (bCheckedIn) return 1;
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return dateA - dateB;
      }

      if (sortBy === 'LateToEarly') {
        const aCheckedIn = a.status === 'Checked In' || a.status === 'Completed' || a.status === 'Present' || a.status === 'Late';
        const bCheckedIn = b.status === 'Checked In' || b.status === 'Completed' || b.status === 'Present' || b.status === 'Late';

        if (aCheckedIn && bCheckedIn) {
          const timeA = a.inTimestamp ? new Date(a.inTimestamp).getTime() : null;
          const timeB = b.inTimestamp ? new Date(b.inTimestamp).getTime() : null;
          if (timeA !== null && timeB !== null && timeA !== timeB) return timeB - timeA;
          if (timeA !== null && timeB === null) return -1;
          if (timeA === null && timeB !== null) return 1;
          return a.name.localeCompare(b.name);
        }
        if (aCheckedIn) return -1;
        if (bCheckedIn) return 1;
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return dateA - dateB;
      }

      return 0;
    });

    return list;
  }, [roster, searchQuery, styleFilter, statusFilter, sortBy]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none">
      
      {/* Banner with Date Control Hub */}
      <div className="bg-gradient-to-r from-slate-900 to-zinc-900 dark:from-zinc-900 dark:to-black rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/25 border border-red-500/30 text-xs font-bold text-red-400 uppercase tracking-wider">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Automated Mat Attendance {currentUser?.role === 'Coach' ? '• Coach View' : ''}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            {friendlyDate}
          </h1>
          <p className="text-slate-400 text-xs max-w-xl">
            Live automated attendance roster. Displays athletes checking in via RFID smart tap, arrival rankings, and live mat duration.
          </p>
        </div>

        {/* Date Navigator Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center bg-slate-800/80 dark:bg-zinc-800/80 rounded-2xl p-1 border border-slate-700/60 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              className="p-2 rounded-xl hover:bg-slate-700 dark:hover:bg-zinc-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && handleDateChange(e.target.value)}
              className="bg-transparent text-white font-mono text-xs font-bold px-2 py-1 outline-none cursor-pointer"
            />

            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              className="p-2 rounded-xl hover:bg-slate-700 dark:hover:bg-zinc-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleSetToday}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-700/60 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer"
          >
            Today
          </button>

          <button
            type="button"
            onClick={openLocationModal}
            className={`px-3.5 py-2.5 rounded-2xl border text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              gymSettings.geofenceEnabled && !gymSettings.hasCoordinates
                ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/50 text-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-slate-700/60 text-white'
            }`}
            title="Set or update gym GPS location and allowed punch-in radius"
          >
            <MapPin className="w-4 h-4 text-red-400" />
            <span>
              {!gymSettings.geofenceEnabled
                ? 'GPS Off'
                : gymSettings.hasCoordinates
                ? `Gym Pin (${gymSettings.radiusMeters}m)`
                : 'Set Gym Pin'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                !gymSettings.geofenceEnabled
                  ? 'bg-slate-400'
                  : gymSettings.hasCoordinates
                  ? 'bg-emerald-400'
                  : 'bg-amber-400 animate-pulse'
              }`}
            ></span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Export Month CSV'}</span>
          </button>
        </div>
      </div>

      {/* Missing Gym Pin Setup Callout */}
      {gymSettings.geofenceEnabled && !gymSettings.hasCoordinates && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5 sm:mt-0" />
            <span className="font-semibold">
              Gym GPS location is not set yet — fighters cannot self punch-in until you pin <strong>{gymSettings.locationLabel}</strong> or switch GPS verification off.
            </span>
          </div>
          <button
            type="button"
            onClick={openLocationModal}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-[11px] shrink-0 cursor-pointer transition-colors"
          >
            Set Gym Pin Now
          </button>
        </div>
      )}

      {/* Success Toast */}
      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Analytics Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Total Athletes</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalFighters || 0}</span>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 block mb-1">Currently on Mats</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.onMats || 0}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Sessions Completed</span>
          <span className="text-2xl font-black text-slate-700 dark:text-zinc-300">{completedTotal}</span>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-500 block mb-1">Not Checked In</span>
          <span className="text-2xl font-black text-red-500">{notCheckedInTotal}</span>
        </div>
      </div>

      {/* ---------------- SECTION 2: ATHLETE HISTORY QUICK PICKER (ABOVE THE LIST) ---------------- */}
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-7 space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-red-500 shrink-0" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Athlete Attendance History
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Click any fighter in the list below or select from the dropdown to view full monthly attendance logs and training hours.
          </p>
        </div>

        {/* Quick Athlete History Selector Dropdown (Grid-constrained so it never overflows) */}
        <div className="lg:col-span-5 min-w-0">
          <div className="relative w-full">
            <select
              value=""
              onChange={(e) => {
                const target = roster.find((f) => f.fighterId === e.target.value);
                if (target) openHistoryModal(target);
              }}
              className="w-full max-w-full min-w-0 truncate appearance-none pl-4 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
            >
              <option value="" disabled>Select Athlete to View History...</option>
              {roster.map((f) => (
                <option key={f.fighterId} value={f.fighterId}>
                  {f.name} ({f.style || 'MMA'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ---------------- SORT & FILTER BAR (Right above the list table) ---------------- */}
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search athlete by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 dark:text-zinc-100"
            />
          </div>

          {/* Sort Dropdown: Senior to Junior (Default), Presented Fighters, Early to Late, Late to Early, Junior to Senior */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:inline">Sort:</span>
            <div className="relative flex-1 sm:flex-initial min-w-0">
              <select
                value={sortBy}
                onChange={(e) => {
                  const val = e.target.value;
                  setSortBy(val);
                  if (val === 'PresentedFighters' && statusFilter === 'Absent') {
                    setStatusFilter('All');
                  }
                }}
                className="w-full sm:w-auto max-w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer truncate"
              >
                <option value="SeniorToJunior">Senior to Junior (Default)</option>
                <option value="PresentedFighters">Presented Fighters (Came Today)</option>
                <option value="EarlyToLate">Early to Late (Arrival 🥇)</option>
                <option value="LateToEarly">Late to Early (Arrival)</option>
                <option value="JuniorToSenior">Junior to Senior</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Style & Status Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">Style:</span>
          {['All', 'MMA', 'Striking', 'Grappling'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStyleFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                styleFilter === st
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              {st}
            </button>
          ))}

          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-3 mr-1">Status:</span>
          {[
            { id: 'All', label: 'All' },
            { id: 'OnMats', label: 'On Mats (Live)' },
            { id: 'Completed', label: 'Completed' },
            { id: 'Absent', label: 'Not Checked In' },
          ].map((sta) => (
            <button
              key={sta.id}
              type="button"
              onClick={() => setStatusFilter(sta.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                statusFilter === sta.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              {sta.label}
            </button>
          ))}

          <span className="ml-auto text-[10px] font-bold text-slate-400">
            Showing {processedRoster.length} Fighters {isPending ? '• Syncing...' : ''}
          </span>
        </div>

      </div>

      {/* ---------------- ATTENDANCE LIST TABLE (Exact match to fighter view) ---------------- */}
      <div className="space-y-3">
        
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Mat Attendance Roster & Early-Bird Rankings
          </h3>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {stats.onMats || 0} Currently on Mats
          </span>
        </div>

        {processedRoster.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-zinc-900/40 rounded-3xl border border-slate-200 dark:border-zinc-800 space-y-2">
            <Users className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto" />
            <h3 className="text-sm font-extrabold uppercase tracking-tight text-slate-700 dark:text-zinc-300">
              No Athletes Found
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              Try adjusting your search query or filter tags.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm">
            {processedRoster.map((fighter, index) => {
              const isOnMats = fighter.status === 'Checked In';
              const isLate = fighter.status === 'Late';
              const isCompleted = fighter.status === 'Completed' || fighter.status === 'Present';
              const hasCheckedIn = isOnMats || isCompleted || isLate;

              return (
                <div
                  key={fighter.fighterId}
                  className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 lg:gap-4 transition-colors relative first:rounded-t-3xl last:rounded-b-3xl ${
                    isOnMats
                      ? 'bg-emerald-500/5 dark:bg-emerald-950/10'
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-850/40'
                  }`}
                >
                  {/* Athlete Info, Rank & Avatar */}
                  <div 
                    className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0"
                    onClick={() => openHistoryModal(fighter)}
                    title="Click to view full training history"
                  >
                    {/* Rank / Early Bird Badge */}
                    <div className="w-8 flex items-center justify-center shrink-0">
                      {hasCheckedIn && fighter.checkInRank ? (
                        fighter.checkInRank === 1 ? (
                          <span className="text-lg" title="1st Arrival - Early Bird Champion">🥇</span>
                        ) : fighter.checkInRank === 2 ? (
                          <span className="text-lg" title="2nd Arrival">🥈</span>
                        ) : fighter.checkInRank === 3 ? (
                          <span className="text-lg" title="3rd Arrival">🥉</span>
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-black text-slate-600 dark:text-zinc-300 flex items-center justify-center">
                            #{fighter.checkInRank}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-300 dark:text-zinc-700 text-xs font-mono font-bold">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                      {fighter.photo ? (
                        <img src={fighter.photo} alt={fighter.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm uppercase tracking-tight text-slate-900 dark:text-white hover:text-red-500 transition-colors truncate">
                          {fighter.name}
                        </h4>
                        {fighter.phone && (
                          <span className="text-[10px] text-slate-400 font-mono hidden md:inline shrink-0">
                            • {fighter.phone}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px]">
                        <span className="font-bold text-red-500 uppercase">{fighter.style || 'MMA'}</span>
                        <span className="text-slate-300 dark:text-zinc-700">•</span>
                        <span className="text-slate-400 font-semibold">{fighter.assignedCoachName}</span>
                        <span className="text-slate-300 dark:text-zinc-700">•</span>
                        <span className="text-slate-400 font-mono">{fighter.experienceLevel || 'Athlete'}</span>
                        {hasCheckedIn && fighter.locationVerified && fighter.checkInDistanceMeters !== null && (
                          <>
                            <span className="text-slate-300 dark:text-zinc-700">•</span>
                            <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                              <MapPin className="w-3 h-3" />
                              {fighter.checkInDistanceMeters}m
                              {fighter.checkOutDistanceMeters !== null ? ` / Out ${fighter.checkOutDistanceMeters}m` : ''}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Punch In/Out, Duration & Actions */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-x-4 gap-y-2.5 w-full lg:w-auto min-w-0">
                    
                    {hasCheckedIn ? (
                      <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:gap-5 w-full sm:w-auto pt-2.5 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-zinc-800/80 text-[11px] sm:text-xs font-mono">
                        <div className="min-w-0">
                          <span className="block text-[9px] text-slate-400 uppercase font-sans font-bold">In Time</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-black whitespace-nowrap">{fighter.inTime || '--:--:--'}</span>
                        </div>

                        <div className="min-w-0">
                          <span className="block text-[9px] text-slate-400 uppercase font-sans font-bold">Out Time</span>
                          <span className="text-red-500 dark:text-red-400 font-black whitespace-nowrap">{fighter.outTime || '--:--:--'}</span>
                        </div>

                        <div className="min-w-0">
                          <span className="block text-[9px] text-slate-400 uppercase font-sans font-bold">Duration</span>
                          <span className="text-slate-800 dark:text-zinc-200 font-black whitespace-nowrap">{fighter.durationFormatted}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-zinc-500 italic">
                        Not checked in today
                      </span>
                    )}

                    {/* Live Status Pill */}
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 inline-flex items-center gap-1 whitespace-nowrap ${
                        isOnMats
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : isLate
                          ? 'bg-amber-500 text-white shadow-sm'
                          : isCompleted
                          ? 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                          : 'bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-600'
                      }`}
                    >
                      {isOnMats && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                      {isOnMats ? 'On Mats' : isLate ? 'Late' : isCompleted ? 'Completed' : fighter.status === 'Absent' ? 'Absent' : 'Not Checked In'}
                    </span>

                    {/* Action Buttons: History & Fallback Manual Override */}
                    <div className="flex items-center gap-2 ml-auto sm:ml-0 shrink-0">
                      {/* Explicit History Button */}
                      <button
                        type="button"
                        onClick={() => openHistoryModal(fighter)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-red-500 hover:text-red-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        title="View athlete monthly history and stats"
                      >
                        <History className="w-3.5 h-3.5 text-red-500" />
                        <span>History</span>
                      </button>

                      {/* Fallback Manual Punch Menu */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setActiveMenuFighterId(activeMenuFighterId === fighter.fighterId ? null : fighter.fighterId)}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                          title="Manual override"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuFighterId === fighter.fighterId && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-30 py-1 text-xs font-bold divide-y divide-slate-100 dark:divide-zinc-800 animate-in fade-in zoom-in-95 duration-150">
                            <button
                              type="button"
                              onClick={() => handleManualAction(fighter.fighterId, 'check-in')}
                              className="w-full text-left px-3 py-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 flex items-center gap-2 cursor-pointer"
                            >
                              <LogIn className="w-3.5 h-3.5" /> Manual Punch In
                            </button>
                            <button
                              type="button"
                              onClick={() => handleManualAction(fighter.fighterId, 'check-out')}
                              className="w-full text-left px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5" /> Manual Punch Out
                            </button>
                            <button
                              type="button"
                              onClick={() => handleManualAction(fighter.fighterId, 'absent')}
                              className="w-full text-left px-3 py-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Mark Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => handleManualAction(fighter.fighterId, 'reset')}
                              className="w-full text-left px-3 py-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                            >
                              Reset Record
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ---------------- ATHLETE HISTORY MODAL (Exact match to Screenshot 2) ---------------- */}
      {historyModalFighter && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setHistoryModalFighter(null);
            setHistoryModalData(null);
          }}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-600 font-black text-sm flex items-center justify-center shrink-0">
                  {historyModalFighter.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                    {historyModalFighter.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                    <span className="font-bold text-red-500 uppercase">{historyModalFighter.style || 'MMA'}</span>
                    <span>•</span>
                    <span>Coach: {historyModalFighter.assignedCoachName || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setHistoryModalFighter(null);
                  setHistoryModalData(null);
                }}
                className="p-2 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-16 text-center text-xs font-bold text-slate-400">
                Loading monthly training history...
              </div>
            ) : historyModalData ? (
              <div className="space-y-6">
                {/* Monthly Stats Cards (Matching Screenshot 2) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-100 dark:border-zinc-800">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      PRESENT DAYS
                    </span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {historyModalData.stats?.presentDays || 0} / {historyModalData.stats?.totalExpectedDays || 26}
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-100 dark:border-zinc-800">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      AVG WORKING HOURS
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {historyModalData.stats?.avgWorkingHours || '00h 00m'}
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-100 dark:border-zinc-800">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-red-500" /> TOTAL MAT HOURS
                    </span>
                    <span className="text-2xl font-black text-red-500">
                      {historyModalData.stats?.totalHoursFormatted || '00h 00m'}
                    </span>
                  </div>
                </div>

                {/* History Logs Feed (Matching Screenshot 2) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Past Mat Sessions ({historyModalData.history?.length || 0})
                  </h4>

                  {historyModalData.history?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-10 text-center italic bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-800">
                      No training history recorded for this month yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 border border-slate-100 dark:border-zinc-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-zinc-950/40">
                      {historyModalData.history?.map((entry) => (
                        <div key={entry._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 font-black text-xs flex items-center justify-center shrink-0">
                              {historyModalFighter.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-900 dark:text-white block uppercase">
                                {historyModalFighter.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {entry.style || 'MMA'} • {entry.date}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 font-mono text-xs pl-11 sm:pl-0">
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">In Time</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-black">{entry.inTime}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">Out Time</span>
                              <span className="text-red-500 dark:text-red-400 font-black">{entry.outTime || '--:--:--'}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">Duration</span>
                              <span className="text-slate-900 dark:text-white font-extrabold">{entry.durationFormatted}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* ---------------- GYM LOCATION / GEOFENCE SETTINGS MODAL ---------------- */}
      {showLocationModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowLocationModal(false)}
        >
          <form
            onSubmit={handleSaveLocation}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black uppercase text-slate-900 dark:text-white truncate">
                    Gym Location & Geofence
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    Verify athletes are physically at the gym before self check-in.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="p-2 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {locMsg && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold flex items-start gap-2 ${
                  locMsg.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
                }`}
              >
                {locMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{locMsg.text}</span>
              </div>
            )}

            {/* Enforcement Toggles */}
            <div className="space-y-2.5 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/70 dark:border-zinc-800 rounded-2xl p-4">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white block">
                    Require Gym Location (Punch In)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Athletes must be within the radius to tap attendance alone.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={locEnabled}
                  onChange={(e) => setLocEnabled(e.target.checked)}
                  className="w-5 h-5 accent-red-600 cursor-pointer shrink-0"
                />
              </label>

              {locEnabled && (
                <label className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-200/70 dark:border-zinc-800 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 block">
                      Also Require Location for Punch Out
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Turn off if athletes forget to tap Out before leaving.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={locRequireCheckOut}
                    onChange={(e) => setLocRequireCheckOut(e.target.checked)}
                    className="w-4.5 h-4.5 accent-red-600 cursor-pointer shrink-0"
                  />
                </label>
              )}
            </div>

            {/* Label & Quick Capture */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Location Name
                </label>
                <input
                  type="text"
                  value={locLabel}
                  onChange={(e) => setLocLabel(e.target.value)}
                  placeholder="Mutants Academy"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                type="button"
                onClick={handleCaptureCurrentLocation}
                disabled={isCapturingGPS}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                <LocateFixed className={`w-4 h-4 text-emerald-400 ${isCapturingGPS ? 'animate-spin' : ''}`} />
                <span>{isCapturingGPS ? 'Detecting Current GPS...' : 'Use My Current Location (At Gym)'}</span>
              </button>

              {/* Paste Google Maps Link or Lat, Lng */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Or Paste Google Maps Link / Coordinates
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mapsPasteInput}
                    onChange={(e) => setMapsPasteInput(e.target.value)}
                    placeholder="Paste Google Maps URL or 13.0827, 80.2707"
                    className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyMapsInput}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-100 text-xs font-black uppercase tracking-wider cursor-pointer shrink-0"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Lat / Lng fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={locLat}
                    onChange={(e) => setLocLat(e.target.value)}
                    placeholder="13.082700"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={locLng}
                    onChange={(e) => setLocLng(e.target.value)}
                    placeholder="80.270700"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {locLat !== '' && locLng !== '' && (
                <a
                  href={`https://www.google.com/maps?q=${encodeURIComponent(`${locLat},${locLng}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-400"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Preview Pin on Google Maps</span>
                </a>
              )}
            </div>

            {/* Allowed Radius */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Allowed Check-In Radius (Meters)
                </label>
                <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {locRadius}m
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[50, 100, 150, 250].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setLocRadius(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                      Number(locRadius) === preset
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {preset}m
                  </button>
                ))}
                <input
                  type="number"
                  min={20}
                  max={2000}
                  value={locRadius}
                  onChange={(e) => setLocRadius(Number(e.target.value) || 100)}
                  className="w-24 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Indoor concrete roofs typically cause 20–60m GPS drift; <strong>100m</strong> is recommended.
              </p>
            </div>

            {gymSettings.updatedByName && (
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  Last updated by <strong>{gymSettings.updatedByName}</strong>
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingLocation}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/25 cursor-pointer disabled:opacity-60"
              >
                {isSavingLocation ? 'Saving...' : 'Save Location'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
