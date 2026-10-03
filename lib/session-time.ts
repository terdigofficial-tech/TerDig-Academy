/**
 * Logika murni jam sesi & deteksi bentrok jadwal — tanpa dependensi Supabase.
 * Dua sesi di tanggal yang sama dengan jam beririsan dianggap bentrok
 * hanya bila berada di ruangan yang sama (ruangan kosong dianggap
 * "ruang default" yang sama).
 */

export interface SessionSlot {
  id?: string;
  title?: string;
  date: string; // 'YYYY-MM-DD'
  start_time?: string | null; // 'HH:MM' atau 'HH:MM:SS'
  end_time?: string | null;
  status?: string;
  room?: string | null;
}

/** Normalisasi 'HH:MM:SS' -> 'HH:MM'; null bila kosong. */
export function normalizeTime(value?: string | null): string | null {
  if (!value) return null;
  const m = /^(\d{2}):(\d{2})/.exec(value);
  return m ? `${m[1]}:${m[2]}` : null;
}

export function isValidTimeRange(
  start?: string | null,
  end?: string | null,
): boolean {
  const s = normalizeTime(start);
  const e = normalizeTime(end);
  if (!s && !e) return true; // jam opsional
  if (!s || !e) return false; // harus sepasang
  return e > s;
}

/** Irisan dua rentang jam 'HH:MM' (ujung tidak inklusif: 10:00-11:00 vs 11:00-12:00 aman). */
export function timesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Cari sesi lain yang bentrok dengan kandidat. Mengembalikan sesi yang
 * bentrok pertama, atau null. Sesi cancelled, sesi tanpa jam, dan sesi di
 * ruangan berbeda diabaikan.
 */
export function findSessionConflict(
  candidate: SessionSlot,
  existing: SessionSlot[],
): SessionSlot | null {
  const cStart = normalizeTime(candidate.start_time);
  const cEnd = normalizeTime(candidate.end_time);
  if (!cStart || !cEnd) return null;

  for (const s of existing) {
    if (s.status === 'cancelled') continue;
    if (candidate.id && s.id === candidate.id) continue;
    if (s.date !== candidate.date) continue;
    if (!roomsMatch(candidate.room, s.room)) continue;
    const sStart = normalizeTime(s.start_time);
    const sEnd = normalizeTime(s.end_time);
    if (!sStart || !sEnd) continue;
    if (timesOverlap(cStart, cEnd, sStart, sEnd)) return s;
  }
  return null;
}

/**
 * Dua ruangan dianggap sama bila keduanya kosong (ruang default) atau
 * teksnya sama setelah dinormalisasi (trim + lowercase).
 */
export function roomsMatch(a?: string | null, b?: string | null): boolean {
  const na = (a || '').trim().toLowerCase();
  const nb = (b || '').trim().toLowerCase();
  return na === nb;
}

/** '14:00' + '15:30' -> '14.00–15.30'; kosong bila jam tidak lengkap. */
export function formatTimeRange(
  start?: string | null,
  end?: string | null,
): string {
  const s = normalizeTime(start);
  const e = normalizeTime(end);
  if (!s || !e) return '';
  return `${s.replace(':', '.')}–${e.replace(':', '.')}`;
}
