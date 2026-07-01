interface LevelBadgeProps {
  level: 'pemula' | 'menengah' | 'lanjut';
}

const LEVEL_MAP: Record<string, { label: string; classes: string }> = {
  pemula: { label: 'Pemula', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  menengah: { label: 'Menengah', classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  lanjut: { label: 'Lanjut', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

export default function LevelBadge({ level }: LevelBadgeProps) {
  const config = LEVEL_MAP[level] || LEVEL_MAP.pemula;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  );
}
