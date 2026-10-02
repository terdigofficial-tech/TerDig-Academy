import { describe, it, expect } from 'vitest';
import {
  defaultBiweeklyPeriod,
  parseBiweeklyPeriod,
  formatPeriodLabel,
  aggregateBiweeklyStudent,
  buildBiweeklyNarrative,
  type BiweeklyStudentInput,
} from '../biweekly';

describe('periode', () => {
  it('defaultBiweeklyPeriod: 14 hari termasuk hari ini', () => {
    const p = defaultBiweeklyPeriod(new Date('2026-10-14T12:00:00Z'));
    expect(p).toEqual({ from: '2026-10-01', to: '2026-10-14' });
  });

  it('parseBiweeklyPeriod menerima rentang valid', () => {
    expect(parseBiweeklyPeriod('2026-09-01', '2026-09-14')).toEqual({
      from: '2026-09-01',
      to: '2026-09-14',
    });
  });

  it('parseBiweeklyPeriod menolak input tak valid -> bawaan', () => {
    const now = new Date('2026-10-14T12:00:00Z');
    const def = defaultBiweeklyPeriod(now);
    expect(parseBiweeklyPeriod('xx', '2026-09-14', now)).toEqual(def);
    expect(parseBiweeklyPeriod('2026-09-14', '2026-09-01', now)).toEqual(def); // from > to
    expect(parseBiweeklyPeriod('2026-01-01', '2026-12-31', now)).toEqual(def); // > 62 hari
    expect(parseBiweeklyPeriod(null, undefined, now)).toEqual(def);
  });

  it('formatPeriodLabel', () => {
    expect(formatPeriodLabel({ from: '2026-10-01', to: '2026-10-14' })).toBe('1–14 Okt 2026');
    expect(formatPeriodLabel({ from: '2026-09-28', to: '2026-10-05' })).toBe('28 Sep–5 Okt 2026');
    expect(formatPeriodLabel({ from: '2026-10-14', to: '2026-10-14' })).toBe('14 Okt 2026');
  });
});

const baseInput: BiweeklyStudentInput = {
  student_id: 's1',
  full_name: 'Budi',
  parent_name: 'Pak Budi Sr',
  parent_phone: '+62812',
  grade_name: 'Kelas 2 SD',
  program_name: 'Calistung Ceria',
  tier_label: 'Reguler',
  attendance: [],
  assessments: [],
};

describe('aggregateBiweeklyStudent', () => {
  it('siswa tanpa sesi -> nol & null', () => {
    const agg = aggregateBiweeklyStudent(baseInput);
    expect(agg.session_count).toBe(0);
    expect(agg.attendance_rate).toBe(0);
    expect(agg.avg_score).toBe(null);
    expect(agg.strengths).toEqual([]);
    expect(agg.episodes).toEqual([]);
  });

  it('menghitung kehadiran, nilai, kriteria, dan episode', () => {
    const agg = aggregateBiweeklyStudent({
      ...baseInput,
      attendance: [
        { session_id: 'a', date: '2026-10-02', title: 'S1', episode_number: 1, episode_title: 'Huruf A', status: 'present' },
        { session_id: 'b', date: '2026-10-09', title: 'S2', episode_number: 2, episode_title: 'Huruf B', status: 'late' },
        { session_id: 'c', date: '2026-10-12', title: 'S3', episode_number: null, episode_title: null, status: 'absent' },
      ],
      assessments: [
        { session_id: 'a', total_score: 80, rubric_scores: { Membaca: 90, Menulis: 70 }, tutor_notes: 'Bagus' },
        { session_id: 'b', total_score: 90, rubric_scores: { Membaca: 95, Menulis: 85 }, tutor_notes: 'Meningkat' },
      ],
    });
    expect(agg.session_count).toBe(3);
    expect(agg.present).toBe(1);
    expect(agg.late).toBe(1);
    expect(agg.absent).toBe(1);
    expect(agg.attendance_rate).toBe(67); // (1+1)/3
    expect(agg.avg_score).toBe(85);
    expect(agg.criteria.find((c) => c.name === 'Membaca')?.avg).toBe(93); // (90+95)/2 rounded
    expect(agg.criteria.find((c) => c.name === 'Menulis')?.avg).toBe(78); // (70+85)/2=77.5 -> 78
    expect(agg.strengths[0]).toBe('Membaca');
    expect(agg.improvements).toContain('Menulis');
    expect(agg.episodes.map((e) => e.title)).toEqual(['Huruf A', 'Huruf B', 'S3']);
    expect(agg.latest_tutor_note).toBe('Meningkat');
  });

  it('tanpa kriteria lemah -> improvements kosong', () => {
    const agg = aggregateBiweeklyStudent({
      ...baseInput,
      attendance: [
        { session_id: 'a', date: '2026-10-02', title: 'S1', episode_number: 1, episode_title: 'X', status: 'present' },
      ],
      assessments: [
        { session_id: 'a', total_score: 95, rubric_scores: { Membaca: 95 }, tutor_notes: '' },
      ],
    });
    expect(agg.improvements).toEqual([]);
    expect(agg.latest_tutor_note).toBe('');
  });
});

describe('buildBiweeklyNarrative', () => {
  const period = { from: '2026-10-01', to: '2026-10-14' };

  it('narasi memuat angka-angka kunci', () => {
    const agg = aggregateBiweeklyStudent({
      ...baseInput,
      attendance: [
        { session_id: 'a', date: '2026-10-02', title: 'S1', episode_number: 1, episode_title: 'Huruf A', status: 'present' },
        { session_id: 'b', date: '2026-10-09', title: 'S2', episode_number: 2, episode_title: 'Huruf B', status: 'present' },
      ],
      assessments: [
        { session_id: 'a', total_score: 80, rubric_scores: { Membaca: 90, Menulis: 70 }, tutor_notes: 'Rajin!' },
      ],
    });
    const text = buildBiweeklyNarrative(agg, period);
    expect(text).toContain('Budi');
    expect(text).toContain('1–14 Okt 2026');
    expect(text).toContain('2 sesi');
    expect(text).toContain('80/100');
    expect(text).toContain('Membaca');
    expect(text).toContain('Menulis');
    expect(text).toContain('Rajin!');
    expect(text).toContain('TerDig Academy');
  });

  it('narasi kosong ramah bila tanpa sesi', () => {
    const agg = aggregateBiweeklyStudent(baseInput);
    const text = buildBiweeklyNarrative(agg, period);
    expect(text).toContain('Belum ada sesi pada periode ini');
    expect(text).not.toContain('NaN');
  });
});
