'use client';

import { useState } from 'react';
import { Loader2, ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { Episode, ActivityLink } from '@/types';
import RubricEditor from './RubricEditor';
import FileUploader from './FileUploader';
import YouTubePreview from './YouTubePreview';
import StatusBadge from './StatusBadge';

interface EpisodeFormProps {
  mode: 'create' | 'edit';
  initialData?: Episode;
  onSave: (formData: any) => Promise<void>;
  onPublish?: () => Promise<void>;
  onArchive?: () => Promise<void>;
}

export default function EpisodeForm({ mode, initialData, onSave, onPublish, onArchive }: EpisodeFormProps) {
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [form, setForm] = useState({
    episode_number: initialData?.episode_number || 1,
    title: initialData?.title || '',
    terdig_level: initialData?.terdig_level || 'pemula' as const,
    roadmap_level: initialData?.roadmap_level || 1,
    duration_minutes: initialData?.duration_minutes || undefined as number | undefined,
    target_age: initialData?.target_age || '',
    theme: initialData?.theme || '',
    keyword_seo: initialData?.keyword_seo || '',
    notes: initialData?.notes || '',
    status: initialData?.status || 'not_started',
  });

  const [youtubeUrls, setYoutubeUrls] = useState<string[]>(
    initialData?.youtube_urls?.length
      ? [...initialData.youtube_urls]
      : initialData?.youtube_url
        ? [initialData.youtube_url]
        : ['']
  );

  const [rubric, setRubric] = useState(initialData?.rubric || []);
  const [activityLinks, setActivityLinks] = useState<ActivityLink[]>(
    initialData?.activity_links || []
  );
  const [fileUrls, setFileUrls] = useState({
    facilitator_guide_url: initialData?.facilitator_guide_url || '',
    worksheet_url: initialData?.worksheet_url || '',
    song_url: initialData?.song_url || '',
    thumbnail_url: initialData?.thumbnail_url || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) newErrors.title = 'Judul wajib diisi';
    if (form.episode_number < 1 || form.episode_number > 60) {
      newErrors.episode_number = 'Nomor episode harus 1-60';
    }
    if (form.duration_minutes && form.duration_minutes < 1) {
      newErrors.duration_minutes = 'Durasi harus positif';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSave({
        ...form,
        rubric,
        youtube_urls: youtubeUrls.filter(url => url.trim() !== ''),
        facilitator_guide_url: fileUrls.facilitator_guide_url || '',
        worksheet_url: fileUrls.worksheet_url || '',
        song_url: fileUrls.song_url || '',
        thumbnail_url: fileUrls.thumbnail_url || '',
        activity_links: activityLinks.filter(link => link.url.trim() !== ''),
      });
    } catch (err: any) {
      console.error('Save error:', err);
    }
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!confirm('Yakin ingin mempublikasikan episode ini?')) return;
    setPublishing(true);
    try {
      await onPublish?.();
    } catch (err: any) {
      console.error('Publish error:', err);
    }
    setPublishing(false);
  };

  const updateField = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/admin/episodes"
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mb-2 text-sm font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
          </Link>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
            {mode === 'create' ? 'Tambah Episode Baru' : `Edit Episode EP-${String(initialData?.episode_number || '').padStart(2, '0')}`}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {mode === 'edit' && initialData && (
            <>
              <StatusBadge status={initialData.status} />
              {initialData.status !== 'published' && initialData.status !== 'archived' && (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition flex items-center gap-2"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Publish
                </button>
              )}
              {initialData.status === 'published' && (
                <button
                  onClick={onArchive}
                  className="bg-amber-600 text-white px-4 py-2 rounded-xl hover:bg-amber-700 text-sm font-medium transition"
                >
                  Archive
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Informasi Dasar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Episode Number */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nomor Episode <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={form.episode_number}
                onChange={(e) => updateField('episode_number', parseInt(e.target.value) || 1)}
                className={`w-full border ${errors.episode_number ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'} rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition`}
              />
              {errors.episode_number && <p className="text-xs text-red-500 mt-1">{errors.episode_number}</p>}
            </div>

            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Judul Episode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Masukkan judul episode"
                className={`w-full border ${errors.title ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'} rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition`}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* TerDig Level */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Level TerDig <span className="text-red-500">*</span>
              </label>
              <select
                value={form.terdig_level}
                onChange={(e) => updateField('terdig_level', e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
              >
                <option value="pemula">Pemula</option>
                <option value="menengah">Menengah</option>
                <option value="lanjut">Lanjut</option>
              </select>
            </div>

            {/* Roadmap Level */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Roadmap Level <span className="text-red-500">*</span>
              </label>
              <select
                value={form.roadmap_level}
                onChange={(e) => updateField('roadmap_level', parseInt(e.target.value))}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
              >
                {[1, 2, 3, 4, 5].map((l) => (
                  <option key={l} value={l}>Level {l}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
              >
                <option value="not_started">Belum Dimulai</option>
                <option value="in_progress">Dalam Progres</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Durasi (menit)</label>
              <input
                type="number"
                min={1}
                value={form.duration_minutes || ''}
                onChange={(e) => updateField('duration_minutes', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Contoh: 15"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
              />
            </div>

            {/* Target Age */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Target Usia</label>
              <input
                type="text"
                value={form.target_age}
                onChange={(e) => updateField('target_age', e.target.value)}
                placeholder="Contoh: 6-7 tahun"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
              />
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tema</label>
              <input
                type="text"
                value={form.theme}
                onChange={(e) => updateField('theme', e.target.value)}
                placeholder="Contoh: Bilangan, Tata Surya"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
              />
            </div>

            {/* Keyword SEO */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Keyword SEO</label>
              <textarea
                value={form.keyword_seo}
                onChange={(e) => updateField('keyword_seo', e.target.value)}
                placeholder="Kata kunci untuk SEO, pisahkan dengan koma"
                rows={2}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
              />
            </div>
          </div>
        </div>

        {/* YouTube URLs - Multiple */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Video YouTube</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Anda bisa menambahkan 1, 2, 3 video atau lebih. Kosongkan jika tidak ada.</p>

          <div className="space-y-3">
            {youtubeUrls.map((url, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Video {index + 1}
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      const newUrls = [...youtubeUrls];
                      newUrls[index] = e.target.value;
                      setYoutubeUrls(newUrls);
                    }}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                  />
                </div>
                {youtubeUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setYoutubeUrls(youtubeUrls.filter((_, i) => i !== index))}
                    className="mt-6 px-3 py-2.5 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition shrink-0"
                    title="Hapus video ini"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setYoutubeUrls([...youtubeUrls, ''])}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl transition"
          >
            + Tambah Video Lain
          </button>

          {/* Preview for first valid URL */}
          {youtubeUrls.find(u => u.trim().startsWith('http')) && (
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Pratayang (video pertama):</p>
              <YouTubePreview url={youtubeUrls.find(u => u.trim().startsWith('http')) || ''} />
            </div>
          )}
        </div>

        {/* File Uploads */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">File Pendukung</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUploader
              episodeId={initialData?.id || 'new'}
              fileType="facilitator_guide"
              currentUrl={fileUrls.facilitator_guide_url}
              label="Facilitator Guide (PDF)"
              accept=".pdf"
              onUploadComplete={(url) => setFileUrls({ ...fileUrls, facilitator_guide_url: url })}
            />
            <FileUploader
              episodeId={initialData?.id || 'new'}
              fileType="worksheet"
              currentUrl={fileUrls.worksheet_url}
              label="Worksheet (PDF)"
              accept=".pdf"
              onUploadComplete={(url) => setFileUrls({ ...fileUrls, worksheet_url: url })}
            />
            <FileUploader
              episodeId={initialData?.id || 'new'}
              fileType="song"
              currentUrl={fileUrls.song_url}
              label="Song (MP3)"
              accept=".mp3,audio/mpeg"
              onUploadComplete={(url) => setFileUrls({ ...fileUrls, song_url: url })}
            />
            <FileUploader
              episodeId={initialData?.id || 'new'}
              fileType="thumbnail"
              currentUrl={fileUrls.thumbnail_url}
              label="Thumbnail (JPG/PNG)"
              accept=".jpg,.jpeg,.png,.webp"
              onUploadComplete={(url) => setFileUrls({ ...fileUrls, thumbnail_url: url })}
            />
          </div>
        </div>

        {/* Activity Links */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
            🎮 Activity Links (Game, Quiz, dll)
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Tambahkan link game/aktivitas interaktif untuk episode ini
          </p>

          <div className="space-y-3">
            {activityLinks.map((link, index) => (
              <div key={index} className="border border-slate-200 dark:border-slate-600 rounded-xl p-4 bg-slate-50 dark:bg-slate-700/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Type Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tipe</label>
                    <select
                      value={link.type}
                      onChange={(e) => {
                        const newLinks = [...activityLinks];
                        newLinks[index] = { ...link, type: e.target.value as ActivityLink['type'] };
                        setActivityLinks(newLinks);
                      }}
                      className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                    >
                      <option value="game">🎮 Game</option>
                      <option value="quiz">📝 Quiz</option>
                      <option value="activity">🎨 Activity</option>
                      <option value="song">🎵 Song</option>
                      <option value="resource">📚 Resource</option>
                    </select>
                  </div>

                  {/* Label Input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Label</label>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => {
                        const newLinks = [...activityLinks];
                        newLinks[index] = { ...link, label: e.target.value };
                        setActivityLinks(newLinks);
                      }}
                      placeholder="Contoh: Game Huruf A-E"
                      className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                    />
                  </div>

                  {/* URL Input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">URL</label>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...activityLinks];
                        newLinks[index] = { ...link, url: e.target.value };
                        setActivityLinks(newLinks);
                      }}
                      placeholder="https://..."
                      className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                    />
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => setActivityLinks(activityLinks.filter((_, i) => i !== index))}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition shrink-0"
                >
                  <Trash2 size={14} /> Hapus
                </button>
              </div>
            ))}
          </div>

          {/* Add Button */}
          <button
            type="button"
            onClick={() => setActivityLinks([...activityLinks, { type: 'game', label: '', url: '' }])}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl transition"
          >
            <Plus size={16} /> Tambah Activity Link
          </button>
        </div>

        {/* Rubric Editor */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Rubrik Penilaian</h3>
          <RubricEditor value={rubric} onChange={setRubric} />
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Catatan</h3>
          <textarea
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Catatan internal untuk episode ini..."
            rows={4}
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/episodes"
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition px-4 py-2"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {mode === 'create' ? 'Simpan Episode' : 'Simpan Perubahan'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
