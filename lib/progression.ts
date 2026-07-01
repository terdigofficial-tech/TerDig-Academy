import { createServerClient } from '@/lib/supabase-server';

async function getWeights(supabase: ReturnType<typeof createServerClient>) {
  // Default 50:50 jika belum di-set
  let weightObs = 0.5;
  let weightWs = 0.5;

  try {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['weight_observation', 'weight_worksheet']);

    if (data) {
      for (const row of data) {
        const val = parseInt(row.value) / 100;
        if (!isNaN(val) && val >= 0 && val <= 1) {
          if (row.key === 'weight_observation') weightObs = val;
          if (row.key === 'weight_worksheet') weightWs = val;
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ Gagal membaca bobot dari database, menggunakan default 50:50', err);
  }

  return { weightObs, weightWs };
}

// Ekspor untuk unit testing langsung
export { getWeights };

export async function checkAndPromoteStudent(studentId: string) {
  const supabase = createServerClient();

  // Baca bobot dari database (atau fallback ke 50:50)
  const { weightObs, weightWs } = await getWeights(supabase);

  // Ambil 4 sesi terakhir yang dihadiri siswa beserta nilainya
  const { data: attendances } = await supabase
    .from('attendance')
    .select('session_id, status')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
    .limit(4);

  if (!attendances || attendances.length < 4) {
    return;
  }

  // Hitung kehadiran
  const presentCount = attendances.filter(a => a.status === 'present' || a.status === 'late').length;
  const attendanceRate = (presentCount / 4) * 100;
  
  if (attendanceRate < 85) {
    return;
  }

  // Ambil nilai assessment (observasi) untuk 4 sesi tersebut
  const sessionIds = attendances.map(a => a.session_id);
  const { data: assessments } = await supabase
    .from('assessments')
    .select('total_score')
    .eq('student_id', studentId)
    .in('session_id', sessionIds);

  if (!assessments || assessments.length < 4) {
    return;
  }

  const avgObservation = assessments.reduce((sum, a) => sum + (a.total_score || 0), 0) / 4;

  // Ambil nilai worksheet untuk 4 sesi yang sama
  const { data: worksheets } = await supabase
    .from('worksheet_submissions')
    .select('score')
    .eq('student_id', studentId)
    .in('session_id', sessionIds);

  let avgWorksheet = 0;
  if (worksheets && worksheets.length > 0) {
    avgWorksheet = worksheets.reduce((sum, w) => sum + (w.score || 0), 0) / worksheets.length;
  }

  // Gabungkan nilai dengan bobot (menggunakan bobot dari database atau default 50:50)
  let finalScore: number;
  if (avgWorksheet > 0) {
    finalScore = (avgObservation * weightObs) + (avgWorksheet * weightWs);
  } else {
    finalScore = avgObservation;
  }

  if (finalScore < 80) {
    return;
  }

  // Syarat terpenuhi: naik level
  const { data: student } = await supabase.from('students').select('current_level').eq('id', studentId).single();
  if (!student) {
    return;
  }

  const newLevel = student.current_level + 1;
  await supabase.from('students').update({ current_level: newLevel }).eq('id', studentId);

  // Catat history
  await supabase.from('progression_history').insert({
    student_id: studentId,
    from_level: student.current_level,
    to_level: newLevel,
    reason: `Observasi ${avgObservation.toFixed(1)}, Lembar Kerja ${avgWorksheet.toFixed(1)}, Nilai Akhir ${finalScore.toFixed(1)}, Kehadiran ${attendanceRate}%`
  });

  return { promoted: true, newLevel, finalScore: finalScore.toFixed(1), avgObservation: avgObservation.toFixed(1), avgWorksheet: avgWorksheet.toFixed(1), attendanceRate };
}
