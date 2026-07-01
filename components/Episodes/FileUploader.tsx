'use client';

import { useState } from 'react';
import { Upload, FileText, Music, Image, Loader2, X, CheckCircle } from 'lucide-react';

interface FileUploaderProps {
  episodeId: string;
  fileType: 'facilitator_guide' | 'worksheet' | 'song' | 'thumbnail';
  currentUrl?: string;
  label: string;
  accept: string;
  onUploadComplete: (url: string) => void;
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  facilitator_guide: <FileText className="w-5 h-5" />,
  worksheet: <FileText className="w-5 h-5" />,
  song: <Music className="w-5 h-5" />,
  thumbnail: <Image className="w-5 h-5" />,
};

const LABEL_COLORS: Record<string, string> = {
  facilitator_guide: 'border-indigo-200 dark:border-indigo-700 hover:border-indigo-400',
  worksheet: 'border-emerald-200 dark:border-emerald-700 hover:border-emerald-400',
  song: 'border-purple-200 dark:border-purple-700 hover:border-purple-400',
  thumbnail: 'border-amber-200 dark:border-amber-700 hover:border-amber-400',
};

export default function FileUploader({ episodeId, fileType, currentUrl, label, accept, onUploadComplete }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState(currentUrl || '');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);

    try {
      const res = await fetch(`/api/admin/episodes/upload?id=${episodeId}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setFileUrl(data.url);
        onUploadComplete(data.url);
      } else {
        console.error('Upload error:', data.error);
        alert(data.error || 'Gagal upload file');
      }
    } catch (err: any) {
      console.error('Network error:', err);
      alert('Network error: ' + err.message);
    }

    setUploading(false);
  };

  const removeFile = () => {
    setFileUrl('');
    onUploadComplete('');
  };

  return (
    <div className={`border-2 border-dashed rounded-xl p-4 transition-all ${LABEL_COLORS[fileType]} ${uploading ? 'opacity-60' : ''}`}>
      <label className="flex flex-col items-center gap-2 cursor-pointer">
        {FILE_ICONS[fileType]}
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-indigo-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </div>
        ) : fileUrl ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="truncate max-w-[200px]">{fileUrl.split('/').pop()}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Klik untuk pilih file ({accept})
          </span>
        )}
        <input
          type="file"
          accept={accept}
          onChange={handleUpload}
          className="hidden"
          disabled={uploading}
        />
      </label>

      {fileUrl && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 hover:underline"
          >
            Lihat file &rarr;
          </a>
          <button
            type="button"
            onClick={removeFile}
            className="text-xs text-red-500 hover:underline flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Hapus
          </button>
        </div>
      )}

      {fileType === 'thumbnail' && fileUrl && (
        <div className="mt-3">
          <img
            src={fileUrl}
            alt="Thumbnail preview"
            className="w-full h-32 object-cover rounded-lg border dark:border-slate-600"
          />
        </div>
      )}
    </div>
  );
}
