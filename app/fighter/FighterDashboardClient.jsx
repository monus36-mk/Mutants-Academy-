'use client';

import { useState, useTransition, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toggleEventRSVP, toggleEventLike, addEventComment } from '@/app/actions/eventActions';
import ThemeToggle from '@/components/ThemeToggle';
import { 
  Dumbbell, Calendar, Phone, Mail, Award, Clock, LogOut, 
  CheckCircle2, AlertTriangle, XCircle, Users, Bell, 
  MessageSquare, UserCheck, Sparkles, Filter, Search, ShieldAlert,
  MapPin, HelpCircle, User, Mic, X, Heart, Send, Pin
} from 'lucide-react';
import { formatWhatsAppNumber } from '@/lib/utils';

const WhatsAppIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const getTitleColorClass = (colorKey) => {
  switch (colorKey) {
    case 'fire':
      return 'bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent';
    case 'emerald':
      return 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent';
    case 'sapphire':
      return 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent';
    case 'gold':
      return 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 bg-clip-text text-transparent';
    case 'electric':
      return 'bg-gradient-to-r from-fuchsia-500 via-purple-600 to-pink-500 bg-clip-text text-transparent';
    default:
      return 'text-slate-800 dark:text-zinc-100';
  }
};

export default function FighterDashboardClient({ fighter, initialPeers, initialEvents }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('events'); // 'events' or 'directory'
  const [isPendingRSVP, startRSVPTransition] = useTransition();
  const [isPendingLike, startLikeTransition] = useTransition();
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [readNoticesCount, setReadNoticesCount] = useState(0);
  const commentInputRef = useRef(null);
  const [selectedPeer, setSelectedPeer] = useState(null);

  const peerHasStyle = selectedPeer?.style && selectedPeer.style !== 'None';
  const peerHasEca = selectedPeer?.eca && selectedPeer.eca !== 'None';

  let peerDisplayStyle = null;
  let peerDisplayEca = null;

  if (peerHasStyle && peerHasEca) {
    peerDisplayStyle = selectedPeer.style;
    peerDisplayEca = selectedPeer.eca;
  } else if (peerHasStyle) {
    peerDisplayStyle = selectedPeer.style;
  } else if (peerHasEca) {
    peerDisplayStyle = selectedPeer.eca;
  }

  // Initialize read notices count on mount
  useEffect(() => {
    const cachedCount = localStorage.getItem('readNoticesCount');
    if (cachedCount) {
      setReadNoticesCount(parseInt(cachedCount, 10));
    }
  }, []);

  // Close bell dropdown when clicking outside
  useEffect(() => {
    if (!showBellDropdown) return;
    const handleOutsideClick = (event) => {
      const bellContainer = document.getElementById('notification-bell-container');
      if (bellContainer && !bellContainer.contains(event.target)) {
        setShowBellDropdown(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showBellDropdown]);

  // Directory filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [styleFilter, setStyleFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');
  const [ageFilter, setAgeFilter] = useState('All');
  const [tenureFilter, setTenureFilter] = useState('All');
  const [ecaFilter, setEcaFilter] = useState(() => {
    return fighter?.eca === 'Silambam' ? 'Silambam' : 'None';
  });
  const [sortBy, setSortBy] = useState('SeniorFirst');

  // Age calculation helper
  const calculateAge = (dobString) => {
    if (!dobString) return 'N/A';
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Tenure calculation helper
  const calculateTenureMonths = (joiningDateString) => {
    if (!joiningDateString) return 0;
    const joined = new Date(joiningDateString);
    const today = new Date();
    const diffTime = Math.abs(today - joined);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 30.4);
  };

  // Format exact tenure period helper
  const formatTenurePeriod = (joiningDateString) => {
    if (!joiningDateString) return 'Newcomer';
    const joinDate = new Date(joiningDateString);
    const today = new Date();
    
    let years = today.getFullYear() - joinDate.getFullYear();
    let months = today.getMonth() - joinDate.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < joinDate.getDate())) {
      years--;
      months += 12;
    }
    
    if (today.getDate() < joinDate.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 12;
      }
    }
    
    const totalMonths = (years * 12) + months;
    const label = totalMonths < 6 ? 'Newcomer' : 'Veteran';
    
    if (years === 0) {
      return `${label} (${months} ${months === 1 ? 'mo' : 'mos'})`;
    }
    if (months === 0) {
      return `${label} (${years} ${years === 1 ? 'yr' : 'yrs'})`;
    }
    return `${label} (${years} ${years === 1 ? 'yr' : 'yrs'} ${months} ${months === 1 ? 'mo' : 'mos'})`;
  };

  const filteredPeers = useMemo(() => {
    const list = initialPeers.filter(p => {

      // 1. Search Query
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // 2. Martial arts style filter
      if (styleFilter !== 'All' && p.style !== styleFilter) {
        return false;
      }

      // 2b. ECA filter
      if (ecaFilter !== 'All' && (p.eca || 'None') !== ecaFilter) {
        return false;
      }

      // 3. Experience level filter
      if (levelFilter !== 'All' && p.experienceLevel !== levelFilter) {
        return false;
      }

      // 4. Age group filter
      if (ageFilter !== 'All') {
        const age = calculateAge(p.dob);
        if (age === 'N/A') return false;
        if (ageFilter === 'Youth' && age >= 18) return false;
        if (ageFilter === 'Adult' && (age < 18 || age > 35)) return false;
        if (ageFilter === 'Master' && age <= 35) return false;
      }

      // 5. Tenure filter
      if (tenureFilter !== 'All') {
        const tenureMonths = calculateTenureMonths(p.joiningDate);
        if (tenureFilter === 'Newcomer' && tenureMonths >= 6) return false;
        if (tenureFilter === 'Veteran' && tenureMonths < 6) return false;
      }

      return true;
    });

    return list.sort((a, b) => {
      const wtA = parseFloat(a.weightClass) || 0;
      const wtB = parseFloat(b.weightClass) || 0;
      const dateA = new Date(a.joiningDate || a.createdAt);
      const dateB = new Date(b.joiningDate || b.createdAt);

      if (sortBy === 'WeightAsc') {
        if (wtA !== wtB) return wtA - wtB;
        return dateA - dateB;
      }
      if (sortBy === 'WeightDesc') {
        if (wtA !== wtB) return wtB - wtA;
        return dateA - dateB;
      }
      if (sortBy === 'JuniorFirst') {
        if (dateA - dateB !== 0) return dateB - dateA;
        return wtA - wtB;
      }
      if (sortBy === 'SeniorFirst_WeightAsc') {
        if (dateA - dateB !== 0) return dateA - dateB;
        return wtA - wtB;
      }
      if (sortBy === 'SeniorFirst_WeightDesc') {
        if (dateA - dateB !== 0) return dateA - dateB;
        return wtB - wtA;
      }
      if (sortBy === 'WeightAsc_SeniorFirst') {
        if (wtA !== wtB) return wtA - wtB;
        return dateA - dateB;
      }
      if (sortBy === 'WeightDesc_SeniorFirst') {
        if (wtA !== wtB) return wtB - wtA;
        return dateA - dateB;
      }
      
      // Default: SeniorFirst
      if (dateA - dateB !== 0) return dateA - dateB;
      return wtA - wtB;
    });
  }, [initialPeers, fighter._id, searchQuery, styleFilter, ecaFilter, levelFilter, ageFilter, tenureFilter, sortBy]);

  // Extract announcements category for scrolling ticker
  const tickerNotices = useMemo(() => {
    return initialEvents.filter(e => e.category === 'Announcement');
  }, [initialEvents]);

  // Upcoming events (including Announcements)
  const upcomingEvents = useMemo(() => {
    return initialEvents;
  }, [initialEvents]);

  const handleRSVP = (eventId) => {
    startRSVPTransition(async () => {
      const res = await toggleEventRSVP(eventId);
      if (res.success) {
        router.refresh();
      } else if (res.error) {
        alert(res.error);
      }
    });
  };

  const handleLike = (eventId) => {
    startLikeTransition(async () => {
      const res = await toggleEventLike(eventId);
      if (res.success) {
        // If this event is open in details modal, update local state too
        if (selectedEvent && selectedEvent._id === eventId) {
          const alreadyLiked = selectedEvent.likes.includes(fighter._id);
          setSelectedEvent(prev => ({
            ...prev,
            likes: alreadyLiked 
              ? prev.likes.filter(id => id !== fighter._id)
              : [...prev.likes, fighter._id]
          }));
        }
        router.refresh();
      } else if (res.error) {
        alert(res.error);
      }
    });
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    startRSVPTransition(async () => {
      const res = await addEventComment(selectedEvent._id, commentText);
      if (res.success) {
        setSelectedEvent(prev => ({
          ...prev,
          comments: [
            ...prev.comments,
            {
              _id: Math.random().toString(),
              text: commentText.trim(),
              createdAt: new Date().toISOString(),
              fighterId: fighter._id,
              fighterName: fighter.name,
              fighterRole: 'Athlete',
            }
          ]
        }));
        setCommentText('');
        router.refresh();
      } else if (res.error) {
        alert(res.error);
      }
    });
  };

  const getEventCategoryIcon = (category) => {
    switch (category) {
      case 'Tournament':
        return Award;
      case 'Sparring':
        return Dumbbell;
      default:
        return Clock;
    }
  };

  const getEventCategoryColor = (category) => {
    switch (category) {
      case 'Tournament':
        return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'Sparring':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      default:
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  const formatEventDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'N/A';
    
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const weekday = weekdays[d.getDay()];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;
    
    return `${weekday}, ${month} ${day}, ${year} at ${hours}:${strMinutes} ${ampm}`;
  };

  const getWhatsAppSparringUrl = (peer) => {
    const cleanPhone = formatWhatsAppNumber(peer.phone);
    const message = `Hey ${peer.name}! Let's set up a sparring session at Mutants Academy! I train in ${fighter.style}. Let me know if you are free.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors duration-200 flex flex-col font-sans select-none">
      
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between flex-nowrap">
            {/* Logo */}
            <div className="flex items-center gap-2 md:gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-600 text-white shadow-md shadow-red-600/20">
                <Dumbbell className="w-5 h-5" />
              </div>
              <span className="font-black tracking-tight text-lg md:text-xl text-slate-900 dark:text-white uppercase">
                Mutants <span className="text-red-600">Academy</span>
              </span>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2.5 md:gap-4">
              
              {/* Notification Bell */}
              <div id="notification-bell-container" className="static sm:relative">
                <button
                  onClick={() => {
                    setShowBellDropdown(!showBellDropdown);
                    if (!showBellDropdown) {
                      setReadNoticesCount(initialEvents.length);
                      localStorage.setItem('readNoticesCount', initialEvents.length.toString());
                    }
                  }}
                  className="w-10 h-10 rounded-2xl border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-500 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer relative"
                  title="Notifications & Notices"
                >
                  <Bell className="w-5 h-5" />
                  {(() => {
                    const unreadCount = Math.max(0, initialEvents.length - readNoticesCount);
                    return unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-red-600 border border-white dark:border-zinc-950 text-[9px] font-black text-white flex items-center justify-center">
                        {unreadCount}
                      </span>
                    );
                  })()}
                </button>

                {/* Dropdown Menu */}
                {showBellDropdown && (
                  <div className="absolute right-4 left-4 sm:right-0 sm:left-auto mt-2.5 sm:w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-4 space-y-3 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
                      <span className="text-xs font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Gym Notice Board</span>
                      <button
                        onClick={() => setShowBellDropdown(false)}
                        className="text-[10px] font-bold text-red-500 hover:text-red-600"
                      >
                        Dismiss
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 text-xs">
                      {initialEvents.length === 0 ? (
                        <p className="text-slate-400 dark:text-zinc-500 text-center py-6 font-medium">No notices currently posted.</p>
                      ) : (
                        initialEvents.slice(0, 5).map((e) => (
                          <div 
                            key={e._id} 
                            onClick={() => { setSelectedEvent(e); setShowBellDropdown(false); }}
                            className="p-2.5 border border-slate-100 dark:border-zinc-800 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-950/40 transition-colors cursor-pointer space-y-1"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-800 dark:text-zinc-200 truncate pr-2 uppercase tracking-tight text-xs">{e.title}</span>
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 ${getEventColor(e.category)}`}>
                                  {e.category}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono block">{formatEventDate(e.date)}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 line-clamp-2 leading-relaxed font-medium">{e.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Profile Avatar Page Link with Athlete Name */}
              <div className="flex items-center gap-2.5 sm:gap-3 pl-1">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 uppercase tracking-tight leading-tight">{fighter.name}</span>
                  <span className="text-[9px] font-black text-red-500 uppercase tracking-widest leading-none mt-0.5">Athlete</span>
                </div>
                <Link
                  href="/fighter/profile"
                  onClick={() => {
                    setShowBellDropdown(false);
                    setSelectedEvent(null);
                  }}
                  className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 transition-all cursor-pointer shadow-sm relative shrink-0"
                  title="View Profile & Membership details"
                >
                  <User className="w-5 h-5 text-red-500" />
                </Link>
              </div>

              {/* Logout */}
              <form action="/api/auth/logout" method="POST" className="m-0">
                <input type="hidden" name="logout" value="true" />
                <button
                  type="submit"
                  formAction={async () => {
                    setShowBellDropdown(false);
                    setSelectedEvent(null);
                    const { logout } = require('@/app/actions/authActions');
                    await logout();
                    window.location.href = '/login';
                  }}
                  className="p-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-200 cursor-pointer"
                  title="Logout Portal"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </form>

            </div>
          </div>
        </div>
      </header>

      {/* Announcements Ticker Banner */}
      {tickerNotices.length > 0 && (
        <div className="w-full bg-red-600 text-white py-2 px-4 shadow-inner overflow-hidden border-b border-red-700 select-none">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <span className="inline-flex px-2 py-0.5 rounded bg-white text-red-600 text-[9px] font-black uppercase tracking-wider shrink-0 shadow-sm animate-pulse">
              ANNOUNCEMENT
            </span>
            <div className="w-full overflow-hidden relative h-5">
              <div className="absolute whitespace-nowrap animate-marquee flex gap-10 font-bold text-xs uppercase tracking-wide">
                {tickerNotices.map((n) => (
                  <span key={n._id}>
                    {n.title}: {n.description}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
        
        {/* Athlete Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 to-zinc-900 dark:from-zinc-900 dark:to-black rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800 dark:border-zinc-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/25 border border-red-500/30 text-xs font-bold text-red-400 uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-red-400" /> Mutants Academy Athlete Network
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              Osu, {fighter.name}!
            </h1>
            <p className="text-slate-405 text-sm mt-1 max-w-xl">
              Fighter Portal active. Review notice boards, join training schedules, and connect with sparring partners. Click the profile icon in the header to view billing cycles.
            </p>
          </div>

          {/* Dynamic counts */}
          <div className="shrink-0 flex gap-4 text-xs font-black uppercase tracking-widest">
            <div className="px-4 py-3 bg-slate-800/50 dark:bg-zinc-900/60 border border-slate-700/50 dark:border-zinc-800/80 rounded-2xl">
              <span className="block text-slate-400 text-[8px] font-bold tracking-wider">EVENTS JOINED</span>
              <span className="text-lg md:text-xl text-red-500 font-extrabold">{upcomingEvents.filter(e => e.rsvps.includes(fighter._id)).length}</span>
            </div>
            <div className="px-4 py-3 bg-slate-800/50 dark:bg-zinc-900/60 border border-slate-700/50 dark:border-zinc-800/80 rounded-2xl">
              <span className="block text-slate-400 text-[8px] font-bold tracking-wider">ACADEMY PEERS</span>
              <span className="text-lg md:text-xl text-emerald-450 font-extrabold">{filteredPeers.length}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-zinc-800/80 gap-6">
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-4 px-2 text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'events'
                ? 'border-red-600 text-red-500 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'
            }`}
          >
            Notices & Events ({upcomingEvents.length})
          </button>
          
          <button
            onClick={() => setActiveTab('directory')}
            className={`pb-4 px-2 text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'directory'
                ? 'border-red-600 text-red-500 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'
            }`}
          >
            Fighter Directory ({filteredPeers.length})
          </button>
        </div>

        {/* Tab 1: Notices & Events Board */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 mb-4">
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-600 dark:text-zinc-300 uppercase tracking-tight">No Events Currently Scheduled</h3>
                <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1">
                  Keep checking back! Notices about sparring sessions and tournaments will be posted by coaches here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                {upcomingEvents.map((event) => {
                  const isAttending = event.rsvps.includes(fighter._id);
                  return (
                     <div
                      key={event._id}
                      className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group max-w-2xl w-full"
                    >
                      <div 
                        className="space-y-4 cursor-pointer"
                        onClick={() => setSelectedEvent(event)}
                      >
                        {/* Event Photo/Image if uploaded */}
                        {event.image && (
                          <div 
                            className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm relative select-none cursor-zoom-in bg-slate-100 dark:bg-zinc-950/50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxImage(event.image);
                            }}
                          >
                            <img 
                              src={event.image} 
                              alt={event.title} 
                              className="w-full h-full object-contain hover:scale-105 transition-all duration-300" 
                            />
                          </div>
                        )}

                        {/* Title & Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border shrink-0 ${getEventColor(event.category)}`}>
                              {event.category}
                            </span>
                            {event.pinned && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-red-600/10 text-red-500 border border-red-500/20 shrink-0">
                                <Pin className="w-3 h-3 text-red-500 fill-current" /> Pinned
                              </span>
                            )}
                          </div>
                          
                          {/* Attendance label */}
                          {isAttending && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-wider font-mono">
                              <CheckCircle2 className="w-4 h-4" /> Going
                            </span>
                          )}
                        </div>

                        <h3 className={`text-lg font-black uppercase tracking-tight group-hover:text-red-500 transition-colors ${getTitleColorClass(event.titleColor)}`}>
                          {event.title}
                        </h3>

                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
                          {event.description}
                        </p>

                        {/* Audio voice notice player if exists */}
                        {event.audio && (
                          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl w-fit">
                            <Mic className="w-4 h-4 text-red-500 shrink-0" />
                            <audio src={event.audio} controls className="h-8 max-w-[240px]" />
                          </div>
                        )}

                        {/* Event Details */}
                        <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs font-semibold text-slate-500 dark:text-zinc-400 font-mono">
                          <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-red-500 shrink-0" /> {formatEventDate(event.date)}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-red-500 shrink-0" /> {event.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* RSVP controls */}
                      <div className="flex items-center justify-between gap-4 border-t border-slate-100 dark:border-zinc-800 pt-5 mt-6 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                          {event.category !== 'Announcement' && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                              <Users className="w-4 h-4" /> {event.rsvps.length} Joined
                            </div>
                          )}

                           <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(event._id);
                            }}
                            disabled={isPendingLike}
                            className={`flex items-center gap-1.5 text-xs font-bold font-mono transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                              event.likes?.includes(fighter._id)
                                ? 'text-red-500 font-black'
                                : 'text-slate-400 hover:text-red-400'
                            }`}
                          >
                            <Heart 
                              className={`w-4 h-4 ${event.likes?.includes(fighter._id) ? 'text-red-500' : 'text-slate-400'}`} 
                              fill={event.likes?.includes(fighter._id) ? 'currentColor' : 'none'} 
                            />
                            <span>{event.likes?.length || 0}</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                            }}
                            className="flex items-center gap-1.5 text-xs font-bold font-mono transition-all hover:scale-105 active:scale-95 cursor-pointer text-slate-400 hover:text-blue-500 dark:hover:text-blue-400"
                            title="View Discussion Comments"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>{event.comments?.length || 0}</span>
                          </button>
                        </div>

                        {event.category !== 'Announcement' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRSVP(event._id);
                            }}
                            disabled={isPendingRSVP}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all select-none cursor-pointer flex items-center gap-1 border ${
                              isAttending
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/35 hover:bg-emerald-500/20'
                                : 'bg-red-600 hover:bg-red-500 text-white border-transparent shadow-md shadow-red-500/10 hover:shadow-red-500/20 active:scale-95'
                            }`}
                          >
                            {isPendingRSVP ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : isAttending ? (
                              'Joined'
                            ) : (
                              'Join'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* Tab 2: Fighter Directory with Filters */}
        {activeTab === 'directory' && (
          <div className="space-y-6">
            
            {/* Filter controls */}
            <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                <Filter className="w-4.5 h-4.5 text-red-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                  Search & Filter Peers
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Name search */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                    Search Name
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/20 text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs transition-all font-semibold"
                      placeholder="e.g. Monus"
                    />
                  </div>
                </div>

                {/* Style */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                    Martial Style
                  </label>
                  <select
                    value={styleFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStyleFilter(val);
                      if (val === 'All') {
                        setEcaFilter('All');
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/20 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold"
                  >
                    <option value="All" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">All styles</option>
                    <option value="MMA" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">MMA</option>
                    <option value="Striking" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Striking</option>
                    <option value="Grappling" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Grappling</option>
                  </select>
                </div>

                {/* ECA Filter */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                    ECA
                  </label>
                  <select
                    value={ecaFilter}
                    onChange={(e) => setEcaFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/20 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold"
                  >
                    <option value="All" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">All ECAs</option>
                    <option value="None" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">None</option>
                    <option value="Silambam" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Silambam</option>
                    <option value="Zumba" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Zumba</option>
                    <option value="Dance" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Dance</option>
                  </select>
                </div>

                {/* Level */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                    Experience Level
                  </label>
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/20 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold"
                  >
                    <option value="All" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">All levels</option>
                    <option value="Beginner" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Beginner</option>
                    <option value="Intermediate" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Intermediate</option>
                    <option value="Pro" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Pro</option>
                  </select>
                </div>

                {/* Age */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                    Age Group
                  </label>
                  <select
                    value={ageFilter}
                    onChange={(e) => setAgeFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/20 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold"
                  >
                    <option value="All" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">All ages</option>
                    <option value="Youth" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Youth (&lt;18)</option>
                    <option value="Adult" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Adult (18-35)</option>
                    <option value="Master" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Master (35+)</option>
                  </select>
                </div>

                {/* Tenure */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                    Tenure
                  </label>
                  <select
                    value={tenureFilter}
                    onChange={(e) => setTenureFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/20 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold"
                  >
                    <option value="All" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">All tenures</option>
                    <option value="Newcomer" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Newcomer (&lt;6mo)</option>
                    <option value="Veteran" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Veteran (6mo+)</option>
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                    Sort
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/20 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold"
                  >
                    <option value="SeniorFirst" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Seniority: Senior to Junior</option>
                    <option value="JuniorFirst" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Seniority: Junior to Senior</option>
                    <option value="WeightAsc" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Weight: Lightest First</option>
                    <option value="WeightDesc" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Weight: Heaviest First</option>
                    <option value="SeniorFirst_WeightAsc" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Seniority & Weight (Senior First, Lightest First)</option>
                    <option value="SeniorFirst_WeightDesc" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Seniority & Weight (Senior First, Heaviest First)</option>
                    <option value="WeightAsc_SeniorFirst" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Weight & Seniority (Lightest First, Senior First)</option>
                    <option value="WeightDesc_SeniorFirst" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Weight & Seniority (Heaviest First, Senior First)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Roster display grid */}
            {filteredPeers.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 mb-4">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-600 dark:text-zinc-300 uppercase tracking-tight">No Athletes Match Filters</h3>
                <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1">
                  Try clearing your search query or adjusting filter settings to locate athletes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {filteredPeers.map((peer) => (
                  <div
                    key={peer._id}
                    onClick={() => setSelectedPeer(peer)}
                    className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
                  >
                    <div className="space-y-4">
                      {/* Avatar & Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {peer.photo ? (
                            <div className="w-10 h-12 bg-slate-50 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-zinc-800 rounded-lg overflow-hidden shrink-0 shadow-sm">
                              <img src={peer.photo} alt={peer.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-base select-none shrink-0 border border-red-500/20">
                              {peer.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-800 dark:text-zinc-100 uppercase tracking-tight leading-tight">
                              {peer.name}
                            </h4>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-555 font-mono block mt-0.5">
                              Joined: {new Date(peer.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>

                        {/* Style Badge */}
                        <span className="inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
                          {peer.style}
                        </span>
                      </div>

                      {/* Detail attributes grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 pt-4 border-t border-slate-100 dark:border-zinc-800 text-xs">
                        <div>
                          <span className="block text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Weight Class</span>
                          <span className="font-semibold text-slate-700 dark:text-zinc-300 font-mono block mt-0.5">{peer.weightClass}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Experience Level</span>
                          <span className="font-semibold text-slate-700 dark:text-zinc-300 block mt-0.5">{peer.experienceLevel}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Age Group</span>
                          <span className="font-semibold text-slate-700 dark:text-zinc-300 block mt-0.5">
                            {calculateAge(peer.dob)} yrs ({calculateAge(peer.dob) < 18 ? 'Youth' : calculateAge(peer.dob) > 35 ? 'Master' : 'Adult'})
                          </span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Tenure</span>
                          <span className="font-semibold text-slate-700 dark:text-zinc-300 block mt-0.5 text-xs sm:text-sm">
                            {formatTenurePeriod(peer.joiningDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sparring Connect controls */}
                    <div className="flex items-center gap-3 pt-5 mt-6 border-t border-slate-100 dark:border-zinc-800 justify-end" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`tel:${peer.phone}`}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950/40 dark:hover:bg-zinc-950 text-slate-500 dark:text-zinc-400 hover:text-slate-700 transition-all border border-slate-200 dark:border-zinc-800"
                        title={`Call ${peer.name}`}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <a
                        href={getWhatsAppSparringUrl(peer)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-2 rounded-xl text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all gap-1.5 text-xs font-bold"
                        title={`Chat on WhatsApp to request sparring`}
                      >
                        <WhatsAppIcon className="w-4.5 h-4.5" />
                        <span>Spar Invite</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </main>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
        >
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col" style={{ maxHeight: '90vh' }}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-zinc-800 shrink-0 gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className={`inline-flex px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border shrink-0 ${getEventColor(selectedEvent.category)}`}>
                  {selectedEvent.category}
                </span>
                <h3 className={`font-extrabold text-xs sm:text-base uppercase tracking-tight truncate min-w-0 flex-1 ${getTitleColorClass(selectedEvent.titleColor)}`}>
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-600 dark:hover:text-zinc-205 transition-all cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 dark:text-zinc-300">
              
              {/* Event Poster / Flyer */}
              {selectedEvent.image && (
                <div 
                  className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm relative select-none cursor-zoom-in h-64 sm:h-80 shrink-0"
                  style={{ maxHeight: '280px' }}
                  onClick={() => setLightboxImage(selectedEvent.image)}
                >
                  <img src={selectedEvent.image} alt={selectedEvent.title} className="w-full h-full object-contain bg-slate-50 dark:bg-zinc-950" />
                </div>
              )}

              {/* Event details summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-100 dark:bg-zinc-950/40 p-4 border border-slate-100 dark:border-zinc-800 rounded-2xl text-xs font-mono font-semibold text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-2">
                  <Clock className="w-4.5 h-4.5 text-red-500 shrink-0" /> {formatEventDate(selectedEvent.date)}
                </span>
                {selectedEvent.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4.5 h-4.5 text-red-500 shrink-0" /> {selectedEvent.location}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">Notice Description</h4>
                <p className="text-sm font-medium leading-relaxed bg-slate-50/50 dark:bg-zinc-950/20 p-4 border border-slate-100 dark:border-zinc-800 rounded-2xl whitespace-pre-wrap">
                  {selectedEvent.description}
                </p>
              </div>

              {/* Audio voice notice if exists */}
              {selectedEvent.audio && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                    <Mic className="w-4 h-4 text-red-500" /> Voice Announcement Audio
                  </h4>
                  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl w-fit">
                    <Mic className="w-5 h-5 text-red-500 shrink-0" />
                    <audio src={selectedEvent.audio} controls className="h-9 max-w-[280px]" />
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="space-y-4 border-t border-slate-100 dark:border-zinc-800 pt-5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-red-500" /> Discussion ({selectedEvent.comments?.length || 0})
                </h4>
                
                {/* Scrollable Comments List */}
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {!selectedEvent.comments || selectedEvent.comments.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-zinc-500 text-center py-4 font-medium">No comments yet. Start the conversation!</p>
                  ) : (
                    selectedEvent.comments.map((comment) => (
                      <div key={comment._id} className="flex gap-2.5 items-start text-xs bg-slate-50/50 dark:bg-zinc-950/20 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800">
                        <div className="w-7 h-7 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold shrink-0 uppercase select-none">
                          {comment.fighterName.charAt(0)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-extrabold text-slate-800 dark:text-zinc-200 uppercase">{comment.fighterName}</span>
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 ${
                                comment.fighterRole === 'Admin' || comment.fighterRole === 'Coach'
                                  ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                  : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              }`}>
                                {comment.fighterRole || 'Athlete'}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono shrink-0">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-zinc-300 leading-relaxed break-all font-medium">{comment.text}</p>
                          <div className="flex items-center gap-3 pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setCommentText(`@${comment.fighterName} `);
                                commentInputRef.current?.focus();
                              }}
                              className="text-[9px] font-bold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Form */}
                <form onSubmit={handleCommentSubmit} className="flex gap-2 items-center">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/30 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs transition-all font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={isPendingRSVP || !commentText.trim()}
                    className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer shadow-md shadow-red-500/10"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </form>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-zinc-900/60 p-4 border-t border-slate-100 dark:border-zinc-800 shrink-0 flex items-center justify-between gap-4">
              
              <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                {selectedEvent.category !== 'Announcement' && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                    <Users className="w-4.5 h-4.5" /> {selectedEvent.rsvps.length} Joined
                  </div>
                )}

                <button
                  onClick={() => {
                    handleLike(selectedEvent._id);
                  }}
                  disabled={isPendingLike}
                  className={`flex items-center gap-1.5 text-xs font-bold font-mono transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                    selectedEvent.likes?.includes(fighter._id)
                      ? 'text-red-500 font-black'
                      : 'text-slate-400 hover:text-red-400'
                  }`}
                >
                  <Heart 
                    className={`w-4 h-4 ${selectedEvent.likes?.includes(fighter._id) ? 'text-red-500' : 'text-slate-400'}`} 
                    fill={selectedEvent.likes?.includes(fighter._id) ? 'currentColor' : 'none'} 
                  />
                  <span>{selectedEvent.likes?.length || 0}</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>

                {selectedEvent.category !== 'Announcement' && (
                  <button
                    onClick={() => {
                      handleRSVP(selectedEvent._id);
                      // Update modal local state too
                      const alreadyRSVP = selectedEvent.rsvps.includes(fighter._id);
                      setSelectedEvent(prev => ({
                        ...prev,
                        rsvps: alreadyRSVP 
                          ? prev.rsvps.filter(id => id !== fighter._id)
                          : [...prev.rsvps, fighter._id]
                      }));
                    }}
                    disabled={isPendingRSVP}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all select-none cursor-pointer flex items-center gap-1 border ${
                      selectedEvent.rsvps.includes(fighter._id)
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/35 hover:bg-emerald-500/20'
                        : 'bg-red-600 hover:bg-red-500 text-white border-transparent shadow-md shadow-red-500/10 active:scale-95'
                    }`}
                  >
                    {isPendingRSVP ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : selectedEvent.rsvps.includes(fighter._id) ? (
                      'Joined'
                    ) : (
                      'Join'
                    )}
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* WhatsApp Fullscreen Lightbox Image Viewer */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md transition-all duration-300 select-none animate-in fade-in duration-200"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
          onClick={() => setLightboxImage(null)}
        >
          <div className="w-full h-full p-6 flex items-center justify-center relative">
            <img 
              src={lightboxImage} 
              alt="Notice Flyer Poster" 
              className="max-w-full max-h-[92vh] object-contain rounded-lg animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>

          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-3 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-white transition-all cursor-pointer z-[10000] border border-zinc-800 shadow-md flex items-center justify-center"
            title="Close image viewer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Selected Peer (Fighter) Profile Details Modal */}
      {selectedPeer && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300 animate-in fade-in duration-200"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          onClick={() => setSelectedPeer(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-4">
                {selectedPeer.photo ? (
                  <div 
                    className="w-12 h-15 bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shrink-0 shadow-sm cursor-zoom-in hover:opacity-90 active:scale-95 transition-all"
                    onClick={() => setLightboxImage(selectedPeer.photo)}
                    title="Click to view full photo"
                  >
                    <img src={selectedPeer.photo} alt={selectedPeer.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-lg select-none shrink-0 border border-red-500/20">
                    {selectedPeer.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-zinc-100 uppercase tracking-tight">
                    {selectedPeer.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider block mt-0.5">
                    Academy Peer
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPeer(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-600 dark:hover:text-zinc-205 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal scrollable body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 dark:text-zinc-300">
              
              {/* Detailed attributes grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2 text-xs">
                {peerDisplayStyle && (
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-wider">Martial Style</span>
                    <span className="text-sm font-extrabold text-red-500 dark:text-red-400 uppercase tracking-wide block mt-1">
                      {peerDisplayStyle}
                    </span>
                  </div>
                )}
                {peerDisplayEca && (
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-wider">Extra Activity</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 block mt-1">
                      {peerDisplayEca}
                    </span>
                  </div>
                )}
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-wider">Experience Level</span>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold mt-1 ${
                    selectedPeer.experienceLevel === 'Pro' 
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30'
                      : selectedPeer.experienceLevel === 'Intermediate' 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30'
                      : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50'
                  }`}>
                    {selectedPeer.experienceLevel}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-wider">Weight Class</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 block mt-1">
                    {selectedPeer.weightClass} kg
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-wider">Age Group</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 block mt-1">
                    {calculateAge(selectedPeer.dob)} yrs ({calculateAge(selectedPeer.dob) < 18 ? 'Youth' : calculateAge(selectedPeer.dob) > 35 ? 'Master' : 'Adult'})
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-wider">Academy Tenure</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 block mt-1">
                    {formatTenurePeriod(selectedPeer.joiningDate)}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-wider">Joined Date</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 font-mono block mt-1">
                    {new Date(selectedPeer.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Bio & Achievements Section */}
              <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-5 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-555 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-red-500" /> Bio & Achievements
                </h4>
                <p className="text-xs font-medium leading-relaxed bg-slate-50/50 dark:bg-zinc-950/20 p-4 border border-slate-100 dark:border-zinc-800 rounded-2xl whitespace-pre-wrap text-slate-600 dark:text-zinc-400">
                  {selectedPeer.bio || (
                    <span className="italic text-slate-400 dark:text-zinc-500">
                      No bio or competition achievements listed by this athlete yet.
                    </span>
                  )}
                </p>
              </div>

              {/* Contact Information (If available) */}
              <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-5 space-y-3.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-zinc-555">Contact Info</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-605 dark:text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-red-500" />
                    <span className="font-mono">{selectedPeer.phone}</span>
                  </div>
                  {selectedPeer.email && (
                    <div className="flex items-center gap-2 break-all">
                      <Mail className="w-4 h-4 text-red-500" />
                      <span className="font-mono">{selectedPeer.email}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 flex items-center gap-3 justify-end shrink-0">
              <a
                href={`tel:${selectedPeer.phone}`}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-all font-bold text-xs flex items-center gap-1.5"
              >
                <Phone className="w-4 h-4" />
                <span>Call Athlete</span>
              </a>
              <a
                href={getWhatsAppSparringUrl(selectedPeer)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 transition-all gap-1.5 text-xs font-bold shadow-md shadow-emerald-500/10 active:scale-95 cursor-pointer"
              >
                <WhatsAppIcon className="w-4.5 h-4.5" />
                <span>Request Sparring</span>
              </a>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 py-6 text-center text-xs text-slate-400 dark:text-zinc-500 transition-colors duration-200">
        &copy; 2026 Mutants Academy MMA Gym. All rights reserved.
      </footer>

    </div>
  );
}

// Inline helper to parse colors for category badges
function getEventColor(category) {
  switch (category) {
    case 'Tournament':
      return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
    case 'Sparring':
      return 'text-red-500 bg-red-500/10 border-red-500/20';
    default:
      return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  }
}
