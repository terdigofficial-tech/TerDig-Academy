'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, FileText, Send, Clock, Calendar, Eye, RefreshCw, Download, X, MessageSquare, Filter, ChevronDown, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import BiweeklyTab from '@/components/Reports/BiweeklyTab';

interface Report {
  id: string;
  student_id: string;
  session_id: string;
  report_type: string;
  content_json: { text: string; meta?: { from?: string; to?: string } } | null;
  wa_status: 'pending' | 'sent' | 'failed';
  sent_at: string | null;
  created_at: string;
  student_name: string;
  parent_name: string;
  parent_phone: string;
  student_level: number;
  session_title: string;
  session_date: string;
  target_level: string;
  episode_number: number | null;
  episode_title: string;
  terdig_level: string;
}

interface Stats {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  thisMonth: number;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, sent: 0, pending: 0, failed: 0, thisMonth: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [sendingWA, setSendingWA] = useState<string | null>(null);
  const [tab, setTab] = useState<'session' | 'biweekly'>('session');
  const [attFrom, setAttFrom] = useState('');
  const [attTo, setAttTo] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Gagal memuat laporan');

      const data: Report[] = json.data || [];
      setReports(data);

      // Calculate stats
      const total = data.length;
      const sent = data.filter(r => r.wa_status === 'sent').length;
      const pending = data.filter(r => r.wa_status === 'pending').length;
      const failed = data.filter(r => r.wa_status === 'failed').length;
      const thisMonth = data.filter(r => {
        const reportDate = new Date(r.created_at);
        const now = new Date();
        return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
      }).length;

