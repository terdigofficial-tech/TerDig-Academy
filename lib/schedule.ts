/**
 * Logika jadwal mingguan berulang — fungsi murni tanpa dependensi Supabase.
 *
 * Konsep: "Jadwal Rutin" adalah pola (mis. Kelas A setiap Senin & Kamis
 * 15.00–16.00 di Ruang 1). Admin men-generate pola menjadi baris sesi nyata
 * untuk rentang tanggal tertentu via API.
 */

/** Label hari: index 0 = Minggu, sesuai Date.getDay(). */
export const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const;

/** Batas maksimum rentang generate: 26 minggu (1 semester). */
export const MAX_GENERATE_WEEKS = 26;

/**
 * Kembangkan pola hari mingguan menjadi daftar tanggal 'YYYY-MM-DD'
 * pada rentang [from, until] (inklusif). daysOfWeek berisi 0–6.
 */
export function expandWeeklyDates(
  daysOfWeek: number[],
  from: string,
  until: string,
): string[] {
  const days = new Set(daysOfWeek.filter((d) => d >= 0 && d <= 6));
  if (days.size === 0) return [];

  const start = parseDate(from);
  const end = parseDate(until);
  if (!start || !end || end < start) return [];

  const out: string[] = [];
  const cur = new Date(start);
  // Pengaman: jangan iterasi lebih dari 2 tahun
  let guard = 0;
  while (cur <= end && guard < 731) {
    if (days.has(cur.getDay())) out.push(formatDate(cur));
    cur.setDate(cur.getDate() + 1);
    guard += 1;
  }
  return out;
}

/** 'Sen, Rab' dari [1, 3]. */
export function formatDays(daysOfWeek: number[]): string {
  return [...daysOfWeek]
    .filter((d) => d >= 0 && d <= 6)
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(', ');
}

/** Jumlah minggu (pembulatan ke atas) antara dua tanggal, untuk validasi batas. */
export function weeksBetween(from: string, until: string): number {
  const start = parseDate(from);
  const end = parseDate(until);
  if (!start || !end || end < start) return 0;
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.ceil(days / 7);
}

function parseDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
