'use client';

import { useState } from 'react';
import { X, Calendar, Phone, Mail, Dumbbell, User, ShieldAlert, Award, Clock, ArrowRight, Edit, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { formatWhatsAppNumber } from '@/lib/utils';

const WhatsAppIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function FighterDetailModal({ fighter, canEdit = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyPhone = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fighter.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyEmail = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fighter.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const getExpiredDays = (nextPaymentDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentDate = new Date(nextPaymentDate);
    paymentDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - paymentDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getWhatsAppUrl = (fighter) => {
    const cleanPhone = formatWhatsAppNumber(fighter.phone);
    let message = '';
    const formattedDate = new Date(fighter.nextPaymentDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (fighter.status === 'Expired') {
      const days = getExpiredDays(fighter.nextPaymentDate);
      const daysText = days <= 0 ? 'today' : `${days} day${days > 1 ? 's' : ''} ago`;
      message = `Hello ${fighter.name},\n\nThis is a payment reminder from Mutants Academy. Your subscription package (${fighter.packageDurationMonths} Month) expired ${daysText} on ${formattedDate}.\n\nPlease renew your subscription to continue your training classes.\n\nThank you!`;
    } else if (fighter.status === 'Due Soon') {
      message = `Hello ${fighter.name},\n\nThis is a payment notice from Mutants Academy. Your subscription package (${fighter.packageDurationMonths} Month) is due soon for renewal on ${formattedDate}.\n\nPlease arrange your payment to ensure uninterrupted training.\n\nThank you!`;
    } else {
      message = `Hello ${fighter.name},\n\nGreetings from Mutants Academy! We appreciate you training with us in our classes. Let us know if you have any feedback or questions.\n\nTrain hard!`;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      {/* Clickable Table Cell Trigger */}
      <div
        onClick={() => setIsOpen(true)}
        className="group cursor-pointer hover:bg-slate-100/50 dark:hover:bg-zinc-800/30 p-2.5 rounded-2xl -ml-2.5 transition-all duration-150"
        title="Click to view full athlete profile"
      >
        <span className="block font-bold text-slate-800 dark:text-zinc-100 text-sm md:text-base group-hover:text-red-500 transition-colors">
          {fighter.name}
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-zinc-500 mt-1 font-mono">
          <a
            href={`tel:${fighter.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 hover:text-red-500 transition-colors"
            title="Click to call athlete"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" /> {fighter.phone}
          </a>
          <button
            onClick={handleCopyPhone}
            className="inline-flex items-center justify-center p-0.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-650 dark:hover:bg-zinc-800 transition-all ml-1"
            title={copied ? "Copied!" : "Copy phone number"}
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
          <a
            href={getWhatsAppUrl(fighter)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center p-0.5 rounded text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 transition-all ml-0.5"
            title="Send WhatsApp payment reminder"
          >
            <WhatsAppIcon className="w-3.5 h-3.5" />
          </a>
        </span>
        {fighter.email && (
          <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-zinc-500 mt-0.5 font-mono">
            <Mail className="w-3.5 h-3.5 shrink-0" /> {fighter.email}
          </span>
        )}
        <span className="block text-[10px] text-slate-455 dark:text-zinc-500 mt-1.5 font-bold uppercase tracking-tight">
          Joined: {new Date(fighter.joiningDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
          {fighter.dob && ` • Age: ${calculateAge(fighter.dob)}`}
        </span>
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 md:p-8 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-red-500/10 text-red-600">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-slate-800 dark:text-zinc-100 uppercase tracking-tight">
                    {fighter.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {/* Experience Level Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      fighter.experienceLevel === 'Pro' 
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30'
                        : fighter.experienceLevel === 'Intermediate' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30'
                        : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50'
                    }`}>
                      {fighter.experienceLevel} Level
                    </span>
                    
                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      fighter.status === 'Expired'
                        ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20'
                        : fighter.status === 'Due Soon'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    }`}>
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

            {/* Profile Grid */}
            <div className="p-6 md:p-8 space-y-6">

              <div className="grid grid-cols-2 gap-6">

                {/* original joined */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Original Joined Date</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">{formatDate(fighter.joiningDate)}</span>
                  </div>
                </div>

                {/* date of birth */}
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Date of Birth & Age</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">
                      {formatDate(fighter.dob)} {fighter.dob && `(${calculateAge(fighter.dob)} years old)`}
                    </span>
                  </div>
                </div>

                {/* Weight Class */}
                <div className="flex items-start gap-3">
                  <Dumbbell className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Weight Class</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">{fighter.weightClass}</span>
                  </div>
                </div>

                {/* Assigned Coach */}
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Assigned Coach</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-zinc-200">
                      {fighter.assignedCoach?.name || 'Self'}
                    </span>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Phone Number</span>
                    <div className="flex items-center gap-2">
                      <a href={`tel:${fighter.phone}`} className="text-sm font-bold text-slate-750 dark:text-zinc-200 hover:text-red-500 font-mono transition-colors">
                        {fighter.phone}
                      </a>
                      <a
                        href={getWhatsAppUrl(fighter)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-1 rounded-md text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 transition-all"
                        title="Send WhatsApp payment reminder"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">Email Address</span>
                    <div className="flex items-center gap-2">
                      <a href={`mailto:${fighter.email}`} className="text-sm font-bold text-slate-750 dark:text-zinc-200 hover:text-red-500 font-mono transition-colors">
                        {fighter.email}
                      </a>
                      <button
                        onClick={handleCopyEmail}
                        className="inline-flex items-center justify-center p-0.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-650 dark:hover:bg-zinc-800 transition-all"
                        title={copiedEmail ? "Copied!" : "Copy email address"}
                      >
                        {copiedEmail ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-5 mt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550 mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" /> Subscription Billing Information
                </h4>
                <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-850 p-4 rounded-2xl">
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Active Cycle Start</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono">{formatDate(fighter.entryDate)}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Package Duration</span>
                    <span className="text-xs font-extrabold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                      {fighter.packageDurationMonths} Month{fighter.packageDurationMonths > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Next Expiry Due</span>
                    <span className="text-xs font-bold text-red-500 dark:text-red-400 font-mono">{formatDate(fighter.nextPaymentDate)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 dark:bg-zinc-900/60 p-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-650 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold cursor-pointer"
              >
                Close Profile
              </button>
              {canEdit && (
                <Link
                  href={`/admin/edit-fighter/${fighter._id}`}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold shadow-md shadow-red-500/10 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Profile
                </Link>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
