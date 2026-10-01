import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { getPaidTotals, refreshInvoiceStatus } from '@/lib/spp-server';
import { z } from 'zod';

const updateInvoiceSchema = z.object({
  amount: z.number().int('amount harus bilangan bulat').min(0, 'amount minimal 0').optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['unpaid', 'cancelled']).optional(),
});

/** Detail tagihan + riwayat pembayaran. Hanya admin. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }
    const { id } = await params;
    const supabase = createServerClient();

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        students (
          id, full_name, parent_name, parent_phone, status,
          grades ( name ),
          programs ( name )
        )
      `)
      .eq('id', id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!invoice) return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 });

    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('*, users!recorded_by ( id, username, full_name )')
      .eq('invoice_id', id)
      .order('paid_at', { ascending: false })
      .order('created_at', { ascending: false });
    if (payError) return NextResponse.json({ error: payError.message }, { status: 500 });

    const paid_total = (payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    return NextResponse.json({
      data: {
        ...invoice,
        paid_total,
        remaining: Math.max(0, invoice.amount - paid_total),
        payments: payments || [],
      },
    });
  } catch (err: any) {
    console.error('❌ Error in GET /api/admin/invoices/[id]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** Ubah nominal/catatan, atau batalkan/buka kembali tagihan. Hanya admin. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }
    const { id } = await params;
    const body = await req.json();
    const validation = updateInvoiceSchema.safeParse(body);
    if (!validation.success) {
      const issues: any[] = (validation.error as any).issues || (validation.error as any).errors || [];
      return NextResponse.json(
        {
          error: 'Validasi gagal',
          details: issues.map((e: any) => ({
            field: (e.path || []).join('.') || '',
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    const supabase = createServerClient();
    const totals = await getPaidTotals(supabase, [id]);
    const paidTotal = totals.get(id) || 0;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (validation.data.notes !== undefined) updates.notes = validation.data.notes;

    if (validation.data.amount !== undefined) {
      if (paidTotal > 0 && validation.data.amount !== undefined && validation.data.amount < paidTotal) {
        return NextResponse.json(
          { error: 'Nominal tagihan tidak boleh lebih kecil dari yang sudah dibayar' },
          { status: 400 },
        );
      }
      if (paidTotal > 0) {
        return NextResponse.json(
          { error: 'Nominal tidak bisa diubah setelah ada pembayaran — hapus pembayaran terlebih dahulu' },
          { status: 400 },
        );
      }
      updates.amount = validation.data.amount;
    }

    if (validation.data.status) updates.status = validation.data.status;

    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 });

    // Status akhir selalu diturunkan ulang dari pembayaran (kecuali cancelled manual)
    const refreshed = await refreshInvoiceStatus(supabase, id);
    return NextResponse.json({
      data: { ...refreshed.invoice, paid_total: refreshed.paidTotal, remaining: refreshed.remaining },
    });
  } catch (err: any) {
    console.error('❌ Error in PUT /api/admin/invoices/[id]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** Hapus tagihan — hanya bila belum ada pembayaran sama sekali. Hanya admin. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }
    const { id } = await params;
    const supabase = createServerClient();

    const totals = await getPaidTotals(supabase, [id]);
    if ((totals.get(id) || 0) > 0) {
      return NextResponse.json(
        { error: 'Tagihan yang sudah memiliki pembayaran tidak bisa dihapus — batalkan saja, atau hapus pembayarannya dulu' },
        { status: 400 },
      );
    }

    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('❌ Error in DELETE /api/admin/invoices/[id]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
