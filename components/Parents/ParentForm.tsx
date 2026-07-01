"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, X } from 'lucide-react';
import type { Parent, ParentFormData } from '@/types';

interface ParentFormProps {
  studentId: string;
  initialData?: Parent;
  onSuccess?: () => void;
  onCancel?: () => void;
  showStudentSelector?: boolean;
}

const RELATIONSHIP_OPTIONS = [
  { value: 'father', label: 'Ayah' },
  { value: 'mother', label: 'Ibu' },
  { value: 'guardian', label: 'Wali' },
  { value: 'other', label: 'Lainnya' },
];

export default function ParentForm({ studentId, initialData, onSuccess, onCancel, showStudentSelector }: ParentFormProps) {
  const [form, setForm] = useState({
    student_id: studentId || '',
    parent_name: initialData?.parent_name || '',
    phone_number: initialData?.phone_number || '',
    relationship: initialData?.relationship || 'father',
    is_primary: initialData?.is_primary ?? true,
    receive_whatsapp: initialData?.receive_whatsapp ?? true,
  });
  const [students, setStudents] = useState<Array<{ id: string; full_name: string }>>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!initialData;
  const showStudentPicker = showStudentSelector && !isEdit;

  // Load students for student selector
  useEffect(() => {
    if (!showStudentSelector) return;
    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await fetch('/api/admin/students');
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.data || [];
        setStudents(list);
      } catch (err) {
        console.error('Gagal load siswa:', err);
      }
      setLoadingStudents(false);
    };
    loadStudents();
  }, [showStudentSelector]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.parent_name.trim()) {
      newErrors.parent_name = 'Nama orang tua wajib diisi';
    }

    if (!form.phone_number.trim()) {
      newErrors.phone_number = 'Nomor WhatsApp wajib diisi';
    } else {
      const cleaned = form.phone_number.replace(/[\s\+\-]/g, '').replace(/^08/, '628');
      if (!cleaned.match(/^628\d{8,12}$/)) {
        newErrors.phone_number = 'Format nomor tidak valid. Gunakan 08xxx atau 628xxx (min. 10 digit)';
      }
    }

    if (!form.student_id && showStudentSelector) {
      newErrors.student_id = 'Pilih siswa terlebih dahulu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/admin/parents/${initialData.id}`
        : '/api/admin/parents';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success(isEdit ? 'Data orang tua berhasil diperbarui' : 'Data orang tua berhasil ditambahkan');
        onSuccess?.();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal menyimpan data');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Student Selector (hanya untuk tambah baru dari halaman daftar) */}
      {showStudentPicker && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Siswa <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: e.target.value })}
          >
            <option value="">-- Pilih Siswa --</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
          {errors.student_id && <p className="text-red-500 text-xs mt-1">{errors.student_id}</p>}
        </div>
      )}

      {/* Nama Orang Tua */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Nama Orang Tua <span className="text-red-500">*</span>
        </label>
        <input
          className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          placeholder="Nama lengkap orang tua"
          value={form.parent_name}
          onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
        />
        {errors.parent_name && <p className="text-red-500 text-xs mt-1">{errors.parent_name}</p>}
      </div>

      {/* Nomor WhatsApp */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Nomor WhatsApp <span className="text-red-500">*</span>
        </label>
        <input
          className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          placeholder="081234567890 atau 6281234567890"
          value={form.phone_number}
          onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
        />
        {errors.phone_number && <p className="text-red-500 text-xs mt-1">{errors.phone_number}</p>}
        <p className="text-xs text-slate-400 mt-1">Format otomatis ke 628xxx saat disimpan</p>
      </div>

      {/* Hubungan */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Hubungan</label>
        <select
          className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          value={form.relationship}
          onChange={(e) => setForm({ ...form, relationship: e.target.value as ParentFormData['relationship'] })}
        >
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3 pt-2">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={form.is_primary}
            onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
          />
          <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            Jadikan kontak utama untuk laporan
            <span className="block text-xs text-slate-400 mt-0.5">Primary parent akan menerima laporan otomatis</span>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={form.receive_whatsapp}
            onChange={(e) => setForm({ ...form, receive_whatsapp: e.target.checked })}
          />
          <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            Orang tua ingin menerima laporan via WhatsApp
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm flex items-center gap-2 transition"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
          ) : (
            isEdit ? 'Simpan Perubahan' : 'Tambah Orang Tua'
          )}
        </button>
      </div>
    </form>
  );
}
