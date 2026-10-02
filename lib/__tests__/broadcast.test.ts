import { describe, it, expect } from 'vitest';
import {
  personalize,
  knownPlaceholders,
  filterAudience,
  validateBroadcast,
  broadcastProgress,
} from '../broadcast';

describe('personalize', () => {
  it('mengganti {nama_anak} dan {nama_wali}', () => {
    const out = personalize('Halo {nama_anak}, sampaikan ke {nama_wali} ya.', {
      child_name: 'Budi',
      parent_name: 'Pak Andi',
    });
    expect(out).toBe('Halo Budi, sampaikan ke Pak Andi ya.');
  });

  it('toleran kapital & spasi: {Nama Anak}, { NAMA_WALI }', () => {
    const out = personalize('{Nama Anak} - { NAMA_WALI }', {
      child_name: 'Budi',
      parent_name: 'Ibu Sari',
    });
    expect(out).toBe('Budi - Ibu Sari');
  });

  it('placeholder tak dikenal dibiarkan', () => {
    const out = personalize('Diskon {kode} untuk {nama_anak}', {
      child_name: 'Budi',
      parent_name: 'Pak Andi',
    });
    expect(out).toBe('Diskon {kode} untuk Budi');
  });

  it('nilai kosong -> string kosong', () => {
    expect(personalize('Halo {nama_anak}', { child_name: '', parent_name: '' })).toBe('Halo ');
  });
});

describe('knownPlaceholders', () => {
  it('mendeteksi placeholder yang dikenali', () => {
    expect(knownPlaceholders('Halo {nama_anak}, {nama_wali}, {kode}')).toEqual(['nama_anak', 'nama_wali']);
    expect(knownPlaceholders('tanpa placeholder')).toEqual([]);
  });
});

describe('filterAudience', () => {
  const students = [
    { id: 'a', program_id: 'p1', grade_id: 'g1' },
    { id: 'b', program_id: 'p2', grade_id: 'g1' },
    { id: 'c', program_id: 'p1', grade_id: null },
  ];

  it('filter kosong = semua', () => {
    expect(filterAudience(students, { program_ids: [], grade_ids: [] })).toHaveLength(3);
  });

  it('filter per program', () => {
    expect(filterAudience(students, { program_ids: ['p1'], grade_ids: [] }).map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('filter kombinasi program + kelas', () => {
    expect(filterAudience(students, { program_ids: ['p1'], grade_ids: ['g1'] }).map((s) => s.id)).toEqual(['a']);
  });

  it('siswa tanpa kelas tersaring bila filter kelas diisi', () => {
    expect(filterAudience(students, { program_ids: [], grade_ids: ['g1'] }).map((s) => s.id)).toEqual(['a', 'b']);
  });
});

describe('validateBroadcast', () => {
  it('valid bila judul & isi terisi', () => {
    expect(validateBroadcast({ title: 'Libur', message: 'Halo' })).toEqual([]);
  });

  it('menolak judul/isi kosong dan kepanjangan', () => {
    expect(validateBroadcast({ title: '', message: 'x' }).length).toBeGreaterThan(0);
    expect(validateBroadcast({ title: 'x', message: '' }).length).toBeGreaterThan(0);
    expect(validateBroadcast({ title: 'x'.repeat(121), message: 'y' }).length).toBeGreaterThan(0);
    expect(validateBroadcast({ title: 'x', message: 'y'.repeat(1501) }).length).toBeGreaterThan(0);
  });
});

describe('broadcastProgress', () => {
  it('persen dibulatkan, aman untuk total 0', () => {
    expect(broadcastProgress(1, 3)).toEqual({ sent: 1, total: 3, percent: 33 });
    expect(broadcastProgress(0, 0)).toEqual({ sent: 0, total: 0, percent: 0 });
    expect(broadcastProgress(5, 5).percent).toBe(100);
  });
});
