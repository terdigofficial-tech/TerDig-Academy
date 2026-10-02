// Logika murni Broadcast pengumuman (Ronde 6).
// Personalisasi template dengan placeholder {nama_anak} dan {nama_wali}.

export interface PersonalizeVars {
  child_name: string;
  parent_name: string;
}

const PLACEHOLDERS: Record<string, keyof PersonalizeVars> = {
  nama_anak: 'child_name',
  nama_wali: 'parent_name',
};

/**
 * Ganti placeholder {nama_anak} / {nama_wali} (case-insensitive, spasi fleksibel).
 * Placeholder tak dikenal dibiarkan apa adanya agar terlihat saat pratinjau.
 */
export function personalize(template: string, vars: PersonalizeVars): string {
  return template.replace(/\{([^}]+)\}/g, (match, raw: string) => {
    const key = raw.trim().toLowerCase().replace(/\s+/g, '_');
    const field = PLACEHOLDERS[key];
    if (!field) return match;
    return (vars[field] || '').trim();
  });
}

/** Daftar placeholder yang dikenali di dalam template. */
export function knownPlaceholders(template: string): string[] {
  const found = new Set<string>();
  for (const m of template.matchAll(/\{([^}]+)\}/g)) {
    const key = m[1].trim().toLowerCase().replace(/\s+/g, '_');
    if (PLACEHOLDERS[key]) found.add(key);
  }
  return [...found];
}

export interface AudienceFilter {
  program_ids: string[];
  grade_ids: string[];
}

export interface AudienceStudent {
  id: string;
  program_id?: string | null;
  grade_id?: string | null;
}

/**
 * Filter penerima: array kosong = semua. Siswa tanpa program/kelas ikut
 * hanya bila filter terkait kosong.
 */
export function filterAudience(students: AudienceStudent[], f: AudienceFilter): AudienceStudent[] {
  return students.filter((s) => {
    const programOk = f.program_ids.length === 0 || (s.program_id != null && f.program_ids.includes(s.program_id));
    const gradeOk = f.grade_ids.length === 0 || (s.grade_id != null && f.grade_ids.includes(s.grade_id));
    return programOk && gradeOk;
  });
}

export interface BroadcastInput {
  title: string;
  message: string;
}

/** Validasi komposer; mengembalikan daftar pesan error (kosong = valid). */
export function validateBroadcast(input: BroadcastInput): string[] {
  const errors: string[] = [];
  if (!input.title || !input.title.trim()) errors.push('Judul broadcast wajib diisi');
  if (!input.message || !input.message.trim()) errors.push('Isi pesan wajib diisi');
  if (input.title && input.title.trim().length > 120) errors.push('Judul maksimal 120 karakter');
  if (input.message && input.message.trim().length > 1500)
    errors.push('Isi pesan maksimal 1500 karakter (batas kenyamanan WhatsApp)');
  return errors;
}

/** Ringkasan progres: {sent, total, percent}. */
export function broadcastProgress(sent: number, total: number): { sent: number; total: number; percent: number } {
  const percent = total === 0 ? 0 : Math.round((sent / total) * 100);
  return { sent, total, percent };
}
