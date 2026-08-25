'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSelfFighterProfile } from '@/app/actions/fighterActions';
import { User, Mail, Award, Check, Download, Camera, X } from 'lucide-react';

export default function FighterProfileClient({ initialFighter }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [style, setStyle] = useState(initialFighter.style || 'MMA');
  const [weightClass, setWeightClass] = useState(initialFighter.weightClass || '');
  const [bio, setBio] = useState(initialFighter.bio || '');
  const [photo, setPhoto] = useState(initialFighter.photo || '');
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/') || 
                    /\.(jpg|jpeg|png|webp|gif)/i.test(file.name);
    if (!isImage) {
      setError('Please select a valid image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Profile photo size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result);
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!style || !weightClass) {
      setError('Please fill in all fields.');
      return;
    }

    setIsPending(true);
    setError('');
    setSuccess(false);

    try {
      const res = await updateSelfFighterProfile(style, weightClass, bio, photo);
      if (res.success) {
        setSuccess(true);
        setIsEditing(false);
        router.refresh();
      } else {
        setError(res.error || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setIsPending(false);
    }
  };

  const hasStyle = initialFighter.style && initialFighter.style !== 'None';
  const hasEca = initialFighter.eca && initialFighter.eca !== 'None';

  let displayStyle = null;
  let displayEca = null;

  if (hasStyle && hasEca) {
    displayStyle = initialFighter.style;
    displayEca = initialFighter.eca;
  } else if (hasStyle) {
    displayStyle = initialFighter.style;
  } else if (hasEca) {
    displayStyle = initialFighter.eca;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      
      {/* Athlete Profile Details Card */}
      <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
            <User className="w-5 h-5 text-red-500" /> Athlete Profile
          </h2>
          
          {!isEditing ? (
            <button
              onClick={() => {
                setError('');
                setSuccess(false);
                setIsEditing(true);
              }}
              className="text-xs font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors uppercase tracking-wider cursor-pointer border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-xl hover:bg-red-50/10"
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setError('');
                  setStyle(initialFighter.style || 'MMA');
                  setWeightClass(initialFighter.weightClass || '');
                  setBio(initialFighter.bio || '');
                  setPhoto(initialFighter.photo || '');
                  setIsEditing(false);
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-400 transition-colors uppercase tracking-wider cursor-pointer"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors uppercase tracking-wider px-3.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Save
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-650 dark:text-emerald-450 text-xs font-bold">
            Profile updated successfully!
          </div>
        )}
        
        <form onSubmit={handleSave}>
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Passport Photo Column */}
            <div className="flex flex-col items-center shrink-0" style={{ width: '150px' }}>
              <div 
                className="bg-slate-50 dark:bg-zinc-950/40 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center relative group shadow-sm transition-all duration-200 hover:border-red-500/50"
                style={{ width: '150px', height: '188px', minWidth: '150px', minHeight: '188px' }}
              >
                {photo ? (
                  <img
                    src={photo}
                    alt="Passport Size Front View"
                    className={`w-full h-full object-cover ${!isEditing ? 'cursor-zoom-in hover:opacity-90 active:scale-95 transition-all' : ''}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onClick={() => {
                      if (!isEditing) setLightboxImage(photo);
                    }}
                    title={!isEditing ? "Click to view full photo" : ""}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    <User className="w-8 h-8 text-slate-300 dark:text-zinc-600 mb-1" />
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Passport</span>
                    <span className="text-[8px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5">Front View</span>
                  </div>
                )}
                {isEditing && (
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-black uppercase tracking-wider transition-opacity cursor-pointer gap-1">
                    <Camera className="w-4 h-4" />
                    Upload Photo
                    <input
                      type="file"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              
              {photo && (
                <a
                  href={photo}
                  download={`${initialFighter.name.replace(/\s+/g, '_')}_passport_photo.png`}
                  className="mt-3.5 inline-flex items-center gap-1.5 text-[10px] font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors uppercase tracking-wider border border-red-500/10 hover:border-red-500/25 px-3 py-1.5 rounded-xl bg-red-500/5 hover:bg-red-500/10 cursor-pointer shadow-sm w-full justify-center"
                >
                  <Download className="w-3.5 h-3.5" /> Download Photo
                </a>
              )}
            </div>

            {/* Form Fields Column */}
            <div className="flex-1 grid grid-cols-2 gap-6 w-full">
              {/* Martial Style */}
              {(isEditing || displayStyle) && (
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-wider">Martial Style</span>
                  {isEditing ? (
                    <select
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/20 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold"
                    >
                      <option value="MMA" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">MMA</option>
                      <option value="Striking" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Striking (Boxing/Muay Thai)</option>
                      <option value="Grappling" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">Grappling (BJJ/Wrestling)</option>
                      <option value="None" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">None</option>
                    </select>
                  ) : (
                    <span className="text-sm font-extrabold text-red-500 dark:text-red-400 uppercase tracking-wide block mt-1">{displayStyle}</span>
                  )}
                </div>
              )}

              {/* ECA (View Only) */}
              {(!isEditing && displayEca) && (
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-wider">Extra Curricular Activity (ECA)</span>
                  <span className="text-sm font-extrabold text-slate-700 dark:text-zinc-200 uppercase tracking-wide block mt-1">{displayEca}</span>
                </div>
              )}

              {/* Experience Level (View Only) */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-wider">Experience Level</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold mt-1.5 ${
                  initialFighter.experienceLevel === 'Pro' 
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30'
                    : initialFighter.experienceLevel === 'Intermediate' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30'
                    : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50'
                }`}>
                  {initialFighter.experienceLevel}
                </span>
              </div>

              {/* Weight Class */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-wider">Weight Class</span>
                {isEditing ? (
                  <input
                    type="text"
                    required
                    value={weightClass}
                    onChange={(e) => setWeightClass(e.target.value)}
                    placeholder="e.g. 60 or 75"
                    className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/20 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold"
                  />
                ) : (
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 block mt-1.5">{initialFighter.weightClass} kg</span>
                )}
              </div>

              {/* Phone (View Only) */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-wider">Phone</span>
                <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 font-mono block mt-1.5">
                  {initialFighter.phone}
                </span>
              </div>

              {/* Email (View Only) */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-wider">Email Address</span>
                <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 font-mono block mt-1.5 break-all">
                  {initialFighter.email}
                </span>
              </div>

              {/* Bio / Achievements */}
              <div className="col-span-2 border-t border-slate-100 dark:border-zinc-800/80 pt-4">
                <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-555 uppercase tracking-wider mb-1.5">Bio & Achievements</span>
                {isEditing ? (
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell other fighters about your training background, weight cuts, favorite styles, or competition achievements..."
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/20 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold resize-none"
                  />
                ) : (
                  <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                    {initialFighter.bio || (
                      <span className="italic text-slate-400 dark:text-zinc-500">
                        No bio or achievements listed yet. Click "Edit Profile" to write one!
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Coach Details (Training Supervisor) */}
      <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm transition-colors">
        <h2 className="text-base font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-red-500" /> Training Supervisor
        </h2>
        
        {initialFighter.assignedCoach ? (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-lg">
              {initialFighter.assignedCoach.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-zinc-100 text-sm uppercase">
                {initialFighter.assignedCoach.name}
              </h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500 uppercase font-semibold">
                Academy Coach
              </p>
              <a
                href={`mailto:${initialFighter.assignedCoach.email}`}
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 font-mono"
              >
                <Mail className="w-3.5 h-3.5" /> {initialFighter.assignedCoach.email}
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-700 dark:text-zinc-300 text-sm">
                General Coaching Staff
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                No coach currently assigned.
              </p>
            </div>
          </div>
        )}
      </div>

      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center">
            <img 
              src={lightboxImage} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
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
    </div>
  );
}
