// Logika murni Rekap 2 Mingguan (Ronde 5).
// Agregat deterministik (tanpa AI): menggabungkan absensi + nilai rubrik semua sesi
// dalam satu periode menjadi satu narasi ramah orang tua untuk WhatsApp.

export interface BiweeklyPeriod {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Periode bawaan: 14 hari terakhir termasuk hari ini. */
export function defaultBiweeklyPeriod(now: Date = new Date()): BiweeklyPeriod {
  const to = new Date(now);
  const from = new Date(now);
  from.setDate(from.getDate() - 13);
  return { from: toISODate(from), to: toISODate(to) };
}

/** Validasi & normalisasi parameter periode; tak valid -> periode bawaan. */
export function parseBiweeklyPeriod(
  from: unknown,
  to: unknown,
  now: Date = new Date(),
): BiweeklyPeriod {
  const def = defaultBiweeklyPeriod(now);
  const f = typeof from === 'string' && DATE_RE.test(from) ? from : null;
  const t = typeof to === 'string' && DATE_RE.test(to) ? to : null;
  if (!f || !t) return def;
  if (f > t) return def;
  // Batasi maksimal 62 hari agar agregat tetap bermakna
  const days = (new Date(t).getTime() - new Date(f).getTime()) / 86400000;
  if (days > 62) return def;
  return { from: f, to: t };
}

const BULAN_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/** "2026-10-01" -> "1 Okt 2026"; rentang -> "1–14 Okt 2026" / "28 Sep–5 Okt 2026". */
export function formatPeriodLabel(p: BiweeklyPeriod): string {
  const [fy, fm, fd] = p.from.split('-').map(Number);
  const [ty, tm, td] = p.to.split('-').map(Number);
  if (p.from === p.to) return `${td} ${BULAN_ID[tm - 1]} ${ty}`;
  const sameMonth = fm === tm && fy === ty;
  if (sameMonth) return `${fd}–${td} ${BULAN_ID[fm - 1]} ${fy}`;
  return `${fd} ${BULAN_ID[fm - 1]}–${td} ${BULAN_ID[tm - 1]} ${ty}`;
}

export interface BiweeklyAttendance {
  session_id: string;
  date: string;
  title: string;
  episode_number: number | null;
  episode_title: string | null;
  status: 'present' | 'late' | 'absent';
}

export interface BiweeklyAssessment {
  session_id: string;
  total_score: number;
  rubric_scores: Record<string, number>;
  tutor_notes: string;
}

export interface BiweeklyStudentInput {
  student_id: string;
  full_name: string;
  parent_name: string;
  parent_phone: string;
  grade_name: string;
  program_name: string;
  tier_label: string;
  attendance: BiweeklyAttendance[];
  assessments: BiweeklyAssessment[];
}

export interface CriterionAvg {
  name: string;
  avg: number;
  count: number;
}

export interface BiweeklyAggregate {
  student_id: string;
  full_name: string;
  parent_name: string;
  parent_phone: string;
  grade_name: string;
  program_name: string;
  tier_label: string;
  session_count: number;
  present: number;
  late: number;
  absent: number;
  attendance_rate: number; // 0–100, hadir+telat dianggap mengikuti
  avg_score: number | null;
  criteria: CriterionAvg[];
  strengths: string[];
  improvements: string[];
  episodes: { number: number | null; title: string }[];
  latest_tutor_note: string;
}

export function aggregateBiweeklyStudent(input: BiweeklyStudentInput): BiweeklyAggregate {
  const att = input.attendance;
  const present = att.filter((a) => a.status === 'present').length;
  const late = att.filter((a) => a.status === 'late').length;
  const absent = att.filter((a) => a.status === 'absent').length;
  const session_count = att.length;
  const attendance_rate =
    session_count === 0 ? 0 : Math.round(((present + late) / session_count) * 100);

  const scored = input.assessments.filter(
    (a) => typeof a.total_score === 'number' && !Number.isNaN(a.total_score),
  );
  const avg_score =
    scored.length === 0
      ? null
      : Math.round(scored.reduce((s, a) => s + a.total_score, 0) / scored.length);

  // Rata-rata per kriteria rubrik
  const critMap = new Map<string, { sum: number; count: number }>();
  for (const a of input.assessments) {
    const rs = a.rubric_scores || {};
    for (const [name, val] of Object.entries(rs)) {
      if (typeof val !== 'number' || Number.isNaN(val)) continue;
      const cur = critMap.get(name) || { sum: 0, count: 0 };
      cur.sum += val;
      cur.count += 1;
      critMap.set(name, cur);
    }
  }
  const criteria: CriterionAvg[] = [...critMap.entries()]
    .map(([name, { sum, count }]) => ({ name, avg: Math.round(sum / count), count }))
    .sort((a, b) => b.avg - a.avg);

  const strengths = criteria.slice(0, 2).map((c) => c.name);
  const weak = criteria.filter((c) => c.avg < 80).slice(-2).map((c) => c.name);
  const improvements = weak.length > 0 ? weak : [];

  // Daftar episode unik berurutan tanggal
  const seen = new Set<string>();
  const episodes: { number: number | null; title: string }[] = [];
  for (const a of [...att].sort((x, y) => (x.date < y.date ? -1 : 1))) {
    const title = a.episode_title || a.title;
    const key = `${a.episode_number ?? ''}|${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    episodes.push({ number: a.episode_number, title });
  }

  const notes = input.assessments
    .map((a) => (a.tutor_notes || '').trim())
    .filter(Boolean);
  const latest_tutor_note = notes.length > 0 ? notes[notes.length - 1] : '';

  return {
    student_id: input.student_id,
    full_name: input.full_name,
    parent_name: input.parent_name,
    parent_phone: input.parent_phone,
    grade_name: input.grade_name,
    program_name: input.program_name,
    tier_label: input.tier_label,
    session_count,
    present,
    late,
    absent,
    attendance_rate,
    avg_score,
    criteria,
    strengths,
    improvements,
    episodes,
    latest_tutor_note,
  };
}

export function buildBiweeklyNarrative(agg: BiweeklyAggregate, period: BiweeklyPeriod): string {
  const label = formatPeriodLabel(period);
  const childLine = `*${agg.full_name}* (${agg.grade_name} • ${agg.program_name})`;
  const greeting = `Halo Bapak/Ibu ${agg.parent_name || 'Wali Murid'} 👋`;

  if (agg.session_count === 0) {
    return (
      `*Rekap 2 Mingguan — TerDig Academy*\n` +
      `Periode ${label}\n\n` +
      `${greeting}\n\n` +
      `Berikut perkembangan ananda ${childLine}:\n\n` +
      `Belum ada sesi pada periode ini. Rekap akan terisi setelah ananda mengikuti sesi belajar.\n\n` +
      `Terima kasih atas kepercayaan Bapak/Ibu 🙏\n— TerDig Academy`
    );
  }

  const lines: string[] = [
    `*Rekap 2 Mingguan — TerDig Academy*`,
    `Periode ${label}`,
    ``,
    greeting,
    ``,
    `Berikut perkembangan ananda ${childLine}:`,
    ``,
    `📚 *Sesi:* ${agg.session_count} sesi (${agg.present} hadir, ${agg.late} telat, ${agg.absent} absen) — kehadiran ${agg.attendance_rate}%`,
  ];
  if (agg.avg_score !== null) lines.push(`⭐ *Nilai rata-rata:* ${agg.avg_score}/100`);
  if (agg.episodes.length > 0) {
    const ep = agg.episodes
      .slice(0, 6)
      .map((e) => (e.number ? `EP-${e.number} ${e.title}` : e.title))
      .join('; ');
    lines.push(`📖 *Materi:* ${ep}${agg.episodes.length > 6 ? '…' : ''}`);
  }
  lines.push(``);
  if (agg.strengths.length > 0) lines.push(`💪 *Kekuatan:* ${agg.strengths.join(', ')}`);
  if (agg.improvements.length > 0) {
    lines.push(`🎯 *Perlu dilatih:* ${agg.improvements.join(', ')}`);
  } else if (agg.criteria.length > 0) {
    lines.push(`🎯 *Perlu dilatih:* semua aspek sudah baik, pertahankan!`);
  }
  if (agg.latest_tutor_note) {
    lines.push(``);
    lines.push(`💬 *Catatan tutor:* ${agg.latest_tutor_note}`);
  }
  lines.push(``);
  lines.push(`Terima kasih atas kepercayaan Bapak/Ibu 🙏`);
  lines.push(`— TerDig Academy`);
  return lines.join('\n');
}
