'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  IndianRupee,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Calendar,
  Phone,
  CheckCircle2,
  Banknote,
  QrCode,
  Building,
  RefreshCw,
  FileSpreadsheet,
  Clock,
  User,
  Bot,
  Zap,
  Check,
  X,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import {
  approvePendingPayment,
  rejectPendingPayment,
  triggerRobotBankCredit,
} from '@/app/actions/paymentActions';

export default function PaymentsDashboardClient({ initialPayments, stats, currentUser }) {
  const [paymentsList, setPaymentsList] = useState(initialPayments);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('all'); // 'all' or 'YYYY-MM'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'amountDesc', 'amountAsc'

  // Coach action states
  const [loadingActionId, setLoadingActionId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Robot simulator modal state
  const [robotModalOpen, setRobotModalOpen] = useState(false);
  const [robotUtr, setRobotUtr] = useState('');
  const [robotAmount, setRobotAmount] = useState('1300');
  const [robotBank, setRobotBank] = useState('Axis Bank');
  const [robotSmsText, setRobotSmsText] = useState('');
  const [robotResult, setRobotResult] = useState(null);
  const [isRobotTriggering, setIsRobotTriggering] = useState(false);

  // Compute available months dynamically from payments + current month
  const availableMonths = useMemo(() => {
    const monthMap = new Map();
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    monthMap.set(currentKey, { value: currentKey, label: `This Month (${currentLabel})`, count: 0 });

    paymentsList.forEach((p) => {
      if (!p.paymentDate) return;
      const d = new Date(p.paymentDate);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      if (!monthMap.has(key)) {
        monthMap.set(key, { value: key, label, count: 0 });
      }
      monthMap.get(key).count += 1;
    });

    return Array.from(monthMap.values()).sort((a, b) => b.value.localeCompare(a.value));
  }, [paymentsList]);

  // Pending verification requests
  const pendingRequests = useMemo(() => {
    return paymentsList.filter((p) => p.status === 'Pending');
  }, [paymentsList]);

  // Filtered and sorted payments
  const filteredPayments = useMemo(() => {
    return paymentsList.filter((p) => {
      // Month filter
      if (monthFilter !== 'all') {
        if (!p.paymentDate) return false;
        const d = new Date(p.paymentDate);
        if (isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== monthFilter) return false;
      }

      // Search by fighter name or phone or txn ID
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const nameMatch = p.fighterName?.toLowerCase().includes(query);
        const phoneMatch = p.phone?.toLowerCase().includes(query);
        const txnMatch = p.transactionId?.toLowerCase().includes(query);
        if (!nameMatch && !phoneMatch && !txnMatch) return false;
      }

      // Method filter
      if (methodFilter !== 'All') {
        if (methodFilter === 'UPI' && p.paymentMethod !== 'UPI' && p.paymentMethod !== 'YouPI') {
          return false;
        } else if (methodFilter === 'Cash' && p.paymentMethod !== 'Cash') {
          return false;
        } else if (methodFilter === 'Bank Transfer' && p.paymentMethod !== 'Bank Transfer') {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'All' && p.status !== statusFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.paymentDate) - new Date(a.paymentDate);
      }
      if (sortBy === 'oldest') {
        return new Date(a.paymentDate) - new Date(b.paymentDate);
      }
      if (sortBy === 'amountDesc') {
        return b.amount - a.amount;
      }
      if (sortBy === 'amountAsc') {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [paymentsList, search, methodFilter, statusFilter, monthFilter, sortBy]);

  // Compute metrics dynamically for the displayed subset
  const currentMetrics = useMemo(() => {
    let total = 0;
    let upi = 0;
    let cash = 0;
    const athleteSet = new Set();
    filteredPayments.forEach((p) => {
      if (p.status === 'Failed') return; // Do not count failed/rejected claims in revenue
      const amt = Number(p.amount) || 0;
      total += amt;
      if (p.paymentMethod === 'UPI' || p.paymentMethod === 'YouPI') {
        upi += amt;
      } else if (p.paymentMethod === 'Cash') {
        cash += amt;
      }
      if (p.fighterId) {
        athleteSet.add(p.fighterId.toString());
      } else if (p.fighterName) {
        athleteSet.add(p.fighterName.toLowerCase());
      }
    });
    return {
      total,
      upi,
      cash,
      count: filteredPayments.filter(p => p.status !== 'Failed').length,
      uniqueAthletes: athleteSet.size,
    };
  }, [filteredPayments]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = hours.toString().padStart(2, '0');
    return `${day} ${month} ${year} at ${strHours}:${minutes} ${ampm}`;
  };

  const getMethodBadge = (method) => {
    switch (method) {
      case 'Cash':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Banknote className="w-3.5 h-3.5" /> Cash
          </span>
        );
      case 'UPI':
      case 'YouPI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <QrCode className="w-3.5 h-3.5" /> UPI
          </span>
        );
      case 'Bank Transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Building className="w-3.5 h-3.5" /> Bank Transfer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
            {method}
          </span>
        );
    }
  };

  // 1-Click Approve handler
  const handleApprove = async (paymentId) => {
    setLoadingActionId(paymentId);
    setActionFeedback(null);
    try {
      const res = await approvePendingPayment(paymentId);
      if (!res.success) {
        throw new Error(res.error || 'Failed to approve payment');
      }

      setPaymentsList((prev) =>
        prev.map((p) =>
          p._id === paymentId
            ? {
                ...p,
                status: 'Completed',
                notes: `${p.notes || ''} [Approved by Coach]`.trim(),
              }
            : p
        )
      );

      setActionFeedback({
        type: 'success',
        message: `Successfully approved renewal for ${res.fighterName}! Official WhatsApp receipt sent.`,
      });
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err) {
      console.error('Approval failed:', err);
      setActionFeedback({ type: 'error', message: err.message || 'Approval failed' });
    } finally {
      setLoadingActionId(null);
    }
  };

  // 1-Click Reject handler
  const handleReject = async (paymentId) => {
    if (!window.confirm('Are you sure you want to reject this payment claim? This will mark it as failed.')) {
      return;
    }

    setLoadingActionId(paymentId);
    setActionFeedback(null);
    try {
      const res = await rejectPendingPayment(paymentId, 'Rejected by coach');
      if (!res.success) {
        throw new Error(res.error || 'Failed to reject payment');
      }

      setPaymentsList((prev) =>
        prev.map((p) =>
          p._id === paymentId
            ? {
                ...p,
                status: 'Failed',
                notes: `${p.notes || ''} [Rejected by Coach]`.trim(),
              }
            : p
        )
      );

      setActionFeedback({ type: 'info', message: 'Payment claim was rejected.' });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Reject failed:', err);
      setActionFeedback({ type: 'error', message: err.message || 'Reject failed' });
    } finally {
      setLoadingActionId(null);
    }
  };

  // Run Robot Bank Credit Simulation
  const handleFireRobotSimulation = async (presetUtr = null, presetAmount = null, presetBank = null) => {
    setIsRobotTriggering(true);
    setRobotResult(null);

    const utr = presetUtr || robotUtr.trim() || `ROBOT_${Date.now()}`;
    const amount = presetAmount !== null ? presetAmount : Number(robotAmount) || 1300;
    const bank = presetBank || robotBank;

    try {
      const res = await triggerRobotBankCredit({
        utr,
        amount,
        bank,
        rawMessage: robotSmsText.trim() || `Credit of Rs.${amount} received via ${bank} (UTR: ${utr})`,
      });

      setRobotResult(res);

      if (res.success && res.matched) {
        // Update payments list locally
        setPaymentsList((prev) =>
          prev.map((p) => {
            if (p.transactionId === utr || (p.status === 'Pending' && p.amount === amount)) {
              return {
                ...p,
                status: 'Completed',
                transactionId: utr,
                notes: `Auto-activated by Robot (${bank} UTR: ${utr})`,
              };
            }
            return p;
          })
        );
      }
    } catch (err) {
      setRobotResult({ error: err.message || 'Robot execution failed' });
    } finally {
      setIsRobotTriggering(false);
    }
  };

  const exportToCSV = () => {
    if (filteredPayments.length === 0) return;
    const headers = ['Date', 'Fighter Name', 'Phone', 'Duration (Months)', 'Amount (INR)', 'Payment Method', 'Transaction ID', 'Status', 'Notes'];
    const rows = filteredPayments.map((p) => [
      `"${p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : ''}"`,
      `"${p.fighterName.replace(/"/g, '""')}"`,
      `"${p.phone || ''}"`,
      p.durationMonths,
      p.amount,
      `"${p.paymentMethod}"`,
      `"${(p.transactionId || '').replace(/"/g, '""')}"`,
      `"${p.status}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Mutants_Academy_Payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 text-red-600 dark:text-red-400 text-xs font-extrabold uppercase tracking-wider mb-2 border border-red-500/20">
            <CreditCard className="w-3.5 h-3.5" />
            Academy Financial Ledger
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Payment History & Revenues
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            Strict continuous renewal tracking, 1-tap coach approvals, and automated Axis/SBI bank robot triggers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Bank Robot Trigger Modal Button */}
          <button
            onClick={() => {
              setRobotResult(null);
              setRobotModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Configure & test automated Axis/SBI bank robot triggers"
          >
            <Bot className="w-4 h-4 text-amber-500" />
            <span>Bank Robot Simulator</span>
          </button>

          <button
            onClick={exportToCSV}
            disabled={filteredPayments.length === 0}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Download CSV spreadsheet of current payments view"
          >
            <Download className="w-4 h-4 text-red-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ACTION FEEDBACK ALERT */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : actionFeedback.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="p-1 hover:opacity-70 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PENDING VERIFICATION REQUESTS BANNER */}
      {pendingRequests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-xl shadow-amber-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-inner">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span>Action Required: {pendingRequests.length} Payment Claim{pendingRequests.length > 1 ? 's' : ''} Pending</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400">
                  Athletes awaiting automated Axis/SBI bank robot credit or your 1-tap coach approval.
                </p>
              </div>
            </div>

            <div className="text-xs text-amber-700 dark:text-amber-300 font-mono font-bold bg-amber-500/20 px-3 py-1 rounded-xl self-start sm:self-auto">
              Total Unverified: ₹{pendingRequests.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingRequests.map((item) => (
              <div
                key={item._id}
                className="bg-white dark:bg-zinc-900 border border-amber-500/30 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-black text-sm text-slate-900 dark:text-white block uppercase tracking-tight">
                        {item.fighterName}
                      </span>
                      {item.phone && (
                        <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {item.phone}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-black text-base text-amber-600 dark:text-amber-400">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-xl text-xs space-y-1 font-mono mt-3 border border-slate-100 dark:border-zinc-800">
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                      <span>Pass Plan:</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {item.durationMonths === 1 ? '🥊 1 Month' : `${item.durationMonths} Months`}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                      <span>Submitted UTR:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 truncate max-w-[150px]" title={item.transactionId}>
                        {item.transactionId || 'None entered'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    onClick={() => handleApprove(item._id)}
                    disabled={loadingActionId === item._id}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loadingActionId === item._id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Approve & Activate</span>
                  </button>

                  <button
                    onClick={() => handleReject(item._id)}
                    disabled={loadingActionId === item._id}
                    className="py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    title="Reject fake claim"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUMMARY STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total / Selected Month Revenue */}
        <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl" />
          <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
            {monthFilter === 'all'
              ? 'Total Revenue Collected'
              : `${availableMonths.find((m) => m.value === monthFilter)?.label || 'Monthly'} Revenue`}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
              ₹{currentMetrics.total.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-emerald-500 font-bold mt-2 block">
            Across {currentMetrics.count} transactions
          </span>
        </div>

        {/* UPI Revenue */}
        <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl" />
          <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
            UPI Collections
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400 font-mono">
              ₹{currentMetrics.upi.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium mt-2 block">
            {currentMetrics.total > 0
              ? `${Math.round((currentMetrics.upi / currentMetrics.total) * 100)}% of total revenue`
              : '0%'}
          </span>
        </div>

        {/* Cash Revenue */}
        <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
          <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
            Cash Collections
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              ₹{currentMetrics.cash.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium mt-2 block">
            {currentMetrics.total > 0
              ? `${Math.round((currentMetrics.cash / currentMetrics.total) * 100)}% of total revenue`
              : '0%'}
          </span>
        </div>

        {/* Unique Athletes Paid */}
        <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl" />
          <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
            Fighters Paid
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
              {currentMetrics.uniqueAthletes}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium mt-2 block">
            Across {currentMetrics.count} transactions
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions by fighter name, phone, or reference..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Filters Group: Month Selector + Method Filter + Sort */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-zinc-200 text-xs font-bold focus:outline-none cursor-pointer py-1.5"
            >
              <option value="all" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                All Months
              </option>
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                  {m.label} ({m.count})
                </option>
              ))}
            </select>
          </div>

          {/* Status filter buttons */}
          <div className="flex items-center gap-1">
            {['All', 'Completed', 'Pending'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-sm'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Method filter buttons */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {['All', 'UPI', 'Cash'].map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  methodFilter === m
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-700 dark:text-zinc-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer shrink-0"
          >
            <option value="newest">Latest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amountDesc">Highest Amount</option>
            <option value="amountAsc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* PAYMENTS LEDGER TABLE */}
      <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/75 dark:bg-zinc-950/50 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                <th className="py-4 px-4 sm:px-6">Date & Time</th>
                <th className="py-4 px-4 sm:px-6">Fighter Name</th>
                <th className="py-4 px-4 sm:px-6">Plan / Validity</th>
                <th className="py-4 px-4 sm:px-6 text-right">Amount Paid</th>
                <th className="py-4 px-4 sm:px-6 text-center">Payment Method</th>
                <th className="py-4 px-4 sm:px-6 text-center">Status</th>
                <th className="py-4 px-4 sm:px-6">Reference / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs font-semibold">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 dark:text-zinc-500">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                      <CreditCard className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="font-bold text-sm">No payment transactions found</p>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                      {search || methodFilter !== 'All' ? 'Try adjusting your search query or filter options' : 'Payment receipts logged via online renewals or admin actions will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr
                    key={payment._id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-zinc-850/40 transition-colors ${
                      payment.status === 'Pending' ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    {/* Date */}
                    <td suppressHydrationWarning className="py-4 px-4 sm:px-6 font-mono text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                      {formatDate(payment.paymentDate)}
                    </td>

                    {/* Fighter Name & Phone */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                        {payment.fighterName}
                      </div>
                      {payment.phone && (
                        <div className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {payment.phone}
                        </div>
                      )}
                    </td>

                    {/* Plan */}
                    <td className="py-4 px-4 sm:px-6">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700/60">
                        {payment.durationMonths === 1
                          ? '🥊 1 Month'
                          : payment.durationMonths === 3
                          ? '🔥 3 Months Quarter'
                          : `${payment.durationMonths} Months`}
                      </span>
                    </td>

                    {/* Amount Paid */}
                    <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                      <span className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white">
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* Method */}
                    <td className="py-4 px-4 sm:px-6 text-center whitespace-nowrap">
                      {getMethodBadge(payment.paymentMethod)}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 sm:px-6 text-center whitespace-nowrap">
                      {payment.status === 'Pending' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                          <Clock className="w-3.5 h-3.5" /> Pending Verification
                        </span>
                      ) : payment.status === 'Failed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                          <X className="w-3.5 h-3.5" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Completed
                        </span>
                      )}
                    </td>

                    {/* Reference / Actions */}
                    <td className="py-4 px-4 sm:px-6 text-slate-500 dark:text-zinc-400 max-w-xs text-[11px]">
                      {payment.status === 'Pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(payment._id)}
                            disabled={loadingActionId === payment._id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {loadingActionId === payment._id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(payment._id)}
                            disabled={loadingActionId === payment._id}
                            className="px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <>
                          {payment.transactionId ? (
                            <span className="font-mono font-semibold text-slate-700 dark:text-zinc-300 block truncate" title={payment.transactionId}>
                              {payment.transactionId}
                            </span>
                          ) : null}
                          {payment.notes && (
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 block truncate" title={payment.notes}>
                              {payment.notes}
                            </span>
                          )}
                          {!payment.transactionId && !payment.notes && '—'}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROBOT SIMULATOR MODAL */}
      {robotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">
                    Automated Bank Robot Trigger
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Axis Bank & SBI 0% Fee UPI Notification Listener
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRobotModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              When your Axis Bank or SBI account receives money, your phone SMS/Email forwards the notification to <code className="text-red-500 bg-red-500/10 px-1 py-0.5 rounded font-mono text-[10px]">/api/payment/robot</code>. The robot matches the pending claim, activates the athlete's pass, and sends a WhatsApp receipt with 0 taps.
            </p>

            {/* Quick Simulate Buttons */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                Quick 1-Click Test Scenarios:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFireRobotSimulation('504423123456', 1300, 'Axis Bank')}
                  disabled={isRobotTriggering}
                  className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-left text-xs font-bold text-amber-800 dark:text-amber-300 cursor-pointer transition-all disabled:opacity-50"
                >
                  <span className="block font-black">Axis Bank ₹1,300</span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">UTR: 504423123456</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFireRobotSimulation('908876543210', 4000, 'SBI')}
                  disabled={isRobotTriggering}
                  className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-left text-xs font-bold text-blue-800 dark:text-blue-300 cursor-pointer transition-all disabled:opacity-50"
                >
                  <span className="block font-black">SBI Bank ₹4,000</span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">UTR: 908876543210</span>
                </button>
              </div>
            </div>

            {/* Custom SMS / UTR Inputs */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                Or Paste Custom Bank Notification SMS:
              </span>
              <textarea
                value={robotSmsText}
                onChange={(e) => setRobotSmsText(e.target.value)}
                rows={2}
                placeholder="e.g. Dear UPI user, A/C ... credited by Rs. 1300.00 on 03-11-26 by Monus (UTR: 504423123456)"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={robotUtr}
                  onChange={(e) => setRobotUtr(e.target.value)}
                  placeholder="Or enter 12-digit UTR"
                  className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="number"
                  value={robotAmount}
                  onChange={(e) => setRobotAmount(e.target.value)}
                  placeholder="Amount (e.g. 1300)"
                  className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleFireRobotSimulation()}
                disabled={isRobotTriggering}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRobotTriggering ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Bank Robot Trigger...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Fire Bank Robot Trigger</span>
                  </>
                )}
              </button>
            </div>

            {/* Robot Execution Result */}
            {robotResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono space-y-1 animate-in fade-in duration-200 ${
                  robotResult.matched
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                    : robotResult.error
                    ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                }`}
              >
                {robotResult.matched ? (
                  <>
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>MATCHED & ACTIVATED: {robotResult.fighterName}</span>
                    </div>
                    <div>Pass Valid Till: {new Date(robotResult.newExpiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div>Receipt sent via WhatsApp to athlete!</div>
                  </>
                ) : robotResult.error ? (
                  <div>Error: {robotResult.error}</div>
                ) : (
                  <>
                    <div className="font-bold">Bank Credit Logged (UTR: {robotResult.utr})</div>
                    <div>{robotResult.message}</div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
