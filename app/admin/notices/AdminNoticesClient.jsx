'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toggleEventPin, addEventComment } from '@/app/actions/eventActions';
import { 
  Calendar, MapPin, Clock, Users, Bell, MessageSquare, Heart, Send, Pin, UserCheck, X, Mic, Sparkles 
} from 'lucide-react';

const getTitleColorClass = (colorKey) => {
  switch (colorKey) {
    case 'fire':
      return 'bg-gradient-to-r from-red-605 via-orange-500 to-yellow-500 bg-clip-text text-transparent';
    case 'emerald':
      return 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent';
    case 'sapphire':
      return 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent';
    case 'gold':
      return 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 bg-clip-text text-transparent';
    case 'electric':
      return 'bg-gradient-to-r from-fuchsia-500 via-purple-600 to-pink-500 bg-clip-text text-transparent';
    default:
      return 'text-slate-800 dark:text-zinc-150';
  }
};

export default function AdminNoticesClient({ initialEvents, user }) {
  const router = useRouter();
  const [isPendingPin, startPinTransition] = useTransition();
  const [isPendingComment, startCommentTransition] = useTransition();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [activeModalTab, setActiveModalTab] = useState('comments');
  const commentInputRef = useRef(null);

  // Sync selectedEvent with the latest from initialEvents to get live updates
  const activeEvent = selectedEvent ? initialEvents.find(e => e._id === selectedEvent._id) : null;

  const handleTogglePin = (eventId) => {
    startPinTransition(async () => {
      const res = await toggleEventPin(eventId);
      if (res && res.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleCommentSubmit = (e, eventId) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    startCommentTransition(async () => {
      const res = await addEventComment(eventId, commentText);
      if (res.success) {
        setCommentText('');
        router.refresh();
      } else if (res.error) {
        alert(res.error);
      }
    });
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

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'Tournament':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30';
      case 'Sparring':
        return 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/30';
      case 'Seminar':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Notice Board Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 to-zinc-900 dark:from-zinc-900 dark:to-black rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800 dark:border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/25 border border-red-500/30 text-xs font-bold text-red-450 uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-red-400" /> Mutants Academy Notice Board
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            Notices, Events & Discussions
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Admin Panel. View notices, see which fighters have liked or joined, and reply directly to athlete discussion comments. Pinned posts stay at the top.
          </p>
        </div>

        <div className="shrink-0 flex gap-4 text-xs font-black uppercase tracking-widest">
          <div className="px-4 py-3 bg-slate-800/50 dark:bg-zinc-900/60 border border-slate-700/50 dark:border-zinc-800/80 rounded-2xl">
            <span className="block text-slate-450 text-[8px] font-bold tracking-wider">TOTAL NOTICES</span>
            <span className="text-lg md:text-xl text-red-500 font-extrabold">{initialEvents.length}</span>
          </div>
        </div>
      </div>

      {/* Grid List of Notices */}
      {initialEvents.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 mb-4">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-600 dark:text-zinc-350 uppercase tracking-tight">No Notices Posted Yet</h3>
          <p className="text-slate-450 dark:text-zinc-550 text-xs mt-1">
            Go to the Events Board page to write and publish notices for the gym!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {initialEvents.map((event) => (
            <div
              key={event._id}
              onClick={() => {
                setSelectedEvent(event);
                setActiveModalTab('comments');
              }}
              className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 hover:border-slate-350 dark:hover:border-zinc-700 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all cursor-pointer group max-w-2xl w-full"
            >
              <div className="space-y-4">
                {/* Event Photo/Image if uploaded */}
                {event.image && (
                  <div 
                    className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm relative select-none cursor-zoom-in bg-slate-100 dark:bg-zinc-955/50"
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
                    <span className={`inline-flex px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border shrink-0 ${getCategoryBadge(event.category)}`}>
                      {event.category}
                    </span>
                    {event.pinned && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-red-600/10 text-red-500 border border-red-500/20 shrink-0">
                        <Pin className="w-3 h-3 text-red-500 fill-current" /> Pinned
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePin(event._id);
                    }}
                    disabled={isPendingPin}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                      event.pinned
                        ? 'border-red-500 bg-red-500/10 text-red-500'
                        : 'border-slate-200 dark:border-zinc-800/80 hover:border-slate-350 hover:bg-slate-50 dark:hover:bg-zinc-900/30 text-slate-400 dark:text-zinc-550'
                    }`}
                    title={event.pinned ? "Unpin Post" : "Pin Post"}
                  >
                    <Pin className={`w-3.5 h-3.5 ${event.pinned ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <h3 className={`text-lg font-black uppercase tracking-tight group-hover:text-red-500 transition-colors ${getTitleColorClass(event.titleColor)}`}>
                  {event.title}
                </h3>

                <p className="text-xs text-slate-550 dark:text-zinc-405 font-medium leading-relaxed line-clamp-3">
                  {event.description}
                </p>

                {/* Audio announcement if exists */}
                {event.audio && (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-xl w-fit" onClick={(e) => e.stopPropagation()}>
                    <Mic className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <audio src={event.audio} controls className="h-7 max-w-[180px]" />
                  </div>
                )}

                {/* Event Details */}
                <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-850 text-xs font-semibold text-slate-550 dark:text-zinc-400 font-mono">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4.5 h-4.5 text-red-500 shrink-0" /> {formatEventDate(event.date)}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4.5 h-4.5 text-red-500 shrink-0" /> {event.location}
                    </span>
                  )}
                </div>
              </div>

              {/* RSVP controls */}
              <div className="flex items-center justify-between gap-4 border-t border-slate-100 dark:border-zinc-850 pt-5 mt-6 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                  {event.category !== 'Announcement' && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-455 dark:text-zinc-500 uppercase tracking-wider font-mono">
                      <Users className="w-4 h-4" /> {event.rsvps.length} Joined
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 font-mono">
                    <Heart className="w-4 h-4 text-red-500 fill-current" />
                    <span>{event.likes?.length || 0}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-405 font-mono">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span>{event.comments?.length || 0}</span>
                  </div>
                </div>

                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 dark:bg-red-950/20 px-3 py-1 rounded-xl border border-red-500/10">
                  Moderator View
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Notice Details Modal */}
      {activeEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
        >
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col" style={{ maxHeight: '90vh' }}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-105 dark:border-zinc-850 shrink-0">
              <div className="flex items-center gap-3">
                <span className={`inline-flex px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border shrink-0 ${getCategoryBadge(activeEvent.category)}`}>
                  {activeEvent.category}
                </span>
                {activeEvent.pinned && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-650/10 text-red-500 border border-red-500/20 shrink-0">
                    <Pin className="w-3 h-3 text-red-500 fill-current" /> Pinned
                  </span>
                )}
                <h3 className={`font-extrabold text-base uppercase tracking-tight truncate max-w-xs sm:max-w-md ${getTitleColorClass(activeEvent.titleColor)}`}>
                  {activeEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-650 dark:hover:text-zinc-205 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Grid (Split Image/Details & Members List) */}
            <div className="overflow-y-auto flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-105 dark:divide-zinc-850">
              
              {/* Left Column: Event details, description, audio */}
              <div className="p-6 md:w-1/2 space-y-5 overflow-y-auto">
                {activeEvent.image && (
                  <div className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm relative bg-slate-105 dark:bg-zinc-950/50">
                    <img src={activeEvent.image} alt={activeEvent.title} className="w-full object-contain max-h-56 bg-slate-50 dark:bg-zinc-955" />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-55 dark:bg-zinc-950/40 p-4 border border-slate-100 dark:border-zinc-850 rounded-2xl text-xs font-mono font-semibold text-slate-555 dark:text-zinc-405">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-500 shrink-0" /> {formatEventDate(activeEvent.date)}
                  </span>
                  {activeEvent.location && (
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500 shrink-0" /> {activeEvent.location}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-455 dark:text-zinc-550">Notice Details</h4>
                  <p className="text-xs font-medium leading-relaxed bg-slate-50/50 dark:bg-zinc-950/20 p-4 border border-slate-100 dark:border-zinc-850 rounded-2xl whitespace-pre-wrap text-slate-655 dark:text-zinc-350">
                    {activeEvent.description}
                  </p>
                </div>

                {activeEvent.audio && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-455 dark:text-zinc-550">Voice Memo</h4>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-2xl w-fit">
                      <Mic className="w-4.5 h-4.5 text-red-500 shrink-0" />
                      <audio src={activeEvent.audio} controls className="h-8 max-w-[200px]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Interactive tabs for replies, joins, and likes */}
              <div className="p-6 md:w-1/2 flex flex-col overflow-hidden max-h-[50vh] md:max-h-none">
                {/* Tab Navigation */}
                <div className="flex border-b border-slate-100 dark:border-zinc-850 pb-2 mb-4 gap-4 text-xs font-bold uppercase tracking-wider select-none shrink-0">
                  <button
                    onClick={() => setActiveModalTab('comments')}
                    className={`pb-1 cursor-pointer transition-colors border-b-2 ${
                      activeModalTab === 'comments' ? 'border-red-500 text-red-500 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Discussion ({activeEvent.comments?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveModalTab('joined')}
                    className={`pb-1 cursor-pointer transition-colors border-b-2 ${
                      activeModalTab === 'joined' ? 'border-red-500 text-red-500 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Joined ({activeEvent.joinedFighters?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveModalTab('liked')}
                    className={`pb-1 cursor-pointer transition-colors border-b-2 ${
                      activeModalTab === 'liked' ? 'border-red-500 text-red-500 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Likes ({activeEvent.likedFighters?.length || 0})
                  </button>
                </div>

                {/* Tab Content Area */}
                <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                  {activeModalTab === 'comments' && (
                    <div className="flex flex-col h-full">
                      {/* Comments list */}
                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4 max-h-[220px] md:max-h-[300px]">
                        {!activeEvent.comments || activeEvent.comments.length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-zinc-550 text-center py-6 font-medium">No discussion comments yet.</p>
                        ) : (
                          activeEvent.comments.map((comment) => (
                            <div key={comment._id} className="flex gap-2 items-start text-xs bg-slate-50/50 dark:bg-zinc-950/20 p-3 rounded-2xl border border-slate-105 dark:border-zinc-850">
                              <div className="w-6.5 h-6.5 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center font-bold shrink-0 uppercase select-none">
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
                                <p className="text-slate-655 dark:text-zinc-350 leading-relaxed break-all font-medium">{comment.text}</p>
                                <div className="flex items-center gap-3 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCommentText(`@${comment.fighterName} `);
                                      commentInputRef.current?.focus();
                                    }}
                                    className="text-[9px] font-bold text-red-500 hover:text-red-655 transition-colors cursor-pointer"
                                  >
                                    Reply
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Comment submit form */}
                      <form onSubmit={(e) => handleCommentSubmit(e, activeEvent._id)} className="flex gap-2 items-center mt-auto pt-2 border-t border-slate-105 dark:border-zinc-850 shrink-0">
                        <input
                          ref={commentInputRef}
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Write admin reply..."
                          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/30 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-550 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs transition-all font-semibold"
                        />
                        <button
                          type="submit"
                          disabled={isPendingComment || !commentText.trim()}
                          className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer shadow-md shadow-red-500/10"
                        >
                          <Send className="w-4.5 h-4.5" />
                        </button>
                      </form>
                    </div>
                  )}

                  {activeModalTab === 'joined' && (
                    <div className="space-y-2 pr-1 max-h-[280px] overflow-y-auto">
                      {!activeEvent.joinedFighters || activeEvent.joinedFighters.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-zinc-555 text-center py-10 font-medium">No athletes have joined this notice event yet.</p>
                      ) : (
                        activeEvent.joinedFighters.map((f) => (
                          <div key={f._id} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-zinc-955/20 border border-slate-105 dark:border-zinc-850 rounded-2xl text-xs font-bold text-slate-700 dark:text-zinc-300">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold uppercase shrink-0">
                                {f.name.charAt(0)}
                              </div>
                              <div>
                                <span className="block text-slate-800 dark:text-zinc-200 uppercase tracking-tight">{f.name}</span>
                                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-semibold">{f.style} / {f.experienceLevel}</span>
                              </div>
                            </div>
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              <UserCheck className="w-3.5 h-3.5" /> Attending
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeModalTab === 'liked' && (
                    <div className="space-y-2 pr-1 max-h-[280px] overflow-y-auto">
                      {!activeEvent.likedFighters || activeEvent.likedFighters.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-zinc-555 text-center py-10 font-medium">No members have liked this notice yet.</p>
                      ) : (
                        activeEvent.likedFighters.map((f) => (
                          <div key={f._id} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-zinc-955/20 border border-slate-105 dark:border-zinc-850 rounded-2xl text-xs font-bold text-slate-700 dark:text-zinc-300">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold uppercase shrink-0">
                                {f.name.charAt(0)}
                              </div>
                              <div>
                                <span className="block text-slate-800 dark:text-zinc-200 uppercase tracking-tight">{f.name}</span>
                                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-semibold">{f.style} / {f.experienceLevel}</span>
                              </div>
                            </div>
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] bg-red-500/10 text-red-500 border border-red-500/20">
                              <Heart className="w-3.5 h-3.5 fill-current" /> Liked
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-950/20 flex items-center justify-end shrink-0">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-655 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-all font-bold text-xs cursor-pointer"
              >
                Close Notice details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
