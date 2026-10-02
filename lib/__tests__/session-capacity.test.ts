import { describe, it, expect } from 'vitest';
import { applySessionCapacity, getRosterIds } from '../session-capacity';

const mk = (names: string[]) => names.map((full_name, i) => ({ id: `s${i}`, full_name }));

describe('applySessionCapacity', () => {
  it('tidak membatasi saat capacity null/undefined/<1', () => {
    const students = mk(['Budi', 'Ani', 'Cici']);
    for (const cap of [null, undefined, 0, -3]) {
      const { roster, overflow } = applySessionCapacity(students, cap as any);
      expect(roster).toHaveLength(3);
      expect(overflow.count).toBe(0);
      expect(overflow.names).toEqual([]);
    }
  });

  it('roster pas kapasitas tanpa overflow', () => {
    const { roster, overflow } = applySessionCapacity(mk(['Budi', 'Ani']), 2);
    expect(roster).toHaveLength(2);
    expect(overflow.count).toBe(0);
  });

  it('memotong roster sesuai kapasitas dan melaporkan overflow', () => {
    const students = mk(['Dedi', 'Budi', 'Ani', 'Cici', 'Eko']);
    const { roster, overflow } = applySessionCapacity(students, 3);
    // urut abjad deterministik: Ani, Budi, Cici masuk; Dedi, Eko overflow
    expect(roster.map((s) => s.full_name)).toEqual(['Ani', 'Budi', 'Cici']);
    expect(overflow.count).toBe(2);
    expect(overflow.names).toEqual(['Dedi', 'Eko']);
  });

  it('deterministik meski urutan input acak', () => {
    const a = applySessionCapacity(mk(['Eko', 'Ani', 'Dedi', 'Budi', 'Cici']), 2);
    const b = applySessionCapacity(mk(['Budi', 'Cici', 'Ani', 'Eko', 'Dedi']), 2);
    // bandingkan berdasarkan nama (id dibuat dari urutan input, jadi tidak sebanding)
    expect(a.roster.map((s) => s.full_name)).toEqual(b.roster.map((s) => s.full_name));
    expect(a.roster.map((s) => s.full_name)).toEqual(['Ani', 'Budi']);
    expect(a.overflow.names).toEqual(b.overflow.names);
  });

  it('daftar kosong tetap aman', () => {
    const { roster, overflow } = applySessionCapacity([], 8);
    expect(roster).toEqual([]);
    expect(overflow.count).toBe(0);
  });
});

describe('getRosterIds', () => {
  it('mengembalikan himpunan id roster saja', () => {
    const ids = getRosterIds(mk(['B', 'A', 'C']), 2);
    // roster: A(s1), B(s0)
    expect(ids).toEqual(new Set(['s1', 's0']));
  });
});
