export function TableSkeleton({ rows = 5, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden animate-pulse transition-colors">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-4">
        <div className="flex gap-8">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-6 py-4">
            <div className="flex gap-8 items-center">
              {Array.from({ length: cols }).map((_, c) => (
                <div
                  key={c}
                  className={`h-4 bg-slate-100 dark:bg-slate-700/50 rounded ${['w-3/4', 'w-1/2', 'w-2/3', 'w-4/5', 'w-3/5', 'w-5/6', 'w-2/5'][(r + c) % 7]}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 animate-pulse transition-colors">
      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
      <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded w-1/2 mb-3" />
      <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded w-2/3" />
    </div>
  );
}
