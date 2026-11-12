export default function NoticesBoardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-24 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="h-44 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800"
          />
        ))}
      </div>
    </div>
  );
}

