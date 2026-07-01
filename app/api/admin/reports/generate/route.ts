import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { generateParentReport } from '@/lib/reporter';

// POST: Generate laporan untuk siswa di sesi tertentu
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, sessionId } = body;

    // Validasi input
    if (!studentId || !sessionId) {
      return NextResponse.json(
        { error: 'studentId dan sessionId wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // 1. Validasi student ada
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, full_name, parent_name, parent_phone, current_level')
      .eq('id', studentId)
      .maybeSingle();

    if (studentError) {
      console.error('❌ Student query error:', studentError);
      return NextResponse.json(
        { error: 'Gagal mengambil data siswa', details: studentError.message },
        { status: 500 }
      );
    }

    if (!student) {
      console.error('❌ Student not found:', studentId);
      return NextResponse.json(
        { error: 'Siswa tidak ditemukan' },
        { status: 404 }
      );
    }

    // 2. Validasi parent data
    if (!student.parent_name || !student.parent_phone) {
      console.error('❌ Parent data incomplete:', {
        parent_name: student.parent_name,
        parent_phone: student.parent_phone,
      });
      return NextResponse.json(
        {
          error: 'Data orang tua belum lengkap. Silakan edit siswa untuk menambahkan nama dan nomor WhatsApp orang tua.',
          missing_fields: {
            parent_name: !student.parent_name,
            parent_phone: !student.parent_phone,
          },
        },
        { status: 400 }
      );
    }

    // 3. Validasi session ada
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, title, date, episodes(episode_number, title)')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error('❌ Session query error:', sessionError);
      return NextResponse.json(
        { error: 'Gagal mengambil data sesi', details: sessionError.message },
        { status: 500 }
      );
    }

    if (!session) {
      console.error('❌ Session not found:', sessionId);
      return NextResponse.json(
        { error: 'Sesi tidak ditemukan' },
        { status: 404 }
      );
    }

    // 4. Validasi attendance & assessment ada
    const { data: attendance, error: attError } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', studentId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (attError) {
      console.error('❌ Attendance query error:', attError);
      return NextResponse.json(
        { error: 'Gagal mengambil data kehadiran', details: attError.message },
        { status: 500 }
      );
    }

    if (!attendance) {
      return NextResponse.json(
        { error: 'Data kehadiran belum ada untuk siswa ini di sesi ini. Silakan input attendance terlebih dahulu.' },
        { status: 400 }
      );
    }

    const { data: assessment, error: asmError } = await supabase
      .from('assessments')
      .select('id')
      .eq('student_id', studentId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (asmError) {
      console.error('❌ Assessment query error:', asmError);
      return NextResponse.json(
        { error: 'Gagal mengambil data penilaian', details: asmError.message },
        { status: 500 }
      );
    }

    if (!assessment) {
      return NextResponse.json(
        { error: 'Data penilaian belum ada untuk siswa ini di sesi ini. Silakan input assessment terlebih dahulu.' },
        { status: 400 }
      );
    }

    // 5. Generate laporan dengan AI
    const reportContent = await generateParentReport(studentId, sessionId);

    if (!reportContent) {
      console.error('❌ AI generate returned null/empty');
      return NextResponse.json(
        { error: 'Gagal generate laporan. AI tidak menghasilkan output. Cek terminal untuk detail error.' },
        { status: 500 }
      );
    }

    // 6. Siapkan data orang tua untuk dikembalikan ke frontend
    const parentInfo = {
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
    };

    // 7. Ambil data laporan yang baru saja disimpan
    const { data: report, error: reportFetchError } = await supabase
      .from('parent_reports')
      .select('*')
      .eq('student_id', studentId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (reportFetchError) {
      console.warn('⚠️ Could not fetch saved report (non-fatal):', reportFetchError.message);
    }

    return NextResponse.json({
      data: report || null,
      content: reportContent,
      parent: parentInfo,
    });
  } catch (error) {
    console.error('❌ UNEXPECTED ERROR in /api/admin/reports/generate:');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    return NextResponse.json(
      {
        error: 'Gagal generate laporan',
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Cek terminal server untuk detail error',
      },
      { status: 500 }
    );
  }
}
