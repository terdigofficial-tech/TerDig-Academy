/**
 * Penegakan kapasitas sesi.
 *
 * Desain roster aplikasi: siswa otomatis masuk daftar sesi berdasarkan
 * kecocokan target_level sesi dengan jenjang kelas siswa (tidak ada tabel
 * pendaftaran eksplisit). "Memasukkan siswa ke sesi" berarti siswa tercatat
 * pada absensi/penilaian sesi tersebut.
 *
 * Aturan:
 * - Roster sesi dibatasi sebanyak `capacity` siswa (urut abjad nama agar deterministik).
 * - Siswa di luar kapasitas dilaporkan sebagai overflow (jumlah + nama) agar
 *   admin bisa memindahkan mereka ke sesi lain atau menaikkan kapasitas.
 * - Penyimpanan absensi/penilaian di server menolak record untuk siswa di luar roster.
 */

// Mapping level pendidikan sesi -> grade levels di tabel grades
export const LEVEL_TO_GRADES: Record<string, number[]> = {
  pemula: [0, 1, 2], // TK, Kelas 1, Kelas 2
  menengah: [3, 4], // Kelas 3, Kelas 4
  lanjut: [5, 6], // Kelas 5, Kelas 6
};

export interface CapacityOverflow {
  count: number;
  names: string[];
}

export interface CapacitySplit<T> {
  /** Siswa yang masuk daftar sesi (maksimal `capacity`). */
  roster: T[];
  /** Siswa aktif yang tidak muat dalam kapasitas. */
  overflow: CapacityOverflow;
}

/**
 * Bagi daftar siswa menjadi roster (dibatasi kapasitas) dan overflow.
 * Urutan roster deterministik: abjad nama (id-ID), lalu id sebagai tie-breaker.
 * capacity null/undefined/<1 dianggap tidak dibatasi (fallback aman).
 */
export function applySessionCapacity<T extends { id: string; full_name: string }>(
  students: T[],
  capacity: number | null | undefined,
): CapacitySplit<T> {
  const sorted = [...students].sort(
    (a, b) =>
      a.full_name.localeCompare(b.full_name, 'id') || a.id.localeCompare(b.id),
  );

  if (!capacity || capacity < 1) {
    return { roster: sorted, overflow: { count: 0, names: [] } };
  }

  const roster = sorted.slice(0, capacity);
  const rest = sorted.slice(capacity);
  return {
    roster,
    overflow: { count: rest.length, names: rest.map((s) => s.full_name) },
  };
}

/** Ambil himpunan id siswa yang berhak masuk sesi (roster setelah capping). */
export function getRosterIds<T extends { id: string; full_name: string }>(
  students: T[],
  capacity: number | null | undefined,
): Set<string> {
  return new Set(applySessionCapacity(students, capacity).roster.map((s) => s.id));
}

/**
 * Ambil roster id langsung dari database untuk satu sesi.
 * Dipakai penegakan kapasitas di sisi server (mis. saat menyimpan absensi).
 * `supabase` adalah server client; parameter diketik longgar agar file ini
 * tetap bisa dipakai tanpa mengimpor modul server-only.
 */
export async function fetchSessionRosterIds(
  supabase: { from(table: string): any },
  targetLevel: string | null | undefined,
  capacity: number | null | undefined,
): Promise<Set<string>> {
  const gradeLevels = (targetLevel && LEVEL_TO_GRADES[targetLevel]) || [];
  if (gradeLevels.length === 0) return new Set();

  const { data } = await supabase
    .from('students')
    .select('id, full_name, grades!inner(level)')
    .in('grades.level', gradeLevels)
    .eq('status', 'active');

  return getRosterIds((data || []) as { id: string; full_name: string }[], capacity);
}
