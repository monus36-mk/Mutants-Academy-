'use client';

import { useState, useTransition, useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createEvent, deleteEvent } from '@/app/actions/eventActions';
import { 
  Calendar, MapPin, Trash2, Megaphone, Users, Clock, Plus, 
  AlertCircle, CalendarRange, Image as ImageIcon, Mic, Square, Play, Trash, Info
} from 'lucide-react';

export default function EventsManager({ initialEvents, user }) {
  const router = useRouter();
  const [isPendingDelete, startDeleteTransition] = useTransition();
  const [state, formAction, isPendingCreate] = useActionState(createEvent, null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form input states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Announcement');

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

  useEffect(() => {
    if (state?.success) {
      // Clear form inputs and media on success
      setTitle('');
      setDescription('');
      setDate('');
      setLocation('');
      setCategory('Announcement');
      setImage('');
      setImagePreview('');
      setAudioUrl('');
      setAudioBase64('');
      setErrorMsg(null);
      router.refresh();
    } else if (state?.error) {
      setErrorMsg(state.error);
    }
  }, [state, router]);

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
              Post Gym Notice
            </h2>
            <p className="text-slate-400 dark:text-zinc-550 text-xs mt-0.5">
              Broadcast announcements, sparring cards, seminars, or upload voice memos.
            </p>
          </div>
        </div>

        <form action={formAction} className="space-y-5">
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

          <button
            type="submit"
            disabled={isPendingCreate || recording}
            className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isPendingCreate ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4.5 h-4.5" /> Publish Notice
              </>
            )}
          </button>
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
                  className="p-5 border border-slate-200 dark:border-zinc-800 hover:border-slate-350 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-950/20 rounded-2xl flex flex-col sm:flex-row justify-between gap-4 transition-all"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getCategoryBadge(event.category)}`}>
                        {event.category}
                      </span>
                      <h3 className="font-extrabold text-slate-800 dark:text-zinc-150 text-sm sm:text-base uppercase tracking-tight">
                        {event.title}
                      </h3>
                    </div>

                    {/* Image Attachment inside Admin list */}
                    {event.image && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 h-28 w-44 select-none shadow-sm bg-slate-100 dark:bg-zinc-950/50">
                        <img src={event.image} alt={event.title} className="w-full h-full object-contain" />
                      </div>
                    )}

                    <p className="text-xs text-slate-550 dark:text-zinc-400 font-medium leading-relaxed max-w-xl">
                      {event.description}
                    </p>

                    {/* Audio Player in Admin list */}
                    {event.audio && (
                      <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-zinc-900 border border-slate-205 dark:border-zinc-850 rounded-xl w-fit">
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
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-emerald-500" /> {event.rsvps.length} Attending
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex sm:flex-col justify-end items-end gap-2">
                    <button
                      onClick={() => handleDelete(event._id)}
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

    </div>
  );
}
