/**
 * Logika murni modul SPP (tagihan & pembayaran) — tanpa dependensi Supabase
 * agar bisa diuji satuan. Dipakai API routes dan halaman SPP.
 */

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled';

export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** Periode tagihan selalu format 'YYYY-MM'. */
export function isValidPeriod(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** '2026-10' -> 'Oktober 2026' */
export function periodLabel(period: string): string {
  if (!isValidPeriod(period)) return period;
  const [year, month] = period.split('-');
  return `${MONTH_NAMES_ID[Number(month) - 1]} ${year}`;
}

/** Periode bulan berjalan dari tanggal (lokal server) — 'YYYY-MM'. */
export function currentPeriod(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Status tagihan diturunkan dari nominal vs total terbayar.
 * 'cancelled' bersifat lengket (keputusan manual admin) dan tidak diturunkan ulang.
 */
export function deriveInvoiceStatus(
  amount: number,
  paidTotal: number,
  current: InvoiceStatus,
): InvoiceStatus {
  if (current === 'cancelled') return 'cancelled';
  if (paidTotal >= amount) return 'paid';
  if (paidTotal > 0) return 'partial';
  return 'unpaid';
}

export interface InvoiceLike {
  amount: number;
  status: InvoiceStatus;
  paid_total?: number;
}

export interface InvoiceSummary {
  count: number;
  paidCount: number;
  unpaidCount: number;
  partialCount: number;
  cancelledCount: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
}

/** Ringkasan satu periode. Tagihan cancelled tidak dihitung sebagai piutang. */
export function summarizeInvoices(invoices: InvoiceLike[]): InvoiceSummary {
  const s: InvoiceSummary = {
    count: 0,
    paidCount: 0,
    unpaidCount: 0,
    partialCount: 0,
    cancelledCount: 0,
    totalBilled: 0,
    totalPaid: 0,
    totalOutstanding: 0,
  };
  for (const inv of invoices) {
    const paid = inv.paid_total ?? 0;
    if (inv.status === 'cancelled') {
      s.cancelledCount += 1;
      continue;
    }
    s.count += 1;
    if (inv.status === 'paid') s.paidCount += 1;
    else if (inv.status === 'partial') s.partialCount += 1;
    else s.unpaidCount += 1;
    s.totalBilled += inv.amount;
    s.totalPaid += paid;
    s.totalOutstanding += Math.max(0, inv.amount - paid);
  }
  return s;
}

/** 250000 -> 'Rp250.000' */
export function formatRupiah(n: number): string {
  return 'Rp' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  unpaid: 'Belum Lunas',
  partial: 'Sebagian',
  paid: 'Lunas',
  cancelled: 'Dibatalkan',
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  qris: 'QRIS',
  transfer: 'Transfer',
  cash: 'Tunai',
  other: 'Lainnya',
};
