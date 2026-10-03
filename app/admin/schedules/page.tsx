'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Plus, X, Loader2, Play, Pencil, Trash2, Power } from 'lucide-react';
import { formatDays } from '@/lib/schedule';
import { formatTimeRange as fmtTime } from '@/lib/session-time';
import toast, { Toaster } from 'react-hot-toast';

interface Schedule {
  id: string;
  title: string;
  target_level: string;
  episode_id: string;
  tutor_id?: string | null;
  days_of_week: number[];
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  capacity: number;
  valid_from: string;
  valid_until?: string | null;
  is_active: boolean;
  users?: { id: string; username: string; full_name: string } | null;
  episodes?: { id: string; episode_number: number; title: string } | null;
}

const DAY_OPTIONS = [
  { v: 1, label: 'Senin' }, { v: 2, label: 'Selasa' }, { v: 3, label: 'Rabu' },
  { v: 4, label: 'Kamis' }, { v: 5, label: 'Jumat' }, { v: 6, label: 'Sabtu' }, { v: 0, label: 'Minggu' },
];

const LEVELS = [
  { v: 'pemula', label: 'Pemula (TK–Kelas 2)' },
  { v: 'menengah', label: 'Menengah (Kelas 3–4)' },
  { v: 'lanjut', label: 'Lanjut (Kelas 5–6)' },
];

