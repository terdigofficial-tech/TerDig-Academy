import { describe, it, expect } from 'vitest';
import {
  TIERS,
  TIER_LABELS,
  isValidTier,
  tierLabel,
  PROGRAM_PHASE_KEYS,
  isValidPhaseKey,
  normalizePhaseKey,
  phaseKeyLabel,
  curriculumPhaseForGradeLevel,
  curriculumPhaseForGradeName,
  suggestProgramIdForGradeLevel,
} from '../programs';

describe('tier', () => {
  it('mengenali tiga tier resmi', () => {
    expect(TIERS).toEqual(['reguler', 'premium', 'privat']);
    expect(isValidTier('reguler')).toBe(true);
    expect(isValidTier('premium')).toBe(true);
    expect(isValidTier('privat')).toBe(true);
  });

  it('menolak nilai tier tak dikenal', () => {
    expect(isValidTier('gold')).toBe(false);
    expect(isValidTier('')).toBe(false);
    expect(isValidTier(null)).toBe(false);
    expect(isValidTier(undefined)).toBe(false);
    expect(isValidTier(1)).toBe(false);
  });

  it('tierLabel mengembalikan label Indonesia atau strip', () => {
    expect(tierLabel('reguler')).toBe('Reguler');
    expect(tierLabel('premium')).toBe('Premium');
    expect(tierLabel('privat')).toBe('Privat');
    expect(tierLabel('gold')).toBe('-');
    expect(tierLabel(null)).toBe('-');
    expect(TIER_LABELS.reguler).toBe('Reguler');
  });
});

describe('phase_key program', () => {
  it('tiga kunci fase valid', () => {
    expect(PROGRAM_PHASE_KEYS).toEqual(['fase_a', 'fase_b', 'fase_c']);
    expect(isValidPhaseKey('fase_a')).toBe(true);
    expect(isValidPhaseKey('fase_x')).toBe(false);
  });

  it('normalizePhaseKey: kosong -> null, valid dipertahankan', () => {
    expect(normalizePhaseKey('')).toBe(null);
    expect(normalizePhaseKey(null)).toBe(null);
    expect(normalizePhaseKey(undefined)).toBe(null);
    expect(normalizePhaseKey('fase_b')).toBe('fase_b');
    expect(normalizePhaseKey('fase_x')).toBe(null);
  });

  it('phaseKeyLabel', () => {
    expect(phaseKeyLabel('fase_a')).toBe('Fase A');
    expect(phaseKeyLabel('fase_c')).toBe('Fase C');
    expect(phaseKeyLabel(null)).toBe('—');
    expect(phaseKeyLabel('fase_x')).toBe('—');
  });
});

describe('fase kurikulum dari kelas', () => {
  it('level 0–2 -> pemula (Fase A)', () => {
    expect(curriculumPhaseForGradeLevel(0)).toBe('pemula');
    expect(curriculumPhaseForGradeLevel(1)).toBe('pemula');
    expect(curriculumPhaseForGradeLevel(2)).toBe('pemula');
  });

  it('level 3–4 -> menengah (Fase B); level 5–6 -> lanjut (Fase C)', () => {
    expect(curriculumPhaseForGradeLevel(3)).toBe('menengah');
    expect(curriculumPhaseForGradeLevel(4)).toBe('menengah');
    expect(curriculumPhaseForGradeLevel(5)).toBe('lanjut');
    expect(curriculumPhaseForGradeLevel(6)).toBe('lanjut');
  });

  it('level di luar 0–6 -> null', () => {
    expect(curriculumPhaseForGradeLevel(-1)).toBe(null);
    expect(curriculumPhaseForGradeLevel(7)).toBe(null);
    expect(curriculumPhaseForGradeLevel(2.5)).toBe(null);
    expect(curriculumPhaseForGradeLevel(NaN)).toBe(null);
  });

  it('nama kelas umum terpetakan benar', () => {
    expect(curriculumPhaseForGradeName('PAUD/TK')).toBe('pemula');
    expect(curriculumPhaseForGradeName('Kelas 1 SD')).toBe('pemula');
    expect(curriculumPhaseForGradeName('Kelas 2 SD')).toBe('pemula');
    expect(curriculumPhaseForGradeName('Kelas 3 SD')).toBe('menengah');
    expect(curriculumPhaseForGradeName('Kelas 4 SD')).toBe('menengah');
    expect(curriculumPhaseForGradeName('Kelas 5 SD')).toBe('lanjut');
    expect(curriculumPhaseForGradeName('Kelas 6 SD')).toBe('lanjut');
    expect(curriculumPhaseForGradeName('  kelas 3 sd ')).toBe('menengah');
    expect(curriculumPhaseForGradeName('SMA')).toBe(null);
    expect(curriculumPhaseForGradeName(null)).toBe(null);
  });
});

describe('suggestProgramIdForGradeLevel', () => {
  const programs = [
    { id: 'p-calistung', phase_key: 'fase_a' as const },
    { id: 'p-ipas', phase_key: 'fase_b' as const },
    { id: 'p-kreator', phase_key: null },
  ];

  it('menyarankan program sesuai fase kelas', () => {
    expect(suggestProgramIdForGradeLevel(0, programs)).toBe('p-calistung');
    expect(suggestProgramIdForGradeLevel(2, programs)).toBe('p-calistung');
    expect(suggestProgramIdForGradeLevel(3, programs)).toBe('p-ipas');
    expect(suggestProgramIdForGradeLevel(4, programs)).toBe('p-ipas');
  });

  it('null bila fase belum punya program (Fase C) atau level tak dikenal', () => {
    expect(suggestProgramIdForGradeLevel(5, programs)).toBe(null);
    expect(suggestProgramIdForGradeLevel(6, programs)).toBe(null);
    expect(suggestProgramIdForGradeLevel(99, programs)).toBe(null);
    expect(suggestProgramIdForGradeLevel(3, [])).toBe(null);
  });
});
