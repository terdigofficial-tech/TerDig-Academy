import { createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import Link from 'next/link';
import { Film, Users, BookOpen, Send, Star, Plus, Calendar, FileText, Eye } from 'lucide-react';
import DashboardCharts from '@/components/DashboardCharts';

export const revalidate = 0;

export default async function AdminDashboard() {
  const supabase = createServerClient();
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  const currentUser = token ? await verifyToken(token) : null;
  const isTutor = currentUser?.role === 'tutor';

  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  // === FETCH TUTOR SESSION IDs ONCE ===
  let tutorSessionIds: string[] = [];
  if (isTutor && currentUser) {
    const { data } = await supabase
      .from('sessions')
      .select('id')
      .eq('tutor_id', currentUser.sub);
    tutorSessionIds = data?.map(s => s.id) || [];
  }
  const hasSessions = tutorSessionIds.length > 0;

  // === PRIMARY STATS ===

  // Total Episode (admin only)
  const { count: totalEpisodes } = isTutor
    ? { count: 0 }
    : await supabase.from('episodes').select('*', { count: 'exact', head: true });

  // Sesi Minggu Ini (filtered by tutor)
  let sessionsQuery = supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .gte('date', today)
    .lte('date', nextWeekStr);
  if (isTutor) sessionsQuery = sessionsQuery.eq('tutor_id', currentUser!.sub);
  const { count: sessionsThisWeek } = await sessionsQuery;

  // Sesi Minggu Ini count moved below, totalStudents computed later

  // Laporan Terkirim — total sepanjang waktu (konsisten dengan halaman Laporan & grafik status laporan)
  let reportsQuery = supabase
    .from('parent_reports')
    .select('*', { count: 'exact', head: true })
    .eq('wa_status', 'sent');
  if (isTutor) {
    if (hasSessions) {
      reportsQuery = reportsQuery.in('session_id', tutorSessionIds);
    } else {
      reportsQuery = reportsQuery.in('session_id', ['__none__']);
    }
  }
  const { count: reportsSent } = await reportsQuery;

  // === SECONDARY STATS ===

  // Attendance (filtered by tutor's sessions)
  let attendanceQuery = supabase
    .from('attendance')
    .select('status, session_id')
    .gte('date', thirtyDaysAgoStr);
  if (isTutor) {
    if (hasSessions) {
      attendanceQuery = attendanceQuery.in('session_id', tutorSessionIds);
    } else {
      attendanceQuery = attendanceQuery.in('session_id', ['__none__']);
    }
  }
  const { data: recentAttendance } = await attendanceQuery;
  const attendanceRate = recentAttendance?.length
    ? Math.round((recentAttendance.filter((a: any) => a.status === 'present' || a.status === 'late').length / recentAttendance.length) * 100)
    : 0;

  // Average Score (filtered by tutor's sessions)
  let assessmentQuery = supabase
    .from('assessments')
    .select('total_score, session_id');
  if (isTutor) {
    if (hasSessions) {
      assessmentQuery = assessmentQuery.in('session_id', tutorSessionIds);
    } else {
      assessmentQuery = assessmentQuery.in('session_id', ['__none__']);
    }
  }    const { data: avgScore } = await assessmentQuery;
  const averageScore = avgScore?.length
    ? Math.round(avgScore.reduce((sum: number, a: any) => sum + a.total_score, 0) / avgScore.length)
    : 0;

  // Total Siswa (filtered by tutor's sessions for tutors)
  let totalStudents: number;
  if (isTutor) {
    // Count distinct students from attendance in tutor's sessions
    if (hasSessions) {
      const { data: tutorStudents } = await supabase
        .from('attendance')
        .select('student_id')
        .in('session_id', tutorSessionIds);
      totalStudents = new Set(tutorStudents?.map((a: any) => a.student_id) || []).size;
    } else {
      totalStudents = 0;
    }
  } else {
    const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active');
    totalStudents = count ?? 0;
  }

  // Students with parent data (admin only)
  const { count: studentsWithParents } = isTutor
    ? { count: 0 }
    : await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .not('parent_name', 'is', null)
        .not('parent_phone', 'is', null);

  // Upcoming Sessions (filtered by tutor)
  let upcomingQuery = supabase
    .from('sessions')
    .select(`
      id, title, date, target_level, status,
      episodes(episode_number, title)
    `)
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(5);
  if (isTutor) upcomingQuery = upcomingQuery.eq('tutor_id', currentUser!.sub);
  const { data: upcomingSessions } = await upcomingQuery;

  // === STATS ARRAYS ===

  const primaryStats = [];

  if (!isTutor) {
    primaryStats.push({ label: 'Total Episode', value: totalEpisodes ?? 0, icon: Film, color: 'bg-blue-500' });
  }

  primaryStats.push(
    { label: 'Sesi Minggu Ini', value: sessionsThisWeek ?? 0, icon: Calendar, color: 'bg-green-500' },
    { label: 'Siswa', value: totalStudents ?? 0, icon: Users, color: 'bg-indigo-500' },
    { label: 'Laporan Terkirim', value: reportsSent ?? 0, icon: Send, color: 'bg-emerald-500' },
  );

  const secondaryStats = [
    { label: 'Kehadiran (30hr)', value: `${attendanceRate}%`, icon: BookOpen, color: 'bg-amber-500' },
    { label: 'Rata-rata Nilai', value: averageScore, icon: Star, color: 'bg-purple-500' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Dashboard</h2>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/sessions/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Sesi Baru
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/admin/sessions/new"
            className="flex items-center gap-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition font-medium text-sm border border-indigo-100 dark:border-indigo-800/30"
          >
            <Calendar className="w-4 h-4" />
            Buat Sesi
          </Link>
          {!isTutor && (
            <Link
              href="/admin/students/add"
              className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition font-medium text-sm border border-emerald-100 dark:border-emerald-800/30"
            >
              <Users className="w-4 h-4" />
              Tambah Siswa
            </Link>
          )}
          {!isTutor && (
            <Link
              href="/admin/episodes"
              className="flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition font-medium text-sm border border-purple-100 dark:border-purple-800/30"
            >
              <Film className="w-4 h-4" />
              Lihat Episode
            </Link>
          )}
          <Link
            href="/admin/reports"
            className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition font-medium text-sm border border-amber-100 dark:border-amber-800/30"
          >
            <FileText className="w-4 h-4" />
            Lihat Laporan
          </Link>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {primaryStats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-xl text-white shadow-sm`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
        {secondaryStats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-xl text-white shadow-sm`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <DashboardCharts />

      {/* Upcoming Sessions */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 mt-8">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Sesi Mendatang
        </h3>
        {upcomingSessions && upcomingSessions.length > 0 ? (
          <div className="space-y-3">
            {upcomingSessions.map((session: any) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">
                    {session.title || `EP-${String(session.episodes?.episode_number || '').padStart(3, '0')} - ${session.episodes?.title || '-'}`}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{new Date(session.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    {session.target_level && (
                      <span className="inline-block px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-medium capitalize">
                        {session.target_level}
                      </span>
                    )}
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      session.status === 'completed' ? 'bg-green-500' :
                      session.status === 'in_progress' ? 'bg-amber-500' :
                      session.status === 'cancelled' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`} />
                  </p>
                </div>
                <Link
                  href={`/admin/sessions/${session.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition shrink-0 ml-3"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Kelola
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada sesi mendatang</p>
            <Link
              href="/admin/sessions/new"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Buat sesi baru
            </Link>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="mt-6 flex justify-end">
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition font-medium text-sm border border-indigo-100 dark:border-indigo-800/30"
        >
          <FileText className="w-4 h-4" />
          Kelola Laporan
        </Link>
      </div>
    </div>
  );
}
