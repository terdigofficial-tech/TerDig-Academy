"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { Upload, FileText, Loader2 } from 'lucide-react';
import type { Grade } from '@/types';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const router = useRouter();

  // Fetch grades saat mount
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const res = await fetch('/api/admin/grades');
        if (res.ok) {
          const data = await res.json();
          setGrades(data || []);
        }
      } catch (err) {
        console.error('Error fetching grades:', err);
      }
    };
    
    fetchGrades();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.docx')) setFile(droppedFile);
    else toast.error('Hanya file .docx yang diterima');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Pilih file dulu');
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (selectedGradeId) {
      formData.append('grade_id', selectedGradeId);
    }
    try {
      const res = await fetch('/api/admin/materials/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        toast.success('Berhasil diproses!');
        router.push('/admin/materials');
      } else toast.error(data.error || 'Gagal');
    } catch {
      toast.error('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Toaster position="top-right" />
      <h2 className="text-3xl font-bold text-slate-800 mb-8">Upload Modul Baru</h2>
      <form onSubmit={handleSubmit}>
        {/* Dropdown Kelas */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Kelas Target (Opsional)</label>
          <select 
            className="w-full border rounded-xl px-4 py-2.5 text-slate-800"
            value={selectedGradeId}
            onChange={e => setSelectedGradeId(e.target.value)}
          >
            <option value="">-- Semua Kelas --</option>
            {grades.map(grade => (
              <option key={grade.id} value={grade.id}>{grade.name}</option>
            ))}
          </select>
        </div>

        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white'
          } ${file ? 'border-green-400 bg-green-50' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="w-12 h-12 text-green-500" />
              <p className="font-medium text-slate-800">{file.name}</p>
              <button type="button" onClick={() => setFile(null)} className="text-red-500 text-sm hover:underline">Hapus</button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-slate-400" />
              <p className="font-medium text-slate-700">Seret & lepas file .docx di sini</p>
              <p className="text-sm text-slate-600">atau</p>
              <label className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition cursor-pointer text-sm font-medium">
                Pilih File
                <input type="file" accept=".docx" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          )}
        </div>
        <button
          disabled={!file || loading}
          className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Memproses dengan AI...
            </>
          ) : (
            'Upload & Generate'
          )}
        </button>
      </form>
    </div>
  );
}
