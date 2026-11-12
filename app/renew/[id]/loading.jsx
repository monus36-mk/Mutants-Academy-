export default function RenewPageLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 h-72 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
          <div className="lg:col-span-7 h-96 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
        </div>
      </div>
    </div>
  );
}

