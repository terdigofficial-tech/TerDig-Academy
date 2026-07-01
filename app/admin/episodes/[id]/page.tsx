'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import EpisodeForm from '@/components/Episodes/EpisodeForm';
import type { Episode } from '@/types';

export default function EditEpisodePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        const res = await fetch(`/api/admin/episodes/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Episode tidak ditemukan');
          } else {
            setError('Gagal memuat data episode');
          }
          return;
        }
        const data = await res.json();
        setEpisode(data);
      } catch (err: any) {
        console.error('Error fetching episode:', err);
        setError('Gagal memuat data episode');
      }
      setLoading(false);
    };

    fetchEpisode();
  }, [id]);

  const handleSave = async (formData: any) => {
    try {
      const res = await fetch(`/api/admin/episodes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Episode berhasil diperbarui!');
        setEpisode(data);
      } else if (res.status === 409) {
        toast.error(data.error || 'Nomor episode sudah digunakan');
      } else {
        toast.error(data.error || 'Gagal menyimpan');
        if (data.details) {
          data.details.forEach((d: any) => toast.error(`${d.field}: ${d.message}`));
        }
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    }
  };

  const handlePublish = async () => {
    try {
      const res = await fetch(`/api/admin/episodes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });

      if (res.ok) {
        const data = await res.json();
        setEpisode(data);
        toast.success('✅ Episode berhasil dipublikasikan!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal publish');
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Yakin ingin meng-archive episode ini?')) return;

    try {
      const res = await fetch(`/api/admin/episodes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });

      if (res.ok) {
        const data = await res.json();
        setEpisode(data);
        toast.success('Episode di-archive');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal archive');
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Memuat data episode...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-700 dark:text-red-300 mb-2">Error</h3>
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!episode) return null;

  return (
    <div>
      <Toaster position="top-right" />
      <EpisodeForm
        mode="edit"
        initialData={episode}
        onSave={handleSave}
        onPublish={handlePublish}
        onArchive={handleArchive}
      />
    </div>
  );
}
