'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Wallet, Plus, Sparkles, X, Trash2, Ban, RotateCcw, MessageCircle, Receipt, Download,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import {
  formatRupiah, periodLabel, currentPeriod,
  INVOICE_STATUS_LABEL, PAYMENT_METHOD_LABEL, type InvoiceStatus,
} from '@/lib/spp';
import type { Invoice, Payment } from '@/types';

interface StudentOption {
  id: string;
  full_name: string;
  status?: string;
}

interface Summary {
  count: number;
  paidCount: number;
  unpaidCount: number;
  partialCount: number;
  cancelledCount: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
}

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  unpaid: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  cancelled: 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
};

function waNumber(phone?: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  if (digits.startsWith('8')) digits = '62' + digits;
  return digits;
}

const inputClass =
  'w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition';
const labelClass = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5';

export default function SppPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentOption[]>([]);

  const [genAmount, setGenAmount] = useState('');
  const [generating, setGenerating] = useState(false);

  const [addStudentId, setAddStudentId] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [adding, setAdding] = useState(false);

  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('transfer');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [paying, setPaying] = useState(false);

  const [historyTarget, setHistoryTarget] = useState<Invoice | null>(null);
  const [historyPayments, setHistoryPayments] = useState<Payment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/invoices?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setInvoices(data.data || []);
        setSummary(data.summary || null);
      } else {
        toast.error(data.error || 'Gagal memuat tagihan');
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    }
    setLoading(false);
  }, [period, statusFilter, search]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    fetch('/api/admin/students')
      .then((res) => res.json())
      .then((data) => {
        const rows: StudentOption[] = Array.isArray(data) ? data : data.data || [];
        setStudents(rows.filter((s) => !s.status || s.status === 'active'));
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    const amount = Number(genAmount);
    if (!amount || amount < 0) {
      toast.error('Isi nominal SPP per anak terlebih dahulu');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, amount }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `Tagihan ${periodLabel(period)}: ${data.created} dibuat, ${data.skipped} dilewati (sudah ada)`,
        );
        loadInvoices();
      } else {
        toast.error(data.error || 'Gagal generate tagihan');
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    }
    setGenerating(false);
  };

  const handleAddManual = async () => {
    if (!addStudentId) {
      toast.error('Pilih siswa terlebih dahulu');
      return;
    }
    const amount = Number(addAmount);
    if (!amount && amount !== 0) {
      toast.error('Isi nominal tagihan');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: addStudentId, period, amount }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Tagihan berhasil dibuat');
        setAddStudentId('');
        setAddAmount('');
        loadInvoices();
      } else {
        toast.error(data.error || 'Gagal membuat tagihan');
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    }
    setAdding(false);
  };

  const openPay = (inv: Invoice) => {
    setPayTarget(inv);
    setPayAmount(String(inv.remaining ?? inv.amount));
    setPayMethod('transfer');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNote('');
  };

  const handlePay = async () => {
    if (!payTarget) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Nominal pembayaran harus lebih dari 0');
      return;
    }
    setPaying(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: payTarget.id,
          amount,
          method: payMethod,
          paid_at: payDate,
          note: payNote || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          data.invoice_status === 'paid'
            ? 'Pembayaran tercatat — tagihan LUNAS 🎉'
            : `Pembayaran tercatat — sisa ${formatRupiah(data.remaining)}`,
        );
        setPayTarget(null);
        loadInvoices();
      } else {
        toast.error(data.error || 'Gagal mencatat pembayaran');
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    }
    setPaying(false);
  };

  const openHistory = async (inv: Invoice) => {
    setHistoryTarget(inv);
    setHistoryPayments([]);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/invoices/${inv.id}`);
      const data = await res.json();
      if (res.ok) setHistoryPayments(data.data.payments || []);
      else toast.error(data.error || 'Gagal memuat riwayat');
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    }
    setHistoryLoading(false);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Hapus pembayaran ini? Status tagihan akan dihitung ulang.')) return;
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Pembayaran dihapus');
        if (historyTarget) openHistory(historyTarget);
        loadInvoices();
      } else {
        toast.error(data.error || 'Gagal menghapus pembayaran');
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    }
  };

  const handleToggleCancel = async (inv: Invoice) => {
    const toCancelled = inv.status !== 'cancelled';
    if (
      toCancelled &&
      !confirm(`Batalkan tagihan ${inv.students?.full_name} untuk ${periodLabel(inv.period)}?`)
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/invoices/${inv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toCancelled ? 'cancelled' : 'unpaid' }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(toCancelled ? 'Tagihan dibatalkan' : 'Tagihan diaktifkan kembali');
        loadInvoices();
      } else {
        toast.error(data.error || 'Gagal mengubah status');
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    }
  };

  const handleDeleteInvoice = async (inv: Invoice) => {
    if (!confirm(`Hapus tagihan ${inv.students?.full_name} (${periodLabel(inv.period)})?`)) return;
    try {
      const res = await fetch(`/api/admin/invoices/${inv.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Tagihan dihapus');
        loadInvoices();
      } else {
        toast.error(data.error || 'Gagal menghapus tagihan');
      }
    } catch (err: any) {
      toast.error('Network error: ' + err.message);
    }
  };

  const reminderText = (inv: Invoice) => {
    const sisa = formatRupiah(inv.remaining ?? inv.amount);
    const nama = inv.students?.full_name || 'Ananda';
    const wali = inv.students?.parent_name || 'Bapak/Ibu';
    return encodeURIComponent(
      `Halo ${wali}, kami dari TerDig Academy 🙏 Mengingatkan tagihan SPP ${nama} untuk ${periodLabel(inv.period)} sebesar ${sisa} yang belum lunas. Pembayaran bisa via QRIS/transfer — balas pesan ini untuk info pembayaran. Terima kasih.`,
    );
  };

  return (
    <div>
      <Toaster position="top-right" />

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Wallet className="w-8 h-8 text-indigo-500" />
            SPP &amp; Tagihan
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Kelola tagihan SPP bulanan, catat pembayaran QRIS/transfer/tunai, dan pantau tunggakan per periode.
          </p>
        </div>
        <a
          href={`/api/admin/exports/invoices?period=${period}`}
          className="shrink-0 inline-flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm font-medium"
        >
          <Download className="w-4 h-4" /> Ekspor Excel
        </a>
      </div>

      {/* Filter periode */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className={labelClass}>Periode</label>
          <input
            type="month"
            value={period}
            onChange={(e) => e.target.value && setPeriod(e.target.value)}
            className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
          />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition">
            <option value="">Semua status</option>
            <option value="unpaid">Belum Lunas</option>
            <option value="partial">Sebagian</option>
            <option value="paid">Lunas</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className={labelClass}>Cari siswa / wali</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ketik nama siswa atau nama wali..."
            className={inputClass}
          />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 pb-2">
          Menampilkan: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{periodLabel(period)}</span>
        </p>
      </div>

      {/* Ringkasan */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Tagihan</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">{formatRupiah(summary.totalBilled)}</p>
            <p className="text-xs text-slate-400 mt-1">{summary.count} tagihan aktif</p>
          </div>
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Terkumpul</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{formatRupiah(summary.totalPaid)}</p>
            <p className="text-xs text-slate-400 mt-1">{summary.paidCount} lunas</p>
          </div>
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sisa Belum Lunas</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">{formatRupiah(summary.totalOutstanding)}</p>
            <p className="text-xs text-slate-400 mt-1">
              {summary.unpaidCount} belum bayar • {summary.partialCount} sebagian
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Dibatalkan</p>
            <p className="text-xl font-bold text-slate-500 dark:text-slate-400 mt-1">{summary.cancelledCount}</p>
            <p className="text-xs text-slate-400 mt-1">tidak dihitung sebagai piutang</p>
          </div>
        </div>
      )}

      {/* Generate & tambah manual */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white">
          <h3 className="font-bold flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5" /> Generate Tagihan Bulanan
          </h3>
          <p className="text-indigo-200 text-xs mb-4">
            Buat tagihan {periodLabel(period)} untuk semua siswa aktif yang belum punya tagihan. Yang sudah ada dilewati, tidak ditimpa.
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              value={genAmount}
              onChange={(e) => setGenAmount(e.target.value)}
              placeholder="Nominal SPP per anak (Rp)"
              className="flex-1 rounded-xl px-4 py-2.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-white text-indigo-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-50 disabled:opacity-50 transition flex items-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
            <Plus className="w-5 h-5 text-indigo-500" /> Tagihan Manual (1 Siswa)
          </h3>
          <div className="flex gap-2">
            <select value={addStudentId} onChange={(e) => setAddStudentId(e.target.value)} className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition text-sm">
              <option value="">-- Pilih siswa --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              placeholder="Nominal (Rp)"
              className="w-36 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition text-sm"
            />
            <button
              onClick={handleAddManual}
              disabled={adding}
              className="bg-indigo-600 text-white font-medium px-4 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2 text-sm"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Buat
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Untuk siswa yang masuk di tengah bulan atau nominal khusus.</p>
        </div>
      </div>

      {/* Tabel tagihan */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> Memuat tagihan...
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center px-6">
            <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-700 dark:text-slate-300 font-medium">Belum ada tagihan untuk periode ini</p>
            <p className="text-slate-400 text-sm mt-1">Gunakan tombol Generate di atas untuk membuat tagihan semua siswa aktif sekaligus.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/40 text-left text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-3.5 font-semibold">Siswa</th>
                  <th className="px-5 py-3.5 font-semibold">Wali</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Tagihan</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Terbayar</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Sisa</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{inv.students?.full_name || '-'}</p>
                      <p className="text-xs text-slate-400">
                        {[inv.students?.grades?.name, inv.students?.programs?.name].filter(Boolean).join(' • ') || '-'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-slate-700 dark:text-slate-300">{inv.students?.parent_name || '-'}</p>
                      <p className="text-xs text-slate-400">{inv.students?.parent_phone || ''}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-800 dark:text-slate-100">{formatRupiah(inv.amount)}</td>
                    <td className="px-5 py-3.5 text-right text-green-600 dark:text-green-400">{formatRupiah(inv.paid_total || 0)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-800 dark:text-slate-100">{formatRupiah(inv.remaining || 0)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[inv.status]}`}>
                        {INVOICE_STATUS_LABEL[inv.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button onClick={() => openPay(inv)} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition">
                            Bayar
                          </button>
                        )}
                        <button onClick={() => openHistory(inv)} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition">
                          Riwayat
                        </button>
                        {(inv.status === 'unpaid' || inv.status === 'partial') && inv.students?.parent_phone && (
                          <a
                            href={`https://wa.me/${waNumber(inv.students.parent_phone)}?text=${reminderText(inv)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold hover:bg-green-200 transition inline-flex items-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> Ingatkan
                          </a>
                        )}
                        <button
                          onClick={() => handleToggleCancel(inv)}
                          title={inv.status === 'cancelled' ? 'Aktifkan kembali' : 'Batalkan tagihan'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"
                        >
                          {inv.status === 'cancelled' ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                        {(inv.paid_total || 0) === 0 && (
                          <button
                            onClick={() => handleDeleteInvoice(inv)}
                            title="Hapus tagihan"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal pembayaran */}
      {payTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPayTarget(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Catat Pembayaran</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {payTarget.students?.full_name} — {periodLabel(payTarget.period)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Sisa tagihan: <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(payTarget.remaining || 0)}</span>
                </p>
              </div>
              <button onClick={() => setPayTarget(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Nominal dibayar (Rp)</label>
                <input type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Metode</label>
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className={inputClass}>
                    <option value="qris">QRIS</option>
                    <option value="transfer">Transfer</option>
                    <option value="cash">Tunai</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tanggal bayar</label>
                  <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Catatan <span className="text-slate-400 font-normal">(opsional)</span></label>
                <input type="text" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Contoh: bukti transfer WA 08.15" className={inputClass} />
              </div>
              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
                Simpan Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal riwayat pembayaran */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setHistoryTarget(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Riwayat Pembayaran</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {historyTarget.students?.full_name} — {periodLabel(historyTarget.period)} • Tagihan {formatRupiah(historyTarget.amount)}
                </p>
              </div>
              <button onClick={() => setHistoryTarget(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            {historyLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> Memuat...
              </div>
            ) : historyPayments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">Belum ada pembayaran tercatat untuk tagihan ini.</p>
            ) : (
              <div className="space-y-2">
                {historyPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{formatRupiah(p.amount)}</p>
                      <p className="text-xs text-slate-400">
                        {PAYMENT_METHOD_LABEL[p.method] || p.method} •{' '}
                        {new Date(p.paid_at + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {p.note ? ` • ${p.note}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePayment(p.id)}
                      title="Hapus pembayaran (koreksi)"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