      setStats({ total, sent, pending, failed, thisMonth });
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      toast.error(err.message || 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSendWA = async (report: Report) => {
    setSendingWA(report.id);
    try {
      if (report.parent_phone) {
        // Format nomor: hapus non-digit, ganti 0 awal dengan 62
        const cleanNumber = report.parent_phone
          .replace(/[^\d]/g, '')
          .replace(/^0/, '62');

        if (!cleanNumber.match(/^628\d{7,13}$/)) {
          toast.error('Format nomor WhatsApp tidak valid: ' + report.parent_phone);
          setSendingWA(null);
          return;
        }

        const text = report.content_json?.text || '';
        const encodedText = encodeURIComponent(text);
        const waUrl = `https://wa.me/${cleanNumber}?text=${encodedText}`;

        window.open(waUrl, '_blank');

        // Tandai sebagai sent
        const markRes = await fetch(`/api/admin/reports/${report.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wa_status: 'sent' }),
        });

        if (markRes.ok) {
          toast.success('WA terbuka & laporan ditandai terkirim!');
          fetchReports();
        }
      } else {
        toast.error('Nomor WhatsApp orang tua tidak tersedia');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim WA');
    }
    setSendingWA(null);
  };

  const handleMarkSent = async (reportId: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wa_status: 'sent' }),
      });
      if (res.ok) {
        toast.success('Laporan ditandai sudah dikirim!');
        fetchReports();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal update status');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2.5 py-0.5 rounded-full font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Terkirim
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-medium">
            <Clock className="w-3 h-3" />
            Draft
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2.5 py-0.5 rounded-full font-medium">
            <AlertCircle className="w-3 h-3" />
            Gagal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-medium">
            {status}
          </span>
        );
    }
  };

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      pemula: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
      menengah: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      lanjut: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    };
    const color = colors[level] || 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400';
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${color}`}>
        {level || '-'}
      </span>
    );
  };

  return (
    <div>
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Laporan Orang Tua</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReports}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <a
            href="/api/admin/reports/export/pdf"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </a>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-2 mb-6">
        {([
          { v: 'session', label: 'Laporan Per Sesi' },
          { v: 'biweekly', label: 'Rekap 2 Mingguan' },
        ] as const).map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${
              tab === t.v
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'biweekly' ? (
        <BiweeklyTab />
      ) : (
      <>

      {/* Ekspor kehadiran Excel */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 mb-6 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Download className="w-4 h-4 text-indigo-500" /> Ekspor Kehadiran (Excel)
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Dari</label>
          <input type="date" value={attFrom} onChange={(e) => setAttFrom(e.target.value)}
            className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Sampai</label>
          <input type="date" value={attTo} onChange={(e) => setAttTo(e.target.value)}
            className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
        </div>
        <a
          href={`/api/admin/exports/attendance?from=${attFrom}&to=${attTo}`}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition text-sm font-medium"
        >
          <Download className="w-4 h-4" /> Unduh
        </a>
        <p className="text-[11px] text-slate-400 w-full">Kosongkan tanggal untuk 30 hari terakhir.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Total Laporan"
          value={stats.total}
          icon={FileText}
          color="bg-blue-500"
        />
        <StatCard
          title="Terkirim"
          value={stats.sent}
          icon={Send}
          color="bg-green-500"
        />
        <StatCard
          title="Draft"
          value={stats.pending}
          icon={Clock}
          color="bg-amber-500"
        />
        <StatCard
          title="Gagal"
          value={stats.failed}
          icon={AlertCircle}
          color="bg-red-500"
        />
        <StatCard
          title="Bulan Ini"
          value={stats.thisMonth}
          icon={Calendar}
          color="bg-purple-500"
        />
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama siswa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100 transition"
            />
          </div>

          {/* Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition"
            >
              <Filter className="w-4 h-4" />
              {statusFilter ? `Status: ${statusFilter}` : 'Semua Status'}
              <ChevronDown className="w-3 h-3" />
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-20 overflow-hidden">
                {['', 'pending', 'sent', 'failed'].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
                      statusFilter === s
                        ? 'text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/20'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {s === '' ? 'Semua Status' : s === 'pending' ? 'Draft' : s === 'sent' ? 'Terkirim' : 'Gagal'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Memuat laporan...</p>
            </div>
          </div>
        ) : reports.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Belum Ada Laporan
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 max-w-md mx-auto">
              Laporan akan muncul setelah Anda generate laporan dari halaman detail sesi.
              Kunjungi halaman Sesi untuk mulai generate laporan siswa.
            </p>
            <a
              href="/admin/sessions"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm"
            >
              <Calendar className="w-4 h-4" />
              Buka Halaman Sesi
            </a>
          </div>
        ) : (
          /* Reports Table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3 pr-4">Tanggal</th>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3 pr-4">Siswa</th>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3 pr-4">Sesi / Episode</th>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3 pr-4">Level</th>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3 pr-4">Status</th>
                  <th className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3.5 pr-4">
                      <span className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatDate(report.created_at)}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {report.student_name}
                      </span>
                      {report.parent_name && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          👤 {report.parent_name}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      {report.report_type === 'biweekly' ? (
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                            Rekap 2 Mingguan
                          </span>
                          {report.content_json?.meta?.from && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                              {report.content_json.meta.from} – {report.content_json.meta.to}
                            </p>
                          )}
                        </div>
                      ) : (
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        {report.episode_number ? (
                          <span>
                            EP-{String(report.episode_number).padStart(3, '0')} - {report.episode_title}
                          </span>
                        ) : (
                          report.session_title
                        )}
                      </div>
                      )}
                      {report.session_date && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatDate(report.session_date)}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      {getLevelBadge(report.target_level || report.terdig_level)}
                    </td>
                    <td className="py-3.5 pr-4">
                      {getStatusBadge(report.wa_status)}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setPreviewReport(report)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition"
                          title="Lihat Laporan"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </button>
                        {report.wa_status !== 'sent' && (
                          <>
                            <button
                              onClick={() => handleSendWA(report)}
                              disabled={sendingWA === report.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-50 transition"
                              title="Kirim via WhatsApp"
                            >
                              {sendingWA === report.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <MessageSquare className="w-3.5 h-3.5" />
                              )}
                              WA
                            </button>
                            <button
                              onClick={() => handleMarkSent(report.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                              title="Tandai Terkirim"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        {!loading && reports.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Menampilkan {reports.length} laporan
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Hover pada baris untuk melihat aksi
            </p>
          </div>
        )}
      </div>

      </>
      )}

      {/* Preview Modal */}
      {previewReport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 pb-8">
          <div className="fixed inset-0 bg-black/50" onClick={() => setPreviewReport(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col z-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span className="truncate">{previewReport.student_name}</span>
                </h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {getStatusBadge(previewReport.wa_status)}
                  <span className="text-xs text-slate-400">
                    {formatDate(previewReport.created_at)}
                  </span>
                  {previewReport.episode_number && (
                    <span className="text-xs text-slate-400">
                      • EP-{String(previewReport.episode_number).padStart(3, '0')} - {previewReport.episode_title}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition shrink-0 ml-4"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5">
                <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {previewReport.content_json?.text || '(Konten laporan tidak tersedia)'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 p-6 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => {
                  const text = previewReport.content_json?.text || '';
                  navigator.clipboard.writeText(text);
                  toast.success('Laporan disalin ke clipboard!');
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm transition"
              >
                <FileText className="w-4 h-4" />
                Copy Laporan
              </button>

              {previewReport.wa_status !== 'sent' && previewReport.parent_phone && (
                <button
                  onClick={() => {
                    handleSendWA(previewReport);
                  }}
                  disabled={sendingWA === previewReport.id}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium text-sm transition disabled:opacity-50"
                >
                  {sendingWA === previewReport.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  Kirim via WA
                </button>
              )}

              {previewReport.wa_status !== 'sent' && (
                <button
                  onClick={() => handleMarkSent(previewReport.id)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 font-medium text-sm transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Tandai Terkirim
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close filter */}
      {showFilterMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color }: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`${color} p-3 rounded-xl text-white shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
