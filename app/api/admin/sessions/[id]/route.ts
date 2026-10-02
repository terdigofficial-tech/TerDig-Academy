import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-middleware';
import { applySessionCapacity, LEVEL_TO_GRADES, fetchSessionRosterIds } from '@/lib/session-capacity';
import { maskStudentPhone } from '@/lib/phone-mask';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUser(req);
  
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch session dengan join ke episodes
  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      *,
      episodes (
        episode_number,
        title,
        terdig_level,
        roadmap_level,
        youtube_url,
        youtube_urls,
        activity_links,
        duration_minutes,
        target_age,
        theme,
        facilitator_guide_url,
        worksheet_url,
        song_url,
        rubric
      )
    `)
    .eq('id', id)
    .single();

  console.log('📋 Session data:', session);
  console.log('🎮 Episode activity_links:', session?.episodes?.activity_links);

  if (error) {
    console.error('❌ Error fetching session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: 'Session tidak ditemukan' }, { status: 404 });
  }

  // Role checking: tutor hanya bisa akses session miliknya
  if (currentUser.role === 'tutor' && session.tutor_id !== currentUser.sub) {
    return NextResponse.json({ error: 'Forbidden - Anda tidak memiliki akses ke session ini' }, { status: 403 });
  }

  // Fetch students berdasarkan target_level
  // Cari siswa yang memiliki grade dengan level yang cocok
  let students: any[] = [];
  const targetLevel = session.target_level as string;

  if (targetLevel && LEVEL_TO_GRADES[targetLevel]) {
    const gradeLevels = LEVEL_TO_GRADES[targetLevel];

    const { data: studentsData } = await supabase
      .from('students')
      .select(`
        *,
        grades!inner(id, name, level)
      `)
      .in('grades.level', gradeLevels)
      .eq('status', 'active')
      .order('full_name');

    students = studentsData || [];
  }

  // Penegakan kapasitas: roster dibatasi sebanyak session.capacity.
  // Siswa di luar kapasitas dilaporkan sebagai overflow agar admin bisa
  // memindahkan mereka ke sesi lain atau menaikkan kapasitas.
  const { roster, overflow } = applySessionCapacity(students, session.capacity ?? null);

  // Masking HP wali untuk tutor: tutor tidak boleh melihat nomor utuh
  // saat browsing daftar siswa.
  const visibleRoster =
    currentUser.role === 'tutor' ? roster.map(maskStudentPhone) : roster;

  // Fetch existing attendance untuk session ini
  const { data: existingAttendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('session_id', id);

  // Fetch existing assessments untuk session ini
  const { data: existingAssessments } = await supabase
    .from('assessments')
    .select('*')
    .eq('session_id', id);

  return NextResponse.json({
    data: {
      id: session.id,
      title: session.title,
      date: session.date,
      start_time: session.start_time ?? null,
      end_time: session.end_time ?? null,
      capacity: session.capacity ?? null,
      status: session.status,
      notes: session.notes,
      target_level: session.target_level,
      episodes: session.episodes,
      students: visibleRoster,
      // Info kapasitas untuk UI: berapa siswa yang tidak muat + siapa saja
      capacity_overflow: overflow,
      attendance: existingAttendance || [],
      assessments: existingAssessments || [],
    }
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUser(req);
  
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();

  // Verifikasi session exists dan role
  const { data: session } = await supabase
    .from('sessions')
    .select('tutor_id, capacity, target_level')
    .eq('id', id)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Session tidak ditemukan' }, { status: 404 });
  }

  // Tutor hanya bisa edit session miliknya
  if (currentUser.role === 'tutor' && session.tutor_id !== currentUser.sub) {
    return NextResponse.json({ error: 'Forbidden - Anda tidak memiliki akses ke session ini' }, { status: 403 });
  }

  const body = await req.json();

  const { attendance, assessments, markComplete } = body;

  const errors: string[] = [];

  // Penegakan kapasitas: hanya siswa dalam roster (setelah capping) yang boleh
  // tercatat pada absensi/penilaian sesi ini. Record untuk siswa di luar
  // kapasitas dibuang dan dilaporkan.
  const allowedIds = await fetchSessionRosterIds(supabase, session.target_level, session.capacity);
  let capacityDropped = 0;
  const withinCapacity = (records: any[]) =>
    records.filter((r) => {
      if (allowedIds.has(r.student_id)) return true;
      capacityDropped += 1;
      return false;
    });

  // 1. Save attendance (batch upsert)
  const attendanceInput = withinCapacity(attendance && Array.isArray(attendance) ? attendance : []);
  if (attendanceInput.length > 0) {
    const attendanceRecords = attendanceInput.map((att: any) => ({
      session_id: id,
      student_id: att.student_id,
      status: att.status || 'present',
      notes: att.notes || null,
      date: new Date().toISOString().split('T')[0],
    }));

    const { error: attErr } = await supabase
      .from('attendance')
      .upsert(attendanceRecords, { onConflict: 'session_id,student_id' });

    if (attErr) {
      console.error('❌ Error saving attendance:', attErr);
      errors.push(`Attendance error: ${attErr.message}`);
    }
  }

  // 2. Save assessments (batch upsert)
  const assessmentsInput = withinCapacity(assessments && Array.isArray(assessments) ? assessments : []);
  if (assessmentsInput.length > 0) {
    const assessmentRecords = assessmentsInput.map((asmt: any) => {
      const scores = asmt.rubric_scores || {};
      const totalScore = asmt.total_score ||
        Object.values(scores).reduce((sum: number, s: any) => sum + (Number(s) || 0), 0);
      return {
        session_id: id,
        student_id: asmt.student_id,
        rubric_scores: scores,
        total_score: totalScore,
        tutor_notes: asmt.notes || null,
      };
    });

    const { error: asmtErr } = await supabase
      .from('assessments')
      .upsert(assessmentRecords, { onConflict: 'session_id,student_id' });

    if (asmtErr) {
      console.error('❌ Error saving assessments:', asmtErr);
      errors.push(`Assessments error: ${asmtErr.message}`);
    }
  }

  // 3. Mark session complete
  if (markComplete) {
    const { error: completeErr } = await supabase
      .from('sessions')
      .update({ status: 'completed' })
      .eq('id', id);

    if (completeErr) {
      console.error('❌ Error marking session complete:', completeErr);
      errors.push(`Mark complete error: ${completeErr.message}`);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 500 });
  }

  return NextResponse.json({ success: true, capacity_dropped: capacityDropped });
}
