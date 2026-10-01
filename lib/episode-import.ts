// Pemetaan baris Excel roadmap kurikulum -> payload episode aplikasi.
// Mendukung dua layout sheet roadmap TerDig:
//  - Layout A: Episode | Level | Judul Video | Konten/Topik | Pause Points | Worksheet Cue | Durasi | Keyword SEO Utama
//  - Layout B: Ep | Level | Mapel | Judul Video | Konten/Topik | Target Usia | Durasi | Keyword SEO Utama
// Penomoran global kurikulum: Fase A = 1-60, Fase B = 61-132, Fase C = 133+.

export type Fase = 'A' | 'B' | 'C';

export interface EpisodeImportPayload {
  episode_number: number;
  title: string;
  terdig_level: 'pemula' | 'menengah' | 'lanjut';
  roadmap_level: number;
  duration_minutes?: number;
  target_age?: string;
  theme?: string;
  keyword_seo?: string;
  notes?: string;
  activity_links: [];
}

export interface MappedRow {
  fase: Fase;
  payload: EpisodeImportPayload;
}

export interface InvalidRow {
  sheet: string;
  rowIndex: number;
  reason: string;
}

export const FASE_OFFSET: Record<Fase, number> = { A: 0, B: 60, C: 132 };
export const FASE_TERDIG_LEVEL: Record<Fase, EpisodeImportPayload['terdig_level']> = {
  A: 'pemula',
  B: 'menengah',
  C: 'lanjut',
};
export const FASE_DEFAULT_AGE: Record<Fase, string> = {
  A: 'TK - Kelas 2 SD',
  B: 'Kelas 3-4 SD',
  C: 'Kelas 5-6 SD',
};

export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\*\*/g, '') // buang penanda bold markdown dari file roadmap
    .replace(/\s+/g, ' ')
    .trim();
}

/** Durasi roadmap ("04:30", "4:30", pecahan hari Excel, atau menit) -> menit (pembulatan setengah ke atas). */
export function parseDurationMinutes(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') {
    if (!isFinite(value) || value <= 0) return undefined;
    // Nilai < 1 dari sel waktu Excel = pecahan hari
    const minutes = value < 1 ? value * 24 * 60 : value;
    return Math.max(1, Math.floor(minutes + 0.5));
  }
  const text = String(value).trim();
  const colon = text.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colon) {
    const totalSeconds =
      colon[3] !== undefined
        ? Number(colon[1]) * 3600 + Number(colon[2]) * 60 + Number(colon[3])
        : Number(colon[1]) * 60 + Number(colon[2]);
    return Math.max(1, Math.floor(totalSeconds / 60 + 0.5));
  }
  const numeric = Number(text.replace(',', '.'));
  if (!isNaN(numeric) && numeric > 0) return Math.max(1, Math.floor(numeric + 0.5));
  return undefined;
}

function normalizeHeader(value: unknown): string {
  return cleanText(value).toLowerCase();
}

interface ColumnMap {
  episode: number;
  level: number;
  title: number;
  content: number;
  mapel: number;
  pause: number;
  worksheet: number;
  duration: number;
  seo: number;
  targetAge: number;
}

function detectColumns(headers: unknown[]): ColumnMap | null {
  const h = headers.map(normalizeHeader);
  const find = (pred: (x: string) => boolean) => h.findIndex(pred);
  const cols: ColumnMap = {
    episode: find((x) => x === 'episode' || x === 'ep' || x === 'no' || x === 'nomor'),
    level: find((x) => x === 'level'),
    title: find((x) => x.includes('judul')),
    content: find((x) => x.startsWith('konten') || x.startsWith('topik')),
    mapel: find((x) => x === 'mapel' || x === 'mata pelajaran'),
    pause: find((x) => x.includes('pause')),
    worksheet: find((x) => x.includes('worksheet')),
    duration: find((x) => x.includes('durasi')),
    seo: find((x) => x.includes('seo')),
    targetAge: find((x) => x.includes('target usia') || x.includes('usia')),
  };
  if (cols.episode < 0 || cols.level < 0 || cols.title < 0) return null;
  return cols;
}

