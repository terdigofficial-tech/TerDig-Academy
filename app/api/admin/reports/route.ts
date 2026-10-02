import { NextRequest, NextResponse } from 'next/server';
import { generateParentReport } from '@/lib/reporter';
import { createServerClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-middleware';

// GET: List all parent reports with joins to students, sessions, and episodes
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const currentUser = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    let query = supabase
      .from('parent_reports')
      .select(`
        id,
        student_id,
        session_id,
        report_type,
        content_json,
        wa_status,
        sent_at,
        created_at,
        students!inner (
          id,
          full_name,
          parent_name,
          parent_phone,
          current_level
        ),
        sessions (
          id,
          title,
          date,
          target_level,
          status,
          tutor_id,
          episodes (
            episode_number,
            title,
            terdig_level
          )
        )
      `, { count: 'exact' });

    // Tutor hanya bisa melihat laporan untuk sesi yang dia ajar
    if (currentUser?.role === 'tutor') {
      query = query.eq('sessions.tutor_id', currentUser.sub);
    }

    if (status) {
      query = query.eq('wa_status', status);
    }

    if (search) {
      query = query.ilike('students.full_name', `%${search}%`);
    }

    query = query.order('created_at', { ascending: false });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching reports:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data for frontend
    const transformedReports = (data || []).map((report: any) => ({
      id: report.id,
      student_id: report.student_id,
      session_id: report.session_id,
      report_type: report.report_type,
      content_json: report.content_json,
      wa_status: report.wa_status,
      sent_at: report.sent_at,
      created_at: report.created_at,
      student_name: report.students?.full_name || '-',
      parent_name: report.students?.parent_name || '',
      parent_phone: report.students?.parent_phone || '',
      student_level: report.students?.current_level || 0,
      session_title: report.sessions?.title || '-',
      session_date: report.sessions?.date || '',
      target_level: report.sessions?.target_level || '',
      episode_number: report.sessions?.episodes?.episode_number || null,
      episode_title: report.sessions?.episodes?.title || '-',
      terdig_level: report.sessions?.episodes?.terdig_level || '',
    }));

    return NextResponse.json({
      data: transformedReports,
      total: count || 0,
      page,
      pageSize,
      totalPages: count ? Math.ceil(count / pageSize) : 0,
    });
  } catch (err: any) {
    console.error('❌ Error in GET /api/admin/reports:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { studentId, sessionId } = await req.json();
    if (!studentId || !sessionId) return NextResponse.json({ error: 'studentId & sessionId required' }, { status: 400 });

    const report = await generateParentReport(studentId, sessionId);
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
