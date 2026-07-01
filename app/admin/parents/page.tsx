import { Users2 } from 'lucide-react';
import { createServerClient } from '@/lib/supabase-server';
import ParentListManager from '@/components/Parents/ParentListManager';

export const revalidate = 0;

export default async function ParentsPage() {
  const supabase = createServerClient();

  // Ambil semua siswa dengan data orang tua + join ke grades
  const { data: students } = await supabase
    .from('students')
    .select(`
      id,
      full_name,
      parent_name,
      parent_phone,
      grade_id,
      status
    `)
    .order('full_name');

  // Ambil grades sekaligus (N+1 → 1 query)
  const { data: allGrades } = await supabase.from('grades').select('id, name');
  const gradeMap: Record<string, string> = {};
  for (const g of allGrades || []) {
    gradeMap[g.id] = g.name;
  }

  // Gabungkan data
  const studentsWithGrade = (students || []).map((s: any) => ({
    ...s,
    gradeName: s.grade_id ? gradeMap[s.grade_id] || '-' : '-',
  }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
          <Users2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Data Orang Tua</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Data orang tua diambil dari tabel siswa — edit di halaman masing-masing
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
        <ParentListManager students={studentsWithGrade} />
      </div>
    </div>
  );
}
