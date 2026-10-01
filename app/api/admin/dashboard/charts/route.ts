import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const currentUser = await getCurrentUser(req);
    const isTutor = currentUser?.role === 'tutor';

    // Dapatkan session IDs untuk tutor (jika tutor)
    let tutorSessionIds: string[] | undefined;
    if (isTutor) {
      const { data: tutorSessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('tutor_id', currentUser!.sub);
      tutorSessionIds = tutorSessions?.map(s => s.id) || [];
    }

    // 1. Attendance trend — 7 hari terakhir
    const last7Days: { label: string; date: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      last7Days.push({ label: dayName, date: dateStr });
    }

    const dateFrom = last7Days[0].date;
    const dateTo = last7Days[6].date;

    let attendanceQuery = supabase
      .from('attendance')
      .select('date, status, session_id')
      .gte('date', dateFrom)
      .lte('date', dateTo);

    // Tutor: filter attendance hanya untuk session miliknya
    if (isTutor && tutorSessionIds && tutorSessionIds.length > 0) {
      attendanceQuery = attendanceQuery.in('session_id', tutorSessionIds);
    }

    const { data: attendanceData } = await attendanceQuery;

    const attendanceTrend = last7Days.map(({ label, date }) => {
      const dayRecords = (attendanceData || []).filter(a => a.date === date);
      const present = dayRecords.filter(a => a.status === 'present' || a.status === 'late').length;
      const total = dayRecords.length;
      return {
        label,
        hadir: present,
        total,
        persentase: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });

    // 2. Level distribution
    const { data: students } = await supabase
      .from('students')
      .select('current_level')
      .eq('status', 'active');

    const levelMap: Record<number, number> = {};
    for (const s of students || []) {
      levelMap[s.current_level] = (levelMap[s.current_level] || 0) + 1;
    }
    const levelDistribution = Object.entries(levelMap)
      .map(([level, count]) => ({ level: Number(level), count }))
      .sort((a, b) => a.level - b.level);

    // 3. Report status distribution
    let reportQuery = supabase
      .from('parent_reports')
      .select('wa_status, sessions!inner(tutor_id)');

    // Tutor: filter reports hanya untuk session miliknya
    if (isTutor) {
      reportQuery = reportQuery.eq('sessions.tutor_id', currentUser!.sub);
    }

    const { data: reports } = await reportQuery;

    const reportStatusMap: Record<string, number> = {};
    for (const r of reports || []) {
      const label = r.wa_status === 'sent' ? 'Terkirim' : r.wa_status === 'failed' ? 'Gagal' : 'Menunggu';
      reportStatusMap[label] = (reportStatusMap[label] || 0) + 1;
    }
    const reportStatus = Object.entries(reportStatusMap).map(([name, value]) => ({ name, value }));

    // 4. Grade distribution — jumlah siswa per kelas
    const { data: grades } = await supabase.from('grades').select('id, name');
    const { data: studentsWithGrades } = await supabase
      .from('students')
      .select('grade_id')
      .eq('status', 'active');

    const gradeCountMap: Record<string, number> = {};
    for (const s of studentsWithGrades || []) {
      if (s.grade_id) {
        gradeCountMap[s.grade_id] = (gradeCountMap[s.grade_id] || 0) + 1;
      }
    }

    const gradeDistribution = (grades || [])
      .map(g => ({
        name: g.name,
        count: gradeCountMap[g.id] || 0,
      }))
      .filter(g => g.count > 0);

    return NextResponse.json({
      attendanceTrend,
      levelDistribution,
      reportStatus,
      gradeDistribution,
    });
  } catch (err: any) {
    console.error('Dashboard charts API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
