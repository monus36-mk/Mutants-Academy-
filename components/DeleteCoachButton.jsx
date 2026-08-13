'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCoach } from '@/app/actions/coachActions';
import { Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function DeleteCoachButton({ coachId, coachName }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (confirm) {
      const timer = setTimeout(() => setConfirm(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirm]);

  const handleDelete = () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }

    startTransition(async () => {
      const res = await deleteCoach(coachId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete coach');
        setConfirm(false);
      }
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
        confirm
          ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
          : 'bg-slate-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 hover:text-red-600 border border-slate-200 dark:border-zinc-800 hover:border-red-200 dark:hover:border-red-900/50'
      }`}
      title={confirm ? `Confirm deletion of ${coachName}` : `Delete ${coachName}`}
    >
      {isPending ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : confirm ? (
        <>
          <AlertTriangle className="w-3.5 h-3.5" /> Confirm?
        </>
      ) : (
        <>
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </>
      )}
    </button>
  );
}
