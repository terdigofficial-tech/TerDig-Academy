"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { Grade, Program } from '@/types';
import { TIERS, TIER_LABELS } from '@/lib/programs';

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [form, setForm] = useState({
    full_name: '',
    parent_name: '',
    parent_phone: '',
    current_level: 1,
    grade_id: '',
    program_id: '',
    tier: 'reguler',
    status: 'active'
  });

  const [grades, setGrades] = useState<Grade[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch student data dan grades/programs saat mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentRes, gradesRes, programsRes] = await Promise.all([
          fetch(`/api/admin/students/${id}`),
          fetch('/api/admin/grades'),
          fetch('/api/admin/programs')
        ]);

        if (studentRes.ok) {
          const studentData = await studentRes.json();
          setForm({
            full_name: studentData.full_name || '',
            parent_name: studentData.parent_name || '',
            parent_phone: studentData.parent_phone || '',
            current_level: studentData.current_level || 1,
            grade_id: studentData.grade_id || '',
            program_id: studentData.program_id || '',
            tier: studentData.tier || 'reguler',
            status: studentData.status || 'active'
          });
        } else {
          toast.error('Gagal memuat data siswa');
        }

        if (gradesRes.ok) {
          const gradesData = await gradesRes.json();
          setGrades(gradesData || []);
        }

        if (programsRes.ok) {
          const programsData = await programsRes.json();
          setPrograms(programsData || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success('Siswa berhasil diperbarui');
        router.push('/admin/students');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Gagal menyimpan');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Toaster position="top-right" />
      <Link href="/admin/students" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </Link>
      <h2 className="text-3xl font-bold text-slate-800 mb-8">Edit Siswa</h2>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800/90 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-5 transition-colors">
        <div>
          <label htmlFor="edit_full_name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
          <input id="edit_full_name"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            placeholder="Nama Lengkap"
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="edit_parent_name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Wali</label>
          <input id="edit_parent_name"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            placeholder="Nama Wali"
            value={form.parent_name}
            onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="edit_parent_phone" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Telepon Wali <span className="text-red-500">*</span></label>
          <input id="edit_parent_phone"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            placeholder="Telepon Wali (628xx)"
            required
            value={form.parent_phone}
            onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="edit_level" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Level Awal</label>
          <input id="edit_level"
            type="number"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            value={form.current_level}
            onChange={(e) => setForm({ ...form, current_level: parseInt(e.target.value) || 1 })}
          />
        </div>

        <div>
          <label htmlFor="edit_grade" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kelas (Opsional)</label>
          <select id="edit_grade"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            value={form.grade_id}
            onChange={(e) => setForm({ ...form, grade_id: e.target.value })}
          >
            <option value="">-- Pilih Kelas --</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>{grade.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="edit_program" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Program (Opsional)</label>
          <select id="edit_program"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            value={form.program_id}
            onChange={(e) => setForm({ ...form, program_id: e.target.value })}
          >
            <option value="">-- Pilih Program --</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>{program.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="edit_tier" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tier</label>
          <select id="edit_tier"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: e.target.value })}
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>{TIER_LABELS[t]}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Tingkatan harga/langganan siswa.</p>
        </div>

        <div>
          <label htmlFor="edit_status" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
          <select id="edit_status"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>

        <button
          disabled={saving}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Menyimpan...
            </>
          ) : (
            'Simpan Perubahan'
          )}
        </button>
      </form>

    </div>
  );
}
