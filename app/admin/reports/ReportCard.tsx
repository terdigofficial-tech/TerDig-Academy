"use client";

import { useState } from 'react';
import { Send, Eye, X, CheckCircle2, MessageSquare } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function ReportCard({ report }: { report: any }) {
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Support both old and new schema
  const studentName = report.students?.full_name || report.student_name || '-';
  const sessionInfo = report.sessions || {};
  const episodeInfo = sessionInfo.episodes || {};
  const materi = episodeInfo.episode_number
    ? `EP-${String(episodeInfo.episode_number).padStart(3, '0')} - ${episodeInfo.title}`
    : sessionInfo.title || report.production_kits?.modules?.filename || '-';
  const waStatus = report.wa_status;

  const handleSendWA = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/admin/reports/send-wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id })
      });
      if (res.ok) {
        toast.success('WA terkirim (simulasi)');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal mengirim');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    }
    setSending(false);
  };

  const handleOpenWA = () => {
    const phone = report.students?.parent_phone || report.parent_phone || '';
    const text = report.content_json?.text || '';
    if (!phone) {
      toast.error('Nomor WhatsApp tidak tersedia');
      return;
    }
    const cleanNumber = phone.replace(/[^\d]/g, '').replace(/^0/, '62');
    if (!cleanNumber.match(/^628\d{7,13}$/)) {
      toast.error('Format nomor tidak valid');
      return;
    }
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`, '_blank');
    toast.success('WhatsApp dibuka');
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="bg-white dark:bg-slate-800/90 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{studentName}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Materi: {materi}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 flex items-center gap-2">
              <span>{new Date(report.created_at).toLocaleDateString('id-ID')}</span>
              <span>•</span>
              <span>{report.report_type}</span>
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                waStatus === 'sent' 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              }`}>
                {waStatus === 'sent' ? '✅ Terkirim' : '⏳ Draft'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={() => setShowPreview(true)}
              className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
            {waStatus !== 'sent' && (
              <button
                onClick={handleSendWA}
                disabled={sending}
                className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                {sending ? '...' : 'Kirim WA'}
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line line-clamp-3">
          {report.content_json?.text || '-'}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowPreview(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6 z-10 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{studentName}</h3>
                <p className="text-sm text-slate-500">{materi}</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5 mb-4">
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {report.content_json?.text || '(Konten laporan tidak tersedia)'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(report.content_json?.text || '');
                  toast.success('Disalin!');
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium transition"
              >
                Copy Laporan
              </button>
              {report.students?.parent_phone && (
                <button
                  onClick={handleOpenWA}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-medium transition flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Buka WhatsApp
                </button>
              )}
              {waStatus !== 'sent' && (
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/admin/reports/${report.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ wa_status: 'sent' }),
                    });
                    if (res.ok) {
                      toast.success('Ditandai terkirim!');
                      setShowPreview(false);
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium transition flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Tandai Terkirim
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
