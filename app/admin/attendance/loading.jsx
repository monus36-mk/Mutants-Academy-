export default function AttendanceLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-24 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="h-20 rounded-2xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800"
          />
        ))}
      </div>
      <div className="h-20 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
      <div className="h-96 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
    </div>
  );
}

