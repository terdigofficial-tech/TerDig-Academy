'use client';

import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import EpisodeForm from '@/components/Episodes/EpisodeForm';

export default function NewEpisodePage() {
  const router = useRouter();

  const handleSave = async (formData: any) => {
    try {
      const res = await fetch('/api/admin/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Episode EP-${String(data.episode_number).padStart(2, '0')} berhasil dibuat!`);
        router.push(`/admin/episodes/${data.id}`);
      } else if (res.status === 409) {
        toast.error(data.error || 'Episode dengan nomor ini sudah ada');
      } else {
        toast.error(data.error || 'Gagal membuat episode');
        if (data.details) {
          data.details.forEach((d: any) => toast.error(`${d.field}: ${d.message}`));
        }
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <EpisodeForm mode="create" onSave={handleSave} />
    </div>
  );
}
