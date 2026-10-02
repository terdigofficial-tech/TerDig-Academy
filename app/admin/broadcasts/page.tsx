'use client';

import { useState, useEffect, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Megaphone, Plus, X, Trash2, Copy, MessageSquare, CheckCircle2, ArrowLeft, Loader2, Users } from 'lucide-react';
import type { Broadcast, BroadcastRecipient, Program, Grade } from '@/types';
import { broadcastProgress } from '@/lib/broadcast';

function cleanWaNumber(phone: string): string | null {
  const n = (phone || '').replace(/[^\d]/g, '').replace(/^0/, '62');
  return /^628\d{7,13}$/.test(n) ? n : null;
}

const inputClass =
  'w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition';
const labelClass = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5';

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selPrograms, setSelPrograms] = useState<string[]>([]);
  const [selGrades, setSelGrades] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const [detail, setDetail] = useState<(Broadcast & { recipients: BroadcastRecipient[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/broadcasts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat broadcast');
      setBroadcasts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat broadcast');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBroadcasts();
    fetch('/api/admin/programs').then((r) => r.json()).then((d) => setPrograms(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/admin/grades').then((r) => r.json()).then((d) => setGrades(Array.isArray(d) ? d : [])).catch(() => {});
  }, [fetchBroadcasts]);

  const toggle = (list: string[], id: string, set: (v: string[]) => void) => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, program_ids: selPrograms, grade_ids: selGrades }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat broadcast');
      toast.success(`Broadcast dibuat untuk ${data.total} penerima`);
      setTitle(''); setMessage(''); setSelPrograms([]); setSelGrades([]);
      setShowComposer(false);
      fetchBroadcasts();
      openDetail(data.id);
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat broadcast');
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat detail');
      setDetail(data);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus broadcast ini beserta semua data penerimanya?')) return;
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus');
      toast.success('Broadcast dihapus');
      if (detail?.id === id) setDetail(null);
      fetchBroadcasts();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus');
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Pesan disalin!');
    } catch {
      toast.error('Gagal menyalin');
    }
  };

  const handleSendWA = async (r: BroadcastRecipient) => {
    const waNumber = cleanWaNumber(r.parent_phone || '');
    if (!waNumber) {
      toast.error('Nomor WhatsApp tidak valid: ' + (r.parent_phone || '-'));
      return;
    }
    setSendingId(r.id);
    try {
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(r.personalized_text)}`, '_blank');
      const res = await fetch(`/api/admin/broadcasts/${detail!.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: r.id }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Gagal merekam pengiriman');
      }
      setDetail((d) =>
        d ? { ...d, recipients: d.recipients.map((x) => (x.id === r.id ? { ...x, status: 'sent' as const, sent_at: new Date().toISOString() } : x)) } : d,
      );
      toast.success('WA terbuka & ditandai terkirim!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim WA');
    } finally {
      setSendingId(null);
    }
  };

  if (detail) {
    const prog = broadcastProgress(
      detail.recipients.filter((r) => r.status === 'sent').length,
      detail.recipients.length,
    );
    return (
      <div>
        <Toaster position="top-right" />
        <button onClick={() => { setDetail(null); fetchBroadcasts(); }} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
        </button>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{detail.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Dibuat {new Date(detail.created_at || '').toLocaleString('id-ID')} • {prog.sent}/{prog.total} terkirim ({prog.percent}%)
            </p>
          </div>
          <button onClick={() => handleDelete(detail.id)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition">
            <Trash2 className="w-3.5 h-3.5" /> Hapus
          </button>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mb-6">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${prog.percent}%` }} />
        </div>

        {detailLoading ? (
          <p className="text-sm text-slate-500">Memuat penerima...</p>
        ) : (
          <div className="space-y-3">
            {detail.recipients.map((r) => {
              const sent = r.status === 'sent';
              const open = expandedId === r.id;
              return (
                <div key={r.id} className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">{r.students?.full_name || '-'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{r.parent_name || '-'} • {r.parent_phone || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sent ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Terkirim
                        </span>
                      ) : (
                        <>
                          <button onClick={() => handleCopy(r.personalized_text)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 transition">
                            <Copy className="w-3.5 h-3.5" /> Salin
                          </button>
                          <button
                            onClick={() => handleSendWA(r)}
                            disabled={sendingId === r.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                          >
                            {sendingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                            WA
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setExpandedId(open ? null : r.id)} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-2 hover:underline">
                    {open ? 'Sembunyikan pesan' : 'Lihat pesan'}
                  </button>
                  {open && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {r.personalized_text}
                    </div>
                  )}
                </div>
              );
            })}
            {detail.recipients.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">Tidak ada penerima.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-indigo-600" /> Broadcast Pengumuman
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kirim pengumuman personal ke WhatsApp orang tua, satu per satu.</p>
        </div>
        <button
          onClick={() => setShowComposer(!showComposer)}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm"
        >
          {showComposer ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showComposer ? 'Tutup' : 'Buat Broadcast'}
        </button>
      </div>

      {showComposer && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Judul *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Libur Nasional 17 Agustus" className={inputClass} maxLength={120} required />
            </div>
            <div>
              <label className={labelClass}>Isi Pesan *</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} maxLength={1500} required
                placeholder={'Contoh:\n\nHalo Bapak/Ibu {nama_wali} 👋\n\nKami informasikan bahwa kelas ananda {nama_anak} libur pada ...\n\nTerima kasih 🙏\n— TerDig Academy'}
                className={inputClass} />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Placeholder: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{nama_anak}'}</code> <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{nama_wali}'}</code> — otomatis terisi per penerima.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Filter Program <span className="font-normal text-slate-400">(kosong = semua)</span></label>
                <div className="flex flex-wrap gap-2">
                  {programs.map((p) => (
                    <button type="button" key={p.id} onClick={() => toggle(selPrograms, p.id, setSelPrograms)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${selPrograms.includes(p.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Filter Kelas <span className="font-normal text-slate-400">(kosong = semua)</span></label>
                <div className="flex flex-wrap gap-2">
                  {grades.map((g) => (
                    <button type="button" key={g.id} onClick={() => toggle(selGrades, g.id, setSelGrades)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${selGrades.includes(g.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button disabled={creating} className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium text-sm transition">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              {creating ? 'Membuat...' : 'Buat & Generate Penerima'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 text-center py-12">Memuat broadcast...</p>
      ) : broadcasts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
          <Megaphone className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="font-medium text-slate-600 dark:text-slate-300">Belum ada broadcast</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Klik “Buat Broadcast” untuk pengumuman pertama.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {broadcasts.map((b) => {
            const prog = broadcastProgress(b.sent || 0, b.total || 0);
            return (
              <div key={b.id} className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{b.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(b.created_at || '').toLocaleString('id-ID')}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(b.id)} title="Hapus" className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${prog.percent}%` }} />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">{prog.sent}/{prog.total}</span>
                </div>
                <button onClick={() => openDetail(b.id)} className="mt-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                  Buka & kirim →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
