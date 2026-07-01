import { createServerClient } from '@/lib/supabase-server';
import StudentTableWithSearch from '@/components/StudentTableWithSearch';

export const revalidate = 0;

export default async function StudentsPage() {
  const supabase = createServerClient();
  const { data: students } = await supabase.from('students').select('*').order('full_name');

  // --- Batch queries untuk menghindari N+1 ---

  // 1. Ambil semua attendance sekaligus
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
  
  const studentIds = (students || []).map(s => s.id);
  
  const { data: allAttendance } = await supabase
    .from('attendance')
    .select('student_id')
    .in('student_id', studentIds)
    .eq('status', 'present')
    .gte('date', dateStr);

  // Hitung session count per student
  const sessionCountMap: Record<string, number> = {};
  for (const att of allAttendance || []) {
    sessionCountMap[att.student_id] = (sessionCountMap[att.student_id] || 0) + 1;
  }

  // 2. Ambil semua grades sekaligus
  const { data: allGrades } = await supabase.from('grades').select('id, name');
  const gradeMap: Record<string, string> = {};
  for (const g of allGrades || []) {
    gradeMap[g.id] = g.name;
  }

  // 3. Ambil semua programs sekaligus
  const { data: allPrograms } = await supabase.from('programs').select('id, name');
  const programMap: Record<string, string> = {};
  for (const p of allPrograms || []) {
    programMap[p.id] = p.name;
  }

  // 4. Gabungkan data — tanpa query individual
  const studentsWithProgress = (students || []).map((s: any) => {
    const sessionCount = sessionCountMap[s.id] || 0;
    return {
      ...s,
      sessionCount,
      isReady: sessionCount >= 4,
      gradeName: s.grade_id ? gradeMap[s.grade_id] || '-' : '-',
      programName: s.program_id ? programMap[s.program_id] || '-' : '-'
    };
  });

  return <StudentTableWithSearch students={studentsWithProgress} />;
}
