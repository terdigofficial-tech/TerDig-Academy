// Logika murni model program tiga lapis TerDig Academy (Ronde 4).
//
// Lapis 1 — Program: produk yang dibeli orang tua (3 program resmi).
// Lapis 2 — Fase kurikulum: jalur episode, DITURUNKAN OTOMATIS dari Kelas siswa
//           (TK–Kelas 2 -> Fase A/pemula; Kelas 3–4 -> Fase B/menengah; Kelas 5–6 -> Fase C/lanjut).
// Lapis 3 — Tier: tingkatan harga sebagai atribut siswa (bukan baris program).

export const TIERS = ['reguler', 'premium', 'privat'] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABELS: Record<Tier, string> = {
  reguler: 'Reguler',
  premium: 'Premium',
  privat: 'Privat',
};

export function isValidTier(v: unknown): v is Tier {
  return typeof v === 'string' && (TIERS as readonly string[]).includes(v);
}

/** Label Indonesia untuk tier; nilai tak dikenal -> '-'. */
export function tierLabel(tier: string | null | undefined): string {
  if (isValidTier(tier)) return TIER_LABELS[tier];
  return '-';
}

export const PROGRAM_PHASE_KEYS = ['fase_a', 'fase_b', 'fase_c'] as const;
export type ProgramPhaseKey = (typeof PROGRAM_PHASE_KEYS)[number];

export function isValidPhaseKey(v: unknown): v is ProgramPhaseKey {
  return typeof v === 'string' && (PROGRAM_PHASE_KEYS as readonly string[]).includes(v);
}

/** Normalisasi input form/API: '' / null / undefined -> null; selain itu harus valid. */
export function normalizePhaseKey(v: unknown): ProgramPhaseKey | null {
  if (v === null || v === undefined || v === '') return null;
  return isValidPhaseKey(v) ? v : null;
}

export const PHASE_KEY_LABELS: Record<ProgramPhaseKey, string> = {
  fase_a: 'Fase A',
  fase_b: 'Fase B',
  fase_c: 'Fase C',
};

export function phaseKeyLabel(k: string | null | undefined): string {
  if (isValidPhaseKey(k)) return PHASE_KEY_LABELS[k];
  return '—';
}

export type CurriculumPhase = 'pemula' | 'menengah' | 'lanjut';

export const CURRICULUM_PHASE_LABELS: Record<CurriculumPhase, string> = {
  pemula: 'Fase A',
  menengah: 'Fase B',
  lanjut: 'Fase C',
};

/** Fase kurikulum dari level kelas (0=PAUD/TK, 1–6=Kelas 1–6 SD). */
export function curriculumPhaseForGradeLevel(level: number): CurriculumPhase | null {
  if (!Number.isInteger(level)) return null;
  if (level >= 0 && level <= 2) return 'pemula';
  if (level >= 3 && level <= 4) return 'menengah';
  if (level >= 5 && level <= 6) return 'lanjut';
  return null;
}

/** Varian berbasis nama kelas ("PAUD/TK", "Kelas 1 SD", ...) untuk kenyamanan UI. */
export function curriculumPhaseForGradeName(name: string | null | undefined): CurriculumPhase | null {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  if (n === 'paud/tk' || n === 'paud' || n === 'tk') return 'pemula';
  const m = n.match(/kelas\s+(\d+)/);
  if (m) return curriculumPhaseForGradeLevel(parseInt(m[1], 10));
  return null;
}

const CURRICULUM_TO_PHASE_KEY: Record<CurriculumPhase, ProgramPhaseKey> = {
  pemula: 'fase_a',
  menengah: 'fase_b',
  lanjut: 'fase_c',
};

export interface ProgramRef {
  id: string;
  // Dilonggarkan ke string opsional agar data mentah API (tak bertipe ketat) bisa langsung dipakai.
  phase_key?: string | null;
}

/**
 * Saran program untuk satu kelas: program yang phase_key-nya cocok dengan fase
 * kurikulum kelas tersebut. Mengembalikan id program atau null bila tak ada yang cocok
 * (mis. Kelas Kreator Cilik phase_key-nya null sehingga tak pernah tersaran otomatis).
 */
export function suggestProgramIdForGradeLevel(
  level: number,
  programs: ProgramRef[],
): string | null {
  const phase = curriculumPhaseForGradeLevel(level);
  if (!phase) return null;
  const want = CURRICULUM_TO_PHASE_KEY[phase];
  const hit = programs.find((p) => p.phase_key === want);
  return hit ? hit.id : null;
}
