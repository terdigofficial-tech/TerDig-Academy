'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Save, Calendar, FileText, BookOpen, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

interface EpisodeOption {
  id: string;
  episode_number: number;
  title: string;
  terdig_level: string;
  label: string;
}

interface TutorOption {
  id: string;
  username: string;
  full_name: string;
}

export default function NewSessionPage() {
  const router = useRouter();
  const [episodes, setEpisodes] = useState<EpisodeOption[]>([]);
  const [tutors, setTutors] = useState<TutorOption[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'tutor' | null>(null);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    episode_id: '',
    target_level: '',
    title: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    tutor_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch episodes & user info on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch episodes
        const [epRes, meRes] = await Promise.all([
          fetch('/api/admin/episodes/dropdown'),
          fetch('/api/admin/auth/me'),
        ]);

        if (epRes.ok) {
          const epData = await epRes.json();
          setEpisodes(epData.data || []);
        } else {
          toast.error('Gagal memuat daftar episode');
        }

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.data) {
            setUserRole(meData.data.role);
            // Jika admin, fetch daftar tutor
            if (meData.data.role === 'admin') {
              const tutRes = await fetch('/api/admin/users?role=tutor&status=active');
              if (tutRes.ok) {
                const tutData = await tutRes.json();
                setTutors(tutData.data || []);
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        toast.error('Network error saat memuat data');
      }
      setLoadingEpisodes(false);
    };

    fetchData();
  }, []);

  // Auto-fill title when episode changes
  const handleEpisodeChange = (episodeId: string) => {
    const selected = episodes.find((ep) => ep.id === episodeId);
    setForm({
      ...form,
      episode_id: episodeId,
      title: selected
        ? `Kelas A - ${selected.title}`
        : '',
    });
    if (errors.episode_id) {
      setErrors({ ...errors, episode_id: '' });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.target_level) {
      newErrors.target_level = 'Pilih level terlebih dahulu';
    }
    if (!form.episode_id) {
      newErrors.episode_id = 'Pilih episode terlebih dahulu';
    }
    if (!form.title.trim()) {
      newErrors.title = 'Judul sesi wajib diisi';
    }
    if (!form.date) {
      newErrors.date = 'Tanggal sesi wajib diisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: form.episode_id,
          target_level: form.target_level,
          title: form.title,
          date: form.date,
          notes: form.notes || null,
          status: 'scheduled',
          tutor_id: userRole === 'admin' ? (form.tutor_id || null) : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Sesi berhasil dibuat!');
        router.push('/admin/sessions');
      } else {
        toast.error(data.error || 'Gagal membuat sesi');
        if (data.details) {
          data.details.forEach((d: any) => toast.error(`${d.field}: ${d.message}`));
        }
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/sessions"
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mb-2 text-sm font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke daftar sesi
        </Link>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
          Buat Sesi Baru
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Buat sesi kelas baru dengan memilih level dan episode yang sudah dipublikasikan
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pilih Level */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-500" />
            Pilih Level
          </h3>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Level <span className="text-red-500">*</span>
            </label>
            <select
              value={form.target_level}
              onChange={(e) => {
                setForm({ ...form, target_level: e.target.value });
                if (errors.target_level) setErrors({ ...errors, target_level: '' });
              }}
              className={`w-full border ${errors.target_level ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'} rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition`}
            >
              <option value="">-- Pilih Level --</option>
              <option value="pemula">🟢 Level Pemula (TK - Kelas 2)</option>
              <option value="menengah">🟡 Level Menengah (Kelas 3 - 4)</option>
              <option value="lanjut">🔴 Level Lanjut (Kelas 5 - 6)</option>
            </select>
            {errors.target_level && (
              <p className="text-xs text-red-500 mt-1">{errors.target_level}</p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              Level menentukan siswa mana yang akan muncul saat input absensi. Siswa dari beberapa kelas bisa digabung dalam satu level.
            </p>
          </div>
        </div>

        {/* Pilih Episode */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Pilih Episode
          </h3>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Episode <span className="text-red-500">*</span>
            </label>
            {loadingEpisodes ? (
              <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="text-sm text-slate-500 dark:text-slate-400">Memuat episode...</span>
              </div>
            ) : episodes.length === 0 ? (
              <div className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Belum ada episode yang tersedia.{' '}
                  <Link href="/admin/episodes/new" className="text-indigo-600 hover:underline font-medium">
                    Buat episode baru
                  </Link>
                </p>
              </div>
            ) : (
              <select
                value={form.episode_id}
                onChange={(e) => handleEpisodeChange(e.target.value)}
                className={`w-full border ${errors.episode_id ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'} rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition`}
              >
                <option value="">-- Pilih Episode --</option>
                {episodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.label}
                  </option>
                ))}
              </select>
            )}
            {errors.episode_id && (
              <p className="text-xs text-red-500 mt-1">{errors.episode_id}</p>
            )}
          </div>
        </div>

        {/* Detail Sesi */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Detail Sesi
          </h3>

          <div className="space-y-5">
            {/* Judul Sesi */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Judul Sesi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
                  if (errors.title) setErrors({ ...errors, title: '' });
                }}
                placeholder="Contoh: Kelas A - Mengenal Huruf A B C D E"
                className={`w-full border ${errors.title ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'} rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition`}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Tanggal Sesi */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tanggal Sesi <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => {
                    setForm({ ...form, date: e.target.value });
                    if (errors.date) setErrors({ ...errors, date: '' });
                  }}
                  className={`w-full border ${errors.date ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'} rounded-xl pl-10 pr-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition`}
                />
              </div>
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Catatan <span className="text-slate-400 dark:text-slate-500 font-normal">(opsional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Contoh: Bawa gunting dan kertas untuk sesi ini"
                rows={3}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Catatan ini akan muncul di halaman detail sesi untuk tutor
              </p>
            </div>

            {/* Pilih Tutor (Admin Only) */}
            {userRole === 'admin' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tutor <span className="text-slate-400 dark:text-slate-500 font-normal">(opsional)</span>
                </label>
                <select
                  value={form.tutor_id}
                  onChange={(e) => setForm({ ...form, tutor_id: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                >
                  <option value="">-- Tidak Di-assign (Unassigned) --</option>
                  {tutors.map((tutor) => (
                    <option key={tutor.id} value={tutor.id}>
                      {tutor.full_name} ({tutor.username})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Pilih tutor yang akan mengajar sesi ini. Kosongkan jika belum ditentukan.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/sessions"
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition px-4 py-2"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={submitting || loadingEpisodes}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Buat Sesi
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
