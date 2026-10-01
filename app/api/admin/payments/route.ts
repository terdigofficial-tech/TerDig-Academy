import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { refreshInvoiceStatus } from '@/lib/spp-server';
import { formatRupiah } from '@/lib/spp';
import { z } from 'zod';

const createPaymentSchema = z.object({
  invoice_id: z.string().uuid('invoice_id harus berupa UUID valid'),
  amount: z.number().int('amount harus bilangan bulat').positive('amount harus lebih dari 0'),
  method: z.enum(['qris', 'transfer', 'cash', 'other']).optional().default('transfer'),
  paid_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'paid_at harus format YYYY-MM-DD')
    .optional(),
  note: z.string().optional().nullable(),
});

/** Catat pembayaran untuk sebuah tagihan. Hanya admin. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const body = await req.json();
    const validation = createPaymentSchema.safeParse(body);
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
    const { invoice_id, amount, method, paid_at, note } = validation.data;

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('id, amount, status')
      .eq('id', invoice_id)
      .maybeSingle();
    if (invError) return NextResponse.json({ error: invError.message }, { status: 500 });
    if (!invoice) return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 });
    if (invoice.status === 'cancelled') {
      return NextResponse.json({ error: 'Tagihan ini sudah dibatalkan' }, { status: 400 });
    }

    const { remaining } = await refreshInvoiceStatus(supabase, invoice_id);
    if (amount > remaining) {
      return NextResponse.json(
        {
          error: `Pembayaran ${formatRupiah(amount)} melebihi sisa tagihan ${formatRupiah(remaining)}`,
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('payments')
      .insert({
        invoice_id,
        amount,
        method,
        paid_at: paid_at || new Date().toISOString().split('T')[0],
        note: note || null,
        recorded_by: auth.user.sub,
      })
      .select()
      .single();
    if (error) {
      console.error('❌ Error recording payment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const after = await refreshInvoiceStatus(supabase, invoice_id);
    return NextResponse.json(
      {
        data,
        invoice_status: after.invoice.status,
        paid_total: after.paidTotal,
        remaining: after.remaining,
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error('❌ Error in POST /api/admin/payments:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
