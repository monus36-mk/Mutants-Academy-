'use client';

import { useState } from 'react';
import { X, Calendar, Phone, Mail, Dumbbell, User, ShieldAlert, Award, Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function FighterProfileModal({ fighter }) {
  const [isOpen, setIsOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getExpiredDays = (nextPaymentDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentDate = new Date(nextPaymentDate);
    paymentDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - paymentDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusAdvisory = (status, nextPaymentDate) => {
    switch (status) {
      case 'Expired':
        const expDays = getExpiredDays(nextPaymentDate);
        return {
          badge: 'bg-red-500 text-white',
          icon: XCircle,
          color: 'text-red-500',
          text: expDays <= 0 ? 'Your subscription expired today.' : `Your subscription expired ${expDays} day${expDays > 1 ? 's' : ''} ago.`,
        };
      case 'Due Soon':
        return {
          badge: 'bg-amber-500 text-white',
          icon: AlertTriangle,
          color: 'text-amber-500',
          text: 'Subscription due soon for renewal.',
        };
      default:
        return {
          badge: 'bg-emerald-500 text-white',
          icon: CheckCircle2,
          color: 'text-emerald-500',
          text: 'Membership is active and in good standing.',
        };
    }
  };

  const statusAdvisory = getStatusAdvisory(fighter.status, fighter.nextPaymentDate);
  const StatusIcon = statusAdvisory.icon;

  const hasStyle = fighter.style && fighter.style !== 'None';
  const hasEca = fighter.eca && fighter.eca !== 'None';

  let displayStyle = null;
  let displayEca = null;

  if (hasStyle && hasEca) {
    displayStyle = fighter.style;
    displayEca = fighter.eca;
  } else if (hasStyle) {
    displayStyle = fighter.style;
  } else if (hasEca) {
    displayStyle = fighter.eca;
  }

  return (
    <>
      {/* Profile Icon Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 transition-all cursor-pointer shadow-sm relative group"
        title="View Profile & Membership details"
      >
        <User className="w-5 h-5 text-red-500" />
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-4">
                {fighter.photo ? (
                  <div 
                    className="w-12 h-15 bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shrink-0 shadow-sm cursor-zoom-in hover:opacity-90 active:scale-95 transition-all"
                    onClick={() => setLightboxImage(fighter.photo)}
                    title="Click to view full photo"
                  >
                    <img src={fighter.photo} alt={fighter.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0 border border-red-500/20">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800 dark:text-zinc-100 uppercase tracking-tight">
                    {fighter.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      Athlete Account
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${statusAdvisory.badge}`}>
                      {fighter.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-600 dark:hover:text-zinc-200 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 gap-5">
                {displayStyle && (
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Martial Style</span>
                    <span className="text-sm font-extrabold text-red-500 dark:text-red-400 uppercase tracking-wide block mt-0.5">{displayStyle}</span>
                  </div>
                )}

                {displayEca && (
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Extra Activity</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 block mt-0.5">{displayEca}</span>
                  </div>
                )}

                <div>
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Experience Level</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 block mt-0.5">{fighter.experienceLevel}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Weight Class</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 block mt-0.5">{fighter.weightClass}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Original Joined Date</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 block mt-0.5 font-mono">{formatDate(fighter.joiningDate)}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Phone</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 font-mono block mt-0.5">{fighter.phone}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Email Address</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 font-mono block mt-0.5 break-all">{fighter.email}</span>
                </div>
              </div>

              {/* Billing Cycle Details */}
              <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-5 mt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" /> Membership Subscription Info
                </h4>
                <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800 p-4 rounded-2xl">
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Billing Package</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase leading-relaxed mt-0.5">
                      {fighter.packageDurationMonths} Month{fighter.packageDurationMonths > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Cycle Started</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono leading-relaxed mt-0.5">{formatDate(fighter.entryDate)}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Next Due Expiry</span>
                    <span className="text-xs font-extrabold text-red-500 dark:text-red-400 font-mono leading-relaxed mt-0.5">{formatDate(fighter.nextPaymentDate)}</span>
                  </div>
                </div>
              </div>

              {/* Coach details */}
              <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-5 mt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-3 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-slate-400" /> Training Supervisor
                </h4>
                {fighter.assignedCoach ? (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-sm">
                      {fighter.assignedCoach.name.charAt(0)}
                    </div>
                    <div>
                      <h5 className="text-xs font-extrabold text-slate-800 dark:text-zinc-100 uppercase">{fighter.assignedCoach.name}</h5>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">{fighter.assignedCoach.email}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">General Coaching Staff</p>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-zinc-900/60 p-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold cursor-pointer"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

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
    </>
  );
}
