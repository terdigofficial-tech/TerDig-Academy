import { describe, it, expect } from 'vitest';
import { expandWeeklyDates, formatDays, weeksBetween, MAX_GENERATE_WEEKS } from '../schedule';
import { findSessionConflict, roomsMatch } from '../session-time';

describe('expandWeeklyDates', () => {
  // 2026-10-05 = Senin, 2026-10-07 = Rabu (terverifikasi via date)
  it('mengembangkan Senin & Rabu pada dua minggu', () => {
    const dates = expandWeeklyDates([1, 3], '2026-10-05', '2026-10-18');
    expect(dates).toEqual(['2026-10-05', '2026-10-07', '2026-10-12', '2026-10-14']);
  });

  it('rentang satu hari yang cocok', () => {
    expect(expandWeeklyDates([1], '2026-10-05', '2026-10-05')).toEqual(['2026-10-05']);
  });

  it('rentang satu hari yang tidak cocok -> kosong', () => {
    expect(expandWeeklyDates([2], '2026-10-05', '2026-10-05')).toEqual([]);
  });

  it('aman untuk input tidak valid', () => {
    expect(expandWeeklyDates([], '2026-10-05', '2026-10-18')).toEqual([]);
    expect(expandWeeklyDates([1], '2026-10-18', '2026-10-05')).toEqual([]);
    expect(expandWeeklyDates([9], '2026-10-05', '2026-10-18')).toEqual([]);
    expect(expandWeeklyDates([1], 'bukan-tanggal', '2026-10-18')).toEqual([]);
  });
});

describe('formatDays', () => {
  it('mengurutkan dan memberi label', () => {
    expect(formatDays([3, 1])).toBe('Sen, Rab');
    expect(formatDays([0])).toBe('Min');
  });
});

describe('weeksBetween', () => {
  it('menghitung minggu pembulatan ke atas', () => {
    expect(weeksBetween('2026-10-05', '2026-10-11')).toBe(1);
    expect(weeksBetween('2026-10-05', '2026-10-12')).toBe(2);
    expect(weeksBetween('2026-10-05', '2026-10-05')).toBe(1);
  });

  it('batas 26 minggu valid', () => {
    expect(MAX_GENERATE_WEEKS).toBe(26);
    expect(weeksBetween('2026-10-05', '2027-04-04') <= MAX_GENERATE_WEEKS).toBe(true);
  });
});

describe('roomsMatch', () => {
  it('keduanya kosong = ruang default yang sama', () => {
    expect(roomsMatch(null, null)).toBe(true);
    expect(roomsMatch('', undefined)).toBe(true);
    expect(roomsMatch(null, '')).toBe(true);
  });

  it('perbandingan case-insensitive + trim', () => {
    expect(roomsMatch('Ruang 1', 'ruang 1')).toBe(true);
    expect(roomsMatch('  Ruang 1 ', 'RUANG 1')).toBe(true);
  });

  it('ruangan berbeda tidak cocok; kosong vs terisi tidak cocok', () => {
    expect(roomsMatch('Ruang 1', 'Ruang 2')).toBe(false);
    expect(roomsMatch(null, 'Ruang 1')).toBe(false);
  });
});

describe('findSessionConflict sadar ruangan', () => {
  const existing = [
    { id: 's1', date: '2026-10-05', start_time: '15:00', end_time: '16:00', room: 'Ruang 1', status: 'scheduled' },
  ];

  it('bentrok bila ruangan sama dan jam beririsan', () => {
    const c = findSessionConflict(
      { date: '2026-10-05', start_time: '15:30', end_time: '16:30', room: 'Ruang 1' },
      existing,
    );
    expect(c?.id).toBe('s1');
  });

  it('tidak bentrok bila ruangan berbeda', () => {
    const c = findSessionConflict(
      { date: '2026-10-05', start_time: '15:30', end_time: '16:30', room: 'Ruang 2' },
      existing,
    );
    expect(c).toBeNull();
  });

  it('perilaku lama tetap: keduanya tanpa ruangan dianggap satu ruang', () => {
    const c = findSessionConflict(
      { date: '2026-10-05', start_time: '15:30', end_time: '16:30' },
      [{ id: 's2', date: '2026-10-05', start_time: '15:00', end_time: '16:00', status: 'scheduled' }],
    );
    expect(c?.id).toBe('s2');
  });
});
