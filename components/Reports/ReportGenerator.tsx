'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Copy, CheckCircle2, RefreshCw, FileText, Eye, Send, User, Phone, MessageSquare } from 'lucide-react';

interface StudentReport {
  id: string;
  student_id: string;
  session_id: string;
  report_type: string;
  content_json: { text: string } | null;
  wa_status: string;
  sent_at: string | null;
  created_at: string;
  students: { id: string; full_name: string; grade_id: string; parent_name: string; parent_phone: string } | null;
}

interface SessionStudent {
  id: string;
  full_name: string;
  current_level: number;
  parent_name?: string;
  parent_phone?: string;
}

interface ReportGeneratorProps {
  sessionId: string;
  students: SessionStudent[];
}

export default function ReportGenerator({ sessionId, students: initialStudents }: ReportGeneratorProps) {
  const [reports, setReports] = useState<Record<string, StudentReport>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [viewingReport, setViewingReport] = useState<StudentReport | null>(null);

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/reports`);
      const json = await res.json();
      const reportsList: StudentReport[] = json.data || [];
      const reportMap: Record<string, StudentReport> = {};
      reportsList.forEach((r) => {
        reportMap[r.student_id] = r;
      });
      setReports(reportMap);
    } catch (err) {
      console.error('Gagal fetch reports:', err);
      toast.error('Gagal memuat data laporan');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [sessionId]);

  const handleGenerate = async (studentId: string) => {
    setGenerating((prev) => ({ ...prev, [studentId]: true }));
    try {
      const res = await fetch('/api/admin/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, sessionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal generate');

      await fetchReports();
      toast.success('Laporan berhasil dibuat!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal generate laporan');
    }
    setGenerating((prev) => ({ ...prev, [studentId]: false }));
  };

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    const studentsWithoutReport = initialStudents.filter((s) => !reports[s.id]);

    for (const student of studentsWithoutReport) {
      setGenerating((prev) => ({ ...prev, [student.id]: true }));
      try {
        const res = await fetch('/api/admin/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: student.id, sessionId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Gagal generate');
      } catch (err: any) {
        toast.error(`Gagal generate untuk ${student.full_name}: ${err.message}`);
      }
      setGenerating((prev) => ({ ...prev, [student.id]: false }));
    }

    await fetchReports();
    toast.success('Laporan untuk semua siswa berhasil dibuat!');
    setGeneratingAll(false);
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Laporan disalin ke clipboard!');
    } catch {
      toast.error('Gagal menyalin. Coba copy manual.');
    }
  };

  const handleOpenWhatsApp = (phoneNumber: string, reportContent: string) => {
    // 1. Format nomor: hapus semua non-digit, ganti 0 diawal dengan 62
    const cleanNumber = phoneNumber
      .replace(/[^\d]/g, '')  // hapus semua non-digit
      .replace(/^0/, '62');    // ganti 0 di depan dengan 62 (Indonesia)

    // 2. Validasi format nomor (harus 628xxx, minimal 10 digit, maks 15 digit)
    if (!cleanNumber.match(/^628\d{7,13}$/)) {
      toast.error('Format nomor WhatsApp tidak valid: ' + phoneNumber);
      return;
    }

    // 3. Encode teks laporan untuk URL
    const encodedText = encodeURIComponent(reportContent);

    // 4. Buat URL WhatsApp dengan format wa.me (paling kompatibel untuk auto-fill)
    //    Format: https://wa.me/[nomor]?text=[pesan]
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedText}`;

    // 5. Buka di tab baru
    const newWindow = window.open(whatsappUrl, '_blank');

    // 6. Cek popup blocker (sync: Chrome bawaan langsung return null)
    if (!newWindow) {
      alert(
        'WhatsApp tidak bisa dibuka otomatis (popup diblokir).\n\n' +
        'Silakan lakukan manual:\n' +
        '1. Buka web.whatsapp.com\n' +
        '2. Copy nomor: ' + phoneNumber + '\n' +
        '3. Paste di kolom pencarian\n' +
        '4. Copy laporan dan paste di chat'
      );
      return;
    }

    // 7. Cek async popup blocker (window terbuka lalu langsung ditutup)
    setTimeout(() => {
      if (newWindow.closed) {
        alert(
          'WhatsApp tertutup otomatis.\n\n' +
          'Silakan lakukan manual:\n' +
          '1. Buka web.whatsapp.com\n' +
          '2. Copy nomor: ' + phoneNumber + '\n' +
          '3. Paste di kolom pencarian\n' +
          '4. Copy laporan dan paste di chat'
        );
      }
    }, 1500);
  };

  const handleMarkSent = async (reportId: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wa_status: 'sent' }),
      });
      if (res.ok) {
        await fetchReports();
        toast.success('Laporan ditandai sudah dikirim!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal update status');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    }
  };

  const getStatusBadge = (wa_status: string, sent_at: string | null) => {
    switch (wa_status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2.5 py-0.5 rounded-full font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Sudah Dikirim
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-medium">
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-medium">
            Belum Ada
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const studentsToShow = initialStudents;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate laporan personal untuk setiap siswa menggunakan AI. 
            Laporan bisa disalin dan dikirim manual via WhatsApp.
          </p>
        </div>
      </div>

      {/* Generate All Button */}
      {studentsToShow.length > 0 && (
        <button
          onClick={handleGenerateAll}
          disabled={generatingAll}
          className="w-full mb-4 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 disabled:opacity-50 font-medium text-sm transition flex items-center justify-center gap-2 border border-indigo-100 dark:border-indigo-800/30"
        >
          {generatingAll ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> AI sedang menulis laporan untuk semua siswa...</>
          ) : (
            <><FileText className="w-4 h-4" /> Generate Laporan untuk Semua Siswa</>
          )}
        </button>
      )}

      {/* Student List */}
      <div className="space-y-3">
        {studentsToShow.length === 0 ? (
          <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">
            Belum ada siswa aktif di sesi ini.
          </p>
        ) : (
          studentsToShow.map((student) => {
            const report = reports[student.id];
            const isGenerating = generating[student.id];

            return (
              <div
                key={student.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg transition-colors"
              >
                {/* Student Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                    {student.full_name}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>Level {student.current_level}</span>
                    {student.parent_name && (
                      <span>👤 {student.parent_name}</span>
                    )}
                    {student.parent_phone && (
                      <span>📱 {student.parent_phone}</span>
                    )}
                    {report && (
                      <>
                        {getStatusBadge(report.wa_status, report.sent_at)}
                        {report.sent_at && (
                          <span className="text-xs text-slate-400">
                            {new Date(report.sent_at).toLocaleDateString('id-ID')}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {!student.parent_phone && !isGenerating && !report && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚠️ Data orang tua belum diisi. 
                      <a href={`/admin/students/${student.id}/edit`} className="underline hover:text-amber-800 ml-1">
                        Edit siswa
                      </a>
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {isGenerating ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menulis...
                    </span>
                  ) : report ? (
                    <>
                      <button
                        onClick={() => setViewingReport(report)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Lihat
                      </button>
                      {report.content_json?.text && student.parent_phone && (
                        <button
                          onClick={() => handleOpenWhatsApp(student.parent_phone!, report.content_json!.text)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          WA
                        </button>
                      )}
                      <button
                        onClick={() => handleGenerate(student.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                        title="Regenerate"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleGenerate(student.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Generate Laporan
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Report Modal */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24 px-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewingReport(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6 z-10 max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Laporan {viewingReport.students?.full_name}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  {getStatusBadge(viewingReport.wa_status, viewingReport.sent_at)}
                  <span className="text-xs text-slate-400">
                    {new Date(viewingReport.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Report Content */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5 mb-4">
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {viewingReport.content_json?.text || '(Konten laporan tidak tersedia)'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleCopy(viewingReport.content_json?.text || '')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm transition"
              >
                <Copy className="w-4 h-4" />
                Copy ke Clipboard
              </button>

              {viewingReport.wa_status !== 'sent' && (
                <button
                  onClick={() => handleMarkSent(viewingReport.id)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium text-sm transition"
                >
                  <Send className="w-4 h-4" />
                  Tandai Sudah Dikirim
                </button>
              )}

              <button
                onClick={() => {
                  setViewingReport(null);
                  handleGenerate(viewingReport.student_id);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 font-medium text-sm transition"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>

              {viewingReport.content_json?.text && viewingReport.students?.parent_phone && (
                <button
                  onClick={() =>
                    handleOpenWhatsApp(
                      viewingReport.students!.parent_phone,
                      viewingReport.content_json!.text
                    )
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium text-sm transition ml-auto"
                >
                  <MessageSquare className="w-4 h-4" />
                  Buka WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
