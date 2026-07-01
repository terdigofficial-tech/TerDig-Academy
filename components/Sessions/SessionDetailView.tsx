'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, Save, CheckCircle2, MessageSquare } from 'lucide-react';
import { getYouTubeEmbedUrl, formatDate } from '@/lib/youtube';
import LevelBadge from '@/components/Episodes/LevelBadge';
import StatusBadge from '@/components/Episodes/StatusBadge';
import LoadingSkeleton from '@/components/Sessions/LoadingSkeleton';
import ErrorMessage from '@/components/Sessions/ErrorMessage';
import ReportGenerator from '@/components/Reports/ReportGenerator';
import toast, { Toaster } from 'react-hot-toast';

interface RubricItem {
  name: string;
  max_score: number;
}

interface EpisodeInfo {
  episode_number: number;
  title: string;
  terdig_level: string;
  roadmap_level: number;
  youtube_url?: string;
  youtube_urls?: string[];
  duration_minutes?: number;
  target_age?: string;
  theme?: string;
  facilitator_guide_url?: string;
  worksheet_url?: string;
  song_url?: string;
  rubric?: RubricItem[];
}

interface StudentInfo {
  id: string;
  full_name: string;
  current_level: number;
  grade_id?: string;
}

interface SessionData {
  id: string;
  title: string;
  date: string;
  status: string;
  notes?: string;
  target_level?: string;
  episodes: EpisodeInfo;
  students?: StudentInfo[];
  attendance?: any[];
  assessments?: any[];
}

