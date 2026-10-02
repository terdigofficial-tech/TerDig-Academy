"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { Grade, Program } from '@/types';
import { TIERS, TIER_LABELS, suggestProgramIdForGradeLevel, curriculumPhaseForGradeLevel, CURRICULUM_PHASE_LABELS } from '@/lib/programs';

export default function AddStudentPage() {
  const [form, setForm] = useState({
    full_name: '',
    parent_name: '',
    parent_phone: '',
    current_level: 1,
    grade_id: '',
    program_id: '',
    tier: 'reguler' as string,
  });
  const [programTouched, setProgramTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const router = useRouter();

  // Fetch grades dan programs saat mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gradesRes, programsRes] = await Promise.all([
          fetch('/api/admin/grades'),
          fetch('/api/admin/programs')
        ]);
        
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
      }
    };
    
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/admin/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      toast.success('Siswa berhasil ditambahkan');
      router.push('/admin/students');
    } else {
      const data = await res.json();
      toast.error(data.error || 'Gagal');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto">
      <Toaster position="top-right" />
      <Link href="/admin/students" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 text-sm font-medium"><ArrowLeft className="w-4 h-4" /> Kembali</Link>
      <h2 className="text-3xl font-bold text-slate-800 mb-8">Tambah Siswa</h2>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800/90 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-5 transition-colors">
        <div>
          <label htmlFor="full_name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
          <input id="full_name"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            placeholder="Nama Lengkap"
            required
            onChange={e => setForm({...form, full_name: e.target.value})}
          />
        </div>
        <div>
          <label htmlFor="parent_name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Wali</label>
          <input id="parent_name"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            placeholder="Nama Wali"
            onChange={e => setForm({...form, parent_name: e.target.value})}
          />
        </div>
        <div>
          <label htmlFor="parent_phone" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Telepon Wali <span className="text-red-500">*</span></label>
          <input id="parent_phone"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            placeholder="Telepon Wali (628xx)"
            required
            onChange={e => setForm({...form, parent_phone: e.target.value})}
          />
        </div>
        <div>
          <label htmlFor="current_level" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Level Awal</label>
          <input id="current_level"
            type="number"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            value={form.current_level}
            onChange={e => setForm({...form, current_level: parseInt(e.target.value) || 1})}
            placeholder="Level Awal"
          />
        </div>
        
        <div>
          <label htmlFor="grade_id" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kelas (Opsional)</label>
          <select id="grade_id"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            value={form.grade_id}
            onChange={e => {
              const gradeId = e.target.value;
              const grade = grades.find(g => g.id === gradeId);
              const suggested = grade ? suggestProgramIdForGradeLevel(grade.level, programs) : null;
              setForm({
                ...form,
                grade_id: gradeId,
                // Isi otomatis program sesuai fase kelas bila belum dipilih manual
                program_id: (!programTouched && suggested) ? suggested : form.program_id,
              });
            }}
          >
            <option value="">-- Pilih Kelas --</option>
            {grades.map(grade => (
              <option key={grade.id} value={grade.id}>{grade.name}</option>
            ))}
          </select>
          {(() => {
            const grade = grades.find(g => g.id === form.grade_id);
            const phase = grade ? curriculumPhaseForGradeLevel(grade.level) : null;
            return phase ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Kelas ini masuk jalur kurikulum {CURRICULUM_PHASE_LABELS[phase]}.
              </p>
            ) : null;
          })()}
        </div>

        <div>
          <label htmlFor="program_id" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Program (Opsional)</label>
          <select id="program_id"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            value={form.program_id}
            onChange={e => { setProgramTouched(true); setForm({...form, program_id: e.target.value}); }}
          >
            <option value="">-- Pilih Program --</option>
            {programs.map(program => (
              <option key={program.id} value={program.id}>{program.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="tier" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tier</label>
          <select id="tier"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
            value={form.tier}
            onChange={e => setForm({...form, tier: e.target.value})}
          >
            {TIERS.map(t => (
              <option key={t} value={t}>{TIER_LABELS[t]}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Tingkatan harga/langganan siswa.</p>
        </div>

        <button disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2">
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...</>
          ) : (
            'Simpan'
          )}
        </button>
      </form>
    </div>
  );
}
