export default function FighterLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-16 rounded-2xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
        <div className="h-44 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-52 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
          <div className="h-52 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
        </div>
      </div>
    </div>
  );
}

