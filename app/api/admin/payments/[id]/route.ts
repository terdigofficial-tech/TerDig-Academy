import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { refreshInvoiceStatus } from '@/lib/spp-server';

/** Hapus satu pembayaran (koreksi salah catat) lalu hitung ulang status tagihan. Hanya admin. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }
    const { id } = await params;
    const supabase = createServerClient();

    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('id, invoice_id')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!payment) return NextResponse.json({ error: 'Pembayaran tidak ditemukan' }, { status: 404 });

    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const after = await refreshInvoiceStatus(supabase, payment.invoice_id);
    return NextResponse.json({
      success: true,
      invoice_status: after.invoice.status,
      paid_total: after.paidTotal,
      remaining: after.remaining,
    });
  } catch (err: any) {
    console.error('❌ Error in DELETE /api/admin/payments/[id]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
