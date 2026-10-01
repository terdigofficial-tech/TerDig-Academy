import { describe, it, expect } from 'vitest';
import { mapSheetRows, parseDurationMinutes, cleanText } from '@/lib/episode-import';

describe('parseDurationMinutes', () => {
  it('memparse format mm:ss', () => {
    expect(parseDurationMinutes('04:00')).toBe(4);
    expect(parseDurationMinutes('04:30')).toBe(5); // 4.5 -> setengah ke atas
    expect(parseDurationMinutes('03:30')).toBe(4);
    expect(parseDurationMinutes('07:30')).toBe(8);
  });
  it('memparse pecahan hari Excel (sel waktu)', () => {
    expect(parseDurationMinutes(6 / 1440)).toBe(6);
  });
  it('menolak nilai kosong/tidak valid', () => {
    expect(parseDurationMinutes('')).toBeUndefined();
    expect(parseDurationMinutes(null)).toBeUndefined();
    expect(parseDurationMinutes('abc')).toBeUndefined();
  });
});

describe('cleanText', () => {
  it('membuang penanda bold markdown', () => {
    expect(cleanText('**REVIEW LEVEL 1**')).toBe('REVIEW LEVEL 1');
    expect(cleanText('N=**Nanas** manis')).toBe('N=Nanas manis');
  });
});

describe('mapSheetRows — layout Fase A', () => {
  const rows = [
    ['Episode', 'Level', 'Judul Video', 'Konten/Topik (SUDAH DIREVISI)', 'Pause Points', 'Worksheet Cue', 'Durasi', 'Keyword SEO Utama'],
    [1, 1, 'Mengenal Huruf A B C D E', 'A=Apel, B=Belimbing', 5, 'Hal 1-3', '04:00', 'belajar huruf TK'],
    [13, 2, 'Suku Kata BA-BI-BU-BE-BO', 'BOLA, BIBI, BUKU', 6, 'Hal 36-38', '04:30', 'suku kata ba'],
  ];
  it('memetakan nomor apa adanya, level pemula, tema Calistung', () => {
    const { mapped, invalid } = mapSheetRows('A', rows);
    expect(invalid).toHaveLength(0);
    expect(mapped).toHaveLength(2);
    expect(mapped[0].payload.episode_number).toBe(1);
    expect(mapped[0].payload.terdig_level).toBe('pemula');
    expect(mapped[0].payload.theme).toBe('Calistung');
    expect(mapped[0].payload.duration_minutes).toBe(4);
    expect(mapped[1].payload.episode_number).toBe(13);
    expect(mapped[1].payload.roadmap_level).toBe(2);
  });
  it('menyimpan konten, pause points, dan worksheet cue ke notes', () => {
    const { mapped } = mapSheetRows('A', rows);
    expect(mapped[0].payload.notes).toContain('Konten: A=Apel');
    expect(mapped[0].payload.notes).toContain('Pause Points: 5');
    expect(mapped[0].payload.notes).toContain('Worksheet: Hal 1-3');
  });
});

describe('mapSheetRows — layout Fase B', () => {
  const rows = [
    ['Ep', 'Level', 'Mapel', 'Judul Video', 'Konten/Topik (Spesifik & Terukur)', 'Target Usia', 'Durasi', 'Keyword SEO Utama'],
    ['**1**', 1, 'Matematika', 'Mengenal Bilangan 100-500', 'Visual dengan uang', 'Kelas 3-4 SD', '06:00', 'bilangan 100-500'],
    [72, 3, 'B.Indo & Mat', '**GRAND FINALE**', 'Presentasi proyek', 'Kelas 3-4 SD', '10:00', 'proyek finale'],
  ];
  it('menggeser nomor +60 dan memakai Mapel sebagai tema', () => {
    const { mapped, invalid } = mapSheetRows('B', rows);
    expect(invalid).toHaveLength(0);
    expect(mapped[0].payload.episode_number).toBe(61);
    expect(mapped[0].payload.terdig_level).toBe('menengah');
    expect(mapped[0].payload.theme).toBe('Matematika');
    expect(mapped[1].payload.episode_number).toBe(132);
    expect(mapped[1].payload.title).toBe('GRAND FINALE');
  });
});

describe('mapSheetRows — baris tidak valid', () => {
  it('menandai baris tanpa judul dan melewati baris kosong', () => {
    const rows = [
      ['Episode', 'Level', 'Judul Video', 'Konten/Topik', 'Pause Points', 'Worksheet Cue', 'Durasi', 'Keyword SEO Utama'],
      [5, 1, '', 'Konten tanpa judul', 5, 'Hal 1', '04:00', 'seo'],
      [null, null, null, null, null, null, null, null],
    ];
    const { mapped, invalid } = mapSheetRows('A', rows as unknown[][]);
    expect(mapped).toHaveLength(0);
    expect(invalid).toHaveLength(1);
    expect(invalid[0].reason).toContain('judul kosong');
  });
});