const emptyForm = {
  title: '', target_level: '', episode_id: '', tutor_id: '',
  days_of_week: [] as number[], start_time: '', end_time: '',
  room: '', capacity: 8, valid_from: '', valid_until: '', is_active: true,
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sRes, tRes, eRes] = await Promise.all([
        fetch('/api/admin/recurring-schedules'),
        fetch('/api/admin/users?role=tutor'),
        fetch('/api/admin/episodes/dropdown'),
      ]);
      if (sRes.ok) setSchedules((await sRes.json()).data || []);
      if (tRes.ok) {
        const tj = await tRes.json();
        setTutors(tj.data || tj || []);
      }
      if (eRes.ok) setEpisodes((await eRes.json()).data || []);
      // Daftar ruangan yang pernah dipakai (untuk saran)
      const sessRes = await fetch('/api/admin/sessions?pageSize=100');
      if (sessRes.ok) {
        const sj = await sessRes.json();
        const r = [...new Set((sj.data || []).map((s: any) => (s.room || '').trim()).filter(Boolean))];
        setRooms(r as string[]);
      }
    } catch (e) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, valid_from: new Date().toISOString().split('T')[0] });
    setShowForm(true);
  };

  const openEdit = (s: Schedule) => {
    setEditing(s);
    setForm({
      title: s.title, target_level: s.target_level, episode_id: s.episode_id,
      tutor_id: s.tutor_id || '', days_of_week: s.days_of_week,
      start_time: s.start_time || '', end_time: s.end_time || '',
      room: s.room || '', capacity: s.capacity,
      valid_from: s.valid_from, valid_until: s.valid_until || '', is_active: s.is_active,
    });
    setShowForm(true);
  };

  const toggleDay = (v: number) => {
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(v)
        ? f.days_of_week.filter((d) => d !== v)
        : [...f.days_of_week, v],
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Judul wajib diisi');
    if (!form.target_level) return toast.error('Pilih level');
    if (!form.episode_id) return toast.error('Pilih episode awal');
    if (form.days_of_week.length === 0) return toast.error('Pilih minimal 1 hari');
    if (!form.valid_from) return toast.error('Tanggal mulai wajib diisi');

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        target_level: form.target_level,
        episode_id: form.episode_id,
        tutor_id: form.tutor_id || null,
        days_of_week: form.days_of_week,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        room: form.room.trim() || null,
        capacity: Number(form.capacity) || 8,
        valid_from: form.valid_from,
        valid_until: form.valid_until || null,
        is_active: form.is_active,
      };
      const res = await fetch(
        editing ? `/api/admin/recurring-schedules/${editing.id}` : '/api/admin/recurring-schedules',
        { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      );
      const j = await res.json();
      if (!res.ok) {
        const det = j.details?.map((d: any) => d.message).join('; ');
        throw new Error(det || j.error || 'Gagal menyimpan');
      }
      toast.success(editing ? 'Jadwal rutin diperbarui' : 'Jadwal rutin dibuat');
      setShowForm(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async (s: Schedule) => {
    if (!confirm(`Generate sesi untuk "${s.title}"?\nSesi dibuat untuk setiap ${formatDays(s.days_of_week)} pada rentang ${s.valid_from} → ${s.valid_until || '(tanpa batas)'}.\nTanggal yang sudah ada dilewati otomatis.`)) return;
    setGenerating(s.id);
    try {
      const res = await fetch(`/api/admin/recurring-schedules/${s.id}/generate`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Gagal generate');
      let msg = `Berhasil membuat ${j.created} sesi`;
      if (j.skipped_existing > 0) msg += `, ${j.skipped_existing} tanggal sudah ada (dilewati)`;
      if (j.skipped_conflict?.length > 0) msg += `, ${j.skipped_conflict.length} bentrok (dilewati)`;
      toast.success(msg, { duration: 5000 });
      if (j.skipped_conflict?.length > 0) {
        console.warn('Konflik generate:', j.skipped_conflict);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(null);
    }
  };

  const handleDelete = async (s: Schedule) => {
    if (!confirm(`Hapus jadwal rutin "${s.title}"?\nSesi yang sudah ter-generate TIDAK ikut terhapus.`)) return;
    const res = await fetch(`/api/admin/recurring-schedules/${s.id}`, { method: 'DELETE' });
    if (!res.ok) return toast.error('Gagal menghapus');
    toast.success('Jadwal rutin dihapus');
    fetchAll();
  };

  const toggleActive = async (s: Schedule) => {
    const res = await fetch(`/api/admin/recurring-schedules/${s.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !s.is_active }),
    });
    if (!res.ok) return toast.error('Gagal mengubah status');
    toast.success(s.is_active ? 'Jadwal dinonaktifkan' : 'Jadwal diaktifkan');
    fetchAll();
  };

  const inputCls = 'w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition';
  const labelCls = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <Toaster position="top-center" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-indigo-600" /> Jadwal Rutin
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pola jadwal mingguan (mis. Kelas A setiap Senin & Kamis). Generate untuk membuat sesi-sesinya sekaligus.
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition">
          <Plus className="w-4 h-4" /> Buat Jadwal Rutin
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Memuat...</div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
          <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Belum ada jadwal rutin</p>
          <p className="text-sm text-slate-400 mt-1">Buat pola mingguan sekali, generate sesi untuk satu semester sekaligus.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((s) => (
            <div key={s.id} className={`bg-white dark:bg-slate-800 rounded-xl border p-5 shadow-sm ${s.is_active ? 'border-slate-100 dark:border-slate-700' : 'border-slate-200 dark:border-slate-600 opacity-70'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-slate-800 dark:text-white">{s.title}</h2>
                    {!s.is_active && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 font-medium">Nonaktif</span>}
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium capitalize">{s.target_level}</span>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 space-y-0.5">
                    <div>🗓️ {formatDays(s.days_of_week)} · ⏰ {fmtTime(s.start_time, s.end_time) || '—'} {s.room && <>· 📍 {s.room}</>}</div>
                    <div>👥 Kapasitas {s.capacity} anak {s.users && <>· 👨‍🏫 {s.users.full_name || s.users.username}</>} {s.episodes && <>· 🎬 EP-{String(s.episodes.episode_number).padStart(3, '0')}</>}</div>
                    <div className="text-xs">Periode: {s.valid_from} → {s.valid_until || 'tanpa batas'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <button onClick={() => handleGenerate(s)} disabled={generating === s.id || !s.is_active}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition">
                    {generating === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Generate Sesi
                  </button>
                  <button onClick={() => toggleActive(s)} title={s.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                    <Power className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(s)} title="Ubah"
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(s)} title="Hapus"
                    className="p-2 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{editing ? 'Ubah Jadwal Rutin' : 'Buat Jadwal Rutin'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Judul *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="mis. Kelas A Calistung" className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Level *</label>
                  <select value={form.target_level} onChange={(e) => setForm({ ...form, target_level: e.target.value })} className={inputCls}>
                    <option value="">— Pilih —</option>
                    {LEVELS.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Episode awal *</label>
                  <select value={form.episode_id} onChange={(e) => setForm({ ...form, episode_id: e.target.value })} className={inputCls}>
                    <option value="">— Pilih episode —</option>
                    {episodes.map((ep: any) => <option key={ep.id} value={ep.id}>EP-{String(ep.episode_number).padStart(3, '0')} — {ep.title}</option>)}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">Episode per sesi bisa diubah manual setelah generate.</p>
                </div>
              </div>
              <div>
                <label className={labelCls}>Hari *</label>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((d) => (
                    <button key={d.v} type="button" onClick={() => toggleDay(d.v)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition ${form.days_of_week.includes(d.v)
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-300'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className={labelCls}>Jam mulai</label>
                  <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Jam selesai</label>
                  <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ruangan</label>
                  <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="mis. Ruang 1" list="room-list" className={inputCls} />
                  <datalist id="room-list">{rooms.map((r) => <option key={r} value={r} />)}</datalist>
                </div>
                <div>
                  <label className={labelCls}>Kapasitas</label>
                  <input type="number" min={1} max={30} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Tutor</label>
                  <select value={form.tutor_id} onChange={(e) => setForm({ ...form, tutor_id: e.target.value })} className={inputCls}>
                    <option value="">— Belum ditentukan —</option>
                    {tutors.map((t: any) => <option key={t.id} value={t.id}>{t.full_name || t.username}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Berlaku dari *</label>
                  <input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Sampai <span className="font-normal text-slate-400">(opsional)</span></label>
                  <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className={inputCls} />
                </div>
              </div>
              <p className="text-xs text-slate-400">Maksimal rentang 26 minggu (1 semester). Generate bisa diulang — tanggal yang sudah ada dilewati otomatis.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">Batal</button>
                <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editing ? 'Simpan Perubahan' : 'Buat Jadwal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