function faseFromSheetName(sheetName: string, cols: ColumnMap): Fase {
  const name = sheetName.trim().toUpperCase();
  if (name === 'A' || name.startsWith('FASE A')) return 'A';
  if (name === 'B' || name.startsWith('FASE B')) return 'B';
  if (name === 'C' || name.startsWith('FASE C')) return 'C';
  // Tebakan dari layout: ada kolom Mapel -> pola Fase B; ada Worksheet Cue -> pola Fase A
  if (cols.mapel >= 0) return 'B';
  if (cols.worksheet >= 0) return 'A';
  return 'A';
}

/**
 * Petakan satu sheet (array-of-arrays, baris pertama = header) menjadi payload episode.
 * Nomor episode digeser sesuai offset fase (B: +60, C: +132) mengikuti penomoran global.
 */
export function mapSheetRows(
  sheetName: string,
  rows: unknown[][],
  faseOverride?: Fase
): { mapped: MappedRow[]; invalid: InvalidRow[] } {
  const mapped: MappedRow[] = [];
  const invalid: InvalidRow[] = [];
  if (!rows || rows.length < 2) return { mapped, invalid };

  const cols = detectColumns(rows[0]);
  if (!cols) {
    invalid.push({ sheet: sheetName, rowIndex: 1, reason: 'Header tidak dikenali (butuh kolom Episode/Ep, Level, Judul)' });
    return { mapped, invalid };
  }
  const fase = faseOverride || faseFromSheetName(sheetName, cols);
  const offset = FASE_OFFSET[fase];
  const cell = (row: unknown[], idx: number) => (idx >= 0 && idx < row.length ? row[idx] : undefined);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const rawNumber = cell(row, cols.episode);
    const localNumber =
      typeof rawNumber === 'number' ? rawNumber : parseInt(cleanText(rawNumber).replace(/[^0-9]/g, ''), 10);
    const title = cleanText(cell(row, cols.title));
    const levelRaw = cell(row, cols.level);
    const level = typeof levelRaw === 'number' ? levelRaw : parseInt(cleanText(levelRaw), 10);

    if (!title && (rawNumber === undefined || cleanText(rawNumber) === '')) continue; // baris kosong
    if (isNaN(localNumber) || localNumber < 1) {
      invalid.push({ sheet: sheetName, rowIndex: i + 1, reason: 'Nomor episode tidak valid' });
      continue;
    }
    if (!title) {
      invalid.push({ sheet: sheetName, rowIndex: i + 1, reason: `Episode ${localNumber}: judul kosong` });
      continue;
    }
    if (isNaN(level) || level < 1 || level > 5) {
      invalid.push({ sheet: sheetName, rowIndex: i + 1, reason: `Episode ${localNumber}: level roadmap tidak valid` });
      continue;
    }

    const content = cleanText(cell(row, cols.content));
    const pause = cleanText(cell(row, cols.pause));
    const worksheet = cleanText(cell(row, cols.worksheet));
    const noteParts: string[] = [];
    if (content) noteParts.push(`Konten: ${content}`);
    if (pause) noteParts.push(`Pause Points: ${pause}`);
    if (worksheet) noteParts.push(`Worksheet: ${worksheet}`);

    const mapel = cleanText(cell(row, cols.mapel));
    const targetAge = cleanText(cell(row, cols.targetAge)) || FASE_DEFAULT_AGE[fase];

    const payload: EpisodeImportPayload = {
      episode_number: offset + localNumber,
      title,
      terdig_level: FASE_TERDIG_LEVEL[fase],
      roadmap_level: level,
      duration_minutes: parseDurationMinutes(cell(row, cols.duration)),
      target_age: targetAge,
      theme: fase === 'A' ? 'Calistung' : mapel || undefined,
      keyword_seo: cleanText(cell(row, cols.seo)) || undefined,
      notes: noteParts.length ? noteParts.join('\n') : undefined,
      activity_links: [],
    };
    mapped.push({ fase, payload });
  }
  return { mapped, invalid };
}

/** Ringkasan jumlah episode per fase per level untuk pratinjau impor. */
export function summarizeSelection(rows: MappedRow[]): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const r of rows) {
    const key = `${r.fase}-${r.payload.roadmap_level}`;
    summary[key] = (summary[key] || 0) + 1;
  }
  return summary;
}
