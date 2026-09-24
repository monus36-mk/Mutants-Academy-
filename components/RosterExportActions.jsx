'use client';

import { useState } from 'react';
import { Download, Copy, Check, Share2, FileSpreadsheet, MessageCircle, Eye, X } from 'lucide-react';

const WhatsAppIcon = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
  </svg>
);

export default function RosterExportActions({ fighters = [] }) {
  const [copiedType, setCopiedType] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTab, setPreviewTab] = useState('whatsapp'); // 'whatsapp' | 'csv'

  const getExpiredDays = (nextPaymentDate) => {
    if (!nextPaymentDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentDate = new Date(nextPaymentDate);
    paymentDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - paymentDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const generateWhatsAppMessage = () => {
    if (!fighters || fighters.length === 0) {
      return '🥋 *MUTANTS ACADEMY - FIGHTERS ROSTER*\nNo fighters found in the current view.';
    }

    const todayStr = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const activeCount = fighters.filter((f) => f.status === 'Active').length;
    const dueCount = fighters.filter((f) => f.status === 'Due Soon').length;
    const expiredCount = fighters.filter((f) => f.status === 'Expired').length;

    let text = `🥋 *MUTANTS ACADEMY - FIGHTERS ROSTER*\n`;
    text += `📅 *Date:* ${todayStr}\n`;
    text += `👥 *Total Count:* ${fighters.length} Students\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    fighters.forEach((f, idx) => {
      const num = idx + 1;
      const days = getExpiredDays(f.nextPaymentDate);
      let expiryNote = '';
      if (f.status === 'Expired') {
        expiryNote = days <= 0 ? ' (Expires Today)' : ` (${days}d ago)`;
      }

      const statusIcon = f.status === 'Expired' ? '🔴' : f.status === 'Due Soon' ? '🟡' : '🟢';
      const paymentDateFormatted = f.nextPaymentDate
        ? new Date(f.nextPaymentDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'N/A';

      const coachName = f.assignedCoach ? f.assignedCoach.name : 'Unassigned';
      const weightText = f.weightClass ? `${f.weightClass} kg` : '-';
      const levelText = f.experienceLevel || '-';

      text += `*${num}. ${f.name}*\n`;
      text += `📱 Phone: ${f.phone || 'N/A'}\n`;
      if (f.email) text += `✉️ Email: ${f.email}\n`;
      text += `🥊 Coach: ${coachName} | ⚖️ ${weightText} | 🎖️ ${levelText}\n`;
      if (f.style && f.style !== 'None') text += `🥋 Style: ${f.style}`;
      if (f.eca && f.eca !== 'None') text += ` | 🏆 ECA: ${f.eca}`;
      if ((f.style && f.style !== 'None') || (f.eca && f.eca !== 'None')) text += `\n`;
      text += `📅 Due Date: ${paymentDateFormatted} (${f.packageDurationMonths || 1}M)\n`;
      text += `${statusIcon} Status: *${(f.status || 'Active').toUpperCase()}*${expiryNote}\n\n`;
      text += `────────────────────\n\n`;
    });

    text += `📊 *Summary Overview:*\n`;
    text += `• Total Students: ${fighters.length}\n`;
    text += `• 🟢 Active: ${activeCount}\n`;
    text += `• 🟡 Due Soon: ${dueCount}\n`;
    text += `• 🔴 Expired: ${expiredCount}\n\n`;
    text += `_Mutants Academy Management System_`;

    return text;
  };

  const generateCSVContent = () => {
    const headers = [
      'Name',
      'Phone',
      'Email',
      'Weight (kg)',
      'Experience Level',
      'Martial Style',
      'ECA',
      'Assigned Coach',
      'Package (Months)',
      'Joining Date',
      'Next Payment Date',
      'Status',
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const rows = fighters.map((f) => [
      escapeCSV(f.name),
      escapeCSV(f.phone),
      escapeCSV(f.email || ''),
      escapeCSV(f.weightClass || ''),
      escapeCSV(f.experienceLevel || ''),
      escapeCSV(f.style || 'None'),
      escapeCSV(f.eca || 'None'),
      escapeCSV(f.assignedCoach ? f.assignedCoach.name : 'Unassigned'),
      escapeCSV(f.packageDurationMonths || 1),
      escapeCSV(f.joiningDate ? new Date(f.joiningDate).toISOString().split('T')[0] : ''),
      escapeCSV(f.nextPaymentDate ? new Date(f.nextPaymentDate).toISOString().split('T')[0] : ''),
      escapeCSV(f.status || 'Active'),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  };

  const handleCopyWhatsApp = async () => {
    try {
      const text = generateWhatsAppMessage();
      await navigator.clipboard.writeText(text);
      setCopiedType('whatsapp');
      setTimeout(() => setCopiedType(null), 2500);
    } catch (err) {
      console.error('Failed to copy WhatsApp text:', err);
    }
  };

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppMessage();
    const encodedText = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  const handleDownloadCSV = () => {
    const csvContent = generateCSVContent();
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const todayStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `mutants_fighters_roster_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyCSV = async () => {
    try {
      const csv = generateCSVContent();
      await navigator.clipboard.writeText(csv);
      setCopiedType('csv');
      setTimeout(() => setCopiedType(null), 2500);
    } catch (err) {
      console.error('Failed to copy CSV:', err);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Share to WhatsApp Direct */}
        <button
          onClick={handleShareWhatsApp}
          disabled={fighters.length === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 hover:shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Open and share roster in WhatsApp"
        >
          <WhatsAppIcon className="w-4 h-4" />
          <span>Share WhatsApp</span>
        </button>

        {/* Copy for WhatsApp */}
        <button
          onClick={handleCopyWhatsApp}
          disabled={fighters.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title="Copy formatted text to clipboard for WhatsApp"
        >
          {copiedType === 'whatsapp' ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-50" />
              <span className="text-emerald-800 dark:text-emerald-300">Copied WA Text!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Copy for WhatsApp</span>
            </>
          )}
        </button>

        {/* Download CSV */}
        <button
          onClick={handleDownloadCSV}
          disabled={fighters.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title="Download data as CSV spreadsheet"
        >
          <Download className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
          <span>Export CSV</span>
        </button>

        {/* Preview / More Options */}
        <button
          onClick={() => setShowPreviewModal(true)}
          disabled={fighters.length === 0}
          className="p-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
          title="Preview Export & WhatsApp Text"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Export & WhatsApp Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-zinc-100 uppercase tracking-tight">
                    Share & Export Fighters Roster
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">
                    {fighters.length} student entries ready for WhatsApp or CSV
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="flex border-b border-slate-100 dark:border-zinc-800 px-6 pt-3 gap-3 bg-slate-50/50 dark:bg-zinc-950/20">
              <button
                onClick={() => setPreviewTab('whatsapp')}
                className={`pb-3 px-2 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 ${
                  previewTab === 'whatsapp'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                <WhatsAppIcon className="w-3.5 h-3.5" /> WhatsApp Format
              </button>
              <button
                onClick={() => setPreviewTab('csv')}
                className={`pb-3 px-2 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 ${
                  previewTab === 'csv'
                    ? 'border-red-500 text-red-600 dark:text-red-400'
                    : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> CSV Spreadsheet
              </button>
            </div>

            {/* Preview Body */}
            <div className="flex-1 p-6 overflow-y-auto">
              {previewTab === 'whatsapp' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      WhatsApp Message Preview:
                    </span>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      Ready to copy & paste
                    </span>
                  </div>
                  <pre className="p-4 rounded-2xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 font-mono text-xs text-slate-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed select-all max-h-[340px] overflow-y-auto">
                    {generateWhatsAppMessage()}
                  </pre>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      CSV Data Preview:
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 font-semibold">
                      Comma Separated Values
                    </span>
                  </div>
                  <pre className="p-4 rounded-2xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 font-mono text-[11px] text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed select-all max-h-[340px] overflow-y-auto">
                    {generateCSVContent()}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/40 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
                {previewTab === 'whatsapp' ? 'Formatted with WhatsApp bold markdown' : 'Compatible with Excel & Google Sheets'}
              </div>

              <div className="flex items-center gap-2">
                {previewTab === 'whatsapp' ? (
                  <>
                    <button
                      onClick={handleCopyWhatsApp}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-100 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedType === 'whatsapp' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Message
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleShareWhatsApp}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" /> Send to WhatsApp
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleCopyCSV}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-100 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedType === 'csv' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied CSV!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy CSV
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadCSV}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download .CSV
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
