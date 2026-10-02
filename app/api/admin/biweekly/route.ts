import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { tierLabel } from '@/lib/programs';
import {
  parseBiweeklyPeriod,
  aggregateBiweeklyStudent,
  buildBiweeklyNarrative,
  type BiweeklyStudentInput,
} from '@/lib/biweekly';

/**
 * GET /api/admin/biweekly?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Agregat rekap 2 mingguan per siswa aktif: absensi + nilai + narasi WA.
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const period = parseBiweeklyPeriod(searchParams.get('from'), searchParams.get('to'));

    const supabase = createServerClient();

    const { data: students, error: sErr } = await supabase
      .from('students')
      .select('id, full_name, parent_name, parent_phone, tier, grades(name, level), programs(name)')
      .eq('status', 'active')
      .order('full_name');
    if (sErr) throw sErr;

    const { data: sessions, error: sessErr } = await supabase
      .from('sessions')
      .select('id, title, date, episodes(episode_number, title)')
      .gte('date', period.from)
      .lte('date', period.to)
      .neq('status', 'cancelled')
      .order('date');
    if (sessErr) throw sessErr;

    const sessionIds = (sessions || []).map((s: any) => s.id);
    const sessionMap = new Map<string, any>((sessions || []).map((s: any) => [s.id, s]));

    let attendance: any[] = [];
    let assessments: any[] = [];
    if (sessionIds.length > 0) {
      const { data: att, error: aErr } = await supabase
        .from('attendance')
        .select('session_id, student_id, status')
        .in('session_id', sessionIds);
      if (aErr) throw aErr;
      attendance = att || [];

      const { data: ass, error: asErr } = await supabase
        .from('assessments')
        .select('session_id, student_id, total_score, rubric_scores, tutor_notes')
        .in('session_id', sessionIds);
      if (asErr) throw asErr;
      assessments = ass || [];
    }

    const attByStudent = new Map<string, any[]>();
    for (const a of attendance) {
      const list = attByStudent.get(a.student_id) || [];
      list.push(a);
      attByStudent.set(a.student_id, list);
    }
    const assByStudent = new Map<string, any[]>();
    for (const a of assessments) {
      const list = assByStudent.get(a.student_id) || [];
      list.push(a);
      assByStudent.set(a.student_id, list);
    }

    const result = (students || []).map((s: any) => {
      const input: BiweeklyStudentInput = {
        student_id: s.id,
        full_name: s.full_name,
        parent_name: s.parent_name || '',
        parent_phone: s.parent_phone || '',
        grade_name: s.grades?.name || '-',
        program_name: s.programs?.name || '-',
        tier_label: tierLabel(s.tier),
        attendance: (attByStudent.get(s.id) || []).map((a: any) => {
          const sess = sessionMap.get(a.session_id);
          return {
            session_id: a.session_id,
            date: sess?.date || '',
            title: sess?.title || '',
            episode_number: sess?.episodes?.episode_number ?? null,
            episode_title: sess?.episodes?.title ?? null,
            status: a.status,
          };
        }),
        assessments: (assByStudent.get(s.id) || []).map((a: any) => ({
          session_id: a.session_id,
          total_score: a.total_score,
          rubric_scores: a.rubric_scores || {},
          tutor_notes: a.tutor_notes || '',
        })),
      };
      const agg = aggregateBiweeklyStudent(input);
      return { ...agg, narrative: buildBiweeklyNarrative(agg, period) };
    });

    return NextResponse.json({ period, students: result });
  } catch (err: any) {
    console.error('❌ Error in GET biweekly:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/biweekly — rekam rekap yang dikirim via WA.
 * Body: { student_id, from, to, text }
 */
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  try {
    const { student_id, from, to, text } = await req.json();
    if (!student_id) return NextResponse.json({ error: 'student_id wajib diisi' }, { status: 400 });
    if (!text || !String(text).trim()) {
      return NextResponse.json({ error: 'Teks rekap tidak boleh kosong' }, { status: 400 });
    }
    const period = parseBiweeklyPeriod(from, to);

    const supabase = createServerClient();
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('id')
      .eq('id', student_id)
      .eq('status', 'active')
      .single();
    if (sErr || !student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan / tidak aktif' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('parent_reports')
      .insert({
        student_id,
        session_id: null,
        report_type: 'biweekly',
        content_json: {
          text: String(text),
          meta: { from: period.from, to: period.to, generated_at: new Date().toISOString() },
        },
        wa_status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('❌ Error in POST biweekly:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
