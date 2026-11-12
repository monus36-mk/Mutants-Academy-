export default function PaymentsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-20 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className={`h-24 rounded-2xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 ${
              idx === 4 ? 'col-span-2 md:col-span-1' : ''
            }`}
          />
        ))}
      </div>
      <div className="h-16 rounded-2xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
      <div className="h-80 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
    </div>
  );
}

