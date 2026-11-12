export default function EventsBoardLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-pulse">
      <div className="h-96 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
      <div className="lg:col-span-2 xl:col-span-3 space-y-4">
        <div className="h-36 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
        <div className="h-36 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
      </div>
    </div>
  );
}

