'use client';

import { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  fighterPunchIn, 
  fighterPunchOut, 
  getTodayAttendanceDashboard,
  getFighterAttendanceHistory 
} from '@/app/actions/attendanceActions';
import { getBrowserCoordinates } from '@/lib/geoUtils';
import ThemeToggle from '@/components/ThemeToggle';
import { 
  Clock, ArrowLeft, CheckCircle2, UserCheck, Flame, 
  Calendar, Users, CreditCard, User, Sparkles, Trophy, 
  Search, ArrowUpDown, ChevronDown, Check, LogIn, LogOut,
  History, Timer, ShieldCheck, Cpu, MapPin, LocateFixed, AlertTriangle
} from 'lucide-react';

function getTodayISTDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default function FighterAttendanceClient({ 
  fighter, 
  initialDashboard, 
  initialHistory, 
  currentDateStr 
}) {
  const router = useRouter();
  const [activeView, setActiveView] = useState('mats'); // 'mats' (Live punch & list) or 'history' (Past logs)
  const [myRecord, setMyRecord] = useState(initialDashboard.myRecord);
  const [attendanceList, setAttendanceList] = useState(initialDashboard.attendanceList || []);
  const [stats, setStats] = useState(initialDashboard.stats || {});
  const [gymSettings, setGymSettings] = useState(
    initialDashboard.gymSettings || {
      locationLabel: 'Mutants Academy',
      hasCoordinates: false,
      radiusMeters: 100,
      geofenceEnabled: true,
      requireCheckOutLocation: true,
    }
  );
  const [historyData, setHistoryData] = useState(initialHistory || { history: [], stats: {} });

  // Sorting state: Default "Senior to Junior" as requested
  const [sortBy, setSortBy] = useState('SeniorToJunior'); // 'SeniorToJunior', 'EarlyToLate', 'LateToEarly', 'JuniorToSenior'
  const [searchQuery, setSearchQuery] = useState('');
  const [styleFilter, setStyleFilter] = useState('All');

  const [isPending, startTransition] = useTransition();
  const [isLocating, setIsLocating] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const activeDateRef = useRef(currentDateStr || getTodayISTDate());

  // Live stopwatch duration calculation
  const [liveDuration, setLiveDuration] = useState(myRecord?.durationFormatted || '00h 00m 00s');

  const isCheckedIn = myRecord?.status === 'Checked In';

  // Auto-refresh when returning to an open tab or after IST midnight rolls over
  useEffect(() => {
    const refreshForToday = async () => {
      const [freshDash, freshHist] = await Promise.all([
        getTodayAttendanceDashboard(fighter._id),
        getFighterAttendanceHistory(fighter._id),
      ]);
      if (freshDash?.success) {
        activeDateRef.current = freshDash.todayDate || getTodayISTDate();
        setMyRecord(freshDash.myRecord);
        setAttendanceList(freshDash.attendanceList);
        setStats(freshDash.stats);
        if (freshDash.gymSettings) setGymSettings(freshDash.gymSettings);
        if (!freshDash.myRecord) {
          setLiveDuration('00h 00m 00s');
        } else if (freshDash.myRecord.status !== 'Checked In') {
          setLiveDuration(freshDash.myRecord.durationFormatted || '00h 00m 00s');
        }
      }
      if (freshHist?.success) {
        setHistoryData(freshHist);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshForToday();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = setInterval(() => {
      if (getTodayISTDate() !== activeDateRef.current) {
        refreshForToday();
      }
    }, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [fighter._id]);

  // Stopwatch effect while checked in
  useEffect(() => {
    if (!isCheckedIn || !myRecord?.inTimestamp) {
      return;
    }

    const inDate = new Date(myRecord.inTimestamp);

    const updateTimer = () => {
      const now = new Date();
      const diffSec = Math.max(0, Math.floor((now.getTime() - inDate.getTime()) / 1000));
      const hours = Math.floor(diffSec / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;
      setLiveDuration(
        `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isCheckedIn, myRecord?.inTimestamp]);

  // Unified Punch In / Punch Out with optional GPS geofence verification
  const executePunch = async (isPunchOut) => {
    const needsLocation =
      gymSettings.geofenceEnabled &&
      gymSettings.hasCoordinates &&
      (!isPunchOut || gymSettings.requireCheckOutLocation);

    let locationPayload = null;
    if (needsLocation) {
      setIsLocating(true);
      const geoRes = await getBrowserCoordinates();
      setIsLocating(false);
      if (geoRes.error) {
        setActionMsg({ type: 'error', text: geoRes.error });
        setTimeout(() => setActionMsg(null), 6000);
        return;
      }
      locationPayload = {
        latitude: geoRes.latitude,
        longitude: geoRes.longitude,
        accuracy: geoRes.accuracy,
      };
    }

    startTransition(async () => {
      const res = isPunchOut
        ? await fighterPunchOut(locationPayload)
        : await fighterPunchIn(locationPayload);

      if (res.success) {
        setMyRecord(res.record);
        setLiveDuration(isPunchOut ? res.record?.durationFormatted || '00h 00m 00s' : '00h 00m 00s');
        setActionMsg({ type: 'success', text: res.message });
        setTimeout(() => setActionMsg(null), 5000);

        const requests = [getTodayAttendanceDashboard(fighter._id)];
        if (isPunchOut) {
          requests.push(getFighterAttendanceHistory(fighter._id));
        }
        const [freshDash, freshHist] = await Promise.all(requests);
        if (freshDash?.success) {
          activeDateRef.current = freshDash.todayDate || getTodayISTDate();
          setAttendanceList(freshDash.attendanceList);
          setStats(freshDash.stats);
          if (freshDash.gymSettings) setGymSettings(freshDash.gymSettings);
        }
        if (freshHist?.success) {
          setHistoryData(freshHist);
        }
      } else {
        setActionMsg({ type: 'error', text: res.error });
        setTimeout(() => setActionMsg(null), 6000);
      }
    });
  };

  const handlePunchIn = () => executePunch(false);
  const handlePunchOut = () => executePunch(true);

  // Sorted and filtered Attendance List
  const processedAttendanceList = useMemo(() => {
    let list = [...attendanceList];

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((f) => f.fighterName.toLowerCase().includes(q));
    }

    // Filter by style
    if (styleFilter !== 'All') {
      list = list.filter((f) => f.style === styleFilter);
    }

    // Filter to presented (came today) fighters when selected in Sort
    if (sortBy === 'PresentedFighters') {
      list = list.filter((f) => f.hasCheckedIn);
    }

    // Sort options:
    // 1. Senior to Junior (Default)
    // 2. Presented Fighters (Came Today - earliest arrival first)
    // 3. Early to Late (Arrival)
    // 4. Late to Early (Arrival)
    // 5. Junior to Senior
    list.sort((a, b) => {
      const dateA = a.joiningDate ? new Date(a.joiningDate).getTime() : 0;
      const dateB = b.joiningDate ? new Date(b.joiningDate).getTime() : 0;

      if (sortBy === 'SeniorToJunior') {
        // Oldest joining date first (valid dates prioritized over missing)
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        if (dateA && dateB && dateA !== dateB) return dateA - dateB;
        return a.fighterName.localeCompare(b.fighterName);
      }

      if (sortBy === 'JuniorToSenior') {
        // Newest joining date first
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        if (dateA && dateB && dateA !== dateB) return dateB - dateA;
        return a.fighterName.localeCompare(b.fighterName);
      }

      if (sortBy === 'EarlyToLate' || sortBy === 'PresentedFighters') {
        // Checked in arrivals first (earliest timestamp first)
        if (a.hasCheckedIn && b.hasCheckedIn) {
          const timeA = a.inTimestamp ? new Date(a.inTimestamp).getTime() : null;
          const timeB = b.inTimestamp ? new Date(b.inTimestamp).getTime() : null;
          if (timeA !== null && timeB !== null && timeA !== timeB) return timeA - timeB;
          if (timeA !== null && timeB === null) return -1;
          if (timeA === null && timeB !== null) return 1;
          return a.fighterName.localeCompare(b.fighterName);
        }
        if (a.hasCheckedIn) return -1;
        if (b.hasCheckedIn) return 1;
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return dateA - dateB;
      }

      if (sortBy === 'LateToEarly') {
        // Checked in arrivals first (latest arrival first)
        if (a.hasCheckedIn && b.hasCheckedIn) {
          const timeA = a.inTimestamp ? new Date(a.inTimestamp).getTime() : null;
          const timeB = b.inTimestamp ? new Date(b.inTimestamp).getTime() : null;
          if (timeA !== null && timeB !== null && timeA !== timeB) return timeB - timeA;
          if (timeA !== null && timeB === null) return -1;
          if (timeA === null && timeB !== null) return 1;
          return a.fighterName.localeCompare(b.fighterName);
        }
        if (a.hasCheckedIn) return -1;
        if (b.hasCheckedIn) return 1;
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return dateA - dateB;
      }

      return 0;
    });

    return list;
  }, [attendanceList, searchQuery, styleFilter, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col font-sans select-none">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors duration-200">
        <div className="w-full max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1720px] 3xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <div className="flex h-16 items-center justify-between">
            
            {/* Back button */}
            <Link
              href="/fighter"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-500 transition-colors uppercase tracking-wider cursor-pointer shrink-0 whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span><span className="hidden sm:inline">Back to </span>Dashboard</span>
            </Link>

            {/* Header Right Controls */}
            <div className="flex items-center gap-2.5 sm:gap-4">
              
              {/* History Sub-Page Icon Button (Toggle between Today's Mats & History) */}
              <button
                type="button"
                onClick={() => setActiveView(activeView === 'mats' ? 'history' : 'mats')}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'history'
                    ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/25'
                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-red-500 hover:text-red-500'
                }`}
                title={activeView === 'mats' ? 'View My Full Training History' : 'Back to Today Live Attendance'}
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">{activeView === 'mats' ? 'Training History' : 'Live Attendance'}</span>
                <span className="sm:hidden">{activeView === 'mats' ? 'History' : 'Live'}</span>
              </button>

              <ThemeToggle />

              {/* Profile Avatar Page Link */}
              <Link
                href="/fighter/profile"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 transition-all cursor-pointer shadow-sm relative shrink-0"
                title="View Profile"
              >
                {fighter.photo ? (
                  <img src={fighter.photo} alt={fighter.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <User className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-red-500" />
                )}
              </Link>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1720px] 3xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8 space-y-6 animate-in fade-in duration-300 pb-28 md:pb-12">
        
        {/* Action Toast / Feedback message */}
        {actionMsg && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 ${
              actionMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
            }`}
          >
            {actionMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <Clock className="w-4 h-4 shrink-0 text-red-500" />
            )}
            <span>{actionMsg.text}</span>
          </div>
        )}

        {/* ---------------- VIEW 1: TODAY'S LIVE ATTENDANCE & LEADERBOARD ---------------- */}
        {activeView === 'mats' && (
          <div className="space-y-6">
            
            {/* User Welcome Card (Matching AAMEC Top Header Card) */}
            <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Welcome back, {fighter.name}
                </h1>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
                  <span>Active Athlete</span>
                  <span className="px-2 py-0.5 rounded-md bg-red-600/10 border border-red-600/20 text-red-600 dark:text-red-400 font-extrabold uppercase text-[10px]">
                    {fighter.style || 'MMA'}
                  </span>
                </p>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-400 dark:text-zinc-500 font-semibold">
                  <span className="font-mono">
                    Mutants Academy
                  </span>
                  <span>•</span>
                  <span className="font-mono">TENURE: {fighter.experienceLevel || 'Athlete'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Mat Session
                </span>
              </div>
            </div>

            {/* Attendance Punch Box Card (Matching Screenshot 1) */}
            <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              
              {/* Header title inside box */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                    ATTENDANCE
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Tap below to log your daily arrival and departure on the mats (tracks live mat hours).
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shrink-0 ${
                    isCheckedIn
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 animate-pulse'
                      : myRecord?.status === 'Completed'
                      ? 'bg-slate-800 dark:bg-zinc-700 text-white'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
                  }`}
                >
                  {isCheckedIn
                    ? 'Checked In 🟢'
                    : myRecord?.status === 'Completed'
                    ? 'Session Completed ⚪'
                    : 'Not Checked In'}
                </span>
              </div>

              {/* Gym GPS Verification Status Pill */}
              <div
                className={`px-3.5 py-2 rounded-2xl border text-[11px] font-bold flex items-center justify-between gap-2 flex-wrap ${
                  !gymSettings.geofenceEnabled
                    ? 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400'
                    : gymSettings.hasCoordinates
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {gymSettings.geofenceEnabled && !gymSettings.hasCoordinates ? (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  )}
                  <span className="truncate">
                    {!gymSettings.geofenceEnabled
                      ? 'Open Check-In Mode • Location verification off'
                      : gymSettings.hasCoordinates
                      ? `Gym GPS Active • Must be within ${gymSettings.radiusMeters}m of ${gymSettings.locationLabel}`
                      : 'Gym GPS pin not set by Admin/Coach yet'}
                  </span>
                </div>
                {myRecord?.locationVerified && myRecord?.checkInDistanceMeters !== null && (
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                    Verified • {myRecord.checkInDistanceMeters}m
                  </span>
                )}
              </div>

              {/* Single RFID Tap Card (First tap Check-In, Next tap Check-Out) */}
              <div className="w-full">
                <button
                  type="button"
                  onClick={isCheckedIn ? handlePunchOut : handlePunchIn}
                  disabled={isPending || isLocating}
                  className={`w-full p-8 sm:p-10 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 cursor-pointer text-center group shadow-xl active:scale-[0.99] disabled:opacity-75 ${
                    isCheckedIn
                      ? 'bg-[#0b1329] dark:bg-zinc-950 border-red-500/60 hover:border-red-400 hover:shadow-red-500/20'
                      : 'bg-[#0b1329] dark:bg-zinc-950 border-cyan-500/50 hover:border-cyan-400 hover:shadow-cyan-500/20'
                  }`}
                >
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${
                      isCheckedIn
                        ? 'bg-red-950/70 border border-red-500/50 text-red-400 shadow-red-500/20 animate-pulse'
                        : 'bg-[#1e293b] border border-cyan-500/40 text-cyan-400 shadow-cyan-500/20'
                    }`}
                  >
                    {isLocating ? (
                      <LocateFixed className="w-8 h-8 animate-spin" />
                    ) : (
                      <Cpu className="w-8 h-8" />
                    )}
                  </div>

                  <div>
                    <h4 className="text-xl font-black text-white uppercase tracking-wider">
                      RFID
                    </h4>
                    <span
                      className={`text-xs font-bold block mt-1 tracking-wide ${
                        isCheckedIn
                          ? 'text-red-400'
                          : 'text-cyan-400'
                      }`}
                    >
                      {isLocating
                        ? 'Verifying Gym GPS Location...'
                        : isPending
                        ? 'Recording Attendance...'
                        : isCheckedIn
                        ? `Smart Card Tap • Tap to Check Out (In at ${myRecord.inTime})`
                        : myRecord?.status === 'Completed'
                        ? `Smart Card Tap • Tap to Check In Again (Last Left at ${myRecord.outTime})`
                        : 'Smart Card Tap • Tap to Check In'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Today In Time, Today Out Time, Live Duration Row (Exact AAMEC Screenshot 1 match) */}
              <div className="bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-100 dark:border-zinc-800/80 rounded-2xl p-5 grid grid-cols-3 gap-2 text-center divide-x divide-slate-200 dark:divide-zinc-800">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Today In Time
                  </span>
                  <span className="text-sm sm:text-base font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {myRecord?.inTime || '--:--:--'}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Today Out Time
                  </span>
                  <span className="text-sm sm:text-base font-mono font-black text-red-500 dark:text-red-400">
                    {myRecord?.outTime || '--:--:--'}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Timer className="w-3 h-3 text-red-500" /> Live Duration
                  </span>
                  <span className="text-sm sm:text-base font-mono font-black text-slate-900 dark:text-white">
                    {myRecord ? liveDuration : '00h 00m 00s'}
                  </span>
                </div>
              </div>

            </div>

            {/* ---------------- SORT & FILTER BAR (Right below check-in area) ---------------- */}
            <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                
                {/* Search Box */}
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search fighter in today's attendance..."
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
                      onChange={(e) => setSortBy(e.target.value)}
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

              {/* Discipline Style Filters */}
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

                <span className="ml-auto text-[10px] font-bold text-slate-400">
                  Showing {processedAttendanceList.length} Fighters
                </span>
              </div>

            </div>

            {/* ---------------- ATTENDANCE LIST & LEADERBOARD (Right below sort bar) ---------------- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Today&apos;s Attendance & Early-Bird Roster
                </h3>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {stats.currentlyOnMats || 0} Currently on Mats
                </span>
              </div>

              {processedAttendanceList.length === 0 ? (
                <div className="p-10 text-center bg-white dark:bg-zinc-900/40 rounded-3xl border border-slate-200 dark:border-zinc-800">
                  <p className="text-xs text-slate-400 dark:text-zinc-500">No fighters matched the selected filter.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm">
                  {processedAttendanceList.map((item, index) => {
                    const isSelf = item.fighterId === fighter._id;

                    return (
                      <div
                        key={item.fighterId}
                        className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors first:rounded-t-3xl last:rounded-b-3xl ${
                          isSelf
                            ? 'bg-red-500/5 dark:bg-red-950/15 border-l-4 border-l-red-600'
                            : item.isOnMats
                            ? 'bg-emerald-500/5 dark:bg-emerald-950/10'
                            : 'hover:bg-slate-50 dark:hover:bg-zinc-850/40'
                        }`}
                      >
                        {/* Athlete Info & Rank */}
                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                          
                          {/* Rank / Early Bird Badge */}
                          <div className="w-8 flex items-center justify-center shrink-0">
                            {item.hasCheckedIn && item.checkInRank ? (
                              item.checkInRank === 1 ? (
                                <span className="text-lg" title="1st Arrival - Early Bird Champion">🥇</span>
                              ) : item.checkInRank === 2 ? (
                                <span className="text-lg" title="2nd Arrival">🥈</span>
                              ) : item.checkInRank === 3 ? (
                                <span className="text-lg" title="3rd Arrival">🥉</span>
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-black text-slate-600 dark:text-zinc-300 flex items-center justify-center">
                                  #{item.checkInRank}
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
                            {item.photo ? (
                              <img src={item.photo} alt={item.fighterName} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-slate-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <h4 className="font-extrabold text-sm uppercase tracking-tight text-slate-900 dark:text-white truncate">
                                {item.fighterName}
                              </h4>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[8px] font-black uppercase tracking-wider shrink-0">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                              <span className="font-bold text-red-500 uppercase">{item.style}</span>
                              <span className="text-slate-300 dark:text-zinc-700">•</span>
                              <span className="text-slate-400 font-semibold">{item.experienceLevel}</span>
                            </div>
                          </div>

                        </div>

                        {/* Punch In/Out, Duration & Live Status Pill */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-x-4 gap-y-2.5 w-full sm:w-auto min-w-0">
                          
                          {item.hasCheckedIn ? (
                            <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:gap-5 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-slate-100 dark:border-zinc-800/80 sm:border-t-0 text-[11px] sm:text-xs font-mono">
                              <div className="min-w-0">
                                <span className="block text-[9px] text-slate-400 uppercase font-sans font-bold">In Time</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-black whitespace-nowrap">{item.inTime}</span>
                              </div>

                              <div className="min-w-0">
                                <span className="block text-[9px] text-slate-400 uppercase font-sans font-bold">Out Time</span>
                                <span className="text-red-500 dark:text-red-400 font-black whitespace-nowrap">{item.outTime || '--:--:--'}</span>
                              </div>

                              <div className="min-w-0">
                                <span className="block text-[9px] text-slate-400 uppercase font-sans font-bold">Mat Duration</span>
                                <span className="text-slate-800 dark:text-zinc-200 font-black whitespace-nowrap">{item.durationFormatted}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-zinc-500 italic">
                              Not checked in today yet
                            </span>
                          )}

                          {/* Live Status Pill */}
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 inline-flex items-center gap-1 whitespace-nowrap ml-auto sm:ml-0 ${
                              item.isOnMats
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : item.hasCheckedIn
                                ? 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                                : 'bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-600'
                            }`}
                          >
                            {item.isOnMats && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                            {item.isOnMats
                              ? 'On Mats'
                              : item.hasCheckedIn
                              ? 'Completed'
                              : item.status === 'Absent'
                              ? 'Absent'
                              : 'Not Checked In'}
                          </span>

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ---------------- VIEW 2: MY TRAINING HISTORY (Matching AAMEC Screenshot 2) ---------------- */}
        {activeView === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Top Back to Live Banner */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  My Mat Training History
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete logs of past check-in and check-out sessions at Mutants Academy.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveView('mats')}
                className="px-3.5 py-2 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 hover:border-red-500 hover:text-red-500 transition-colors cursor-pointer"
              >
                Back to Live Attendance
              </button>
            </div>

            {/* Monthly Statistics Summary Cards (Matching AAMEC Screenshot 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  PRESENT DAYS
                </span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {historyData.stats?.presentDays || 0} / {historyData.stats?.totalExpectedDays || 26}
                </span>
              </div>

              <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  AVG TRAINING HOURS
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {historyData.stats?.avgWorkingHours || '00h 00m'}
                </span>
              </div>

              <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" /> TOTAL MAT HOURS
                </span>
                <span className="text-2xl font-black text-red-500">
                  {historyData.stats?.totalHoursFormatted || '00h 00m'}
                </span>
              </div>
            </div>

            {/* History Feed List (Matching AAMEC Screenshot 2 rows) */}
            <div className="space-y-3">
              {historyData.history?.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-zinc-900/40 rounded-3xl border border-slate-200 dark:border-zinc-800">
                  <p className="text-xs text-slate-400 dark:text-zinc-500">No past attendance logs recorded for this month yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/80 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
                  {historyData.history?.map((entry) => (
                    <div
                      key={entry._id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-zinc-850/40 transition-colors"
                    >
                      {/* Avatar & Date Info */}
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
                          {fighter.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm uppercase tracking-tight text-slate-900 dark:text-white">
                            {fighter.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {entry.style || 'MMA'} • {entry.date}
                          </span>
                        </div>
                      </div>

                      {/* Timestamps & Duration (Matching Screenshot 2) */}
                      <div className="flex items-center gap-6 text-xs font-mono pl-13 sm:pl-0">
                        <div>
                          <span className="block text-[9px] text-slate-400 uppercase font-sans font-bold">In Time</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{entry.inTime}</span>
                        </div>

                        <div>
                          <span className="block text-[9px] text-slate-400 uppercase font-sans font-bold">Out Time</span>
                          <span className="text-red-500 dark:text-red-400 font-bold">{entry.outTime}</span>
                        </div>

                        <div>
                          <span className="block text-[9px] text-slate-400 uppercase font-sans font-bold">Duration</span>
                          <span className="text-slate-900 dark:text-white font-extrabold">{entry.durationFormatted}</span>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Mobile Fixed Bottom Navigation Bar (3 Tabs: Events, Fighters, Billing) */}
      <nav 
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-zinc-800 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] px-3 pt-2 transition-colors duration-200"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60, paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="grid grid-cols-3 items-center max-w-md mx-auto gap-1">
          <Link
            href="/fighter"
            className="flex flex-col items-center justify-center py-1 px-2 rounded-2xl text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 font-semibold transition-all cursor-pointer relative"
          >
            <Calendar className="w-5 h-5 stroke-[1.75]" />
            <span className="text-[10px] tracking-tight uppercase mt-1">Events</span>
          </Link>

          <Link
            href="/fighter?tab=directory"
            className="flex flex-col items-center justify-center py-1 px-2 rounded-2xl text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 font-semibold transition-all cursor-pointer relative"
          >
            <Users className="w-5 h-5 stroke-[1.75]" />
            <span className="text-[10px] tracking-tight uppercase mt-1">Fighters</span>
          </Link>

          <Link
            href="/fighter?tab=billing"
            className="flex flex-col items-center justify-center py-1 px-2 rounded-2xl text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 font-semibold transition-all cursor-pointer relative"
          >
            <CreditCard className="w-5 h-5 stroke-[1.75]" />
            <span className="text-[10px] tracking-tight uppercase mt-1">Billing</span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 py-6 text-center text-xs text-slate-400 dark:text-zinc-500 transition-colors duration-200 mb-16 md:mb-0">
        &copy; 2026 Mutants Academy MMA Gym. All rights reserved.
      </footer>

    </div>
  );
}
