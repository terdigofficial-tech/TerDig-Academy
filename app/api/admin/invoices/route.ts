import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { getPaidTotals } from '@/lib/spp-server';
import { isValidPeriod, summarizeInvoices, type InvoiceStatus } from '@/lib/spp';
import { z } from 'zod';

const createInvoiceSchema = z.object({
  student_id: z.string().uuid('student_id harus berupa UUID valid'),
  period: z.string().refine(isValidPeriod, 'period harus format YYYY-MM'),
  amount: z.number().int('amount harus bilangan bulat').min(0, 'amount minimal 0'),
  notes: z.string().optional().nullable(),
});

function validationError(error: z.ZodError) {
  const issues: any[] = (error as any).issues || (error as any).errors || [];
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

/** Daftar tagihan per periode + ringkasan. Hanya admin. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '';
    const status = searchParams.get('status') || '';
    const search = (searchParams.get('search') || '').toLowerCase();

    if (period && !isValidPeriod(period)) {
      return NextResponse.json({ error: 'period harus format YYYY-MM' }, { status: 400 });
    }

    const supabase = createServerClient();
    let query = supabase
      .from('invoices')
      .select(`
        *,
        students (
          id, full_name, parent_name, parent_phone, status,
          grades ( name ),
          programs ( name )
        )
      `)
      .order('created_at', { ascending: true });

    if (period) query = query.eq('period', period);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      console.error('❌ Error fetching invoices:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const invoices = data || [];
    const totals = await getPaidTotals(supabase, invoices.map((i: any) => i.id));

    let enriched = invoices.map((inv: any) => {
      const paid_total = totals.get(inv.id) || 0;
      return {
        ...inv,
        paid_total,
        remaining: Math.max(0, inv.amount - paid_total),
      };
    });

    if (search) {
      enriched = enriched.filter((inv: any) =>
        (inv.students?.full_name || '').toLowerCase().includes(search) ||
        (inv.students?.parent_name || '').toLowerCase().includes(search),
      );
    }

    return NextResponse.json({
      data: enriched,
      summary: summarizeInvoices(
        enriched.map((i: any) => ({
          amount: i.amount,
          status: i.status as InvoiceStatus,
          paid_total: i.paid_total,
        })),
      ),
    });
  } catch (err: any) {
    console.error('❌ Error in GET /api/admin/invoices:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** Buat satu tagihan manual. Hanya admin. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const body = await req.json();
    const validation = createInvoiceSchema.safeParse(body);
    if (!validation.success) return validationError(validation.error);

    const supabase = createServerClient();

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, full_name')
      .eq('id', validation.data.student_id)
      .maybeSingle();
    if (studentError) {
      return NextResponse.json({ error: studentError.message }, { status: 500 });
    }
    if (!student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        student_id: validation.data.student_id,
        period: validation.data.period,
        amount: validation.data.amount,
        notes: validation.data.notes || null,
        created_by: auth.user.sub,
      })
      .select()
      .single();

    if (error) {
      if ((error as any).code === '23505') {
        return NextResponse.json(
          { error: `Tagihan untuk ${student.full_name} pada periode ini sudah ada` },
          { status: 409 },
        );
      }
      console.error('❌ Error creating invoice:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ...data, paid_total: 0, remaining: data.amount }, { status: 201 });
  } catch (err: any) {
    console.error('❌ Error in POST /api/admin/invoices:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
