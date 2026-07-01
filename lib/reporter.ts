import Groq from 'groq-sdk';
import { createServerClient } from '@/lib/supabase-server';

function getGroqClient(): Groq {
  return new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
}

const SYSTEM_PROMPT_REPORT = `Anda adalah guru SD yang berpengalaman menulis laporan perkembangan siswa untuk orang tua. 
Gaya bahasa: hangat, profesional, informatif, dan membangun.
Fokus pada hal positif dan area pengembangan yang konstruktif.
Gunakan bahasa Indonesia yang santun dan mudah dipahami orang tua.`;

export async function generateParentReport(studentId: string, sessionId: string) {
    try {
    const supabase = createServerClient();

    // 1. Fetch student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (studentError) {
      console.error('❌ Student query error:', studentError);
      return null;
    }

    if (!student) {
      console.error('❌ Student not found:', studentId);
      return null;
    }

    // 2. Fetch session + episodes
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*, episodes(episode_number, title, terdig_level, roadmap_level)')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('❌ Session query error:', sessionError);
      return null;
    }

    if (!session) {
      console.error('❌ Session not found:', sessionId);
      return null;
    }

    // 3. Fetch assessment
    const { data: assessment, error: asmError } = await supabase
      .from('assessments')
      .select('*')
      .eq('student_id', studentId)
      .eq('session_id', sessionId)
      .single();

    if (asmError) {
      console.error('❌ Assessment query error:', asmError);
      return null;
    }

    if (!assessment) {
      console.error('❌ Assessment not found for student', studentId, 'session', sessionId);
      return null;
    }

    // 4. Fetch attendance
    const { data: attendanceList, error: attError } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', studentId)
      .eq('session_id', sessionId)
      .order('date', { ascending: false })
      .limit(1);

    if (attError) {
      console.error('❌ Attendance query error:', attError);
      return null;
    }

    const attendance = attendanceList?.[0];

    // 5. Fetch worksheet
    const { data: worksheet, error: wsError } = await supabase
      .from('worksheet_submissions')
      .select('score, ai_correction')
      .eq('student_id', studentId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (wsError) {
      console.warn('⚠️ Worksheet query warning (non-fatal):', wsError.message);
    }

    // 6. Check Groq API key
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.trim() === '') {
      console.error('❌ GROQ_API_KEY tidak valid atau kosong');
      return null;
    }

    // Format materi dari episodes title (fallback ke session.title)
    const episodeTitle = session.episodes?.title || '-';
    const episodeNumber = session.episodes?.episode_number || '-';

    // Format catatan koreksi jika ada
    let correctionNote = '';
    if (worksheet?.ai_correction?.manual_text) {
      correctionNote = `- Catatan koreksi lembar kerja: ${worksheet.ai_correction.manual_text.substring(0, 150)}...`;
    }

    const parentName = student.parent_name || 'Orang Tua/Wali';

    const prompt = `Buat laporan singkat untuk orang tua siswa SD dalam bahasa Indonesia yang natural, hangat, dan informatif. Gunakan data berikut:
- Nama orang tua: ${parentName}
- Nama siswa: ${student.full_name}
- Episode: EP-${episodeNumber} - ${episodeTitle}
- Judul sesi: ${session.title || '-'}
- Status kehadiran: ${attendance?.status || 'tidak diketahui'}
- Nilai rata-rata: ${assessment.total_score}
- Catatan tutor: ${assessment.tutor_notes || 'Tidak ada'}
${worksheet ? `- Nilai lembar kerja: ${worksheet.score}/100` : ''}
${correctionNote}

Format laporan:
1. Pembuka (sapa orang tua dengan nama, sebutkan materi hari ini)
2. Kehadiran
3. Capaian belajar & kekuatan
4. Area yang perlu ditingkatkan
5. Penutup (ajakan dukung belajar di rumah)

Jangan lebih dari 150 kata. Output HANYA teks laporan tanpa markdown.`;

    // 7. Panggil Groq
    const completion = await getGroqClient().chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_REPORT },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content || '';

    if (!content) {
      console.error('❌ Groq returned empty content');
      return null;
    }

    // 8. Simpan ke parent_reports
    const { error: insertError } = await supabase.from('parent_reports').insert({
      student_id: studentId,
      session_id: sessionId,
      report_type: 'post_session',
      content_json: { text: content },
      wa_status: 'pending',
    });

    if (insertError) {
      console.error('❌ Insert report error:', insertError);
      return null;
    }

    return content;
  } catch (error) {
    console.error('❌ UNEXPECTED ERROR in generateParentReport:');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return null;
  }
}
