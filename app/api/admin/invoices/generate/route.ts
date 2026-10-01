import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth-middleware';
import { isValidPeriod, periodLabel } from '@/lib/spp';
import { z } from 'zod';

const generateSchema = z.object({
  period: z.string().refine(isValidPeriod, 'period harus format YYYY-MM'),
  amount: z.number().int('amount harus bilangan bulat').min(0, 'amount minimal 0'),
  notes: z.string().optional().nullable(),
});

/**
 * Generate tagihan satu periode untuk SEMUA siswa aktif yang belum punya
 * tagihan di periode itu. Siswa yang sudah punya tagihan dilewati (tidak ditimpa).
 * Hanya admin.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const body = await req.json();
    const validation = generateSchema.safeParse(body);
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

    const { period, amount, notes } = validation.data;
    const supabase = createServerClient();

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('status', 'active');
    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    const { data: existing, error: existingError } = await supabase
      .from('invoices')
      .select('student_id')
      .eq('period', period);
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const existingIds = new Set((existing || []).map((i: any) => i.student_id));
    const targets = (students || []).filter((s: any) => !existingIds.has(s.id));
    const skipped = (students || []).length - targets.length;

    let created = 0;
    if (targets.length > 0) {
      const rows = targets.map((s: any) => ({
        student_id: s.id,
        period,
        amount,
        notes: notes || null,
        created_by: auth.user.sub,
      }));
      const { data: inserted, error: insertError } = await supabase
        .from('invoices')
        .insert(rows)
        .select('id');
      if (insertError) {
        console.error('❌ Error generating invoices:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      created = inserted?.length || 0;
    }

    console.log(`✅ Generate SPP ${periodLabel(period)}: ${created} dibuat, ${skipped} dilewati`);
    return NextResponse.json({
      period,
      period_label: periodLabel(period),
      amount,
      created,
      skipped,
      total_active_students: (students || []).length,
    });
  } catch (err: any) {
    console.error('❌ Error in POST /api/admin/invoices/generate:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
