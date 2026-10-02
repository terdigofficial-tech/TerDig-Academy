'use client';

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { CalendarRange, Loader2, Copy, MessageSquare, CheckCircle2, Search, Sparkles } from 'lucide-react';

interface BiweeklyStudent {
  student_id: string;
  full_name: string;
  parent_name: string;
  parent_phone: string;
  grade_name: string;
  program_name: string;
  tier_label: string;
  session_count: number;
  present: number;
  late: number;
  absent: number;
  attendance_rate: number;
  avg_score: number | null;
  strengths: string[];
  improvements: string[];
  episodes: { number: number | null; title: string }[];
  narrative: string;
}

function cleanWaNumber(phone: string): string | null {
  const n = (phone || '').replace(/[^\d]/g, '').replace(/^0/, '62');
  return /^628\d{7,13}$/.test(n) ? n : null;
}

export default function BiweeklyTab() {
  const [preset, setPreset] = useState<'14' | '30' | 'custom'>('14');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [periodLabel, setPeriodLabel] = useState('');
  const [students, setStudents] = useState<BiweeklyStudent[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    if (preset === '14') {
      const f = new Date(today); f.setDate(f.getDate() - 13);
      params.set('from', iso(f)); params.set('to', iso(today));
    } else if (preset === '30') {
      const f = new Date(today); f.setDate(f.getDate() - 29);
      params.set('from', iso(f)); params.set('to', iso(today));
    } else {
      if (from) params.set('from', from);
      if (to) params.set('to', to);
    }
    return params;
  }, [preset, from, to]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/biweekly?${buildParams().toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal membuat rekap');
      setStudents(json.students || []);
      setPeriodLabel(`${json.period?.from || ''} – ${json.period?.to || ''}`);
      setLoaded(true);
      setSentIds(new Set());
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat rekap');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Rekap disalin!');
    } catch {
      toast.error('Gagal menyalin');
    }
  };

  const handleSendWA = async (s: BiweeklyStudent) => {
    const waNumber = cleanWaNumber(s.parent_phone);
    if (!waNumber) {
      toast.error('Nomor WhatsApp tidak valid: ' + (s.parent_phone || '-'));
      return;
    }
    setSendingId(s.student_id);
    try {
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(s.narrative)}`, '_blank');
      const params = buildParams();
      const res = await fetch('/api/admin/biweekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: s.student_id,
          from: params.get('from'),
          to: params.get('to'),
          text: s.narrative,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Gagal merekam pengiriman');
      }
      setSentIds((prev) => new Set(prev).add(s.student_id));
      toast.success('WA terbuka & rekap ditandai terkirim!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim WA');
    } finally {
      setSendingId(null);
    }
  };

  const filtered = students.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      {/* Panel periode */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarRange className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Periode Rekap</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
            {([
              { v: '14', label: '14 hari terakhir' },
              { v: '30', label: '30 hari terakhir' },
              { v: 'custom', label: 'Kustom' },
            ] as const).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setPreset(o.v)}
                className={`px-4 py-2.5 text-sm font-medium transition ${
                  preset === o.v
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
              />
              <span className="text-slate-400 text-sm">s/d</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
              />
            </>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Menyusun...' : 'Buat Rekap'}
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Rekap disusun otomatis dari absensi &amp; nilai rubrik semua sesi pada periode — narasi siap kirim via WhatsApp.
        </p>
      </div>

      {/* Hasil */}
      {!loaded ? (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
          <CalendarRange className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="font-medium text-slate-600 dark:text-slate-300">Belum ada rekap</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Pilih periode lalu klik “Buat Rekap”.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Periode <span className="font-semibold">{periodLabel}</span> • {filtered.length} siswa aktif
              {sentIds.size > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-medium"> • {sentIds.size} terkirim</span>}
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari siswa..."
                className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((s) => {
              const sent = sentIds.has(s.student_id);
              const isOpen = expanded === s.student_id;
              return (
                <div key={s.student_id} className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{s.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {s.grade_name} • {s.program_name} • {s.tier_label}
                      </p>
                    </div>
                    {sent && (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full font-medium shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Terkirim
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3 text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium">
                      {s.session_count} sesi
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                      Hadir {s.attendance_rate}%
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                      Nilai {s.avg_score !== null ? `${s.avg_score}/100` : '–'}
                    </span>
                  </div>

                  {s.episodes.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                      📖 {s.episodes.slice(0, 4).map((e) => (e.number ? `EP-${e.number}` : e.title)).join(', ')}
                      {s.episodes.length > 4 ? ` +${s.episodes.length - 4}` : ''}
                    </p>
                  )}

                  <button
                    onClick={() => setExpanded(isOpen ? null : s.student_id)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-2 hover:underline"
                  >
                    {isOpen ? 'Sembunyikan pratinjau' : 'Lihat pratinjau pesan'}
                  </button>
                  {isOpen && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {s.narrative}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleCopy(s.narrative)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                    >
                      <Copy className="w-3.5 h-3.5" /> Salin
                    </button>
                    <button
                      onClick={() => handleSendWA(s)}
                      disabled={sendingId === s.student_id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      {sendingId === s.student_id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <MessageSquare className="w-3.5 h-3.5" />}
                      Kirim via WA
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
              Tidak ada siswa yang cocok dengan pencarian.
            </div>
          )}
        </>
      )}
    </div>
  );
}