export default function SessionDetailView({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Attendance state: { [studentId]: { status, notes } }
  const [attendanceData, setAttendanceData] = useState<Record<string, { status: string; notes: string }>>({});

  // Assessment state: { [studentId]: { scores: { [criterionName]: number }, notes: string } }
  const [assessmentData, setAssessmentData] = useState<Record<string, { scores: Record<string, number>; notes: string }>>({});

  const [saving, setSaving] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);

  // Handlers
  const handleAttendanceChange = useCallback((studentId: string, status: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  }, []);

  const handleAttendanceNotesChange = useCallback((studentId: string, notes: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }));
  }, []);

  const handleAssessmentScoreChange = useCallback((studentId: string, criterionName: string, score: number) => {
    setAssessmentData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        scores: { ...prev[studentId]?.scores, [criterionName]: score },
      },
    }));
  }, []);

  const handleAssessmentNotesChange = useCallback((studentId: string, notes: string) => {
    setAssessmentData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }));
  }, []);

  // Fetch all data on mount
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`);
      if (!res.ok) {
        setError(res.status === 404 ? 'Session tidak ditemukan' : 'Gagal memuat data session');
        return;
      }
      const result = await res.json();
      const data: SessionData = result.data;
      setSession(data);

      // Pre-fill existing attendance
      const attData: Record<string, { status: string; notes: string }> = {};
      data.attendance?.forEach((a: any) => {
        attData[a.student_id] = { status: a.status || 'present', notes: a.notes || '' };
      });
      setAttendanceData(attData);

      // Pre-fill existing assessments
      const asmtData: Record<string, { scores: Record<string, number>; notes: string }> = {};
      data.assessments?.forEach((a: any) => {
        asmtData[a.student_id] = { scores: a.rubric_scores || {}, notes: a.tutor_notes || '' };
      });
      setAssessmentData(asmtData);
    } catch (err: any) {
      console.error('Error fetching session:', err);
      setError('Gagal memuat data session: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save all attendance & assessments
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const students = session?.students || [];
      const attendance = students.map(s => ({
        student_id: s.id,
        status: attendanceData[s.id]?.status || 'present',
        notes: attendanceData[s.id]?.notes || null,
      }));

      const assessments = students.map(s => {
        const scores = assessmentData[s.id]?.scores || {};
        return {
          student_id: s.id,
          rubric_scores: scores,
          total_score: Object.values(scores).reduce((sum, sc) => sum + (Number(sc) || 0), 0),
          notes: assessmentData[s.id]?.notes || null,
        };
      });

      const res = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance, assessments }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.errors?.join(', ') || 'Gagal menyimpan data');
      }

      toast.success('Data kehadiran dan penilaian berhasil disimpan!');
    } catch (err: any) {
      console.error('Error saving:', err);
      toast.error(err.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  // Mark session as complete
  const handleMarkComplete = async () => {
    if (!confirm('Tandai sesi ini sebagai selesai? Data kehadiran dan penilaian akan disimpan terlebih dahulu.')) return;

    setMarkingComplete(true);
    try {
      // Save data dulu sebelum mark complete
      const students = session?.students || [];
      const attendance = students.map(s => ({
        student_id: s.id,
        status: attendanceData[s.id]?.status || 'present',
        notes: attendanceData[s.id]?.notes || null,
      }));

      const assessments = students.map(s => {
        const scores = assessmentData[s.id]?.scores || {};
        return {
          student_id: s.id,
          rubric_scores: scores,
          total_score: Object.values(scores).reduce((sum, sc) => sum + (Number(sc) || 0), 0),
          notes: assessmentData[s.id]?.notes || null,
        };
      });

      const res = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance,
          assessments,
          markComplete: true,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.errors?.join(', ') || 'Gagal mark complete');
      }

      toast.success('✅ Sesi berhasil ditandai selesai!');
      // Reload to update status
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      console.error('Error marking complete:', err);
      toast.error(err.message || 'Gagal mark complete');
    } finally {
      setMarkingComplete(false);
    }
  };

  // ─── RENDER ───

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!session) return null;

  const episode = session.episodes;
  if (!episode) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-amber-600">Data episode tidak tersedia.</p>
      </div>
    );
  }

  const videoUrls = episode.youtube_urls?.length
    ? episode.youtube_urls.filter(Boolean)
    : episode.youtube_url
      ? [episode.youtube_url]
      : [];

  const hasFiles = episode.facilitator_guide_url || episode.worksheet_url || episode.song_url;
  const rubric = episode.rubric;
  const totalMaxScore = rubric?.reduce((sum, item) => sum + item.max_score, 0) || 0;
  const students = session.students || [];
  const isCompleted = session.status === 'completed';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Toaster position="top-right" />

      {/* ===== HEADER ===== */}
      <div className="mb-8">
        <Link
          href="/admin/sessions"
          className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar Sesi
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
              {session.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-500 dark:text-slate-400">
              <span>
                📚 EP-{String(episode.episode_number).padStart(3, '0')} &mdash; {episode.title}
              </span>
              <span>📅 {formatDate(session.date)}</span>
              {episode.duration_minutes && <span>⏱️ {episode.duration_minutes} menit</span>}
            </div>
          </div>
          <StatusBadge status={session.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'} />
        </div>
      </div>

      {/* ===== GRID 2 KOLOM (info + files) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {videoUrls.length > 0 && (
            <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">📺 Video Pembelajaran</h2>
              </div>
              <div className="p-5 space-y-4">
                {videoUrls.map((url, index) => (
                  <div key={index}>
                    {url && (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Video {index + 1}
                          </span>
                        </div>
                        <div className="aspect-video bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                          <iframe
                            src={getYouTubeEmbedUrl(url)}
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            title={`Video ${index + 1} - EP-${episode.episode_number}`}
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <p className="text-xs text-slate-400 dark:text-slate-500">💡 Putar video ini di proyektor untuk siswa di kelas</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">📄 File Pendukung</h2>
            </div>
            <div className="p-5 space-y-3">
              {episode.facilitator_guide_url && (
                <DownloadCard href={episode.facilitator_guide_url} emoji="📘" title="Facilitator Guide" description="PDF — Panduan tutor untuk mengajar sesi ini" bgColor="bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30" textColor="text-blue-600 dark:text-blue-400" />
              )}
              {episode.worksheet_url && (
                <DownloadCard href={episode.worksheet_url} emoji="📝" title="Worksheet" description="PDF — Lembar kerja untuk siswa" bgColor="bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30" textColor="text-green-600 dark:text-green-400" />
              )}
              {episode.song_url && (
                <DownloadCard href={episode.song_url} emoji="🎵" title="Lagu Ice Breaking" description="MP3 — Untuk pembukaan kelas" bgColor="bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30" textColor="text-purple-600 dark:text-purple-400" />
              )}
              {!hasFiles && (
                <p className="text-slate-400 dark:text-slate-500 text-center py-8">
                  Belum ada file yang diupload untuk episode ini.<br />
                  <Link href="/admin/episodes" className="text-indigo-600 hover:underline text-sm mt-1 inline-block">Upload file di halaman episode</Link>
                </p>
              )}
            </div>
          </div>

          {session.notes && (
            <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">📝 Catatan Sesi</h2>
              </div>
              <div className="p-5">
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{session.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">ℹ️ Info Episode</h2>
            </div>
            <div className="p-5">
              <dl className="space-y-4 text-sm">
                <InfoRow label="Nomor Episode" value={`EP-${String(episode.episode_number).padStart(3, '0')}`} />
                <InfoRow label="Judul Episode" value={episode.title} />
                <InfoRow label="Level Target">
                  {session.target_level ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      session.target_level === 'pemula' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                      session.target_level === 'menengah' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                      'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                    }`}>
                      {session.target_level === 'pemula' ? '🟢' : session.target_level === 'menengah' ? '🟡' : '🔴'}
                      {' '}{session.target_level.charAt(0).toUpperCase() + session.target_level.slice(1)}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </InfoRow>
                <InfoRow label="Level TerDig">
                  <LevelBadge level={episode.terdig_level as 'pemula' | 'menengah' | 'lanjut'} />
                </InfoRow>
                <InfoRow label="Roadmap Level" value={`Level ${episode.roadmap_level}`} />
                <InfoRow label="Target Usia" value={episode.target_age || '-'} />
                <InfoRow label="Tema" value={episode.theme || '-'} />
                <InfoRow label="Durasi Video" value={episode.duration_minutes ? `${episode.duration_minutes} menit` : '-'} />
                <InfoRow label="Tanggal Sesi" value={formatDate(session.date)} />
              </dl>
            </div>
          </div>

          {episode.rubric && episode.rubric.length > 0 && (
            <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">📊 Rubrik Penilaian</h2>
              </div>
              <div className="p-5">
                <div className="space-y-2">
                  {episode.rubric.map((item, index) => (
                    <div key={index} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{index + 1}. {item.name}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Max: {item.max_score}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-600">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <span>Total Maksimal</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{totalMaxScore} poin</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">📋 Status Sesi</h2>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Status saat ini</span>
                <StatusBadge status={session.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'} />
              </div>
              <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">Siswa aktif: {students.length} orang</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION: ATTENDANCE & ASSESSMENT ===== */}
      <div className="mt-8 space-y-6 border-t border-slate-200 dark:border-slate-700 pt-8">

        {/* 7. Kehadiran Siswa */}
        <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              ✅ Kehadiran Siswa
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-2">({students.length} siswa)</span>
            </h2>
          </div>
          <div className="p-5">
            {students.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-center py-8">
                Belum ada siswa aktif. Tambahkan siswa terlebih dahulu.
              </p>
            ) : (
              <div className="space-y-3">
                {students.map((student) => {
                  const current = attendanceData[student.id];
                  return (
                    <div
                      key={student.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                    >
                      {/* Nama */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">
                          {student.full_name}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          Level {student.current_level}
                        </div>
                      </div>

                      {/* Radio buttons */}
                      <div className="flex items-center gap-4 shrink-0">
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                          <input
                            type="radio"
                            name={`att-${student.id}`}
                            value="present"
                            checked={current?.status === 'present' || !current?.status}
                            onChange={() => handleAttendanceChange(student.id, 'present')}
                            className="w-4 h-4 text-green-600 border-slate-300 focus:ring-green-500"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-green-600 transition-colors">✅ Hadir</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                          <input
                            type="radio"
                            name={`att-${student.id}`}
                            value="late"
                            checked={current?.status === 'late'}
                            onChange={() => handleAttendanceChange(student.id, 'late')}
                            className="w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-amber-600 transition-colors">⏰ Telat</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                          <input
                            type="radio"
                            name={`att-${student.id}`}
                            value="absent"
                            checked={current?.status === 'absent'}
                            onChange={() => handleAttendanceChange(student.id, 'absent')}
                            className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-red-600 transition-colors">❌ Absen</span>
                        </label>
                      </div>

                      {/* Notes */}
                      <input
                        type="text"
                        placeholder="Catatan..."
                        value={current?.notes || ''}
                        onChange={(e) => handleAttendanceNotesChange(student.id, e.target.value)}
                        className="w-full sm:w-44 px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 8. Penilaian Per Siswa */}
        {rubric && rubric.length > 0 && (
          <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                📊 Penilaian Per Siswa
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-2">(berdasarkan rubrik episode)</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Siswa</th>
                    {rubric.map((item, index) => (
                      <th key={index} className="px-3 py-3 text-center font-semibold text-slate-600 dark:text-slate-300 min-w-[90px]">
                        <div>{item.name}</div>
                        <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500">Max: {item.max_score}</div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center font-semibold text-slate-600 dark:text-slate-300 min-w-[60px]">Total</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 min-w-[120px]">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {students.map((student) => {
                    const scores = assessmentData[student.id]?.scores || {};
                    const total = rubric.reduce((sum, item) => sum + (Number(scores[item.name]) || 0), 0);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {student.full_name}
                        </td>
                        {rubric.map((item, index) => (
                          <td key={index} className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={item.max_score}
                              value={scores[item.name] ?? ''}
                              onChange={(e) => handleAssessmentScoreChange(student.id, item.name, Number(e.target.value))}
                              className="w-16 px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-center text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                              placeholder="0"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center font-semibold text-indigo-600 dark:text-indigo-400">
                          {total}
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            placeholder="Catatan..."
                            value={assessmentData[student.id]?.notes || ''}
                            onChange={(e) => handleAssessmentNotesChange(student.id, e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== SECTION: LAPORAN ORANG TUA ===== */}
        <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Laporan Orang Tua
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-2">(via AI)</span>
            </h2>
          </div>
          <div className="p-5">
            <ReportGenerator
              sessionId={sessionId}
              students={students}
            />
          </div>
        </div>

        {/* 9. Tombol Action */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleSaveAll}
            disabled={saving || students.length === 0}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl transition disabled:cursor-not-allowed shadow-sm"
          >
            {saving ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...</>
            ) : (
              <><Save className="w-5 h-5" /> Simpan Semua</>
            )}
          </button>

          {!isCompleted && (
            <button
              onClick={handleMarkComplete}
              disabled={markingComplete || students.length === 0}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition disabled:cursor-not-allowed shadow-sm"
            >
              {markingComplete ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Memproses...</>
              ) : (
                <><CheckCircle2 className="w-5 h-5" /> Mark Complete</>
              )}
            </button>
          )}

          {isCompleted && (
            <div className="flex items-center gap-2 px-5 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl text-sm font-medium border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-5 h-5" />
              Sesi ini sudah selesai
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Komponen Bantuan ─── */

function DownloadCard({
  href, emoji, title, description, bgColor, textColor,
}: {
  href: string; emoji: string; title: string; description: string; bgColor: string; textColor: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`flex items-center gap-4 p-4 rounded-lg border border-transparent ${bgColor} transition group`}>
      <span className="text-2xl shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-800 dark:text-slate-100 group-hover:underline">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</div>
      </div>
      <div className={`shrink-0 flex items-center gap-1 text-sm font-medium ${textColor}`}>
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Download</span>
      </div>
    </a>
  );
}

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="text-slate-500 dark:text-slate-400 shrink-0">{label}</dt>
      <dd className="font-medium text-slate-700 dark:text-slate-200 text-right">{children || value || '-'}</dd>
    </div>
  );
}
