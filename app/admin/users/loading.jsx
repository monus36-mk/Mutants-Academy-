export default function CoachesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-16 rounded-2xl bg-slate-200 dark:bg-zinc-900/60" />
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <div className="h-80 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
        <div className="lg:col-span-2 xl:col-span-3 h-96 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
      </div>
    </div>
  );
}

