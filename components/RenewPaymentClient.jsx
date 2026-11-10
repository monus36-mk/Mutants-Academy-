'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import ThemeToggle from '@/components/ThemeToggle';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Calendar,
  Sparkles,
  Zap,
  Smartphone,
  QrCode,
  Flame,
  Dumbbell,
  RefreshCw,
  Lock,
  ArrowRight,
  ArrowLeft,
  User,
  ExternalLink
} from 'lucide-react';
import { submitPendingRenewal, checkPaymentStatus } from '@/app/actions/paymentActions';

export default function RenewPaymentClient({ fighter, upiConfig }) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/fighter');
    }
  };

  const monthlyRate = fighter.monthlyFee !== undefined ? Number(fighter.monthlyFee) : 1300;
  
  // Exactly 2 plans:
  // 1 Month: ₹1,300 (or fighter's agreed monthlyFee)
  // 3 Months: ₹4,000 (or calculated from fighter's monthlyFee)
  const oneMonthAmount = (monthlyRate !== undefined && monthlyRate !== null && !isNaN(monthlyRate) && monthlyRate > 0) ? monthlyRate : 1300;
  const threeMonthsAmount = (monthlyRate === 1200 || monthlyRate === 1300) ? 4000 : Math.max(1, Math.round(monthlyRate * 3 * 0.95));

  const PACKAGES = [
    {
      months: 1,
      title: '🥊 1 Month Training Pass',
      subtitle: 'Standard Monthly Pass',
      amount: oneMonthAmount,
      tag: 'Regular',
      savings: null,
      highlight: false,
      description: 'Full academy access, all daily grappling, MMA & striking sessions, coach oversight.',
    },
    {
      months: 3,
      title: '🔥 3 Months Quarter Pass',
      subtitle: 'Quarterly Fight Camp',
      amount: threeMonthsAmount,
      tag: 'Best Value',
      savings: null,
      highlight: true,
      description: 'Consistent 90-day fight progression, priority sparring slots, camp conditioning.',
    },
  ];

  // Default to 1 Month or fighter's existing package duration if 3
  const [selectedMonths, setSelectedMonths] = useState(
    fighter.packageDurationMonths === 3 ? 3 : 1
  );
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState(null);
  const [isPendingReview, setIsPendingReview] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const currentPackage = PACKAGES.find((p) => p.months === selectedMonths) || PACKAGES[0];
  const upiId = process.env.NEXT_PUBLIC_GYM_UPI_ID || upiConfig?.vpa || 'monuskumar36@okicici';
  const upiName = process.env.NEXT_PUBLIC_GYM_UPI_NAME || upiConfig?.name || 'Mutants Academy';

  // Calculate new prospective expiry date
  const computeNewExpiryDate = (months) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let base = fighter.nextPaymentDate ? new Date(fighter.nextPaymentDate) : today;
    if (isNaN(base.getTime())) {
      base = today;
    }
    const newDate = new Date(base);
    newDate.setMonth(newDate.getMonth() + Number(months));
    return newDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const transactionNote = `Mutants Renewal - ${fighter.name} (${selectedMonths}M)`;
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    upiName
  )}&am=${currentPackage.amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

  // Generate dynamic QR code whenever package or fighter changes
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(upiDeepLink, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate UPI QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [upiDeepLink]);

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'upi') {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  // Live Radar Polling: automatically senses Robot Bank Credit or Coach 1-Tap Approval
  useEffect(() => {
    if (!pendingPaymentId || !isPendingReview || isSuccess) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await checkPaymentStatus(pendingPaymentId);
        if (!isMounted) return;

        if (res?.success && res.status === 'Completed') {
          setIsPendingReview(false);
          setIsSuccess(true);
          setSuccessData({
            newExpiryDate: res.expiryDate || res.fighterNextPaymentDate,
            amount: currentPackage.amount,
            status: res.fighterStatus,
          });
          clearInterval(interval);
        } else if (res?.status === 'Failed') {
          setIsPendingReview(false);
          setErrorMsg('Payment claim was rejected or could not be verified. Please check with your coach.');
          clearInterval(interval);
        }
      } catch (pollErr) {
        console.error('Polling status error:', pollErr);
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pendingPaymentId, isPendingReview, isSuccess, currentPackage.amount]);

  const handleConfirmPayment = async (e) => {
    if (e) e.preventDefault();
    setIsVerifying(true);
    setErrorMsg('');

    try {
      const cleanUtr = utrNumber.trim();
      const res = await submitPendingRenewal({
        fighterId: fighter._id,
        durationMonths: selectedMonths,
        amount: currentPackage.amount,
        utr: cleanUtr,
        paymentMethod: 'UPI',
      });

      if (!res?.success || res.error) {
        throw new Error(res?.error || 'Failed to submit payment claim');
      }

      // If Bank Robot had already received the bank notification, auto-approve immediately!
      if (res.instantApproved) {
        setIsSuccess(true);
        setSuccessData({
          newExpiryDate: res.expiryDate,
          amount: currentPackage.amount,
          status: res.fighterStatus,
        });
        return;
      }

      setPendingPaymentId(res.paymentId);
      setIsPendingReview(true);
    } catch (err) {
      console.error('Payment claim submission error:', err);
      setErrorMsg(err.message || 'Could not submit payment claim. Please check your network or contact coach.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full">
      {/* Top Sticky Header with Back Button */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/30 text-xs font-bold transition-all shadow-sm cursor-pointer group"
            title="Return to Athlete Dashboard"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-red-500" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-3">
            <Link
              href="/fighter"
              className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors hidden sm:inline-block"
            >
              Athlete Portal
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Academy Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/15 text-red-500 text-xs font-black tracking-wider uppercase mb-3 border border-red-500/25">
            <Dumbbell className="w-3.5 h-3.5 text-red-500" />
            Official Athlete Portal • Membership Renewal
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            Mutants <span className="text-red-600">Academy</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 mt-1 max-w-lg mx-auto">
            Renew your subscription pass, lock in your training slots, and train with zero interruptions.
          </p>
        </div>

      {/* SUCCESS SCREEN */}
      {isSuccess ? (
        <div className="bg-white dark:bg-zinc-900 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300 text-center">
          <div className="w-20 h-20 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Payment Verified • Status: Active</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">
            Renewal Confirmed, {fighter.name}!
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 max-w-md mx-auto mb-8">
            Your Mutants Academy package has been successfully extended for{' '}
            <strong className="text-slate-900 dark:text-zinc-100">{selectedMonths} Month(s)</strong>.
          </p>

          {/* Receipt Breakdown Card */}
          <div className="bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 max-w-md mx-auto text-left space-y-3 mb-8">
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400">
              <span>Athlete Name:</span>
              <div className="flex items-center gap-2">
                {fighter.photo && (
                  <img
                    src={fighter.photo}
                    alt={fighter.name}
                    className="w-5 h-6 rounded object-cover border border-slate-200 dark:border-zinc-800"
                  />
                )}
                <span className="font-bold text-slate-800 dark:text-zinc-200">{fighter.name}</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400">
              <span>Plan Selected:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">{currentPackage.title}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400">
              <span>Amount Paid:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                ₹{currentPackage.amount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400 border-t border-slate-200 dark:border-zinc-800/80 pt-2.5">
              <span>New Expiry Date:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {computeNewExpiryDate(selectedMonths)}
              </span>
            </div>
            {fighter.phone && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>
                  Official receipt dispatched to WhatsApp: <strong>+{fighter.phone}</strong>
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a
              href="/fighter"
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/20 transition-all text-center"
            >
              Go to Athlete Portal
            </a>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl border border-slate-300 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-semibold text-sm transition-all cursor-pointer"
            >
              Refresh Status
            </button>
          </div>
        </div>
      ) : (
        /* RENEWAL INTERACTION FORM */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Athlete Profile & Exactly 2 Plans (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Fighter Overview Card */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {fighter.photo ? (
                    <div className="w-14 h-16 sm:w-16 sm:h-20 bg-slate-50 dark:bg-zinc-950/40 border-2 border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shrink-0 shadow-sm relative group">
                      <img
                        src={fighter.photo}
                        alt={fighter.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-16 sm:w-16 sm:h-20 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-white flex flex-col items-center justify-center font-black shadow-md shrink-0 border border-red-500/20">
                      <User className="w-6 h-6 mb-1 opacity-90" />
                      <span className="text-[11px] font-bold uppercase tracking-wider leading-none">
                        {fighter.name ? fighter.name.slice(0, 2) : 'MA'}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {fighter.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Discipline: <span className="font-semibold text-slate-800 dark:text-zinc-200">{fighter.style || 'MMA'}</span> • Weight: <span className="font-semibold text-slate-800 dark:text-zinc-200">{fighter.weightClass || 'Open'}</span>
                    </p>
                  </div>
                </div>

                {/* Status Badge with SVG Icon */}
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      fighter.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : fighter.status === 'Due Soon'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        fighter.status === 'Active'
                          ? 'text-emerald-500'
                          : fighter.status === 'Due Soon'
                          ? 'text-amber-500 animate-pulse'
                          : 'text-red-500'
                      }`}
                    />
                    <span>{fighter.status || 'Active'}</span>
                  </span>
                  <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 font-mono">
                    Expiry: {fighter.nextPaymentDate ? new Date(fighter.nextPaymentDate).toLocaleDateString('en-IN') : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Exactly 2 Membership Renewal Plans: 1 Month (₹1,200) & 3 Months (₹4,000) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Select Membership Renewal Plan (1 Month or 3 Months)
                </label>
                <span className="text-xs text-red-500 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Instant Pass Activation
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PACKAGES.map((pkg) => {
                  const isSelected = selectedMonths === pkg.months;
                  return (
                    <button
                      key={pkg.months}
                      type="button"
                      onClick={() => setSelectedMonths(pkg.months)}
                      className={`relative p-5 rounded-3xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-red-600 bg-red-600/10 dark:bg-red-950/20 shadow-lg shadow-red-600/10 scale-[1.02]'
                          : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {pkg.highlight && (
                        <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white flex items-center gap-1 shadow-md">
                          <Flame className="w-3 h-3" /> Popular
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-black uppercase tracking-wider text-red-500">
                            {pkg.tag}
                          </span>
                          {pkg.savings && (
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              {pkg.savings}
                            </span>
                          )}
                        </div>

                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                          {pkg.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {pkg.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                            ₹{pkg.amount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-zinc-500 font-semibold">
                            / {pkg.months} mo
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 font-mono">
                          Valid until: <strong className="text-slate-800 dark:text-zinc-200">{computeNewExpiryDate(pkg.months)}</strong>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reassurance Features with SVG icon */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Guaranteed Academy Training Continuity
              </div>
              <p className="flex items-center gap-1.5">
                • Your profile status immediately updates to <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> ACTIVE</span> upon payment confirmation.
              </p>
              <p>
                • An official branded receipt with renewed validity is delivered straight to your WhatsApp.
              </p>
              <p>
                • Instant check-in access for daily morning and evening sessions.
              </p>
            </div>
          </div>

          {/* Right Column: Dynamic UPI Payment & QR Code (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-red-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Pay via UPI (Zero Fee)
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  ₹{currentPackage.amount.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Dynamic QR Code Display */}
              <div className="text-center">
                <div className="inline-block p-3 bg-white rounded-2xl shadow-inner border border-slate-200">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Mutants Academy UPI Payment QR"
                      className="w-52 h-52 mx-auto rounded-lg"
                    />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center bg-slate-100 text-slate-400 text-xs">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 font-medium">
                  Scan with Google Pay, PhonePe, Paytm, or BHIM
                </p>
              </div>

              {/* Direct Mobile UPI Intent Button (One-tap payment on phones) */}
              <div>
                <a
                  href={upiDeepLink}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] text-center cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  Pay ₹{currentPackage.amount.toLocaleString('en-IN')} via UPI App
                </a>
                <p className="text-[11px] text-center text-slate-400 dark:text-zinc-500 mt-1.5">
                  Opens Google Pay / PhonePe / Paytm directly on your phone
                </p>
              </div>

              {/* Copy UPI Details */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs">
                <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-900">
                  <div>
                    <span className="text-slate-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">
                      Gym UPI ID
                    </span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                      {upiId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(upiId, 'upi')}
                    className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:text-red-500 transition-colors cursor-pointer border border-slate-200 dark:border-zinc-700 flex items-center gap-1 text-[11px] font-bold"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUpi ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Payment Confirmation & Instant Activation */}
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-3">
                {isPendingReview ? (
                  <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-5 text-center space-y-4 animate-in fade-in duration-300">
                    <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                      <div className="relative w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-500 shadow-inner">
                        <Zap className="w-6 h-6 animate-pulse" />
                      </div>
                    </div>

                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 mb-2">
                        <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                        <span>Radar Active • Listening for Bank Credit</span>
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        Payment Claim Submitted
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                        Waiting for automated Axis/SBI bank robot credit or Coach 1-tap verification.
                      </p>
                    </div>

                    <div className="bg-white/80 dark:bg-zinc-950/80 border border-amber-500/30 rounded-xl p-3 text-left space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400 text-[11px]">
                        <span>Amount Claimed:</span>
                        <span className="font-bold text-slate-900 dark:text-white">₹{currentPackage.amount.toLocaleString('en-IN')}</span>
                      </div>
                      {utrNumber && (
                        <div className="flex justify-between text-slate-500 dark:text-zinc-400 text-[11px]">
                          <span>Ref / UTR:</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">{utrNumber}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400 text-[11px]">
                        <span>Status:</span>
                        <span className="font-bold text-amber-500 animate-pulse">Awaiting Verification...</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 italic">
                      Do not close this page. Your pass will unlock immediately once verified!
                    </p>
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-4 text-center space-y-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Done scanning & paying?
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        Enter your 12-digit UTR from GPay/PhonePe to activate your pass!
                      </p>
                    </div>

                    <div className="pt-1">
                      <input
                        type="text"
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
                        maxLength={18}
                        placeholder="Enter 12-digit UPI UTR / Ref (e.g. 504423123456)"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmPayment}
                      disabled={isVerifying}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Submitting Claim...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>I Have Paid ₹{currentPackage.amount.toLocaleString('en-IN')} — Activate Pass</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs">
                    {errorMsg}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
