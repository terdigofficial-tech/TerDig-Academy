interface StatusBadgeProps {
  status: 'not_started' | 'in_progress' | 'published' | 'archived' | 'scheduled' | 'completed' | 'cancelled';
}

const STATUS_MAP: Record<string, { label: string; classes: string; emoji?: string }> = {
  // Episode statuses
  not_started: { label: 'Belum Dimulai', classes: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  in_progress: { label: 'Dalam Progres', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  published: { label: 'Published', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  archived: { label: 'Archived', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  // Session statuses
  scheduled: { label: 'Terjadwal', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', emoji: '📅' },
  completed: { label: 'Selesai', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', emoji: '✅' },
  cancelled: { label: 'Dibatalkan', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', emoji: '❌' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_MAP[status];
  // Fallback: jika status tidak dikenali, tampilkan apa adanya
  if (!config) {
    const label = status.replace(/_/g, ' ');
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize">
        {label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.emoji && <span>{config.emoji}</span>}
      {config.label}
    </span>
  );
}
