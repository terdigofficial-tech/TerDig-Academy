export default function LoadingSkeleton() {
  return (
    <div className="container mx-auto p-6">
      <div className="animate-pulse space-y-6">
        {/* Back button skeleton */}
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>

        {/* Title skeleton */}
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video skeleton */}
            <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700 p-6">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-4"></div>
              <div className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            </div>
            {/* Files skeleton */}
            <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700 p-6">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-36 mb-4"></div>
              <div className="space-y-3">
                <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
              </div>
            </div>
          </div>
          {/* Right column */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700 p-6">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
