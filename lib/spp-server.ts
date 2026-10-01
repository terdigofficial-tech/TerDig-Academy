import { createServerClient } from '@/lib/supabase-server';
import { deriveInvoiceStatus, type InvoiceStatus } from '@/lib/spp';

type Supabase = ReturnType<typeof createServerClient>;

/** Total pembayaran per invoice id. */
export async function getPaidTotals(
  supabase: Supabase,
  invoiceIds: string[],
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (invoiceIds.length === 0) return totals;
  const { data, error } = await supabase
    .from('payments')
    .select('invoice_id, amount')
    .in('invoice_id', invoiceIds);
  if (error) throw new Error(error.message);
  for (const row of data || []) {
    totals.set(row.invoice_id, (totals.get(row.invoice_id) || 0) + (row.amount || 0));
  }
  return totals;
}

/**
 * Hitung ulang status invoice dari pembayaran aktual dan simpan bila berubah.
 * Mengembalikan invoice terbaru + total terbayar.
 */
export async function refreshInvoiceStatus(supabase: Supabase, invoiceId: string) {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();
  if (error || !invoice) {
    throw new Error(error?.message || 'Tagihan tidak ditemukan');
  }
  const totals = await getPaidTotals(supabase, [invoiceId]);
  const paidTotal = totals.get(invoiceId) || 0;
  const next = deriveInvoiceStatus(
    invoice.amount,
    paidTotal,
    invoice.status as InvoiceStatus,
  );
  let current = invoice;
  if (next !== invoice.status) {
    const { data: updated, error: updErr } = await supabase
      .from('invoices')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', invoiceId)
      .select()
      .single();
    if (updErr) throw new Error(updErr.message);
    current = updated;
  }
  return { invoice: current, paidTotal, remaining: Math.max(0, current.amount - paidTotal) };
}
