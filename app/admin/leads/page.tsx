'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, UserPlus, Sparkles, X, Trash2, MessageCircle, Pencil, GraduationCap, Mail,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import {
  LEAD_STATUSES, LEAD_STATUS_LABELS, toWaNumber, type LeadStatus, type LeadSummary,
} from '@/lib/leads';
import { suggestProgramIdForGradeLevel } from '@/lib/programs';
import type { Lead } from '@/types';

interface SchoolOption {
  code: string;
  name: string;
}

interface GradeOption {
  id: string;
  name: string;
  level: number;
}

interface ProgramOption {
  id: string;
  name: string;
  phase_key?: string | null;
}

const STATUS_BADGE: Record<LeadStatus, string> = {
  amplop_dibagi: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  klaim_wa: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  pemetaan: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  trial_terjadwal: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  trial_hadir: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  daftar: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  belum_minat: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  hilang: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
};

const inputClass =
  'w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition';
const labelClass = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5';

const CLASS_OPTIONS = ['PAUD/TK', 'Kelas 1 SD', 'Kelas 2 SD', 'Kelas 3 SD', 'Kelas 4 SD', 'Kelas 5 SD', 'Kelas 6 SD'];

function waFollowUpText(lead: Lead): string {
  const child = lead.child_name?.trim() || 'Ananda';
  const voucher = lead.voucher_code ? ` (kode voucher ${lead.voucher_code})` : '';
  return encodeURIComponent(
    `Halo, kami dari TerDig Academy. Terima kasih ${child} sudah ikut TerDig Smart Session${voucher}. ` +
    `Voucher Tes Pemetaan Awal & 1x Trial Class gratis masih berlaku 7 hari sejak acara — ` +
    `boleh kami bantu jadwalkan hari trialnya? Terima kasih.`,
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [search, setSearch] = useState('');

  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);

  // Generate amplop
  const [genSchoolName, setGenSchoolName] = useState('');
  const [genSchoolCode, setGenSchoolCode] = useState('');
  const [genCount, setGenCount] = useState('60');
  const [genEventDate, setGenEventDate] = useState('');
  const [genClassLabel, setGenClassLabel] = useState('');
  const [generating, setGenerating] = useState(false);

  // Tambah manual
  const [addForm, setAddForm] = useState({
    child_name: '', parent_name: '', parent_phone: '', school_name: '', school_code: '',
    class_label: '', voucher_code: '', status: 'klaim_wa' as LeadStatus,
  });
  const [adding, setAdding] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Konversi modal
  const [convertTarget, setConvertTarget] = useState<Lead | null>(null);
  const [convertGradeId, setConvertGradeId] = useState('');
  const [convertProgramId, setConvertProgramId] = useState('');
  const [convertProgramTouched, setConvertProgramTouched] = useState(false);
  const [convertLevel, setConvertLevel] = useState('1');
  const [converting, setConverting] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (schoolFilter) params.set('school', schoolFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLeads(data.leads || []);
        setSummary(data.summary || null);
        setSchools(data.schools || []);
      } else {
        toast.error(data.error || 'Gagal memuat leads');
      }
    } catch {
      toast.error('Gagal memuat leads');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, schoolFilter, search]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    fetch('/api/admin/grades').then((r) => r.json()).then((d) => setGrades(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/admin/programs').then((r) => r.json()).then((d) => setPrograms(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/leads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: genSchoolName,
          school_code: genSchoolCode,
          count: Number(genCount),
          event_date: genEventDate || null,
          class_label: genClassLabel || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal generate');
      toast.success(`${data.created} amplop dibuat: ${data.first_code} s.d. ${data.last_code}. Tulis kode ini di amplop & voucher sebelum disegel.`);
      setGenSchoolName('');
      setGenSchoolCode('');
      setGenEventDate('');
      setGenClassLabel('');
      loadLeads();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          parent_name: addForm.parent_name || null,
          parent_phone: addForm.parent_phone || null,
          school_name: addForm.school_name || null,
          school_code: addForm.school_code || null,
          class_label: addForm.class_label || null,
          voucher_code: addForm.voucher_code || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambah lead');
      toast.success('Lead ditambahkan');
      setAddForm({
        child_name: '', parent_name: '', parent_phone: '', school_name: '', school_code: '',
        class_label: '', voucher_code: '', status: 'klaim_wa',
      });
      loadLeads();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function changeStatus(lead: Lead, status: LeadStatus) {
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status');
      toast.success(`Status: ${LEAD_STATUS_LABELS[status]}`);
      loadLeads();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function openEdit(lead: Lead) {
    setEditTarget(lead);
    setEditForm({
      child_name: lead.child_name || '',
      parent_name: lead.parent_name || '',
      parent_phone: lead.parent_phone || '',
      school_name: lead.school_name || '',
      school_code: lead.school_code || '',
      class_label: lead.class_label || '',
      voucher_code: lead.voucher_code || '',
      event_date: lead.event_date || '',
      trial_date: lead.trial_date || '',
      notes: lead.notes || '',
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/leads/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_name: editForm.child_name,
          parent_name: editForm.parent_name || null,
          parent_phone: editForm.parent_phone || null,
          school_name: editForm.school_name || null,
          school_code: editForm.school_code || null,
          class_label: editForm.class_label || null,
          voucher_code: editForm.voucher_code || null,
          event_date: editForm.event_date || null,
          trial_date: editForm.trial_date || null,
          notes: editForm.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');
      toast.success('Lead diperbarui');
      setEditTarget(null);
      loadLeads();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(lead: Lead) {
    const name = lead.child_name?.trim() || lead.voucher_code || 'lead ini';
    if (!window.confirm(`Hapus ${name}? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus');
      toast.success('Lead dihapus');
      loadLeads();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function openConvert(lead: Lead) {
    setConvertTarget(lead);
    setConvertGradeId('');
    setConvertProgramId('');
    setConvertProgramTouched(false);
    setConvertLevel('1');
  }

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!convertTarget) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/admin/leads/${convertTarget.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade_id: convertGradeId,
          program_id: convertProgramId,
          current_level: Number(convertLevel),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal konversi');
      toast.success(`${data.student.full_name} kini terdaftar sebagai siswa aktif`);
      setConvertTarget(null);
      loadLeads();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <UserPlus className="w-8 h-8 text-indigo-600" />
          Leads &amp; Trial
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Funnel TerDig Smart Session: dari amplop dibagikan, klaim WhatsApp, pemetaan, trial, sampai jadi siswa.
          Menggantikan pencatatan manual di Tracker Funnel Excel.
        </p>
      </div>

      {/* Ringkasan funnel vs target pilot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-xs font-bold tracking-wide text-slate-400">PESERTA (AMPLOP)</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{summary?.total ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">Target pilot: ≥ 60 anak</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-xs font-bold tracking-wide text-slate-400">KLAIM WA</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{summary?.engaged ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">Target ≥ 20 • {summary?.claimRate ?? 0}% dari peserta</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-xs font-bold tracking-wide text-slate-400">TRIAL HADIR</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{summary?.trialAttended ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">Target ≥ 8 • {summary?.trialRate ?? 0}% dari klaim</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-xs font-bold tracking-wide text-slate-400">DAFTAR (SISWA BARU)</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{summary?.registered ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">Target ≥ 3 • {summary?.registrationRate ?? 0}% dari trial hadir</p>
        </div>
      </div>

      {/* Chip per status */}
      <div className="flex flex-wrap gap-2 mb-6">
        {LEAD_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              statusFilter === s ? 'ring-2 ring-indigo-500 ' : ''
            }${STATUS_BADGE[s]}`}
          >
            {LEAD_STATUS_LABELS[s]}: {summary?.perStatus[s] ?? 0}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Generate amplop */}
        <form onSubmit={handleGenerate} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-1">
            <Mail className="w-5 h-5 text-indigo-600" /> Generate Amplop &amp; Voucher
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Buat daftar peserta untuk satu sekolah sebelum acara. Kode voucher berurutan otomatis —
            tulis kodenya di amplop &amp; voucher sebelum disegel.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Nama Sekolah</label>
              <input className={inputClass} value={genSchoolName} onChange={(e) => setGenSchoolName(e.target.value)} placeholder="mis. TK Aisyiyah Comal" required />
            </div>
            <div>
              <label className={labelClass}>Kode Sekolah (2–5 huruf)</label>
              <input className={inputClass} value={genSchoolCode} onChange={(e) => setGenSchoolCode(e.target.value)} placeholder="mis. TKA" required />
            </div>
            <div>
              <label className={labelClass}>Jumlah Amplop</label>
              <input className={inputClass} type="number" min={1} max={500} value={genCount} onChange={(e) => setGenCount(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>Tanggal Acara</label>
              <input className={inputClass} type="date" value={genEventDate} onChange={(e) => setGenEventDate(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Kelas (opsional)</label>
              <select className={inputClass} value={genClassLabel} onChange={(e) => setGenClassLabel(e.target.value)}>
                <option value="">— campuran —</option>
                {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={generating} className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Generate Voucher
          </button>
        </form>

        {/* Tambah manual */}
        <form onSubmit={handleAdd} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-1">
            <UserPlus className="w-5 h-5 text-indigo-600" /> Tambah Lead Manual
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Untuk orang tua yang langsung menghubungi via WhatsApp di luar daftar amplop.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nama Anak *</label>
              <input className={inputClass} value={addForm.child_name} onChange={(e) => setAddForm({ ...addForm, child_name: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>Nama Wali</label>
              <input className={inputClass} value={addForm.parent_name} onChange={(e) => setAddForm({ ...addForm, parent_name: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>No. WhatsApp Wali</label>
              <input className={inputClass} value={addForm.parent_phone} onChange={(e) => setAddForm({ ...addForm, parent_phone: e.target.value })} placeholder="08…" />
            </div>
            <div>
              <label className={labelClass}>Kode Voucher (bila ada)</label>
              <input className={inputClass} value={addForm.voucher_code} onChange={(e) => setAddForm({ ...addForm, voucher_code: e.target.value })} placeholder="TD-TKA-001" />
            </div>
            <div>
              <label className={labelClass}>Nama Sekolah</label>
              <input className={inputClass} value={addForm.school_name} onChange={(e) => setAddForm({ ...addForm, school_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Kode Sekolah</label>
                <input className={inputClass} value={addForm.school_code} onChange={(e) => setAddForm({ ...addForm, school_code: e.target.value })} placeholder="TKA" />
              </div>
              <div>
                <label className={labelClass}>Kelas</label>
                <select className={inputClass} value={addForm.class_label} onChange={(e) => setAddForm({ ...addForm, class_label: e.target.value })}>
                  <option value="">—</option>
                  {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
          <button type="submit" disabled={adding} className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
            {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            Tambah Lead (status: Klaim WA)
          </button>
        </form>
      </div>

      {/* Filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          className={`${inputClass} md:max-w-xs`}
          placeholder="Cari nama anak, wali, atau kode voucher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={`${inputClass} md:max-w-[220px]`} value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
          <option value="">Semua sekolah</option>
          {schools.map((s) => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
        </select>
        <select className={`${inputClass} md:max-w-[220px]`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Semua status</option>
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Tabel leads */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat leads…
          </div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="font-semibold text-slate-500 dark:text-slate-300">Belum ada lead pada filter ini</p>
            <p className="text-sm mt-1">Gunakan panel Generate Amplop untuk menyiapkan peserta Smart Session pertama.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-3">Anak</th>
                <th className="px-4 py-3">Wali &amp; WhatsApp</th>
                <th className="px-4 py-3">Sekolah / Kelas</th>
                <th className="px-4 py-3">Voucher</th>
                <th className="px-4 py-3">Status Funnel</th>
                <th className="px-4 py-3">Trial</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const wa = toWaNumber(lead.parent_phone);
                return (
                  <tr key={lead.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      {lead.child_name?.trim() ? (
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{lead.child_name}</span>
                      ) : (
                        <span className="italic text-slate-400">(belum klaim)</span>
                      )}
                      {lead.converted_student_id && (
                        <span className="ml-2 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">SISWA</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>{lead.parent_name || '—'}</div>
                      <div className="text-xs text-slate-400">{lead.parent_phone || 'belum ada nomor'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>{lead.school_name || '—'}</div>
                      <div className="text-xs text-slate-400">{lead.class_label || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{lead.voucher_code || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => changeStatus(lead, e.target.value as LeadStatus)}
                        className={`px-2.5 py-1.5 rounded-full text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${STATUS_BADGE[lead.status]}`}
                      >
                        {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">
                      {lead.trial_date ? new Date(`${lead.trial_date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {wa && (
                          <a
                            href={`https://wa.me/${wa}?text=${waFollowUpText(lead)}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Follow-up via WhatsApp"
                            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={() => openEdit(lead)} title="Edit lead" className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 transition">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!lead.converted_student_id && (
                          <button onClick={() => openConvert(lead)} title="Konversi jadi siswa" className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">
                            <GraduationCap className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(lead)} title="Hapus lead" className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal edit */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditTarget(null)}>
          <form
            onSubmit={handleSaveEdit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Edit Lead</h3>
              <button type="button" onClick={() => setEditTarget(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Nama Anak</label>
                <input className={inputClass} value={editForm.child_name} onChange={(e) => setEditForm({ ...editForm, child_name: e.target.value })} placeholder="Diisi saat klaim WA" />
              </div>
              <div>
                <label className={labelClass}>Nama Wali</label>
                <input className={inputClass} value={editForm.parent_name} onChange={(e) => setEditForm({ ...editForm, parent_name: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>No. WhatsApp Wali</label>
                <input className={inputClass} value={editForm.parent_phone} onChange={(e) => setEditForm({ ...editForm, parent_phone: e.target.value })} placeholder="08…" />
              </div>
              <div>
                <label className={labelClass}>Kode Voucher</label>
                <input className={inputClass} value={editForm.voucher_code} onChange={(e) => setEditForm({ ...editForm, voucher_code: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Nama Sekolah</label>
                <input className={inputClass} value={editForm.school_name} onChange={(e) => setEditForm({ ...editForm, school_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Kode Sekolah</label>
                  <input className={inputClass} value={editForm.school_code} onChange={(e) => setEditForm({ ...editForm, school_code: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Kelas</label>
                  <select className={inputClass} value={editForm.class_label} onChange={(e) => setEditForm({ ...editForm, class_label: e.target.value })}>
                    <option value="">—</option>
                    {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Tanggal Acara</label>
                <input className={inputClass} type="date" value={editForm.event_date} onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Tanggal Trial</label>
                <input className={inputClass} type="date" value={editForm.trial_date} onChange={(e) => setEditForm({ ...editForm, trial_date: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Catatan</label>
                <textarea className={inputClass} rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Hasil pemetaan, jadwal pilihan, dsb." />
              </div>
            </div>
            <button type="submit" disabled={savingEdit} className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
              {savingEdit && <Loader2 className="w-5 h-5 animate-spin" />} Simpan Perubahan
            </button>
          </form>
        </div>
      )}

      {/* Modal konversi */}
      {convertTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConvertTarget(null)}>
          <form
            onSubmit={handleConvert}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Konversi Jadi Siswa</h3>
              <button type="button" onClick={() => setConvertTarget(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{convertTarget.child_name || '(nama belum terisi)'}</span> akan
              terdaftar sebagai siswa aktif dan status lead menjadi <span className="font-semibold">Daftar</span>.
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Kelas *</label>
                <select
                  className={inputClass}
                  value={convertGradeId}
                  onChange={(e) => {
                    const gid = e.target.value;
                    const grade = grades.find((g) => g.id === gid);
                    const suggested = grade ? suggestProgramIdForGradeLevel(grade.level, programs) : null;
                    setConvertGradeId(gid);
                    if (!convertProgramTouched && suggested) setConvertProgramId(suggested);
                  }}
                  required
                >
                  <option value="">— Pilih kelas —</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Program *</label>
                <select
                  className={inputClass}
                  value={convertProgramId}
                  onChange={(e) => { setConvertProgramTouched(true); setConvertProgramId(e.target.value); }}
                  required
                >
                  <option value="">— Pilih program —</option>
                  {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {!convertProgramTouched && convertProgramId && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Terisi otomatis sesuai kelas — boleh diubah.</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Level Awal</label>
                <input className={inputClass} type="number" min={0} max={6} value={convertLevel} onChange={(e) => setConvertLevel(e.target.value)} />
              </div>
            </div>
            <button type="submit" disabled={converting} className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
              {converting ? <Loader2 className="w-5 h-5 animate-spin" /> : <GraduationCap className="w-5 h-5" />}
              Daftarkan sebagai Siswa
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
