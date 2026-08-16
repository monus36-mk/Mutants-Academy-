'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createEvent, deleteEvent, updateEvent, toggleEventPin, addEventComment } from '@/app/actions/eventActions';
import { 
  Calendar, MapPin, Trash2, Megaphone, Users, Clock, Plus, 
  AlertCircle, CalendarRange, Image as ImageIcon, Mic, Square, Play, Trash, Info, Pencil, X,
  MessageSquare, Heart, Send, Pin, UserCheck
} from 'lucide-react';

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
      return 'text-slate-800 dark:text-zinc-150';
  }
};

export default function EventsManager({ initialEvents, user }) {
  const router = useRouter();
  const [isPendingDelete, startDeleteTransition] = useTransition();
  const [isPendingSubmit, startSubmitTransition] = useTransition();
  const [isPendingPin, startPinTransition] = useTransition();
  const [isPendingComment, startCommentTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [activeModalTab, setActiveModalTab] = useState('comments');
  const commentInputRef = useRef(null);

  // Form input states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Announcement');
  const [titleColor, setTitleColor] = useState('default');

  // Media states
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  // Audio recording states
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioBase64, setAudioBase64] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const startEdit = (event) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description);
    
    // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
    if (event.date) {
      const d = new Date(event.date);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
      setDate(localISOTime);
    } else {
      setDate('');
    }
    
    setLocation(event.location || '');
    setCategory(event.category || 'Announcement');
    setTitleColor(event.titleColor || 'default');
    setImage(event.image || '');
    setImagePreview(event.image || '');
    setAudioUrl(event.audio || '');
    setAudioBase64(event.audio || '');
    setErrorMsg(null);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setDate('');
    setLocation('');
    setCategory('Announcement');
    setTitleColor('default');
    setImage('');
    setImagePreview('');
    setAudioUrl('');
    setAudioBase64('');
    setErrorMsg(null);
  };

  const handleTogglePin = (eventId) => {
    startPinTransition(async () => {
      setErrorMsg(null);
      const res = await toggleEventPin(eventId);
      if (res && res.error) {
        setErrorMsg(res.error);
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
        setErrorMsg(res.error);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !date || !category) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    startSubmitTransition(async () => {
      setErrorMsg(null);
      
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('date', date);
      formData.append('location', location);
      formData.append('category', category);
      formData.append('image', image);
      formData.append('audio', audioBase64);
      formData.append('titleColor', titleColor);

      let res;
      if (editingEvent) {
        res = await updateEvent(editingEvent._id, formData);
      } else {
        res = await createEvent(null, formData);
      }

      if (res.success) {
        cancelEdit();
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to submit notice.');
      }
    });
  };

  // Clean up timers and audio recording on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Image Upload handler with client-side compression
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale image to a maximum of 1200px on either side
        const MAX_DIM = 1200;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as JPEG at 0.7 quality to keep Base64 footprint lightweight (approx. 100-200KB)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setImage(compressedBase64);
        setImagePreview(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage('');
    setImagePreview('');
  };

  // Audio Recording handlers
  const startRecording = async () => {
    audioChunksRef.current = [];
    setRecordingTime(0);
    setAudioUrl('');
    setAudioBase64('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert blob to Base64 for database storage
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result);
        };
        reader.readAsDataURL(audioBlob);

        // Stop stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setRecording(true);

      // Start recording timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Could not access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const deleteRecording = () => {
    setAudioUrl('');
    setAudioBase64('');
    setRecordingTime(0);
  };

  const formatRecordingTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const handleDelete = (eventId) => {
    if (confirm('Are you sure you want to delete this event? This will remove all RSVP records and notice media.')) {
      startDeleteTransition(async () => {
        const res = await deleteEvent(eventId);
        if (res.success) {
          router.refresh();
        } else if (res.error) {
          alert(res.error);
        }
      });
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'Tournament':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30';
      case 'Sparring':
        return 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/30';
      case 'Seminar':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30';
      default: // Announcement
        return 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50';
    }
  };

  const formatDate = (dateString) => {
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

  const activeSelectedEvent = selectedEvent ? initialEvents.find(e => e._id === selectedEvent._id) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10 animate-in fade-in duration-300">
      
      {/* Column 1: Post Event Form */}
      <div className="lg:col-span-1 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl h-fit">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-zinc-800 pb-5 mb-6">
          <div className="p-3 rounded-2xl bg-red-500/10 text-red-600">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-tight">
              {editingEvent ? 'Update Gym Notice' : 'Post Gym Notice'}
            </h2>
            <p className="text-slate-400 dark:text-zinc-550 text-xs mt-0.5">
              {editingEvent 
                ? 'Modify notice description, category, dates, or media attachments.' 
                : 'Broadcast announcements, sparring cards, seminars, or upload voice memos.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Hidden inputs for Base64 attachments */}
          <input type="hidden" name="image" value={image} />
          <input type="hidden" name="audio" value={audioBase64} />

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Notice Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold"
              placeholder="e.g. Sparring Session Cards"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Notice Category *
            </label>
            <select
              id="category"
              name="category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold font-semibold"
            >
              <option value="Announcement">Announcement Ticker</option>
              <option value="Sparring">Sparring Invitation</option>
              <option value="Tournament">Tournament Notice</option>
              <option value="Seminar">Special Seminar / Class</option>
            </select>
          </div>

          {/* Title Color/Gradient Theme */}
          <div>
            <label htmlFor="titleColor" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Title Theme Style *
            </label>
            <select
              id="titleColor"
              name="titleColor"
              value={titleColor}
              onChange={(e) => setTitleColor(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-semibold"
            >
              <option value="default">Default (White/Dark Slate)</option>
              <option value="fire">Crimson Fire (Red / Orange)</option>
              <option value="emerald">Neon Emerald (Green / Cyan)</option>
              <option value="sapphire">Sapphire Strike (Blue / Purple)</option>
              <option value="gold">Gold Rush (Amber / Yellow)</option>
              <option value="electric">Electric Fuchsia (Purple / Pink)</option>
            </select>
          </div>

          {/* Date & Time */}
          <div>
            <label htmlFor="date" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Notice Date & Time *
            </label>
            <input
              id="date"
              name="date"
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all font-mono"
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Location / Arena
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="location"
                name="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
                placeholder="e.g. Ring A / Main Cage"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
              Notice Description *
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm transition-all"
              placeholder="Provide event details..."
            />
          </div>

          {/* Image Upload Input */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-850">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2.5 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-red-500" /> Notice Image (Optional)
            </span>
            
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 group h-36 w-full">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-650 transition-colors cursor-pointer"
                  title="Remove Image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-4 hover:bg-slate-50 dark:hover:bg-zinc-900/30 hover:border-red-500/50 transition-all cursor-pointer select-none">
                <Plus className="w-6 h-6 text-slate-400 group-hover:text-red-500" />
                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 mt-1 uppercase">Choose Event Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Voice Notice Recorder */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-850">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2.5 flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-red-500" /> Voice notice (Optional)
            </span>

            {recording ? (
              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-2xl animate-pulse">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                  <span className="text-xs font-bold font-mono">RECORDING: {formatRecordingTime(recordingTime)}</span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-red-500/20 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" /> Stop & Save
                </button>
              </div>
            ) : audioUrl ? (
              <div className="p-3 bg-slate-55 dark:bg-zinc-950/40 border border-slate-205 dark:border-zinc-850 rounded-2xl flex items-center justify-between gap-3">
                <audio src={audioUrl} controls className="h-9 w-full max-w-[220px]" />
                <button
                  type="button"
                  onClick={deleteRecording}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                  title="Delete recording"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="w-full py-3 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 hover:border-red-500/40 text-slate-650 dark:text-zinc-400 font-bold text-xs uppercase rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none"
              >
                <Mic className="w-4 h-4 text-red-500" /> Record Voice Memo
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-1.5 animate-bounce">
              <AlertCircle className="w-4 h-4" /> {errorMsg}
            </div>
          )}

          <div className="flex gap-3">
            {editingEvent && (
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-650 dark:text-zinc-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-all cursor-pointer text-center select-none"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isPendingSubmit || recording}
              className={`rounded-xl py-3.5 font-bold text-sm shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                editingEvent 
                  ? 'flex-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10' 
                  : 'w-full bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
              }`}
            >
              {isPendingSubmit ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : editingEvent ? (
                <>
                  <Pencil className="w-4.5 h-4.5" /> Save Changes
                </>
              ) : (
                <>
                  <Plus className="w-4.5 h-4.5" /> Publish Notice
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Column 2: Events List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4 mb-5">
            <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-red-500" /> Active Gym Notices ({initialEvents.length})
            </h2>
          </div>

          {initialEvents.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-600 dark:text-zinc-350">No events or notices found</h3>
              <p className="text-slate-400 dark:text-zinc-550 text-xs mt-1 max-w-sm mx-auto">
                Fill out the notice poster form to broadcast matches, sparring invites, or gym closures to all athletes.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[750px] overflow-y-auto pr-2">
              {initialEvents.map((event) => (
                <div
                  key={event._id}
                  onClick={() => {
                    setSelectedEvent(event);
                    setActiveModalTab('comments');
                  }}
                  className="p-5 border border-slate-200 dark:border-zinc-800 hover:border-slate-350 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-950/20 rounded-2xl flex flex-col sm:flex-row justify-between gap-4 transition-all cursor-pointer hover:shadow-md group"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getCategoryBadge(event.category)}`}>
                        {event.category}
                      </span>
                      {event.pinned && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-600/10 text-red-500 border border-red-500/20 shrink-0 animate-pulse">
                          <Pin className="w-3 h-3 text-red-500 fill-current" /> Pinned
                        </span>
                      )}
                      <h3 className={`font-extrabold text-sm sm:text-base uppercase tracking-tight group-hover:text-red-500 transition-colors ${getTitleColorClass(event.titleColor)}`}>
                        {event.title}
                      </h3>
                    </div>

                    {/* Image Attachment inside Admin list */}
                    {event.image && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 h-28 w-44 select-none shadow-sm bg-slate-100 dark:bg-zinc-955/50">
                        <img src={event.image} alt={event.title} className="w-full h-full object-contain" />
                      </div>
                    )}

                    <p className="text-xs text-slate-550 dark:text-zinc-400 font-medium leading-relaxed max-w-xl">
                      {event.description}
                    </p>

                    {/* Audio Player in Admin list */}
                    {event.audio && (
                      <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-zinc-900 border border-slate-205 dark:border-zinc-850 rounded-xl w-fit" onClick={(e) => e.stopPropagation()}>
                        <Mic className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <audio src={event.audio} controls className="h-7 max-w-[200px]" />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-[11px] font-semibold text-slate-400 dark:text-zinc-550 font-mono pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-red-500" /> {formatDate(event.date)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-red-500" /> {event.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-emerald-500 font-bold">
                        <Users className="w-3.5 h-3.5 text-emerald-500" /> {event.rsvps.length} Attending
                      </span>
                      <span className="flex items-center gap-1 text-red-500 font-bold">
                        <Heart className="w-3.5 h-3.5 text-red-500 fill-current" /> {event.likes?.length || 0} Likes
                      </span>
                      <span className="flex items-center gap-1 text-blue-500 font-bold">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> {event.comments?.length || 0} Comments
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex sm:flex-col justify-end items-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(event._id);
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        event.pinned
                          ? 'border-red-500 bg-red-500/10 text-red-500'
                          : 'border-slate-200 dark:border-zinc-800/80 hover:border-slate-350 hover:bg-slate-50 dark:hover:bg-zinc-900/30 text-slate-400 dark:text-zinc-550'
                      }`}
                      title={event.pinned ? "Unpin Notice" : "Pin Notice"}
                      disabled={isPendingPin}
                    >
                      <Pin className={`w-4 h-4 ${event.pinned ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(event);
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        editingEvent && editingEvent._id === event._id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                          : 'border-slate-200 dark:border-zinc-800/80 hover:border-slate-350 hover:bg-slate-50 dark:hover:bg-zinc-900/30 text-slate-400 dark:text-zinc-550'
                      }`}
                      title="Edit Event"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(event._id);
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 hover:border-red-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 transition-all cursor-pointer"
                      title="Delete Event"
                      disabled={isPendingDelete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin Notice Details Modal */}
      {activeSelectedEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
        >
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col" style={{ maxHeight: '90vh' }}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-zinc-850 shrink-0">
              <div className="flex items-center gap-3">
                <span className={`inline-flex px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border shrink-0 ${getCategoryBadge(activeSelectedEvent.category)}`}>
                  {activeSelectedEvent.category}
                </span>
                {activeSelectedEvent.pinned && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-650/10 text-red-500 border border-red-500/20 shrink-0">
                    <Pin className="w-3 h-3 text-red-500 fill-current" /> Pinned
                  </span>
                )}
                <h3 className={`font-extrabold text-base uppercase tracking-tight truncate max-w-xs sm:max-w-md ${getTitleColorClass(activeSelectedEvent.titleColor)}`}>
                  {activeSelectedEvent.title}
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
                {activeSelectedEvent.image && (
                  <div className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm relative bg-slate-105 dark:bg-zinc-950/50">
                    <img src={activeSelectedEvent.image} alt={activeSelectedEvent.title} className="w-full object-contain max-h-56 bg-slate-50 dark:bg-zinc-955" />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-55 dark:bg-zinc-955/40 p-4 border border-slate-100 dark:border-zinc-850 rounded-2xl text-xs font-mono font-semibold text-slate-555 dark:text-zinc-400">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-500 shrink-0" /> {formatDate(activeSelectedEvent.date)}
                  </span>
                  {activeSelectedEvent.location && (
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500 shrink-0" /> {activeSelectedEvent.location}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-455 dark:text-zinc-550">Notice Details</h4>
                  <p className="text-xs font-medium leading-relaxed bg-slate-50/50 dark:bg-zinc-950/20 p-4 border border-slate-100 dark:border-zinc-850 rounded-2xl whitespace-pre-wrap text-slate-655 dark:text-zinc-350">
                    {activeSelectedEvent.description}
                  </p>
                </div>

                {activeSelectedEvent.audio && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-455 dark:text-zinc-550">Voice Memo</h4>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-2xl w-fit">
                      <Mic className="w-4.5 h-4.5 text-red-500 shrink-0" />
                      <audio src={activeSelectedEvent.audio} controls className="h-8 max-w-[200px]" />
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
                    Discussion ({activeSelectedEvent.comments?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveModalTab('joined')}
                    className={`pb-1 cursor-pointer transition-colors border-b-2 ${
                      activeModalTab === 'joined' ? 'border-red-500 text-red-500 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Joined ({activeSelectedEvent.joinedFighters?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveModalTab('liked')}
                    className={`pb-1 cursor-pointer transition-colors border-b-2 ${
                      activeModalTab === 'liked' ? 'border-red-500 text-red-500 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Likes ({activeSelectedEvent.likedFighters?.length || 0})
                  </button>
                </div>

                {/* Tab Content Area */}
                <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                  {activeModalTab === 'comments' && (
                    <div className="flex flex-col h-full">
                      {/* Comments list */}
                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4 max-h-[220px] md:max-h-[300px]">
                        {!activeSelectedEvent.comments || activeSelectedEvent.comments.length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-zinc-550 text-center py-6 font-medium">No discussion comments yet.</p>
                        ) : (
                          activeSelectedEvent.comments.map((comment) => (
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
                      <form onSubmit={(e) => handleCommentSubmit(e, activeSelectedEvent._id)} className="flex gap-2 items-center mt-auto pt-2 border-t border-slate-105 dark:border-zinc-850 shrink-0">
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
                      {!activeSelectedEvent.joinedFighters || activeSelectedEvent.joinedFighters.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-zinc-555 text-center py-10 font-medium">No athletes have joined this notice event yet.</p>
                      ) : (
                        activeSelectedEvent.joinedFighters.map((f) => (
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
                      {!activeSelectedEvent.likedFighters || activeSelectedEvent.likedFighters.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-zinc-555 text-center py-10 font-medium">No members have liked this notice yet.</p>
                      ) : (
                        activeSelectedEvent.likedFighters.map((f) => (
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
